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
  automatic?: boolean;
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
  const allTasks = tasksResult.data ?? [];
  const startedTaskIds = await loadStartedTaskIds(input, allTasks);
  // Uploads may populate a new plan once, but must not silently redistribute
  // established work or the remaining slots of a plan already in progress.
  if (input.automatic && (startedTaskIds.size > 0 || allTasks.some((task) =>
    task.status !== "todo" || task.user_edited || task.source !== "generic_generated"
  ))) {
    return {
      contextVersion: assignment.context_version,
      summary: "Materials saved. Your existing task plan and progress are unchanged.",
      tasks: [],
    };
  }
  const tasks = selectRefinableAssignmentTasks(
    allTasks,
    input.protectedTaskId,
    startedTaskIds,
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
      fixedTasks: allTasks.filter((task) => !tasks.some((candidate) => candidate.id === task.id))
        .map((task) => ({ id: task.id, title: task.title, scheduledDate: task.scheduled_date })),
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
  startedTaskIds: ReadonlySet<string> = new Set(),
) {
  return tasks.filter((task) =>
    task.id !== protectedTaskId
    && !startedTaskIds.has(task.id)
    && task.status === "todo"
    && !task.user_edited
    && refinableTaskSources.has(task.source)
  );
}

async function loadStartedTaskIds(
  input: { supabase: SupabaseServerClient; userId: string; assignmentId: string },
  tasks: Array<{ id: string }>,
) {
  const { data: sessions, error } = await input.supabase
    .from("study_sessions")
    .select("planner_task_id")
    .eq("assignment_id", input.assignmentId)
    .eq("user_id", input.userId);

  if (error) {
    throw new TaskRefinementError("Study progress could not be verified. The task plan was not changed.", 500);
  }
  // Older sessions have no durable task link. Preserve the whole plan rather
  // than guessing which renamed task owns that conversation.
  return new Set(sessions?.some((session) => !session.planner_task_id)
    ? tasks.map((task) => task.id)
    : (sessions ?? []).flatMap((session) => session.planner_task_id ? [session.planner_task_id] : []));
}

export async function applyAssignmentTaskRefinement(input: {
  supabase: SupabaseServerClient;
  userId: string;
  assignmentId: string;
  contextVersion: number;
  tasks: ProposedTask[];
  automatic?: boolean;
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
    .select("id, title, scheduled_date, status, source, user_edited")
    .eq("assignment_id", input.assignmentId)
    .eq("user_id", input.userId);

  if (eligibleError) {
    throw new TaskRefinementError("The planner tasks could not be verified.", 500);
  }

  const allTasks = eligibleData ?? [];
  const startedTaskIds = await loadStartedTaskIds(input, allTasks);
  if (input.automatic && (startedTaskIds.size > 0 || allTasks.some((task) =>
    task.status !== "todo" || task.user_edited || task.source !== "generic_generated"
  ))) {
    return 0;
  }
  const eligibleIds = new Set(selectRefinableAssignmentTasks(allTasks, null, startedTaskIds)
    .filter((task) => taskIds.includes(task.id)).map((task) => task.id));
  if (eligibleIds.size !== taskIds.length) {
    throw new TaskRefinementError(
      "One or more planner tasks changed. Generate the task update again.",
      409,
    );
  }

  for (const task of input.tasks) {
    const { data, error } = await input.supabase
      .from("study_plan_tasks")
      .update({
        title: task.proposedTitle.trim(),
        source: "context_generated",
        context_version: input.contextVersion,
      })
      .eq("id", task.id)
      .eq("user_id", input.userId)
      .eq("assignment_id", input.assignmentId)
      .eq("status", "todo")
      .eq("user_edited", false)
      .eq("title", allTasks.find((candidate) => candidate.id === task.id)!.title)
      .in("source", input.automatic ? ["generic_generated"] : ["generic_generated", "context_generated"])
      .select("id")
      .maybeSingle();

    if (error) {
      console.error("Planner task refinement update error:", error);
      throw new TaskRefinementError(
        "Some planner tasks could not be updated. Refresh before trying again.",
        500,
      );
    }
    if (!data) {
      throw new TaskRefinementError("A planner task changed. Refresh before trying again.", 409);
    }
  }

  return input.tasks.length;
}
