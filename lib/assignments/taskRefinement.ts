import { generateAssignmentTaskRefinement } from "@/lib/ai/assignmentTaskPlan";
import { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

type ProposedTask = {
  id: string;
  proposedTitle: string;
};

type RefinableTask = {
  id: string;
  title: string;
  scheduled_date: string;
  status: string;
  source: string;
  user_edited: boolean;
};

const refinableTaskSources = new Set([
  "generic_generated",
  "context_generated",
]);

export type AssignmentTaskRefinement = {
  contextVersion: number;
  summary: string;
  tasks: Array<{
    id: string;
    scheduledDate: string;
    currentTitle: string;
    proposedTitle: string;
  }>;
};

export class TaskRefinementError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "TaskRefinementError";
  }
}

export async function previewAssignmentTaskRefinement(input: {
  supabase: SupabaseServerClient;
  userId: string;
  assignmentId: string;
  protectedTaskId?: string | null;
  signal?: AbortSignal;
}): Promise<AssignmentTaskRefinement> {
  const [assignmentResult, materialsResult, tasksResult] = await Promise.all([
    input.supabase
      .from("assignments")
      .select("id, title, description, due_date, original_file_name, extracted_text, context_version")
      .eq("id", input.assignmentId)
      .eq("user_id", input.userId)
      .maybeSingle(),
    input.supabase
      .from("assignment_materials")
      .select("original_file_name, extracted_text, created_at")
      .eq("assignment_id", input.assignmentId)
      .eq("user_id", input.userId)
      .order("created_at", { ascending: false }),
    input.supabase
      .from("study_plan_tasks")
      .select("id, title, scheduled_date, status, source, user_edited")
      .eq("assignment_id", input.assignmentId)
      .eq("user_id", input.userId)
      .order("scheduled_date", { ascending: true })
      .order("created_at", { ascending: true }),
  ]);

  if (assignmentResult.error || materialsResult.error || tasksResult.error) {
    throw new TaskRefinementError(
      "The assignment task plan could not be loaded.",
      500,
    );
  }
  if (!assignmentResult.data) {
    throw new TaskRefinementError("Assignment not found.", 404);
  }

  const assignment = assignmentResult.data;
  const tasks = selectRefinableAssignmentTasks(
    tasksResult.data ?? [],
    input.protectedTaskId,
  );

  if (tasks.length === 0) {
    return {
      contextVersion: assignment.context_version,
      summary: "No unfinished generated assignment tasks are available to update.",
      tasks: [],
    };
  }

  const sources = [
    ...(materialsResult.data ?? []).flatMap((material) =>
      material.extracted_text?.trim()
        ? [{ name: material.original_file_name, text: material.extracted_text }]
        : [],
    ),
    ...(assignment.extracted_text?.trim()
      ? [{
          name: assignment.original_file_name ?? "Assignment instructions",
          text: assignment.extracted_text,
        }]
      : []),
  ];

  if (sources.length === 0) {
    throw new TaskRefinementError(
      "Upload readable assignment instructions or study material before updating the tasks.",
      409,
    );
  }

  let proposals: Awaited<ReturnType<typeof generateAssignmentTaskRefinement>>;
  try {
    proposals = await generateAssignmentTaskRefinement({
      assignmentTitle: assignment.title,
      description: assignment.description,
      dueDate: assignment.due_date,
      tasks: tasks.map((task) => ({
        id: task.id,
        title: task.title,
        scheduledDate: task.scheduled_date,
      })),
      sources,
      safetyIdentifier: input.userId,
      signal: input.signal,
    });
  } catch (error) {
    console.error("Assignment task refinement generation error:", error);
    throw new TaskRefinementError(
      "The material was saved, but the assignment tasks could not be updated from it.",
      502,
    );
  }

  const proposalById = new Map(
    proposals.map((proposal) => [proposal.id, proposal.proposedTitle]),
  );
  const refinedTasks = tasks.flatMap((task) => {
    const proposedTitle = proposalById.get(task.id);
    if (!proposedTitle || proposedTitle === task.title) return [];

    return [{
      id: task.id,
      scheduledDate: task.scheduled_date,
      currentTitle: task.title,
      proposedTitle,
    }];
  });

  return {
    contextVersion: assignment.context_version,
    summary: refinedTasks.length
      ? `Redistributing the assignment material across ${tasks.length} unfinished task${tasks.length === 1 ? "" : "s"}.`
      : "The existing task titles already match the assignment material.",
    tasks: refinedTasks,
  };
}

export function selectRefinableAssignmentTasks(
  tasks: RefinableTask[],
  protectedTaskId?: string | null,
) {
  return tasks.filter((task) =>
    task.id !== protectedTaskId
    && task.status === "todo"
    && !task.user_edited
    && refinableTaskSources.has(task.source)
  );
}

export async function applyAssignmentTaskRefinement(input: {
  supabase: SupabaseServerClient;
  userId: string;
  assignmentId: string;
  contextVersion: number;
  tasks: ProposedTask[];
}) {
  if (input.tasks.length === 0) return 0;

  const { data: assignment, error: assignmentError } = await input.supabase
    .from("assignments")
    .select("id, context_version")
    .eq("id", input.assignmentId)
    .eq("user_id", input.userId)
    .maybeSingle();

  if (assignmentError) {
    throw new TaskRefinementError("The assignment could not be verified.", 500);
  }
  if (!assignment) {
    throw new TaskRefinementError("Assignment not found.", 404);
  }
  if (assignment.context_version !== input.contextVersion) {
    throw new TaskRefinementError(
      "The assignment changed. Generate the task update again.",
      409,
    );
  }

  const taskIds = input.tasks.map((task) => task.id);
  const { data: eligibleData, error: eligibleError } = await input.supabase
    .from("study_plan_tasks")
    .select("id")
    .eq("assignment_id", input.assignmentId)
    .eq("user_id", input.userId)
    .eq("status", "todo")
    .eq("user_edited", false)
    .in("source", ["generic_generated", "context_generated"])
    .in("id", taskIds);

  if (eligibleError) {
    throw new TaskRefinementError("The planner tasks could not be verified.", 500);
  }

  const eligibleIds = new Set((eligibleData ?? []).map((task) => task.id));
  if (eligibleIds.size !== taskIds.length) {
    throw new TaskRefinementError(
      "One or more planner tasks changed. Generate the task update again.",
      409,
    );
  }

  for (const task of input.tasks) {
    const { error } = await input.supabase
      .from("study_plan_tasks")
      .update({
        title: task.proposedTitle.trim(),
        source: "context_generated",
        context_version: input.contextVersion,
      })
      .eq("id", task.id)
      .eq("user_id", input.userId);

    if (error) {
      console.error("Planner task refinement update error:", error);
      throw new TaskRefinementError(
        "Some planner tasks could not be updated. Refresh before trying again.",
        500,
      );
    }
  }

  return input.tasks.length;
}
