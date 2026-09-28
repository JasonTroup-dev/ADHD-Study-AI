"use client";

import { useEffect, useRef, useState } from "react";
import InputBar from "@/components/ai-tutor/InputBar";
import PromptButtons from "@/components/ai-tutor/PromptButtons";
import TutorWorkspace from "@/components/ai-tutor/TutorWorkspace";
import { withTutorQuote } from "@/lib/ai/tutorQuote";
import {
    formatFileSize,
    MAX_STUDY_FILE_BYTES,
    MAX_TUTOR_FILES,
    TUTOR_ATTACHMENT_ACCEPT,
    type SupportedTutorImageType,
} from "@/lib/files/uploadConstraints";
import {
    TutorFileUploadError,
    uploadTutorFiles,
} from "@/lib/files/tutorAttachments";

type TutorAttachment = {
    id: string;
    name: string;
    content: string;
    kind: "text" | "image";
    mediaType?: SupportedTutorImageType;
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
    const [selectedQuote, setSelectedQuote] = useState<string | null>(null);
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
                setSelectedQuote(null);
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
        if (!input.trim() && files.length === 0) return;
        void runTutorTurn({
            messageContent: withTutorQuote(input.trim() || "Please help me understand the attached study materials.", selectedQuote),
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
            onAskTutor={setSelectedQuote}
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
            composer={(
                <InputBar
                    input={input}
                    setInput={setInput}
                    handleSend={handleSend}
                    onStopResponse={isLoading ? handleCancelResponse : undefined}
                    textareaRef={textareaRef}
                    selectedQuote={selectedQuote}
                    onRemoveQuote={() => setSelectedQuote(null)}
                    files={files}
                    onFilesSelected={handleFilesSelected}
                    onRemoveFile={handleRemoveFile}
                    status={loadingStatus}
                    error={composerError}
                    accept={TUTOR_ATTACHMENT_ACCEPT}
                    attachmentLabel="Attach study files or images"
                    disabled={isLoading}
                />
            )}
            emptyActions={<PromptButtons onSummarize={handleSummarizeNotes} />}
        />
    );
}
