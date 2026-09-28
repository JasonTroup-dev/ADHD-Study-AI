import {
    getTutorResponseStream,
    type TutorAttachment,
    type TutorMessage,
} from "@/lib/ai/tutor";
import {
    MAX_TUTOR_ATTACHMENT_CHARS,
    MAX_TUTOR_FILES,
    MAX_TUTOR_IMAGE_BYTES,
    SUPPORTED_TUTOR_IMAGE_TYPES,
} from "@/lib/files/uploadConstraints";
import { requireUser } from "@/lib/api/requireUser";
import {
    createSafetyIdentifier,
    enforceAIQuota,
} from "@/lib/ai/requestProtection";

const MAX_TUTOR_MESSAGES = 24;
const MAX_TUTOR_CONVERSATION_CHARS = 160_000;
const MAX_TUTOR_REQUEST_BYTES = 4 * 1024 * 1024;
const MAX_TUTOR_IMAGE_DATA_URL_CHARS = Math.ceil(
    MAX_TUTOR_IMAGE_BYTES * 4 / 3,
) + 64;
const MAX_TUTOR_IMAGE_PAYLOAD_CHARS =
    MAX_TUTOR_IMAGE_DATA_URL_CHARS * MAX_TUTOR_FILES;

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

    if (
        getConversationSize(body.messages) > MAX_TUTOR_CONVERSATION_CHARS
        || getImagePayloadSize(body.messages) > MAX_TUTOR_IMAGE_PAYLOAD_CHARS
    ) {
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
    if (
        !(
        isRecord(value)
        && typeof value.id === "string"
        && typeof value.name === "string"
        && value.name.length > 0
        && value.name.length <= 255
        && (value.kind === "text" || value.kind === "image")
        && typeof value.content === "string"
        && value.content.length > 0
        )
    ) {
        return false;
    }

    if (value.kind === "text") {
        return value.content.length <= MAX_TUTOR_ATTACHMENT_CHARS;
    }

    return (
        typeof value.mediaType === "string"
        && SUPPORTED_TUTOR_IMAGE_TYPES.includes(
            value.mediaType as (typeof SUPPORTED_TUTOR_IMAGE_TYPES)[number],
        )
        && value.content.length <= MAX_TUTOR_IMAGE_DATA_URL_CHARS
        && isValidTutorImageDataUrl(value.content, value.mediaType)
    );
}

function isValidTutorImageDataUrl(content: string, mediaType: string) {
    const prefix = `data:${mediaType};base64,`;
    if (!content.startsWith(prefix)) return false;

    const base64 = content.slice(prefix.length);
    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) return false;

    const paddingBytes = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
    const decodedBytes = Math.floor(base64.length * 3 / 4) - paddingBytes;
    return decodedBytes > 0 && decodedBytes <= MAX_TUTOR_IMAGE_BYTES;
}

function getConversationSize(messages: TutorMessage[]) {
    return messages.reduce((total, message) => {
        const attachmentCharacters = (message.attachments ?? []).reduce(
            (attachmentTotal, attachment) => (
                attachmentTotal
                + attachment.id.length
                + attachment.name.length
                + (attachment.kind === "text" ? attachment.content.length : 0)
            ),
            0,
        );

        return total + message.id.length + message.content.length + attachmentCharacters;
    }, 0);
}

function getImagePayloadSize(messages: TutorMessage[]) {
    return messages.reduce(
        (messageTotal, message) => messageTotal + (message.attachments ?? []).reduce(
            (attachmentTotal, attachment) => attachmentTotal
                + (attachment.kind === "image" ? attachment.content.length : 0),
            0,
        ),
        0,
    );
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
