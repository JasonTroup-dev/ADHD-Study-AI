import { describe, expect, it } from "vitest";

import { normalizeClassMaterialSuggestions } from "@/lib/ai/classMaterials";

describe("class material classification", () => {
  it("keeps a reusable equation sheet at class level despite a topical exam match", () => {
    const [suggestion] = normalizeClassMaterialSuggestions(
      {
        files: [{
          fileIndex: 0,
          kind: "study_material",
          target: "existing_assignment",
          assignmentId: "midterm-1",
          newAssignmentTitle: null,
          dueDate: "2026-09-06",
          description: "Mechanics formulas used on exams.",
          confidence: 0.88,
          reason: "Supports the Midterm Exam 1 topics.",
        }],
      },
      [{
        fileIndex: 0,
        originalFileName: "physics-cm-equations-sheet-2020.pdf",
        extension: ".pdf",
        text: "Physics C Equations Sheet - Mechanics",
      }],
      [{
        id: "midterm-1",
        title: "Midterm Exam 1",
        dueDate: "2026-09-06",
        hasAssignmentFile: false,
      }],
    );

    expect(suggestion).toMatchObject({
      kind: "study_material",
      target: "class_material",
      assignmentId: null,
      newAssignmentTitle: null,
      dueDate: null,
    });
  });

  it("does not attach an unmatched fallback file to the first assignment", () => {
    const [suggestion] = normalizeClassMaterialSuggestions(
      { files: [] },
      [{
        fileIndex: 0,
        originalFileName: "lecture-notes.pdf",
        extension: ".pdf",
        text: "Newton's laws and conservation of energy",
      }],
      [{
        id: "midterm-1",
        title: "Midterm Exam 1",
        dueDate: "2026-09-06",
        hasAssignmentFile: false,
      }],
    );

    expect(suggestion.target).toBe("class_material");
    expect(suggestion.assignmentId).toBeNull();
  });
});
