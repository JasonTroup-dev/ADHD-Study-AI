import { createClient } from "@/lib/supabase/server";
import { createAssignmentStudySessionTitle } from "@/lib/syllabus/studySessionTitles";

type RefinableTask = {
  id: string;
  title: string;
  scheduled_date: string;
  status: string;
  source: string;
  user_edited: boolean;
};

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id: assignmentId } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return Response.json(
      { error: "You must be signed in to refine a study plan." },
      { status: 401 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  if (!isRecord(body) || (body.action !== "preview" && body.action !== "apply")) {
    return Response.json({ error: "Choose a valid plan refinement action." }, { status: 400 });
  }

  const { data: assignment, error: assignmentError } = await supabase
    .from("assignments")
    .select("id, title, description, due_date, extracted_text, context_version")
    .eq("id", assignmentId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (assignmentError) {
    return Response.json({ error: "The assignment could not be loaded." }, { status: 500 });
  }
  if (!assignment) {
    return Response.json({ error: "Assignment not found." }, { status: 404 });
  }
  if (!assignment.extracted_text?.trim()) {
    return Response.json(
      { error: "Upload readable assignment instructions before refining the plan." },
      { status: 409 },
    );
  }

  if (body.action === "apply") {
    return applyRefinement(supabase, user.id, assignment, body);
  }

  const protectedTaskId = typeof body.protectedTaskId === "string"
    ? body.protectedTaskId
    : null;
  const today = new Date().toISOString().slice(0, 10);
  const { data: taskData, error: taskError } = await supabase
    .from("study_plan_tasks")
    .select("id, title, scheduled_date, status, source, user_edited")
    .eq("assignment_id", assignmentId)
    .eq("user_id", user.id)
    .in("source", ["generic_generated", "context_generated"])
    .order("scheduled_date", { ascending: true })
    .order("created_at", { ascending: true });

  if (taskError) {
    return Response.json({ error: "The planner tasks could not be loaded." }, { status: 500 });
  }

  const allTasks = (taskData ?? []) as RefinableTask[];
  const totalSessions = allTasks.length;
  const tasks = allTasks.flatMap((task, index) => {
    if (
      task.id === protectedTaskId
      || task.status !== "todo"
      || task.user_edited
      || task.scheduled_date < today
    ) {
      return [];
    }

    const proposedTitle = createAssignmentStudySessionTitle(
      assignment.title,
      index + 1,
      totalSessions,
    );

    return proposedTitle === task.title
      ? []
      : [{
          id: task.id,
          scheduledDate: task.scheduled_date,
          currentTitle: task.title,
          proposedTitle,
        }];
  });

  if (tasks.length === 0) {
    return Response.json({
      contextVersion: assignment.context_version,
      summary: "No future assignment study sessions need renaming.",
      tasks: [],
    });
  }

  return Response.json({
    contextVersion: assignment.context_version,
    summary: `Renaming future planner blocks as ${totalSessions} numbered study session${totalSessions === 1 ? "" : "s"}.`,
    tasks,
  });
}

async function applyRefinement(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  assignment: { id: string; context_version: number },
  body: Record<string, unknown>,
) {
  if (
    typeof body.contextVersion !== "number"
    || body.contextVersion !== assignment.context_version
    || !Array.isArray(body.tasks)
    || body.tasks.length === 0
    || !body.tasks.every(isProposedTask)
  ) {
    return Response.json(
      { error: "The assignment changed. Preview the refined plan again." },
      { status: 409 },
    );
  }

  const taskIds = body.tasks.map((task) => task.id);
  const { data: eligibleData, error: eligibleError } = await supabase
    .from("study_plan_tasks")
    .select("id")
    .eq("assignment_id", assignment.id)
    .eq("user_id", userId)
    .eq("status", "todo")
    .eq("user_edited", false)
    .in("source", ["generic_generated", "context_generated"])
    .in("id", taskIds);

  if (eligibleError) {
    return Response.json({ error: "The planner tasks could not be verified." }, { status: 500 });
  }

  const eligibleIds = new Set((eligibleData ?? []).map((task) => task.id as string));
  if (eligibleIds.size !== taskIds.length) {
    return Response.json(
      { error: "One or more planner tasks changed. Preview the plan again." },
      { status: 409 },
    );
  }

  for (const task of body.tasks) {
    const { error } = await supabase
      .from("study_plan_tasks")
      .update({
        title: task.proposedTitle.trim(),
        source: "context_generated",
        context_version: assignment.context_version,
      })
      .eq("id", task.id)
      .eq("user_id", userId);

    if (error) {
      console.error("Planner task refinement update error:", error);
      return Response.json(
        { error: "Some planner tasks could not be updated. Refresh before trying again." },
        { status: 500 },
      );
    }
  }

  return Response.json({ updatedTaskCount: body.tasks.length });
}

function isProposedTask(value: unknown): value is { id: string; proposedTitle: string } {
  return isRecord(value)
    && typeof value.id === "string"
    && typeof value.proposedTitle === "string"
    && value.proposedTitle.trim().length > 0
    && value.proposedTitle.length <= 120;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
