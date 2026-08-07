import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  getGeneratedFlashcardsSchema,
  materialAnalysisSchema,
  studyTutorResponseSchema,
  syllabusAnalysisSchema,
} from "@/lib/ai/schemas";

describe("AI structured output schemas", () => {
  it("requires the requested flashcard count and rejects extra keys", () => {
    const schema = getGeneratedFlashcardsSchema(2);
    const validDeck = {
      title: "Cell basics",
      description: "Core cell structures, ATP, and their roles in living systems.",
      cards: [
        { question: "What is a cell?", answer: "The basic unit of life." },
        { question: "What is ATP?", answer: "A cellular energy carrier." },
      ],
    };

    assert.equal(schema.safeParse(validDeck).success, true);
    assert.equal(
      schema.safeParse({ ...validDeck, cards: validDeck.cards.slice(0, 1) })
        .success,
      false,
    );
    assert.equal(
      schema.safeParse({ title: validDeck.title, cards: validDeck.cards })
        .success,
      false,
    );
    assert.equal(schema.safeParse({ ...validDeck, markdown: true }).success, false);
  });

  it("keeps every object schema strict", () => {
    const material = {
      files: [{
        fileIndex: 0,
        kind: "assignment_file",
        target: "new_assignment",
        assignmentId: null,
        newAssignmentTitle: "Lab report",
        dueDate: null,
        description: "",
        confidence: 0.9,
        reason: "Defines a graded report.",
      }],
    };
    assert.equal(materialAnalysisSchema.safeParse(material).success, true);
    assert.equal(
      materialAnalysisSchema.safeParse({ ...material, extra: true }).success,
      false,
    );

    const tutor = {
      message: "Start with the first small step.",
      completionStatus: "in_progress",
      completionReason: "",
    };
    assert.equal(studyTutorResponseSchema.safeParse(tutor).success, true);
    assert.equal(
      studyTutorResponseSchema.safeParse({ ...tutor, extra: true }).success,
      false,
    );

    const syllabus = {
      course: {
        name: "Cellular Biology",
        classCode: "BIO 210",
        instructor: "Mei Chen",
        confidence: 1,
      },
      matchedClassId: null,
      assignments: [],
    };
    assert.equal(syllabusAnalysisSchema.safeParse(syllabus).success, true);
    assert.equal(
      syllabusAnalysisSchema.safeParse({
        ...syllabus,
        course: { ...syllabus.course, extra: true },
      }).success,
      false,
    );
  });
});
