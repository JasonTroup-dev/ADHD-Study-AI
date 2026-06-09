import {
    getTutorResponseStream,
    type TutorMessage,
} from "@/lib/ai/tutor";

export async function POST(req: Request) {
    let body: unknown;

    try {
        body = await req.json();
    } catch {
        return Response.json(
            { error: "Request body must be valid JSON." },
            { status: 400 },
        );
    }

    if (
        !isRecord(body)
        || !Array.isArray(body.messages)
        || body.messages.length === 0
        || !body.messages.every(isTutorMessage)
    ) {
        return Response.json(
            { error: "A non-empty messages array is required." },
            { status: 400 },
        );
    }

    try {
        const openAIStream = await getTutorResponseStream(
            body.messages,
            req.signal,
        );
        const encoder = new TextEncoder();

        const stream = new ReadableStream<Uint8Array>({
            async start(controller) {
                try {
                    for await (const event of openAIStream) {
                        if (event.type === "response.output_text.delta") {
                            controller.enqueue(encoder.encode(event.delta));
                        } else if (event.type === "error") {
                            throw new Error(event.message);
                        } else if (event.type === "response.failed") {
                            throw new Error(
                                event.response.error?.message
                                ?? "The AI response failed.",
                            );
                        }
                    }

                    controller.close();
                } catch (error) {
                    if (!req.signal.aborted) {
                        controller.error(error);
                    }
                }
            },
            cancel() {
                openAIStream.controller.abort();
            },
        });

        return new Response(stream, {
            headers: {
                "Cache-Control": "no-cache, no-transform",
                "Content-Type": "text/plain; charset=utf-8",
                "X-Content-Type-Options": "nosniff",
            },
        });
    } catch (error) {
        console.error("AI tutor stream error:", error);

        return Response.json(
            { error: "Failed to start the AI response." },
            { status: 500 },
        );
    }
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

function isTutorMessage(value: unknown): value is TutorMessage {
    return (
        isRecord(value)
        && typeof value.id === "string"
        && (value.role === "user" || value.role === "assistant")
        && typeof value.content === "string"
    );
}
