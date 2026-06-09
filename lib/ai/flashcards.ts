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
    model: "gpt-5.4-mini",
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
- Do not include markdown.
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
