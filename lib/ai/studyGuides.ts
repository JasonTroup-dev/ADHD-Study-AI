import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  maxRetries: 0,
  timeout: 4 * 60 * 1000,
});

const requiredSectionHeadings = [
  "Quick Summary",
  "Key Concepts",
  "Important Vocabulary",
  "Step-by-Step Explanation",
  "Common Mistakes",
  "Practice Questions",
  "Estimated Study Plan",
] as const;

const studyGuideInstructions = `
You create ADHD-friendly study guides from uploaded course material.

Return ONLY a complete markdown document

Rules:
- Start with a short, specific markdown title based on the material.
- Keep sections short and easy to scan.
- Use clear headings, bullets, and numbered steps where helpful.
- Avoid long paragraphs and walls of text.
- Explain concepts in plain language.
- Keep the tone encouraging, calm, and practical without sounding cheesy.
- Make the material feel manageable.
- Do not invent facts that are not supported by the source material.
- Do not wrap the markdown in a code fence.
`;

export async function generateStudyGuideFromText(
  text: string,
): Promise<string> {
  const response = await client.responses.create({
    model: "gpt-5.4-mini",
    max_output_tokens: 8_000,
    input: [
      {
        role: "system",
        content: studyGuideInstructions,
      },
      {
        role: "user",
        content: text,
      },
    ],
  });

  const content = normalizeMarkdownResponse(response.output_text);

  if (!content) {
    throw new Error("The model returned an empty study guide.");
  }

  return content;
}

function normalizeMarkdownResponse(content: string) {
  const trimmedContent = content.trim();
  const fencedMarkdown = trimmedContent.match(
    /^```(?:markdown|md)?\s*\n([\s\S]*?)\n```$/i,
  );

  return fencedMarkdown?.[1]?.trim() ?? trimmedContent;
}
