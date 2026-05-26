import { getTutorResponse } from "@/lib/ai/tutor";

export async function POST(req: Request) {

    const body = await req.json();
    const messages = body.messages;

    const reply = await getTutorResponse(messages);

    return Response.json({ reply });
}