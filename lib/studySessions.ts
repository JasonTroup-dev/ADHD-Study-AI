import type { SupabaseClient } from "@supabase/supabase-js";

import { supabase } from "@/lib/supabase/client";
import type {
  StudySession,
  StudySessionInsert,
  StudySessionMessage,
  StudySessionType,
  StudySessionsDatabase,
} from "@/types/database";

const studySessionsClient =
  supabase as unknown as SupabaseClient<StudySessionsDatabase>;
const MAX_STORED_SESSION_MESSAGES = 40;
const MAX_STORED_SESSION_MESSAGE_CHARS = 12_000;

type CreateStudySessionInput = {
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
  } = await studySessionsClient.auth.getUser();

  if (error) throw new Error(error.message);
  if (!user) throw new Error("You must be signed in to use study sessions.");

  return user.id;
}

export async function createStudySession(
  input: CreateStudySessionInput,
): Promise<CreateStudySessionResult> {
  const activeSession = await getActiveStudySession();

  if (activeSession) {
    return { session: activeSession, isExisting: true };
  }

  const userId = await getCurrentUserId();
  const now = new Date().toISOString();
  const newSession: StudySessionInsert = {
    user_id: userId,
    assignment_id: input.assignmentId ?? null,
    class_id: input.classId ?? null,
    title: input.title.trim() || "Study Session",
    planned_minutes: input.plannedMinutes ?? null,
    status: "active",
    session_type: input.sessionType ?? "general_study",
    started_at: now,
    ended_at: null,
  };

  const { data, error } = await studySessionsClient
    .from("study_sessions")
    .insert(newSession)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return { session: data, isExisting: false };
}

export async function getActiveStudySession(): Promise<StudySession | null> {
  const userId = await getCurrentUserId();
  const { data, error } = await studySessionsClient
    .from("study_sessions")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active")
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
  const { data, error } = await studySessionsClient
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
  const { data, error } = await studySessionsClient
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
): Promise<CompleteStudySessionResult> {
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
  const startedAt = session.started_at
    ? new Date(session.started_at)
    : endedAt;
  const actualMinutes = Math.max(
    1,
    Math.ceil((endedAt.getTime() - startedAt.getTime()) / 60_000),
  );

  const { data, error } = await studySessionsClient
    .from("study_sessions")
    .update({
      actual_minutes: actualMinutes,
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

  if (plannerTaskId) {
    const { error: taskError } = await supabase
      .from("study_plan_tasks")
      .update({ status: "completed" })
      .eq("id", plannerTaskId)
      .eq("user_id", userId);

    taskCompletionError = taskError?.message ?? null;
  }

  if (assignmentIdToComplete) {
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

export async function cancelStudySession(
  sessionId: string,
): Promise<StudySession> {
  const userId = await getCurrentUserId();
  const now = new Date().toISOString();
  const { data, error } = await studySessionsClient
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

export async function getTodayCompletedStudySessions(): Promise<
  StudySession[]
> {
  const userId = await getCurrentUserId();
  const { start, end } = getLocalDayRange();
  const { data, error } = await studySessionsClient
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
    (total, session) => total + (session.actual_minutes ?? 0),
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

  return value
    .flatMap((message, index): StudySessionMessage[] => {
      if (!isRecord(message)) return [];

      const role =
        message.role === "user" || message.role === "assistant"
          ? message.role
          : null;
      const content =
        typeof message.content === "string"
          ? message.content.slice(0, MAX_STORED_SESSION_MESSAGE_CHARS)
          : "";
      const completionStatus =
        message.completionStatus === "in_progress"
        || message.completionStatus === "ready"
          ? message.completionStatus
          : undefined;
      const completionReason =
        typeof message.completionReason === "string"
          ? message.completionReason.slice(0, MAX_STORED_SESSION_MESSAGE_CHARS)
          : undefined;

      if (!role || !content.trim()) return [];

      return [
        {
          id:
            typeof message.id === "string" && message.id
              ? message.id
              : `study-session-message-${index}`,
          role,
          content,
          ...(completionStatus ? { completionStatus } : {}),
          ...(completionReason ? { completionReason } : {}),
        },
      ];
    })
    .slice(-MAX_STORED_SESSION_MESSAGES);
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
