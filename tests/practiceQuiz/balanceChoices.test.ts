import { describe, expect, it } from "vitest";

import type { PracticeQuizQuestion } from "@/lib/ai/practiceQuiz";
import { balancePracticeQuizChoices } from "@/lib/practiceQuiz/balanceChoices";

function createQuestions(count: number): PracticeQuizQuestion[] {
  return Array.from({ length: count }, (_, index) => ({
    question: `Question ${index + 1}`,
    choices: ["Correct", "Wrong 1", "Wrong 2", "Wrong 3"],
    correctChoiceIndex: 0,
    explanation: "Because it is correct.",
    topic: "Testing",
    difficulty: "foundational",
  }));
}

describe("balancePracticeQuizChoices", () => {
  it("distributes correct answers across all four positions", () => {
    const balanced = balancePracticeQuizChoices(createQuestions(10), () => 0);
    const counts = [0, 0, 0, 0];

    balanced.forEach((question) => {
      counts[question.correctChoiceIndex] += 1;
    });

    expect(counts.sort()).toEqual([2, 2, 3, 3]);
  });

  it("keeps the same correct choice after rearranging choices", () => {
    const questions = createQuestions(8).map((question, index) => ({
      ...question,
      choices: ["Wrong 1", "Wrong 2", "Correct", "Wrong 3"],
      correctChoiceIndex: index % 2 === 0 ? 2 : 0,
    }));
    questions.forEach((question, index) => {
      if (index % 2 === 1) question.choices[0] = "Correct";
    });

    const balanced = balancePracticeQuizChoices(questions, () => 0.42);

    balanced.forEach((question) => {
      expect(question.choices[question.correctChoiceIndex]).toBe("Correct");
      expect(question.choices).toHaveLength(4);
    });
  });
});
