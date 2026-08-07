import type { StudySession, StudySessionMessage } from "@/types/database";

export type GuidedStudySessionProps = {
  session: StudySession;
  plannerTaskId?: string | null;
};

export type AssignmentSessionContext = {
  id: string;
  title: string;
  description: string | null;
  className: string | null;
  dueDate: string | null;
  importance: string;
  points: number | null;
  status: string;
  originalFileName: string | null;
  hasExtractedText: boolean;
  contextStatus: string;
  contextVersion: number;
  materials: Array<{
    id: string;
    originalFileName: string;
    hasExtractedText: boolean;
  }>;
  studySessionGoal: {
    sessionNumber: number;
    totalSessions: number;
    percentage: number;
  } | null;
};

export type TutorMessage = StudySessionMessage;

export type RequiredTutorResponse = {
  message: string;
  completionStatus: "in_progress" | "ready";
  completionReason: string;
};

export type PlanRefinement = {
  contextVersion: number;
  summary: string;
  tasks: Array<{
    id: string;
    scheduledDate: string;
    currentTitle: string;
    proposedTitle: string;
  }>;
};

export type GuidedSessionController = {
  assignment: AssignmentSessionContext | null;
  messages: TutorMessage[];
  input: string;
  contextError: string | null;
  tutorError: string | null;
  uploadNotice: string | null;
  isContextLoading: boolean;
  isTutorLoading: boolean;
  isUploading: boolean;
  isPlanLoading: boolean;
  isPlanApplying: boolean;
  planRefinement: PlanRefinement | null;
  isCompleting: boolean;
  completionUnlocked: boolean;
  completionReason: string;
  setInput: (value: string) => void;
  dismissPlanRefinement: () => void;
  sendMessage: () => Promise<void>;
  uploadAssignmentFile: (file: File | null) => Promise<void>;
  uploadStudyMaterials: (files: File[]) => Promise<void>;
  applyPlanRefinement: () => Promise<void>;
  completeSession: () => Promise<void>;
};
