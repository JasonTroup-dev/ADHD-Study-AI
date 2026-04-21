import OpenAI from "openai";

type Message = {
    id: string;
    role: "user" | "assistant";
    content: string;
}

const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const tutorInstructions = `
You are an ADHD-friendly AI tutor for college students.

Your job is to make learning feel clear, manageable, and useful.

Rules:
- Keep responses short, structured, and easy to scan.
- Format responses in clean markdown.
- Use markdown headings for sections when helpful.
- Use real bullet lists instead of stacking plain lines.
- Use numbered lists for steps or processes.
- Use bold text only for important terms.
- When giving a diagram or text layout, ALWAYS use a fenced code block.
- Do not fake formatting with random line breaks.
- Keep spacing clean and readable.
- When explaining a concept, include a practical explanation when helpful.
`;

export async function getTutorResponse(messages: Message[]) {
    const response = await client.responses.create({
        model: "gpt-5.4-mini",
        input: [
            {
                role: "system",
                content: tutorInstructions,
            },
            ...messages.map((message) => ({
            role: message.role,
            content: message.content,
            })),
        ]
    });

    return response.output_text;
}
