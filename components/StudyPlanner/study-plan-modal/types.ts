import type { FormEvent } from "react";

import type { ClassColor } from "@/lib/classColors";
import type {
  DetectedSyllabusCourse,
  StudyPlanImportSummary,
  SyllabusAssignment,
  SyllabusClassMatch,
} from "@/types/syllabus";

export type ClassOption = { id: string; name: string };

export type StudyPlannerModalProps = {
  isOpen: boolean;
  classes: ClassOption[];
  onClose: () => void;
  onStudyPlanCreated: (summary: StudyPlanImportSummary) => void;
};

export type ReviewAssignment = SyllabusAssignment & { id: string };

export type AnalyzeResponse = {
  course?: DetectedSyllabusCourse;
  classMatch?: SyllabusClassMatch | null;
  assignments?: SyllabusAssignment[];
  originalFileName?: string;
  error?: string;
};

export type ImportResponse = Partial<StudyPlanImportSummary> & { error?: string };

export type ClassResolution = "matched" | "existing" | "create" | null;
export type StudyPlannerStep = "upload" | "review";

export type StudyPlannerModalState = {
  sourceFile: File | null;
  isDragging: boolean;
  isAnalyzing: boolean;
  uploadProgress: number;
  isImporting: boolean;
  isBusy: boolean;
  error: string | null;
  assignments: ReviewAssignment[];
  course: DetectedSyllabusCourse | null;
  classMatch: SyllabusClassMatch | null;
  classResolution: ClassResolution;
  selectedClassId: string;
  newClassName: string;
  newClassCode: string;
  newClassInstructor: string;
  newClassColor: ClassColor;
  analysisFileName: string;
  isReviewConfirmed: boolean;
  maxTasksPerDay: number;
  step: StudyPlannerStep;
};

export type StudyPlannerModalActions = {
  analyzeSyllabus: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  cancelAnalysis: () => void;
  chooseClassResolution: (resolution: ClassResolution) => void;
  closeModal: () => void;
  createStudyPlan: () => Promise<void>;
  goBack: () => void;
  removeAssignment: (id: string) => void;
  setIsDragging: (dragging: boolean) => void;
  setIsReviewConfirmed: (confirmed: boolean) => void;
  setMaxTasksPerDay: (value: number) => void;
  setNewClassCode: (value: string) => void;
  setNewClassColor: (value: ClassColor) => void;
  setNewClassInstructor: (value: string) => void;
  setNewClassName: (value: string) => void;
  setSelectedClassId: (value: string) => void;
  updateAssignment: (
    id: string,
    patch: Partial<Omit<ReviewAssignment, "id">>,
  ) => void;
  updateSourceFile: (file: File | null) => void;
};
