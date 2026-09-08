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

export function getAssignmentTaskRefinementSchema(taskCount: number) {
  return z.strictObject({
    tasks: z.array(
      z.strictObject({
        taskId: z.string().min(1),
        title: z.string().min(1).max(120),
      }),
    ).length(taskCount),
  });
}

export const practiceQuizConceptsSchema = z.strictObject({
  sectionTitle: z.string().min(1).max(160),
  concepts: z
    .array(
      z.strictObject({
        topic: z.string().min(1).max(160),
        fact: z.string().min(1).max(700),
        evidence: z.string().min(1).max(500),
        importance: z.number().int().min(1).max(3),
      }),
    )
    .min(1)
    .max(18),
});

const practiceQuizQuestionSchema = z.strictObject({
  question: z.string().min(1).max(700),
  choices: z.array(z.string().min(1).max(300)).length(4),
  correctChoiceIndex: z.number().int().min(0).max(3),
  explanation: z.string().min(1).max(700),
  topic: z.string().min(1).max(160),
  difficulty: z.enum(["foundational", "application", "challenge"]),
});

export function getPracticeQuizSchema(questionCount: number) {
  return z.strictObject({
    title: z.string().min(1).max(120),
    questions: z.array(practiceQuizQuestionSchema).length(questionCount),
  });
}

export const materialAnalysisSchema = z.strictObject({
  files: z.array(
    z.strictObject({
      fileIndex: z.number().int().min(0),
      kind: z.enum(["assignment_file", "study_material"]),
      target: z.enum([
        "class_material",
        "existing_assignment",
        "new_assignment",
      ]),
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
