import { z } from "zod";

const generatedFlashcardSchema = z.strictObject({
  question: z.string().min(1).max(600),
  answer: z.string().min(1).max(1_500),
});

export function getGeneratedFlashcardsSchema(cardCount: number) {
  return z.strictObject({
    title: z.string().min(1).max(120),
    description: z
      .string()
      .min(1)
      .max(240)
      .describe(
        "A content-focused summary of the main subjects and concepts covered. Do not mention the number of cards or describe the flashcard set itself.",
      ),
    cards: z.array(generatedFlashcardSchema).length(cardCount),
  });
}

export const materialAnalysisSchema = z.strictObject({
  files: z.array(
    z.strictObject({
      fileIndex: z.number().int().min(0),
      kind: z.enum(["assignment_file", "study_material"]),
      target: z.enum(["existing_assignment", "new_assignment"]),
      assignmentId: z.string().nullable(),
      newAssignmentTitle: z.string().nullable(),
      dueDate: z.string().nullable(),
      description: z.string(),
      confidence: z.number().min(0).max(1),
      reason: z.string(),
    }),
  ),
});

export const syllabusAnalysisSchema = z.strictObject({
  course: z.strictObject({
    name: z.string().nullable(),
    classCode: z.string().nullable(),
    instructor: z.string().nullable(),
    confidence: z.number().min(0).max(1),
  }),
  matchedClassId: z.string().nullable(),
  assignments: z
    .array(
      z.strictObject({
        title: z.string(),
        kind: z.enum(["assignment", "exam", "quiz"]),
        dueDate: z.string().nullable(),
        dueDateStatus: z.enum(["explicit", "inferred", "missing"]),
        points: z.number().nullable(),
        difficulty: z.enum(["easy", "medium", "hard"]),
        confidence: z.number().min(0).max(1),
        notes: z.string(),
      }),
    )
    .max(80),
});

export const studyTutorResponseSchema = z.strictObject({
  message: z.string(),
  completionStatus: z.enum(["in_progress", "ready"]),
  completionReason: z.string(),
});
