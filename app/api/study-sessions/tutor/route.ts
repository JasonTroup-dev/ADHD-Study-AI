import {
  getStudyTutorResponse,
  type StudyTutorContext,
  type StudyTutorMessage,
} from "@/lib/ai/studySessionTutor";
import {
  MAX_TUTOR_FILES,
  MAX_TUTOR_IMAGE_BYTES,
  SUPPORTED_TUTOR_IMAGE_TYPES,
} from "@/lib/files/uploadConstraints";
import { buildAssignmentProblemIndex, MAX_STUDY_TUTOR_MESSAGES, prepareCompletedSessionContext } from "@/lib/ai/studyTutorContext";
import { createClient } from "@/lib/supabase/server";
import {
  getAssignmentStudySessionGoal,
  type AssignmentStudySessionGoal,
} from "@/lib/syllabus/studySessionTitles";

const MAX_ASSIGNMENT_CONTEXT_CHARS = 60_000;
const MAX_MATERIAL_CONTEXT_CHARS = 60_000;
const MAX_CONVERSATION_MESSAGES = MAX_STUDY_TUTOR_MESSAGES;
const MAX_MESSAGE_CHARS = 12_000;
const MAX_REQUEST_BYTES = 4 * 1024 * 1024;
const MAX_IMAGE_DATA_URL_CHARS = Math.ceil(MAX_TUTOR_IMAGE_BYTES * 4 / 3) + 64;


type AssignmentRow = {
  class_id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  extracted_text: string | null;
  classes: { name: string | null } | { name: string | null }[] | null;
};

type AssignmentMaterialRow = {
  original_file_name: string;
  extracted_text: string | null;
  scope: "assignment" | "class";
};

type ClassMaterialRow = {
  file_name: string;
  extracted_text: string | null;
};

