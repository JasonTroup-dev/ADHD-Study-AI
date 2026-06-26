export type SyllabusAssignmentDifficulty = "easy" | "medium" | "hard";
export type SyllabusItemKind = "assignment" | "exam" | "quiz";
export type SyllabusDueDateStatus = "explicit" | "inferred" | "missing";

export type DetectedSyllabusCourse = {
  name: string | null;
  classCode: string | null;
  instructor: string | null;
  confidence: number;
};

export type SyllabusClassMatch = {
  id: string;
  name: string;
  classCode: string | null;
};

export type SyllabusAssignment = {
  title: string;
  kind: SyllabusItemKind;
  dueDate: string | null;
  dueDateStatus: SyllabusDueDateStatus;
  points: number | null;
  difficulty: SyllabusAssignmentDifficulty;
  confidence: number;
  notes: string;
};

export type StudyPlanImportSummary = {
  assignmentCount: number;
  studySessionCount: number;
  classId: string;
  className: string;
  classCreated: boolean;
};
