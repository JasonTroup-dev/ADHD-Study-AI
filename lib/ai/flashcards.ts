import { zodTextFormat } from "openai/helpers/zod";

import { normalizeMathDelimiters } from "@/lib/ai/markdownText";
import { runAIRequest } from "@/lib/ai/runtime";
import { getGeneratedFlashcardsSchema } from "@/lib/ai/schemas";

export type GeneratedFlashcard = {
  question: string;
  answer: string;
};

export type GenerateFlashcardsResult = {
  title: string;
  description: string;
  cards: GeneratedFlashcard[];
};

export async function generateFlashcardsFromText(
  text: string,
  cardCount: number,
  safetyIdentifier?: string,
): Promise<GenerateFlashcardsResult> {
  const schema = getGeneratedFlashcardsSchema(cardCount);
  const response = await runAIRequest(
    "flashcards",
    ({ client, model, requestOptions }) => client.responses.parse({
      model,
      store: false,
      safety_identifier: safetyIdentifier,
      input: [
        {
          role: "system",
          content: `
You generate ADHD-friendly flashcards.

Rules:
- Make exactly ${cardCount} flashcards.
- Write a specific title for the set.
- Write a concise one- or two-sentence description focused entirely on the subject matter.
- Name the central topics, processes, or relationships a learner will encounter.
- Begin directly with the subject matter. Do not begin with phrases such as "This set" or "These flashcards."
- Never mention the number of cards, flashcards, the deck, the set, the source document, or how the material was generated.
- Keep the description under 240 characters and avoid generic phrases such as "study material."
- Good description: "Cellular respiration, including glycolysis, the citric acid cycle, oxidative phosphorylation, ATP production, and the role of oxygen."
- Bad description: "A 20-card flashcard set that reviews cellular respiration."
- Questions should be specific.
- Answers should be short and easy to review.
- Do not include markdown except KaTeX-compatible math notation.
- Put inline math inside single dollar signs, for example $x^2$.
- Prefer inline math for short formulas and equations.
- For display equations, put the opening and closing double dollar signs on their own lines, with one uninterrupted equation line between them.
- In the structured JSON response, encode each LaTeX backslash as two backslashes. For example, write \\\\rightarrow and \\\\text in the JSON string.
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

  return {
    ...response.output_parsed,
    cards: response.output_parsed.cards.map((card) => ({
      question: normalizeMathDelimiters(card.question),
      answer: normalizeMathDelimiters(card.answer),
    })),
  };
}
