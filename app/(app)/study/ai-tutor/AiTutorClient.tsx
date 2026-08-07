"use client";

import { useEffect, useRef, useState } from "react";
import InputBar from "@/components/ai-tutor/InputBar";
import PromptButtons from "@/components/ai-tutor/PromptButtons";
import TutorWorkspace from "@/components/ai-tutor/TutorWorkspace";
import {
    formatFileSize,
    MAX_STUDY_FILE_BYTES,
    MAX_TUTOR_FILES,
} from "@/lib/files/uploadConstraints";

type TutorAttachment = {
    id: string;
    name: string;
    content: string;
};

type Message = {
    id: string;
    role: "user" | "assistant";
    content: string;
    attachments?: TutorAttachment[];
    deliveryState?: "cancelled" | "error";
};

export default function AiTutor() {
    const [input, setInput] = useState("");
    const [messages, setMessages] = useState<Message[]>([]);
    const [files, setFiles] = useState<File[]>([]);
    const [composerError, setComposerError] = useState<string | null>(null);
    const [loadingStatus, setLoadingStatus] = useState("Waiting for AI...");
    const [isLoading, setIsLoading] = useState(false);

    const abortControllerRef = useRef<AbortController | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);

    useEffect(() => {
        return () => {
            const abortController = abortControllerRef.current;
            abortControllerRef.current = null;
            abortController?.abort();
        };
    }, []);

    async function runTutorTurn({
        messageContent,
        sourceFiles = [],
        existingAttachments = [],
        baseMessages = messages,
        clearComposer = false,
    }: {
        messageContent: string;
        sourceFiles?: File[];
        existingAttachments?: TutorAttachment[];
        baseMessages?: Message[];
        clearComposer?: boolean;
    }) {
        if ((!messageContent.trim() && sourceFiles.length === 0) || isLoading) return;

        const abortController = new AbortController();
        const assistantMessageId = `${crypto.randomUUID()}-assistant`;

        abortControllerRef.current = abortController;
        setComposerError(null);
        setLoadingStatus(sourceFiles.length > 0 ? "Reading attached files..." : "Waiting for AI...");
        setIsLoading(true);

        try {
            const uploadedAttachments = sourceFiles.length > 0
                ? await uploadTutorFiles(sourceFiles, abortController.signal)
                : [];
            const attachments = sourceFiles.length > 0
                ? uploadedAttachments.map((attachment) => ({
                    ...attachment,
                    id: crypto.randomUUID(),
                }))
                : existingAttachments;
            const normalizedContent = messageContent.trim()
                || "Please help me understand the attached study materials.";
            const newUserMessage: Message = {
                id: crypto.randomUUID(),
                role: "user",
                content: normalizedContent,
                attachments,
            };
            const updatedMessages = [...baseMessages, newUserMessage];
            const conversationForApi = updatedMessages.slice(-8);
            const newAssistantMessage: Message = {
                id: assistantMessageId,
                role: "assistant",
                content: "",
            };

            setMessages([...updatedMessages, newAssistantMessage]);
            if (clearComposer) {
                setInput("");
                setFiles([]);
            }
            setLoadingStatus("Waiting for AI...");

            const response = await fetch("/api/chat", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ messages: conversationForApi }),
                signal: abortController.signal,
            });

            if (!response.ok) {
                throw new Error("Failed to get AI response");
            }

            if (!response.body) {
                throw new Error("The AI response did not include a stream");
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let receivedText = false;

            while (true) {
                const { done, value } = await reader.read();

                if (done) break;

                const chunk = decoder.decode(value, { stream: true });

                if (!chunk) continue;

                receivedText = true;
                setMessages((prev) =>
                    prev.map((message) =>
                        message.id === assistantMessageId
                            ? { ...message, content: message.content + chunk }
                            : message
                    )
                );
            }

            const finalChunk = decoder.decode();

            if (finalChunk) {
                receivedText = true;
                setMessages((prev) =>
                    prev.map((message) =>
                        message.id === assistantMessageId
                            ? { ...message, content: message.content + finalChunk }
                            : message
                    )
                );
            }

            if (!receivedText) {
                throw new Error("The AI response stream was empty");
            }
        } catch (error) {
            if (abortController.signal.aborted) {
                setMessages((currentMessages) =>
                    currentMessages.map((message) =>
                        message.id === assistantMessageId
                            ? {
                                ...message,
                                content: message.content
                                    ? `${message.content}\n\n*Response stopped. You can retry.*`
                                    : "Response stopped. You can retry.",
                                deliveryState: "cancelled",
                            }
                            : message,
                    ),
                );
                return;
            }

            console.error("handleSend error:", error);

            if (error instanceof TutorFileUploadError) {
                setComposerError(error.message);
                return;
            }

            setMessages((prev) =>
                prev.map((message) => {
                    if (message.id !== assistantMessageId) return message;

                    const errorText = message.content
                        ? "\n\n*The response was interrupted. Please try again.*"
                        : "Something went wrong while getting a response. Please try again.";

                    return {
                        ...message,
                        content: message.content + errorText,
                        deliveryState: "error",
                    };
                })
            );
        } finally {
            if (
                abortControllerRef.current === abortController
            ) {
                abortControllerRef.current = null;
                setIsLoading(false);
            }
        }
    }

    function handleSend() {
        void runTutorTurn({
            messageContent: input,
            sourceFiles: files,
            clearComposer: true,
        });
    }

    function handleCancelResponse() {
        abortControllerRef.current?.abort();
    }

    function handleRetryResponse(index: number) {
        const userMessage = messages[index - 1];

        if (!userMessage || userMessage.role !== "user") return;

        void runTutorTurn({
            messageContent: userMessage.content,
            existingAttachments: userMessage.attachments ?? [],
            baseMessages: messages.slice(0, index - 1),
        });
    }

    function handleFilesSelected(selectedFiles: File[]) {
        const nextFiles = [...files, ...selectedFiles];

        if (nextFiles.length > MAX_TUTOR_FILES) {
            setComposerError(`Attach no more than ${MAX_TUTOR_FILES} files at a time.`);
            return;
        }

        const totalBytes = nextFiles.reduce((sum, file) => sum + file.size, 0);

        if (totalBytes > MAX_STUDY_FILE_BYTES) {
            setComposerError(
                `Attachments can be up to ${formatFileSize(MAX_STUDY_FILE_BYTES)} total.`,
            );
            return;
        }

        setComposerError(null);
        setFiles(nextFiles);
    }

    function handleRemoveFile(index: number) {
        setComposerError(null);
        setFiles((currentFiles) =>
            currentFiles.filter((_, fileIndex) => fileIndex !== index)
        );
    }

    function handleSummarizeNotes() {
        setInput("Summarize the notes I attach into the main ideas and key takeaways.");
        requestAnimationFrame(() => textareaRef.current?.focus());
    }

    return (
        <TutorWorkspace
            messages={messages}
            isLoading={isLoading}
            messageActions={(message, index) =>
                message.role === "assistant" && message.deliveryState ? (
                    <button
                        type="button"
                        onClick={() => handleRetryResponse(index)}
                        className="rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800 transition hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                    >
                        Retry response
                    </button>
                ) : null
            }
            composerHeader={isLoading ? (
                <div className="mx-auto flex w-full max-w-2xl justify-end px-3 lg:max-w-xl xl:max-w-4xl">
                    <button
                        type="button"
                        onClick={handleCancelResponse}
                        className="rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800 shadow-sm transition hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                    >
                        Stop response
                    </button>
                </div>
            ) : null}
            composer={(
                <InputBar
                    input={input}
                    setInput={setInput}
                    handleSend={handleSend}
                    textareaRef={textareaRef}
                    files={files}
                    onFilesSelected={handleFilesSelected}
                    onRemoveFile={handleRemoveFile}
                    status={loadingStatus}
                    error={composerError}
                    disabled={isLoading}
                />
            )}
            emptyActions={<PromptButtons onSummarize={handleSummarizeNotes} />}
        />
    );
}

