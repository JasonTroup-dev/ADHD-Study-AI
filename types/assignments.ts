import type { ClassColor } from "@/lib/classColors";

export type AssignmentImportance = "low" | "medium" | "high" | "critical";
export type AssignmentStatus =
  | "not_started"
  | "in_progress"
  | "completed";
export type AssignmentContextStatus =
  | "missing"
  | "processing"
  | "ready"
  | "failed";

export type AssignmentClass = {
  name: string;
  color: ClassColor | null;
};

export type Assignment = {
  id: string;
  user_id: string;
  class_id: string | null;
  title: string;
  description: string | null;
  due_date: string | null;
  importance: AssignmentImportance;
  points: number | null;
  status: AssignmentStatus;
  original_file_name: string | null;
  file_type: string | null;
  file_size_bytes: number | null;
  storage_path: string | null;
  extracted_text: string | null;
  context_status: AssignmentContextStatus;
  context_version: number;
  created_at: string;
  updated_at: string;
  classes: AssignmentClass | AssignmentClass[] | null;
};

export type AssignmentClassOption = {
  id: string;
  name: string;
  color: ClassColor | null;
};

export type NewAssignment = {
  title: string;
  classId: string | null;
  description: string | null;
  dueDate: string;
  importance: AssignmentImportance;
  points: number | null;
  file: File | null;
  materials: File[];
};
