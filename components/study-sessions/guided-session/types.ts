import type { StudySession, StudySessionMessage } from "@/types/database";
import type { AssignmentProblemIndexEntry } from "@/lib/ai/studyTutorContext";
import type { TutorImageAttachment } from "@/lib/ai/tutor";

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
  problemIndex: AssignmentProblemIndexEntry[];
  studySessionGoal: {
    sessionNumber: number;
    totalSessions: number;
    percentage: number;
  } | null;
};

export type TutorMessage = StudySessionMessage & {
  attachments?: TutorImageAttachment[];
};

export type RequiredTutorResponse = {
  message: string;
  completionStatus: "in_progress" | "ready";
  completionReason: string;
  flashcardAction: "none" | "offer" | "create";
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
  files: File[];
  selectedQuote: string | null;
  setSelectedQuote: (quote: string | null) => void;
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
  attachPastedImages: (files: File[]) => void;
  removeAttachedImage: (index: number) => void;
  dismissPlanRefinement: () => void;
  sendMessage: () => Promise<void>;
  uploadAssignmentFile: (file: File | null) => Promise<void>;
  uploadStudyMaterials: (files: File[]) => Promise<void>;
  applyPlanRefinement: () => Promise<void>;
  stopTutorResponse: () => void;
  completeSession: () => Promise<void>;
};
