import { supabase } from "@/lib/supabase/client";
import { retainStudyTutorMessages } from "@/lib/ai/studyTutorContext";
import { confirmedStudyMinutes, parseStudyMinutes } from "@/lib/studyTime";
import type {
  StudySession,
  StudySessionInsert,
  StudySessionMessage,
  StudySessionType,
} from "@/types/database";

const MAX_STORED_SESSION_MESSAGE_CHARS = 12_000;
const HIGH_SURROGATE_START = 0xd800;
const HIGH_SURROGATE_END = 0xdbff;
const LOW_SURROGATE_START = 0xdc00;
const LOW_SURROGATE_END = 0xdfff;

type CreateStudySessionInput = {
  plannerTaskId?: string | null;
  assignmentId?: string | null;
  classId?: string | null;
  title: string;
  plannedMinutes?: number | null;
  sessionType?: StudySessionType;
};

export type CreateStudySessionResult = {
  session: StudySession;
  isExisting: boolean;
};

export type CompleteStudySessionResult = {
  session: StudySession;
  taskCompletionError: string | null;
  assignmentCompletionError: string | null;
};

async function getCurrentUserId() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) throw new Error(error.message);
  if (!user) throw new Error("You must be signed in to use study sessions.");

  return user.id;
}

export async function createStudySession(
  input: CreateStudySessionInput,
): Promise<CreateStudySessionResult> {
  const activeSession = await getActiveStudySession(input);

  if (activeSession) {
    return { session: activeSession, isExisting: true };
  }

  const userId = await getCurrentUserId();
  const now = new Date().toISOString();
  const newSession: StudySessionInsert = {
    user_id: userId,
    planner_task_id: input.plannerTaskId ?? null,
    assignment_id: input.assignmentId ?? null,
    class_id: input.classId ?? null,
    title: input.title.trim() || "Study Session",
    planned_minutes: input.plannedMinutes ?? null,
    status: "active",
    session_type: input.sessionType ?? "general_study",
    started_at: now,
    ended_at: null,
  };

  const { data, error } = await supabase
    .from("study_sessions")
    .insert(newSession)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return { session: data, isExisting: false };
}

