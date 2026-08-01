"use client";

import { useEffect, useRef, type ReactNode } from "react";

import AiMarkdown from "@/components/AiMarkdown";

export type TutorWorkspaceMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  attachments?: Array<{
    id: string;
    name: string;
  }>;
};

type TutorWorkspaceProps = {
  messages: TutorWorkspaceMessage[];
  isLoading: boolean;
  composer: ReactNode;
  emptyTitle?: string;
  emptyActions?: ReactNode;
  messageActions?: (message: TutorWorkspaceMessage, index: number) => ReactNode;
  conversationHeader?: ReactNode;
  conversationFooter?: ReactNode;
  composerHeader?: ReactNode;
  composerFooter?: ReactNode;
};

export default function TutorWorkspace({
  messages,
  isLoading,
  composer,
  emptyTitle = "What are you working on?",
  emptyActions,
  messageActions,
  conversationHeader,
  conversationFooter,
  composerHeader,
  composerFooter,
}: TutorWorkspaceProps) {
  const lastAssistantRef = useRef<HTMLDivElement | null>(null);
  const hasMessages = messages.length > 0;
  const lastMessage = messages.at(-1);
  const lastMessageId = lastMessage?.id;
  const lastMessageRole = lastMessage?.role;

  useEffect(() => {
    if (lastMessageRole === "assistant") {
      lastAssistantRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, [lastMessageId, lastMessageRole]);

  return (
    <div className="ai-tutor-scroll-scope flex min-h-screen w-full justify-center bg-gray-100">
      <div className="min-h-screen min-w-4xl border-b-blue-500">
        <div className="relative min-h-screen">
          {!hasMessages ? (
            <div className="flex min-h-screen items-center">
              <div className="flex w-full flex-col items-center">
                <header className="text-3xl">{emptyTitle}</header>
                {composerHeader}
                {composer}
                {composerFooter}
                {emptyActions}
              </div>
            </div>
          ) : (
            <div className="flex min-h-screen flex-col">
              <div className="flex-1 pt-8">
                {conversationHeader}

                {messages.map((message, index) => {
                  const actions = messageActions?.(message, index);

                  return (
                    <div
                      key={message.id}
                      ref={
                        message.role === "assistant"
                        && index === messages.length - 1
                          ? lastAssistantRef
                          : null
                      }
                      className={
                        message.role === "user"
                          ? "mb-6 ml-auto w-fit max-w-2xl rounded-3xl bg-white px-5 py-3"
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

                      {actions ? <div className="mt-4">{actions}</div> : null}
                    </div>
                  );
                })}

                {conversationFooter}
              </div>

              <div className="sticky bottom-0 z-10 bg-linear-to-t from-gray-100 via-gray-100 to-transparent pb-6 pt-4">
                {composerHeader}
                {composer}
                {composerFooter}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
