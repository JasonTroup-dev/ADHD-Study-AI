import { zodTextFormat } from "openai/helpers/zod";

import { runAIRequest } from "@/lib/ai/runtime";
import { getGeneratedFlashcardsSchema } from "@/lib/ai/schemas";

export type GeneratedFlashcard = {
  question: string;
  answer: string;
};

export type GenerateFlashcardsResult = {
  title: string;
  cards: GeneratedFlashcard[];
};

export async function generateFlashcardsFromText(
  text: string,
  cardCount: number,
): Promise<GenerateFlashcardsResult> {
  const schema = getGeneratedFlashcardsSchema(cardCount);
  const response = await runAIRequest(
    "flashcards",
    ({ client, model, requestOptions }) => client.responses.parse({
      model,
      input: [
        {
          role: "system",
          content: `
You generate ADHD-friendly flashcards.

Rules:
- Make exactly ${cardCount} flashcards.
- Questions should be specific.
- Answers should be short and easy to review.
- Do not include markdown except KaTeX-compatible math notation.
- Put inline math inside single dollar signs, for example $x^2$.
- Put display equations inside double dollar signs.
- Use standard KaTeX notation for chemical expressions.
- For chemistry, use notation such as \\mathrm{H_2O}; do not use \\ce.
- Do not use \\(...\\) or \\[...\\] math delimiters.
          `,
        },
        {
          role: "user",
          content: text,
        },
      ],
      text: {
        format: zodTextFormat(schema, "flashcard_deck"),
      },
    }, requestOptions),
  );

  if (!response.output_parsed) {
    throw new Error("The model did not return a flashcard deck.");
  }

  return response.output_parsed;
}
