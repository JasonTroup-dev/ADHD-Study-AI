import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
  const response = await client.responses.create({
    model: "gpt-5-mini",
    input: [
      {
        role: "system",
        content: `
You generate ADHD-friendly flashcards.

Return ONLY valid JSON in this format:
{
  "title": "Short deck title",
  "cards": [
    {
      "question": "Clear question",
      "answer": "Short helpful answer"
    }
  ]
}

Rules:
- Make exactly ${cardCount} flashcards.
- The cards array must contain exactly ${cardCount} items.
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
  });

  return JSON.parse(response.output_text);
}