export async function getActiveStudySession(
  input?: CreateStudySessionInput,
): Promise<StudySession | null> {
  const userId = await getCurrentUserId();
  let query = supabase
    .from("study_sessions")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active");

  if (input?.plannerTaskId) {
    // A different task's active conversation must never capture this click.
    query = query.eq("planner_task_id", input.plannerTaskId);
  } else if (input) {
    query = query
      .is("planner_task_id", null)
      .eq("session_type", input.sessionType ?? "general_study")
      .eq("title", input.title.trim() || "Study Session");
    query = input.assignmentId
      ? query.eq("assignment_id", input.assignmentId)
      : query.is("assignment_id", null);
    query = input.classId
      ? query.eq("class_id", input.classId)
      : query.is("class_id", null);
  }

  const { data, error } = await query
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

export async function getStudySessionById(
  sessionId: string,
): Promise<StudySession | null> {
  const userId = await getCurrentUserId();
  const { data, error } = await supabase
    .from("study_sessions")
    .select("*")
    .eq("id", sessionId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

export async function saveStudySessionMessages(
  sessionId: string,
  messages: StudySessionMessage[],
): Promise<void> {
  const userId = await getCurrentUserId();
  const normalizedMessages = normalizeStudySessionMessages(messages);
  const { data, error } = await supabase
    .from("study_sessions")
    .update({
      messages: normalizedMessages,
      updated_at: new Date().toISOString(),
    })
    .eq("id", sessionId)
    .eq("user_id", userId)
    .eq("status", "active")
    .select("id")
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Active study session not found.");
}

export async function completeStudySession(
  sessionId: string,
  plannerTaskId?: string | null,
  assignmentIdToComplete?: string | null,
  studyMinutes: string = "",
): Promise<CompleteStudySessionResult> {
  const actualMinutes = parseStudyMinutes(studyMinutes);
  const userId = await getCurrentUserId();
  const session = await getStudySessionById(sessionId);

  if (!session) throw new Error("Study session not found.");
  if (session.status === "completed") {
    return {
      session,
      taskCompletionError: null,
      assignmentCompletionError: null,
    };
  }
  if (session.status !== "active") {
    throw new Error("Only an active study session can be completed.");
  }

  const endedAt = new Date();

  const { data, error } = await supabase
    .from("study_sessions")
    .update({
      actual_minutes: actualMinutes,
      time_confirmed_at: actualMinutes === null ? null : endedAt.toISOString(),
      ended_at: endedAt.toISOString(),
      status: "completed",
      updated_at: endedAt.toISOString(),
    })
    .eq("id", sessionId)
    .eq("user_id", userId)
    .eq("status", "active")
    .select("*")
    .single();

  if (error) throw new Error(error.message);

  let taskCompletionError: string | null = null;
  let assignmentCompletionError: string | null = null;

  const linkedTaskId = session.planner_task_id ?? plannerTaskId;
  if (linkedTaskId) {
    const { error: taskError } = await supabase
      .from("study_plan_tasks")
      .update({ status: "completed" })
      .eq("id", linkedTaskId)
      .eq("user_id", userId);

    taskCompletionError = taskError?.message ?? null;
  }

  // Linked task sessions derive their assignment status from all sibling tasks.
  // Only assignment-level sessions may explicitly complete the whole assignment.
  if (assignmentIdToComplete && !linkedTaskId) {
    const { error: assignmentError } = await supabase
      .from("assignments")
      .update({ status: "completed" })
      .eq("id", assignmentIdToComplete)
      .eq("user_id", userId);

    assignmentCompletionError = assignmentError?.message ?? null;
  }

  return {
    session: data,
    taskCompletionError,
    assignmentCompletionError,
  };
}

export async function updateStudySessionTime(sessionId: string, value: string): Promise<StudySession> {
  const minutes = parseStudyMinutes(value);
  const userId = await getCurrentUserId();
  const now = new Date().toISOString();
  const { data, error } = await supabase.from("study_sessions")
    .update({ actual_minutes: minutes, time_confirmed_at: minutes === null ? null : now, updated_at: now })
    .eq("id", sessionId).eq("user_id", userId).eq("status", "completed")
    .select("*").single();
  if (error) throw new Error(error.message);
  return data;
}

export async function cancelStudySession(
  sessionId: string,
): Promise<StudySession> {
  const userId = await getCurrentUserId();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("study_sessions")
    .update({
      status: "cancelled",
      ended_at: now,
      updated_at: now,
    })
    .eq("id", sessionId)
    .eq("user_id", userId)
    .eq("status", "active")
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function resetStudySessionTask(
  plannerTaskId: string,
): Promise<{ clearedSessionIds: string[] }> {
  const userId = await getCurrentUserId();
  const { data, error } = await supabase
    .from("study_plan_tasks")
    .update({ status: "todo" })
    .eq("id", plannerTaskId)
    .eq("user_id", userId)
    .select("id")
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Study session task not found.");

  const now = new Date().toISOString();
  const { data: clearedSessions, error: activeSessionError } =
    await supabase
      .from("study_sessions")
      .update({
        actual_minutes: null,
        ended_at: now,
        messages: [],
        status: "cancelled",
        updated_at: now,
      })
      .eq("user_id", userId)
      .eq("planner_task_id", plannerTaskId)
      .eq("status", "active")
      .select("id");

  if (activeSessionError) throw new Error(activeSessionError.message);
  return {
    clearedSessionIds: clearedSessions.map((session) => session.id),
  };
}

export async function getTodayCompletedStudySessions(): Promise<
  StudySession[]
> {
  const userId = await getCurrentUserId();
  const { start, end } = getLocalDayRange();
  const { data, error } = await supabase
    .from("study_sessions")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "completed")
    .gte("ended_at", start)
    .lt("ended_at", end)
    .order("ended_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data;
}

export async function getTodayTotalStudyMinutes(
  sessions?: StudySession[],
): Promise<number> {
  const completedSessions =
    sessions ?? (await getTodayCompletedStudySessions());

  return completedSessions.reduce(
    (total, session) => total + confirmedStudyMinutes(session),
    0,
  );
}

export function getSessionTypeLabel(sessionType: StudySessionType) {
  const labels: Record<StudySessionType, string> = {
    assignment: "Assignment",
    flashcards: "Flashcards",
    practice_quiz: "Practice quiz",
    general_study: "General study",
  };

  return labels[sessionType];
}

export function inferTaskSessionType(title: string): StudySessionType {
  const normalizedTitle = title.toLowerCase();

  if (normalizedTitle.includes("flashcard")) return "flashcards";
  if (normalizedTitle.includes("quiz")) {
    return "practice_quiz";
  }

  return "assignment";
}

export function normalizeStudySessionMessages(
  value: unknown,
): StudySessionMessage[] {
  if (!Array.isArray(value)) return [];

  return retainStudyTutorMessages(value
    .flatMap((message, index): StudySessionMessage[] => {
      if (!isRecord(message)) return [];

      const role =
        message.role === "user" || message.role === "assistant"
          ? message.role
          : null;
      const content =
        typeof message.content === "string"
          ? normalizePostgresText(
              message.content,
              MAX_STORED_SESSION_MESSAGE_CHARS,
            )
          : "";
      const completionStatus =
        message.completionStatus === "in_progress"
        || message.completionStatus === "ready"
          ? message.completionStatus
          : undefined;
      const completionReason =
        typeof message.completionReason === "string"
          ? normalizePostgresText(
              message.completionReason,
              MAX_STORED_SESSION_MESSAGE_CHARS,
            )
          : undefined;

      if (!role || !content.trim()) return [];

      return [
        {
          id:
            typeof message.id === "string" && message.id
              ? normalizePostgresText(message.id) || `study-session-message-${index}`
              : `study-session-message-${index}`,
          role,
          content,
          ...(completionStatus ? { completionStatus } : {}),
          ...(completionReason ? { completionReason } : {}),
        },
      ];
    }));
}

function normalizePostgresText(value: string, maxLength = value.length) {
  let normalized = "";

  for (let index = 0; index < value.length && normalized.length < maxLength; index += 1) {
    const codeUnit = value.charCodeAt(index);

    // PostgreSQL text/jsonb cannot store U+0000.
    if (codeUnit === 0) continue;

    if (codeUnit >= HIGH_SURROGATE_START && codeUnit <= HIGH_SURROGATE_END) {
      const nextCodeUnit = value.charCodeAt(index + 1);
      const hasLowSurrogate =
        nextCodeUnit >= LOW_SURROGATE_START
        && nextCodeUnit <= LOW_SURROGATE_END;

      if (hasLowSurrogate) {
        if (normalized.length + 2 > maxLength) break;
        normalized += value[index] + value[index + 1];
        index += 1;
      } else {
        normalized += "\uFFFD";
      }
      continue;
    }

    normalized +=
      codeUnit >= LOW_SURROGATE_START && codeUnit <= LOW_SURROGATE_END
        ? "\uFFFD"
        : value[index];
  }

  return normalized;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getLocalDayRange(date = new Date()) {
  const start = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  );
  const end = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate() + 1,
  );

  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}
