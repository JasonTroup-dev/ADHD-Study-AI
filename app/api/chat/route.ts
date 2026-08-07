import {
    getTutorResponseStream,
    type TutorAttachment,
    type TutorMessage,
} from "@/lib/ai/tutor";
import {
    MAX_TUTOR_ATTACHMENT_CHARS,
    MAX_TUTOR_FILES,
} from "@/lib/files/uploadConstraints";
import { requireUser } from "@/lib/api/requireUser";
import {
    createSafetyIdentifier,
    enforceAIQuota,
} from "@/lib/ai/requestProtection";

const MAX_TUTOR_MESSAGES = 24;
const MAX_TUTOR_CONVERSATION_CHARS = 160_000;
const MAX_TUTOR_REQUEST_BYTES = 768 * 1024;

export async function POST(req: Request) {
    const auth = await requireUser();
    if (auth instanceof Response) return auth;

    const contentLength = Number(req.headers.get("content-length") ?? 0);
    if (
        Number.isFinite(contentLength)
        && contentLength > MAX_TUTOR_REQUEST_BYTES
    ) {
        return conversationTooLargeResponse();
    }

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
        || body.messages.length > MAX_TUTOR_MESSAGES
        || !body.messages.every(isTutorMessage)
    ) {
        return Response.json(
            { error: "A non-empty messages array is required." },
            { status: 400 },
        );
    }

    if (getConversationSize(body.messages) > MAX_TUTOR_CONVERSATION_CHARS) {
        return conversationTooLargeResponse();
    }

    const quotaResponse = await enforceAIQuota(auth.supabase, "chat");
    if (quotaResponse) return quotaResponse;

    try {
        const openAIStream = await getTutorResponseStream(
            body.messages,
            req.signal,
            createSafetyIdentifier(auth.user.id),
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

function getConversationSize(messages: TutorMessage[]) {
    return messages.reduce((total, message) => {
        const attachmentCharacters = (message.attachments ?? []).reduce(
            (attachmentTotal, attachment) => (
                attachmentTotal
                + attachment.id.length
                + attachment.name.length
                + attachment.content.length
            ),
            0,
        );

        return total + message.id.length + message.content.length + attachmentCharacters;
    }, 0);
}

function conversationTooLargeResponse() {
    return Response.json(
        {
            error:
                "The conversation is too large. Start a new chat or remove older messages and attachments.",
        },
        { status: 413 },
    );
}
