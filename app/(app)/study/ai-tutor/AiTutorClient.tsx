"use client";

import { useEffect, useRef, useState } from "react";
import AiMarkdown from "@/components/AiMarkdown";
import InputBar from "@/components/ai-tutor/InputBar";
import PromptButtons from "@/components/ai-tutor/PromptButtons";
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
};

export default function AiTutor() {
    const [input, setInput] = useState("");
    const [messages, setMessages] = useState<Message[]>([]);
    const [files, setFiles] = useState<File[]>([]);
    const [composerError, setComposerError] = useState<string | null>(null);
    const [loadingStatus, setLoadingStatus] = useState("Waiting for AI...");
    const [isLoading, setIsLoading] = useState(false);

    const lastAssistantRef = useRef<HTMLDivElement | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    const hasMessages = messages.length > 0;

    useEffect(() => {
        return () => {
            abortControllerRef.current?.abort();
        };
    }, []);

    useEffect(() => {
        const lastMessage = messages[messages.length - 1];

        if (lastMessage?.role === "assistant") {
            lastAssistantRef.current?.scrollIntoView({
                behavior: "smooth",
                block: "start",
            });
        }
    }, [messages]);

    async function handleSend() {
        if ((!input.trim() && files.length === 0) || isLoading) return;

        const abortController = new AbortController();
        const assistantMessageId = `${crypto.randomUUID()}-assistant`;

        abortControllerRef.current = abortController;
        setComposerError(null);
        setLoadingStatus(files.length > 0 ? "Reading attached files..." : "Waiting for AI...");
        setIsLoading(true);

        try {
            const attachments = files.length > 0
                ? await uploadTutorFiles(files, abortController.signal)
                : [];
            const messageContent = input.trim()
                || "Please help me understand the attached study materials.";
            const newUserMessage: Message = {
                id: crypto.randomUUID(),
                role: "user",
                content: messageContent,
                attachments: attachments.map((attachment) => ({
                    ...attachment,
                    id: crypto.randomUUID(),
                })),
            };
            const updatedMessages = [...messages, newUserMessage];
            const conversationForApi = updatedMessages.slice(-8);
            const newAssistantMessage: Message = {
                id: assistantMessageId,
                role: "assistant",
                content: "",
            };

            setMessages([...updatedMessages, newAssistantMessage]);
            setInput("");
            setFiles([]);
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
                    };
                })
            );
        } finally {
            if (
                abortControllerRef.current === abortController
                && !abortController.signal.aborted
            ) {
                abortControllerRef.current = null;
                setIsLoading(false);
            }
        }
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

    return (
        <div className="min-h-screen w-full flex justify-center bg-gray-100">
            <div className="min-h-screen min-w-4xl border-b-blue-500">

                {/* Center AI Response Area */}
                <div className="min-h-screen relative">
                    {!hasMessages ? (
                        <div className="min-h-screen flex items-center">
                            <div className="w-full flex flex-col items-center">
                                <header className="text-3xl">What are you working on?</header>

                                <InputBar
                                    input={input}
                                    setInput={setInput}
                                    handleSend={handleSend}
                                    files={files}
                                    onFilesSelected={handleFilesSelected}
                                    onRemoveFile={handleRemoveFile}
                                    status={loadingStatus}
                                    error={composerError}
                                    disabled={isLoading}
                                />

                                <PromptButtons />
                            </div>
                        </div>
                    ) : (
                        <div className="min-h-screen flex flex-col">
                            <div className="flex-1 pt-8">
                                {messages.map((message, index) => (
                                    <div
                                        key={message.id}
                                        ref={
                                            message.role === "assistant" && index === messages.length - 1
                                            ? lastAssistantRef
                                            : null
                                        }
                                        className={
                                            message.role === "user"
                                                ? "ml-auto mb-6 w-fit max-w-2xl rounded-3xl bg-white px-5 py-3"
                                                : "mb-4 max-w-3xl"
                                        }
                                    >
                                        {message.role === "user" ? (
                                            <>
                                                <p>{message.content}</p>
                                                {message.attachments?.length ? (
                                                    <div className="mt-3 flex flex-wrap gap-2">
                                                        {message.attachments.map((attachment) => (
                                                            <span
                                                                key={attachment.id}
                                                                className="max-w-64 truncate rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-xs text-gray-600"
                                                            >
                                                                {attachment.name}
                                                            </span>
                                                        ))}
                                                    </div>
                                                ) : null}
                                            </>
                                        ) : !message.content && isLoading ? (
                                            <p className="mb-4 animate-pulse leading-7 text-gray-500">
                                                Thinking...
                                            </p>
                                        ) : (
                                            <AiMarkdown variant="tutor">
                                                {message.content}
                                            </AiMarkdown>
                                        )}
                                    </div>
                                ))}
                            </div>

                            <div className="sticky bottom-0 bg-linear-to-t from-gray-100 via-gray-100 to-transparent pb-6 pt-4">
                                <InputBar
                                    input={input}
                                    setInput={setInput}
                                    handleSend={handleSend}
                                    files={files}
                                    onFilesSelected={handleFilesSelected}
                                    onRemoveFile={handleRemoveFile}
                                    status={loadingStatus}
                                    error={composerError}
                                    disabled={isLoading}
                                />
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
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
