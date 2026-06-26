import { generateAssignmentGuide } from "@/lib/ai/assignmentGuide";
import { createClient } from "@/lib/supabase/server";
import { getAssignmentStudySessionGoal } from "@/lib/syllabus/studySessionTitles";

const MAX_ASSIGNMENT_CONTEXT_CHARS = 60_000;

type AssignmentRow = {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  importance: string;
  points: number | null;
  status: string;
  original_file_name: string | null;
  extracted_text: string | null;
  context_status: string;
  context_version: number;
  classes: { name: string | null } | { name: string | null }[] | null;
};

type PlannerTaskRow = {
  id: string;
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return Response.json(
      { error: "You must be signed in to start guided study." },
      { status: 401 },
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "Request body must be valid JSON." },
      { status: 400 },
    );
  }

  if (
    !isRecord(body) ||
    typeof body.sessionId !== "string" ||
    !body.sessionId
  ) {
    return Response.json(
      { error: "A study session id is required." },
      { status: 400 },
    );
  }

  const { data: session, error: sessionError } = await supabase
    .from("study_sessions")
    .select("id, assignment_id, session_type")
    .eq("id", body.sessionId)
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (sessionError) {
    console.error("Error loading assignment study session:", sessionError);
    return Response.json(
      { error: "The study session could not be loaded." },
      { status: 500 },
    );
  }

  if (!session || session.session_type !== "assignment") {
    return Response.json(
      { error: "Assignment study session not found." },
      { status: 404 },
    );
  }

  if (!session.assignment_id) {
    return Response.json(
      { error: "No assignment is linked to this study session." },
      { status: 404 },
    );
  }

  const { data, error: assignmentError } = await supabase
    .from("assignments")
    .select(`
      id,
      title,
      description,
      due_date,
      importance,
      points,
      status,
      original_file_name,
      extracted_text,
      context_status,
      context_version,
      classes (
        name
      )
    `)
    .eq("id", session.assignment_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (assignmentError) {
    console.error("Error loading guided assignment:", assignmentError);
    return Response.json(
      { error: "The assignment could not be loaded." },
      { status: 500 },
    );
  }

  if (!data) {
    return Response.json(
      { error: "Assignment not found." },
      { status: 404 },
    );
  }

  const assignment = data as AssignmentRow;
  const plannerTaskId = typeof body.plannerTaskId === "string"
    ? body.plannerTaskId
    : null;
  const { data: materialData, error: materialsError } = await supabase
    .from("assignment_materials")
    .select("id, original_file_name, extracted_text")
    .eq("assignment_id", assignment.id)
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (materialsError) {
    console.error("Error loading assignment materials:", materialsError);
    return Response.json(
      { error: "The assignment study materials could not be loaded." },
      { status: 500 },
    );
  }
  const className = getClassName(assignment.classes);
  const { data: taskData, error: taskError } = await supabase
    .from("study_plan_tasks")
    .select("id")
    .eq("assignment_id", assignment.id)
    .eq("user_id", user.id)
    .order("scheduled_date", { ascending: true })
    .order("created_at", { ascending: true });

  if (taskError) {
    console.error("Error loading assignment study session goal:", taskError);
    return Response.json(
      { error: "The assignment study sessions could not be loaded." },
      { status: 500 },
    );
  }

  const assignmentInstructions = assignment.extracted_text
    ? truncateAssignmentText(assignment.extracted_text)
    : null;
  const studySessionGoal = getAssignmentStudySessionGoal(
    (taskData ?? []) as PlannerTaskRow[],
    plannerTaskId,
  );
  const assignmentResponse = {
    id: assignment.id,
    title: assignment.title,
    description: assignment.description,
    className,
    dueDate: assignment.due_date,
    importance: assignment.importance,
    points: assignment.points,
    status: assignment.status,
    originalFileName: assignment.original_file_name,
    hasExtractedText: Boolean(assignmentInstructions),
    contextStatus: assignment.context_status,
    contextVersion: assignment.context_version,
    materials: (materialData ?? []).map((material) => ({
      id: material.id as string,
      originalFileName: material.original_file_name as string,
      hasExtractedText: Boolean(material.extracted_text),
    })),
    studySessionGoal,
  };

  if (body.generateGuide === false) {
    return Response.json({ assignment: assignmentResponse });
  }

  try {
    const guide = await generateAssignmentGuide({
      title: assignment.title,
      description: assignment.description,
      className,
      dueDate: assignment.due_date,
      importance: assignment.importance,
      points: assignment.points,
      originalFileName: assignment.original_file_name,
      assignmentInstructions,
    });

    return Response.json({
      guide,
      assignment: assignmentResponse,
    });
  } catch (error) {
    console.error("Assignment guide generation error:", error);
    return Response.json(
      {
        error:
          "Your assignment is ready, but AI guidance could not be created right now.",
        assignment: assignmentResponse,
      },
      { status: 500 },
    );
  }
}

function truncateAssignmentText(text: string) {
  if (text.length <= MAX_ASSIGNMENT_CONTEXT_CHARS) return text;

  return [
    text.slice(0, MAX_ASSIGNMENT_CONTEXT_CHARS),
    "[Assignment instructions truncated for the study session.]",
  ].join("\n\n");
}

function getClassName(
  classes: AssignmentRow["classes"],
): string | null {
  if (!classes) return null;
  return Array.isArray(classes)
    ? classes[0]?.name ?? null
    : classes.name ?? null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
