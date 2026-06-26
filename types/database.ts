export type StudySessionStatus = "active" | "completed" | "cancelled";
export type StudySessionType =
  | "assignment"
  | "flashcards"
  | "practice_quiz"
  | "general_study";

export type StudySessionMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  completionStatus?: "in_progress" | "ready";
  completionReason?: string;
};

export type StudySession = {
  id: string;
  user_id: string;
  class_id: string | null;
  assignment_id: string | null;
  title: string | null;
  planned_minutes: number | null;
  actual_minutes: number | null;
  status: StudySessionStatus;
  session_type: StudySessionType;
  messages: StudySessionMessage[];
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
  updated_at: string;
};

export type StudySessionInsert = {
  id?: string;
  user_id: string;
  class_id?: string | null;
  assignment_id?: string | null;
  title?: string | null;
  planned_minutes?: number | null;
  actual_minutes?: number | null;
  status: StudySessionStatus;
  session_type?: StudySessionType;
  messages?: StudySessionMessage[];
  started_at?: string | null;
  ended_at?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type StudySessionUpdate = Partial<
  Omit<StudySession, "id" | "user_id" | "created_at">
>;

export type StudySessionsDatabase = {
  public: {
    Tables: {
      study_sessions: {
        Row: StudySession;
        Insert: StudySessionInsert;
        Update: StudySessionUpdate;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