type PlannerTaskRow = {
  id: string;
  title: string;
  status: string;
};

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BYTES) {
    return Response.json(
      { error: "The tutor message is too large. Attach fewer images and try again." },
      { status: 413 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return Response.json(
      { error: "You must be signed in to use the study tutor." },
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
    !isRecord(body)
    || typeof body.sessionId !== "string"
    || !body.sessionId
    || !Array.isArray(body.messages)
    || body.messages.length > MAX_CONVERSATION_MESSAGES
    || !body.messages.every(isStudyTutorMessage)
  ) {
    return Response.json(
      { error: "A valid study session and conversation are required." },
      { status: 400 },
    );
  }

  const { data: session, error: sessionError } = await supabase
    .from("study_sessions")
    .select("id, assignment_id, planner_task_id, title, session_type")
    .eq("id", body.sessionId)
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (sessionError) {
    console.error("Error loading study tutor session:", sessionError);
    return Response.json(
      { error: "The study session could not be loaded." },
      { status: 500 },
    );
  }

  if (!session) {
    return Response.json(
      { error: "Active study session not found." },
      { status: 404 },
    );
  }

  let assignment: AssignmentRow | null = null;
  let materials: AssignmentMaterialRow[] = [];
  let studySessionGoal: AssignmentStudySessionGoal | null = null;
  let currentTask: StudyTutorContext["currentTask"] = null;
  let completedTasks: NonNullable<StudyTutorContext["completedTasks"]> = [];
  let completedSessions: NonNullable<StudyTutorContext["completedSessions"]> = [];

  if (session.assignment_id) {
    const { data, error } = await supabase
      .from("assignments")
      .select(`
        class_id,
        title,
        description,
        due_date,
        extracted_text,
        classes (
          name
        )
      `)
      .eq("id", session.assignment_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      console.error("Error loading study tutor assignment:", error);
      return Response.json(
        { error: "The assignment context could not be loaded." },
        { status: 500 },
      );
    }

    assignment = data as AssignmentRow | null;

    if (assignment) {
      const [assignmentMaterialsResult, classMaterialsResult] = await Promise.all([
        supabase
          .from("assignment_materials")
          .select("original_file_name, extracted_text")
          .eq("assignment_id", session.assignment_id)
          .eq("user_id", user.id)
          .order("created_at", { ascending: true }),
        supabase
          .from("assignment_files")
          .select("file_name, extracted_text")
          .eq("class_id", assignment.class_id)
          .eq("user_id", user.id)
          .is("assignment_id", null)
          .order("created_at", { ascending: false }),
      ]);

      if (assignmentMaterialsResult.error) {
        console.error("Error loading assignment study materials:", assignmentMaterialsResult.error);
        return Response.json(
          { error: "The assignment study materials could not be loaded." },
          { status: 500 },
        );
      }
      if (classMaterialsResult.error) {
        console.error("Error loading class study materials:", classMaterialsResult.error);
        return Response.json(
          { error: "The class study materials could not be loaded." },
          { status: 500 },
        );
      }

      const classMaterials = (classMaterialsResult.data ?? []) as ClassMaterialRow[];
      const assignmentMaterials = assignmentMaterialsResult.data ?? [];
      materials = [
        ...classMaterials.map((material) => ({
          original_file_name: material.file_name,
          extracted_text: material.extracted_text,
          scope: "class" as const,
        })),
        ...assignmentMaterials.map((material) => ({
          original_file_name: material.original_file_name,
          extracted_text: material.extracted_text,
          scope: "assignment" as const,
        })),
      ];

      const plannerTaskId = session.planner_task_id
        ?? (typeof body.plannerTaskId === "string" ? body.plannerTaskId : null);
      const { data: taskData, error: taskError } = await supabase
        .from("study_plan_tasks")
        .select("id, title, status")
        .eq("assignment_id", session.assignment_id)
        .eq("user_id", user.id)
        .order("scheduled_date", { ascending: true })
        .order("created_at", { ascending: true });

      if (taskError) {
        console.error("Error loading study tutor study session goal:", taskError);
        return Response.json(
          { error: "The assignment study sessions could not be loaded." },
          { status: 500 },
        );
      }

      const tasks = (taskData ?? []) as PlannerTaskRow[];
      // Older sessions have no persisted link. A unique exact title match is
      // a safe fallback; do not guess from percentages or problem numbers.
      const titleMatches = tasks.filter((task) => task.title === session.title);
      currentTask = tasks.find((task) => task.id === plannerTaskId)
        ?? (!plannerTaskId && titleMatches.length === 1 ? titleMatches[0] : null);
      studySessionGoal = getAssignmentStudySessionGoal(tasks, currentTask?.id);
      completedTasks = tasks.filter((task) => task.status === "completed")
        .map(({ id, title }) => ({ id, title }));

      const { data: previousSessions, error: previousSessionsError } = await supabase
        .from("study_sessions")
        .select("title, ended_at, messages")
        .eq("assignment_id", session.assignment_id)
        .eq("user_id", user.id)
        .eq("status", "completed")
        .order("ended_at", { ascending: false })
        .limit(8);
      if (previousSessionsError) {
        console.error("Error loading prior study session progress:", previousSessionsError);
        return Response.json({ error: "Previous study progress could not be loaded. Please try again." }, { status: 500 });
      }
      completedSessions = prepareCompletedSessionContext(previousSessions ?? []);
    }
  }

  const messages = body.messages as StudyTutorMessage[];
  const tutorStartedAt = Date.now();

  console.info(JSON.stringify({
    event: "study_tutor.request.started",
    messageCount: messages.length,
    hasAssignment: Boolean(assignment),
  }));

  const abortController = new AbortController();
  const signal = AbortSignal.any([request.signal, abortController.signal]);
  const generate = async (onMessage?: (message: string) => void) => {
    const result = await getStudyTutorResponse(
      {
        sessionTitle: session.title ?? "Study session",
        sessionType: session.session_type,
        currentTask,
        completedTasks,
        completedSessions,
        assignment: assignment
          ? {
              title: assignment.title,
              description: assignment.description,
              className: getClassName(assignment.classes),
              dueDate: assignment.due_date,
              instructions: assignment.extracted_text
                ? truncateText(assignment.extracted_text)
                : null,
              materials: prepareMaterialContext(materials),
              problemIndex: buildAssignmentProblemIndex(
                prepareMaterialContext(
                  materials.filter((material) => material.scope === "assignment"),
                ),
              ),
              studySessionGoal,
            }
          : null,
      },
      messages,
      signal,
      onMessage,
    );

    console.info(JSON.stringify({
      event: "study_tutor.request.completed",
      messageCount: messages.length,
      completionStatus: result.completionStatus,
      latencyMs: Date.now() - tutorStartedAt,
    }));

    return result;
  };

  if (request.headers.get("accept")?.includes("application/x-ndjson")) {
    const encoder = new TextEncoder();
    let cancelled = false;
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const send = (event: unknown) => {
          if (!cancelled) controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        };
        try {
          const result = await generate((message) => send({ type: "message", message }));
          send({ type: "complete", ...result });
        } catch (error) {
          if (!signal.aborted) console.error("Study tutor stream error:", error);
          send({ type: "error", error: "The study tutor could not respond right now. Please try again." });
        } finally {
          if (!cancelled) controller.close();
        }
      },
      cancel() {
        cancelled = true;
        abortController.abort();
      },
    });
    return new Response(stream, {
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "X-Content-Type-Options": "nosniff",
      },
    });
  }

  try {
    return Response.json(await generate());
  } catch (error) {
    console.error(JSON.stringify({
      event: "study_tutor.request.failed",
      messageCount: messages.length,
      latencyMs: Date.now() - tutorStartedAt,
      errorName: error instanceof Error ? error.name : "UnknownError",
    }));
    console.error("Study tutor response error:", error);
    return Response.json(
      { error: "The study tutor could not respond right now." },
      { status: 500 },
    );
  }
}

