import OpenAI from "openai";

export type TutorMessage = {
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
- Format responses in clean markdown.
`;

export async function getTutorResponseStream(
    messages: TutorMessage[],
    signal?: AbortSignal,
) {
    return client.responses.create({
        model: "gpt-5.4-mini",
        stream: true,
        input: [
            {
                role: "system",
                content: tutorInstructions,
            },
            ...messages.map((message) => ({
            role: message.role,
            content: message.content,
            })),
        ],
    }, {
        signal,
    });
}
