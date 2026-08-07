import type { NewAssignment } from "@/types/assignments";

export type ClassMaterial = {
  id: string;
  title: string;
  meta: string;
  kind: "assignment_file" | "study_material" | "note";
};

export type ClassAssignmentOption = {
  id: string;
  title: string;
  dueDate: string | null;
  hasAssignmentFile: boolean;
};

export type ClassMaterialsPanelProps = {
  classId: string;
  className: string;
  assignments: ClassAssignmentOption[];
  materials: ClassMaterial[];
};

export type AnalysisKind = "assignment_file" | "study_material";
export type AnalysisTarget = "existing_assignment" | "new_assignment";

export type AnalysisSuggestion = {
  fileIndex: number;
  originalFileName: string;
  kind: AnalysisKind;
  target: AnalysisTarget;
  assignmentId: string | null;
  newAssignmentTitle: string | null;
  dueDate: string | null;
  description: string;
  confidence: number;
  reason: string;
};

export type ConfirmationItem = AnalysisSuggestion & {
  clientId: string;
};

export type CreateAssignmentResponse = {
  assignment?: {
    id: string;
    title: string;
    due_date: string | null;
    original_file_name: string | null;
  };
  error?: string;
  warning?: string | null;
};

export type MaterialsResponse = {
  materials?: Array<{ id: string }>;
  warnings?: string[];
  error?: string;
};

export type AddAssignmentHandler = (assignment: NewAssignment) => Promise<void>;
