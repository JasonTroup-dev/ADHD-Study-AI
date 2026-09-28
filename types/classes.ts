import type { ClassColor } from "@/lib/classColors";

export type ClassSummary = {
  id: string;
  name: string;
  createdAt: string;
  classCode: string;
  professorName: string;
  color: ClassColor;
  nextAssignment: {
    id: string;
    title: string;
    dueDate: string | null;
  } | null;
  progressPercent: number;
  flashcardSetCount: number;
  noteCount: number;
  sessionCount: number;
};

export type CreateClassInput = {
  name: string;
  classCode: string;
  professorName: string;
  color: ClassColor;
};