type UploadedTutorAttachment = {
    name: string;
    content: string;
};

class TutorFileUploadError extends Error {}

async function uploadTutorFiles(
    files: File[],
    signal: AbortSignal,
): Promise<UploadedTutorAttachment[]> {
    const formData = new FormData();

    files.forEach((file) => {
        formData.append("files", file);
    });

    const response = await fetch("/api/chat/files", {
        method: "POST",
        body: formData,
        signal,
    });
    const payload = await readJsonResponse(response);

    if (!response.ok) {
        throw new TutorFileUploadError(
            typeof payload.error === "string"
                ? payload.error
                : "Could not read the attached files.",
        );
    }

    if (
        !Array.isArray(payload.attachments)
        || !payload.attachments.every(isUploadedTutorAttachment)
    ) {
        throw new TutorFileUploadError(
            "The file upload response was incomplete.",
        );
    }

    return payload.attachments;
}

async function readJsonResponse(response: Response): Promise<Record<string, unknown>> {
    try {
        const payload = await response.json();
        return typeof payload === "object" && payload !== null
            ? payload as Record<string, unknown>
            : {};
    } catch {
        return {};
    }
}

function isUploadedTutorAttachment(
    value: unknown,
): value is UploadedTutorAttachment {
    return (
        typeof value === "object"
        && value !== null
        && "name" in value
        && typeof value.name === "string"
        && "content" in value
        && typeof value.content === "string"
    );
}
