import {
    getTutorResponseStream,
    type TutorAttachment,
    type TutorMessage,
} from "@/lib/ai/tutor";
import {
    MAX_TUTOR_ATTACHMENT_CHARS,
    MAX_TUTOR_FILES,
} from "@/lib/files/uploadConstraints";

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
        && value.content.length <= 20_000
        && (
            value.attachments === undefined
            || (
                value.role === "user"
                && Array.isArray(value.attachments)
                && value.attachments.length <= MAX_TUTOR_FILES
                && value.attachments.every(isTutorAttachment)
            )
        )
    );
}

function isTutorAttachment(value: unknown): value is TutorAttachment {
    return (
        isRecord(value)
        && typeof value.id === "string"
        && typeof value.name === "string"
        && value.name.length > 0
        && value.name.length <= 255
        && typeof value.content === "string"
        && value.content.length > 0
        && value.content.length <= MAX_TUTOR_ATTACHMENT_CHARS
    );
}
