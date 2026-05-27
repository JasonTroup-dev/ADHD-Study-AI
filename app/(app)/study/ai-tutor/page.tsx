"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";

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

        setMessages(updatedMessages);
        setInput("");
        setIsLoading(true);

        try {
            const response = await fetch("/api/chat", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ messages: conversationForApi }),
            });

            if (!response.ok) {
                throw new Error("Failed to get AI response");
            }

            const data = await response.json();

            const newAssistantMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: "assistant",
                content: data.reply,
            };

            setMessages((prev) => [...prev, newAssistantMessage]);
        } catch (error) {
            console.error("handleSend error:", error);

            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: "assistant",
                content: "Something went wrong while getting a response. Please try again.",
            };

            setMessages((prev) => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="flex h-screen w-full flex-col items-center overflow-hidden bg-gray-100">
            <div className="flex items-center justify-center border border-red-500 px-4 py-2">
                <h1 className="text-2xl font-semibold">AI Tutor</h1>
            </div>

            <div className="flex h-full min-h-0 w-6/12 flex-col border border-green-600">
                <div className="flex-1 min-h-0 overflow-y-auto border border-amber-300 p-4">
                    {messages.map((message) => (
                        <div 
                            key={message.id}
                            ref={
                                message.role === "assistant" &&
                                message.id === messages[messages.length - 1]?.id
                                    ? lastAssistantRef
                                    : null
                            }
                            className="mb-4"
                        >
                            <p className="mb-1 text-sm font-semibold text-gray-600">
                                {message.role === "user" ? "You" : "AI"}
                            </p>

                            <div 
                                className={`rounded-lg border p-4 ${message.role === "user" ? "bg-gray-100" : "bg-white"}`}>
                                
                                <ReactMarkdown
                                    components={{
                                        h1: ({ children }) => (
                                            <h1 className="mb-3 text-2xl font-bold">{children}</h1>
                                        ),
                                        h2: ({ children }) => (
                                            <h2 className="mb-2 mt-4 text-xl font-semibold">{children}</h2>
                                        ),
                                        h3: ({ children }) => (
                                            <h3 className="mb-2 mt-3 text-lg font-semibold">{children}</h3>
                                        ),
                                        p: ({ children }) => (
                                            <p className="mb-3 leading-7">{children}</p>
                                        ),
                                        ul: ({ children }) => (
                                            <ul className="mb-3 list-disc pl-6">{children}</ul>
                                        ),
                                        ol: ({ children }) => (
                                            <ol className="mb-3 list-decimal pl-6">{children}</ol>
                                        ),
                                        li: ({ children }) => (
                                            <li className="mb-1">{children}</li>
                                        ),
                                        code: ({ children, className }) => {
                                            const isBlock = className?.includes("language-");

                                            if (isBlock) {
                                                return (
                                                    <code className="font-mono text-sm">
                                                        {children}
                                                    </code>
                                                );
                                            }

                                            return (
                                                <code className="rounded bg-gray-100 px-1 py-0.5 font-mono text-sm">
                                                    {children}
                                                </code>
                                            );
                                        },
                                        pre: ({ children }) => (
                                            <pre className="mb-3 overflow-x-auto rounded-lg bg-gray-100 p-3 font-mono text-sm leading-6">
                                                {children}
                                            </pre>
                                        ),
                                        strong: ({ children }) => (
                                            <strong className="font-semibold">{children}</strong>
                                        ),
                                    }}
                                >
                                    {message.content}
                                </ReactMarkdown>
                            </div>
                        </div>
                    ))}

                    {isLoading && (
                        <div className="mb-4">
                            <p className="mb-1 font-semibold">AI</p>
                            <div className="rounded-lg border p-4">
                                <p>AI is thinking...</p>
                            </div>
                        </div>
                    )}

                </div>

                <div className="border-t p-3">
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder={isLoading ? "Waiting for AI..." : "Ask something..."}
                        className="w-full resize-none rounded-md border p-3 outline-none"
                        disabled={isLoading}
                        rows={3}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                handleSend();
                            }
                        }}
                    />

                    <div className="mt-2 flex justify-end">
                        <button
                            onClick={handleSend}
                            disabled={isLoading || !input.trim()}
                            className="rounded-md border px-4 py-2 disabled:opacity-50"
                        >
                            Send
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}