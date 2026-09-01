import type { PracticeQuizQuestion } from "@/lib/ai/practiceQuiz";

type RandomSource = () => number;

export function balancePracticeQuizChoices(
  questions: PracticeQuizQuestion[],
  random: RandomSource = Math.random,
): PracticeQuizQuestion[] {
  const targetPositions = shuffle(
    questions.map((_, index) => index % 4),
    random,
  );

  return questions.map((question, questionIndex) => {
    const correctChoice = question.choices[question.correctChoiceIndex];
    if (correctChoice === undefined) return question;

    const distractors = shuffle(
      question.choices.filter(
        (_, choiceIndex) => choiceIndex !== question.correctChoiceIndex,
      ),
      random,
    );
    const correctChoiceIndex = targetPositions[questionIndex] ?? 0;
    const choices = [...distractors];
    choices.splice(correctChoiceIndex, 0, correctChoice);

    return {
      ...question,
      choices,
      correctChoiceIndex,
    };
  });
}

function shuffle<T>(items: T[], random: RandomSource): T[] {
  const shuffled = [...items];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(clampRandom(random()) * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [
      shuffled[randomIndex],
      shuffled[index],
    ];
  }

  return shuffled;
}

function clampRandom(value: number) {
  if (!Number.isFinite(value) || value <= 0) return 0;
  if (value >= 1) return 1 - Number.EPSILON;
  return value;
}