function isStudyTutorMessage(value: unknown): value is StudyTutorMessage {
  return (
    isRecord(value)
    && (value.role === "user" || value.role === "assistant")
    && typeof value.content === "string"
    && value.content.length > 0
    && value.content.length <= MAX_MESSAGE_CHARS
    && (
      value.attachments === undefined
      || (
        value.role === "user"
        && Array.isArray(value.attachments)
        && value.attachments.length <= MAX_TUTOR_FILES
        && value.attachments.every(isStudyTutorImageAttachment)
      )
    )
  );
}

function isStudyTutorImageAttachment(value: unknown) {
  if (
    !isRecord(value)
    || typeof value.id !== "string"
    || typeof value.name !== "string"
    || !value.name
    || value.name.length > 255
    || value.kind !== "image"
    || typeof value.mediaType !== "string"
    || !SUPPORTED_TUTOR_IMAGE_TYPES.includes(
      value.mediaType as (typeof SUPPORTED_TUTOR_IMAGE_TYPES)[number],
    )
    || typeof value.content !== "string"
    || value.content.length > MAX_IMAGE_DATA_URL_CHARS
  ) {
    return false;
  }

  const prefix = `data:${value.mediaType};base64,`;
  if (!value.content.startsWith(prefix)) return false;
  const base64 = value.content.slice(prefix.length);
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) return false;
  const paddingBytes = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  const decodedBytes = Math.floor(base64.length * 3 / 4) - paddingBytes;
  return decodedBytes > 0 && decodedBytes <= MAX_TUTOR_IMAGE_BYTES;
}

function truncateText(value: string) {
  return value.length <= MAX_ASSIGNMENT_CONTEXT_CHARS
    ? value
    : `${value.slice(0, MAX_ASSIGNMENT_CONTEXT_CHARS)}\n\n[Assignment text truncated.]`;
}

function prepareMaterialContext(materials: AssignmentMaterialRow[]) {
  let remainingCharacters = MAX_MATERIAL_CONTEXT_CHARS;

  return materials.flatMap((material) => {
    const text = material.extracted_text?.trim();
    if (!text || remainingCharacters <= 0) return [];

    const content = text.slice(0, remainingCharacters);
    remainingCharacters -= content.length;
    return [{ name: material.original_file_name, content, scope: material.scope }];
  });
}

function getClassName(classes: AssignmentRow["classes"]) {
  if (!classes) return null;
  return Array.isArray(classes)
    ? classes[0]?.name ?? null
    : classes.name ?? null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
