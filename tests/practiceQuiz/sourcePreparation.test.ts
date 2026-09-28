import { describe, expect, it } from "vitest";

import {
  DIRECT_QUIZ_SOURCE_CHARS,
  MAX_QUIZ_ANALYSIS_CHUNKS,
  preparePracticeQuizSource,
} from "@/lib/practiceQuiz/sourcePreparation";

describe("preparePracticeQuizSource", () => {
  it("sends a small source directly to quiz generation", () => {
    const prepared = preparePracticeQuizSource(
      "Cell membranes are selectively permeable.",
    );

    expect(prepared.usesConceptPass).toBe(false);
    expect(prepared.chunks).toEqual([
      {
        label: "Complete source",
        text: "Cell membranes are selectively permeable.",
      },
    ]);
  });

  it("covers every section of a moderately long source", () => {
    const paragraphs = Array.from({ length: 240 }, (_, index) =>
      `Paragraph ${index}: ${String(index).padStart(3, "0")} ${"cell transport ".repeat(16)}`,
    );
    const source = paragraphs.join("\n\n");
    expect(source.length).toBeGreaterThan(DIRECT_QUIZ_SOURCE_CHARS);

    const prepared = preparePracticeQuizSource(source);
    const reconstructed = prepared.chunks.map((chunk) => chunk.text).join("\n\n");

    expect(prepared.usesConceptPass).toBe(true);
    expect(reconstructed).toContain("Paragraph 0:");
    expect(reconstructed).toContain("Paragraph 120:");
    expect(reconstructed).toContain("Paragraph 239:");
    expect(prepared.analyzedCharacterCount).toBe(prepared.originalCharacterCount);
  });

  it("samples evenly across an extremely large source without dropping the end", () => {
    const source = [
      `START ${"alpha ".repeat(10_000)}`,
      `QUARTER_TWO ${"bravo ".repeat(10_000)}`,
      `QUARTER_THREE ${"charlie ".repeat(10_000)}`,
      `END ${"delta ".repeat(10_000)}`,
    ].join("\n\n");
    const prepared = preparePracticeQuizSource(source);
    const sampledText = prepared.chunks.map((chunk) => chunk.text).join("\n");

    expect(prepared.chunks).toHaveLength(MAX_QUIZ_ANALYSIS_CHUNKS);
    expect(sampledText).toContain("START");
    expect(sampledText).toContain("bravo");
    expect(sampledText).toContain("charlie");
    expect(sampledText.trimEnd().endsWith("delta")).toBe(true);
    expect(prepared.analyzedCharacterCount).toBeLessThan(
      prepared.originalCharacterCount,
    );
  });
});
