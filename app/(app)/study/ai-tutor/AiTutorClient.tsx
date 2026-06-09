"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import InputBar from "@/components/ai-tutor/InputBar";
import PromptButtons from "@/components/ai-tutor/PromptButtons";

type Message = {
    id: string;
    role: "user" | "assistant";
    content: string;
};

export default function AiTutor() {
    const [input, setInput] = useState("");
    const [messages, setMessages] = useState<Message[]>([]);
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
        if (!input.trim() || isLoading) return;

        const newUserMessage: Message = {
            id: Date.now().toString(),
            role: "user",
            content: input,
        };

        const updatedMessages = [...messages, newUserMessage];
        const conversationForApi = updatedMessages.slice(-8);
        const assistantMessageId = `${Date.now()}-assistant`;
        const newAssistantMessage: Message = {
            id: assistantMessageId,
            role: "assistant",
            content: "",
        };
        const abortController = new AbortController();

        abortControllerRef.current = abortController;
        setMessages([...updatedMessages, newAssistantMessage]);
        setInput("");
        setIsLoading(true);

        try {
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
                                            <p>{message.content}</p>
                                        ) : !message.content && isLoading ? (
                                            <p className="mb-4 animate-pulse leading-7 text-gray-500">
                                                Thinking...
                                            </p>
                                        ) : (
                                            <ReactMarkdown
                                                components={{
                                                    h1: ({ children }) => (
                                                        <h1 className="mb-4 mt-6 text-3xl font-semibold">{children}</h1>
                                                    ),
                                                    h2: ({ children }) => (
                                                        <h2 className="mb-3 mt-5 text-2xl font-semibold">{children}</h2>
                                                    ),
                                                    h3: ({ children }) => (
                                                        <h3 className="mb-2 mt-4 text-lg font-semibold">{children}</h3>
                                                    ),
                                                    p: ({ children }) => (
                                                        <p className="mb-4 leading-7 text-gray-800">{children}</p>
                                                    ),
                                                    ul: ({ children }) => (
                                                        <ul className="mb-4 list-disc space-y-2 pl-6">{children}</ul>
                                                    ),
                                                    ol: ({ children }) => (
                                                        <ol className="mb-4 list-decimal space-y-2 pl-6">{children}</ol>
                                                    ),
                                                    li: ({ children }) => (
                                                        <li className="leading-7 text-gray-800">{children}</li>
                                                    ),
                                                    strong: ({ children }) => (
                                                        <strong className="font-semibold text-black">{children}</strong>
                                                    ),
                                                }}
                                            >
                                                {message.content}
                                            </ReactMarkdown>
                                        )}
                                    </div>
                                ))}
                            </div>

                            <div className="sticky bottom-0 bg-linear-to-t from-gray-100 via-gray-100 to-transparent pb-6 pt-4">
                                <InputBar
                                    input={input}
                                    setInput={setInput}
                                    handleSend={handleSend}
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
