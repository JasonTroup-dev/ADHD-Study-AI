"use client";

import { BookOpen, Check, FileUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

import InputBar from "@/components/ai-tutor/InputBar";
import TutorWorkspace from "@/components/ai-tutor/TutorWorkspace";
import { Button } from "@/components/ui/button";
import {
  ASSIGNMENT_FILE_ACCEPT,
  formatFileSize,
  MAX_STUDY_FILE_BYTES,
  STUDY_FILE_ACCEPT,
} from "@/lib/files/uploadConstraints";
import {
  completeStudySession,
  normalizeStudySessionMessages,
  saveStudySessionMessages,
} from "@/lib/studySessions";
import type { StudySession, StudySessionMessage } from "@/types/database";

type GuidedStudySessionProps = {
  session: StudySession;
  plannerTaskId?: string | null;
};

type AssignmentSessionContext = {
  id: string;
  title: string;
  description: string | null;
  className: string | null;
  dueDate: string | null;
  importance: string;
  points: number | null;
  status: string;
  originalFileName: string | null;
  hasExtractedText: boolean;
  contextStatus: string;
  contextVersion: number;
  materials: Array<{
    id: string;
    originalFileName: string;
    hasExtractedText: boolean;
  }>;
  studySessionGoal: {
    sessionNumber: number;
    totalSessions: number;
    percentage: number;
  } | null;
};

type AssignmentContextResponse = {
  assignment?: AssignmentSessionContext;
  error?: string;
};

type TutorMessage = StudySessionMessage;

type TutorResponse = {
  message?: string;
  completionStatus?: "in_progress" | "ready";
  completionReason?: string;
  error?: string;
};

type PlanRefinement = {
  contextVersion: number;
  summary: string;
  tasks: Array<{
    id: string;
    scheduledDate: string;
    currentTitle: string;
    proposedTitle: string;
  }>;
};

export function GuidedStudySession({
  session,
  plannerTaskId,
}: GuidedStudySessionProps) {
  const router = useRouter();
  const savedMessages = normalizeStudySessionMessages(session.messages);
  const savedCompletion = getReadyCompletion(savedMessages);
  const [assignment, setAssignment] =
    useState<AssignmentSessionContext | null>(null);
  const [messages, setMessages] = useState<TutorMessage[]>(savedMessages);
  const [input, setInput] = useState("");
  const [contextError, setContextError] = useState<string | null>(null);
  const [tutorError, setTutorError] = useState<string | null>(null);
  const [uploadNotice, setUploadNotice] = useState<string | null>(null);
  const [isContextLoading, setIsContextLoading] = useState(
    session.session_type === "assignment",
  );
  const [isTutorLoading, setIsTutorLoading] = useState(
    savedMessages.length === 0,
  );
  const [isUploading, setIsUploading] = useState(false);
  const [isPlanLoading, setIsPlanLoading] = useState(false);
  const [isPlanApplying, setIsPlanApplying] = useState(false);
  const [planRefinement, setPlanRefinement] = useState<PlanRefinement | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);
  const [completionUnlocked, setCompletionUnlocked] = useState(
    Boolean(savedCompletion),
  );
  const [completionReason, setCompletionReason] = useState(
    savedCompletion?.completionReason ?? "",
  );
  const abortControllerRef = useRef<AbortController | null>(null);
  const startedContextVersionRef = useRef<number | null>(null);
  const hasSavedMessagesRef = useRef(savedMessages.length > 0);
  const assignmentFileInputRef = useRef<HTMLInputElement | null>(null);
  const materialsInputRef = useRef<HTMLInputElement | null>(null);
  const assignmentContextVersion = assignment?.contextVersion ?? -1;
  const assignmentHasExtractedText = assignment?.hasExtractedText ?? false;
  const assignmentTitle = assignment?.title ?? session.title ?? "this assignment";
  const assignmentDescription = assignment?.description ?? null;
  const assignmentStudySessionGoal = assignment?.studySessionGoal ?? null;
  const hasLinkedAssignment = Boolean(assignment);
  const persistMessages = useCallback(
    async (
      nextMessages: TutorMessage[],
      { quiet = false }: { quiet?: boolean } = {},
    ) => {
      try {
        await saveStudySessionMessages(session.id, nextMessages);
      } catch (error) {
        console.error("Error saving study session messages:", error);
        if (!quiet) {
          setTutorError((current) =>
            current
            ?? "This conversation is visible, but it could not be saved for resume.",
          );
        }
      }
    },
    [session.id],
  );

  useEffect(() => {
    if (session.session_type !== "assignment") return;

    let isMounted = true;

    async function loadAssignment() {
      setIsContextLoading(true);
      setContextError(null);

      try {
        const response = await fetch("/api/study-sessions/assignment-guide", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: session.id,
            generateGuide: false,
            plannerTaskId,
          }),
        });
        const payload = (await response.json()) as AssignmentContextResponse;

        if (!response.ok || !payload.assignment) {
          throw new Error(
            payload.error ?? "The linked assignment could not be loaded.",
          );
        }

        if (isMounted) setAssignment(payload.assignment);
      } catch (error) {
        if (isMounted) {
          setContextError(
            error instanceof Error
              ? error.message
              : "The linked assignment could not be loaded.",
          );
          setIsTutorLoading(false);
        }
      } finally {
        if (isMounted) setIsContextLoading(false);
      }
    }

    void loadAssignment();

    return () => {
      isMounted = false;
    };
  }, [plannerTaskId, session.id, session.session_type]);

  useEffect(() => {
    if (session.session_type === "assignment" && isContextLoading) return;
    if (session.session_type === "assignment" && !hasLinkedAssignment) return;

    if (hasSavedMessagesRef.current) {
      setIsTutorLoading(false);
      return;
    }

    if (startedContextVersionRef.current === assignmentContextVersion) return;
    startedContextVersionRef.current = assignmentContextVersion;

    if (
      session.session_type === "assignment"
      && !assignmentHasExtractedText
    ) {
      const missingContextMessage = createMissingContextMessage(
        assignmentTitle,
        assignmentDescription,
        assignmentStudySessionGoal,
      );

      hasSavedMessagesRef.current = true;
      setMessages([missingContextMessage]);
      void persistMessages([missingContextMessage]);
      setIsTutorLoading(false);
      return;
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    async function beginSession() {
      const assistantMessageId = `${crypto.randomUUID()}-assistant`;

      setIsTutorLoading(true);
      setTutorError(null);
      setMessages([
        {
          id: assistantMessageId,
          role: "assistant",
          content: "",
        },
      ]);

      try {
        const payload = await requestTutorResponse(
          session.id,
          [],
          plannerTaskId,
          abortController.signal,
        );

        const nextMessages: TutorMessage[] = [
          {
            id: assistantMessageId,
            role: "assistant",
            content: payload.message,
            completionStatus: payload.completionStatus,
            completionReason: payload.completionReason,
          },
        ];

        hasSavedMessagesRef.current = true;
        setMessages(nextMessages);
        void persistMessages(nextMessages);
        applyCompletionState(payload);
      } catch (error) {
        if (!abortController.signal.aborted) {
          setMessages((current) =>
            current.filter((message) => message.id !== assistantMessageId),
          );
          setTutorError(
            error instanceof Error
              ? error.message
              : "The study tutor could not get started.",
          );
        }
      } finally {
        if (!abortController.signal.aborted) setIsTutorLoading(false);
      }
    }

    void beginSession();

    return () => {
      abortController.abort();
      if (abortControllerRef.current === abortController) {
        abortControllerRef.current = null;
      }
    };
  }, [
    assignmentContextVersion,
    assignmentDescription,
    assignmentHasExtractedText,
    assignmentStudySessionGoal,
    assignmentTitle,
    hasLinkedAssignment,
    isContextLoading,
    plannerTaskId,
    persistMessages,
    session.id,
    session.session_type,
  ]);

  function applyCompletionState(payload: RequiredTutorResponse) {
    if (payload.completionStatus !== "ready") return;
    setCompletionUnlocked(true);
    setCompletionReason(payload.completionReason);
  }

  async function sendMessage() {
    const content = input.trim();
    if (!content || isTutorLoading) return;

    const userMessage: TutorMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content,
    };
    const nextMessages = [...messages, userMessage];
    const abortController = new AbortController();
    const assistantMessageId = `${crypto.randomUUID()}-assistant`;

    abortControllerRef.current?.abort();
    abortControllerRef.current = abortController;
    hasSavedMessagesRef.current = true;
    setMessages([
      ...nextMessages,
      {
        id: assistantMessageId,
        role: "assistant",
        content: "",
      },
    ]);
    setInput("");
    setTutorError(null);
    setIsTutorLoading(true);
    void persistMessages(nextMessages, { quiet: true });

    try {
      const payload = await requestTutorResponse(
        session.id,
        nextMessages,
        plannerTaskId,
        abortController.signal,
      );

      const completedMessages: TutorMessage[] = [
        ...nextMessages,
        {
          id: assistantMessageId,
          role: "assistant",
          content: payload.message,
          completionStatus: payload.completionStatus,
          completionReason: payload.completionReason,
        },
      ];

      setMessages(completedMessages);
      void persistMessages(completedMessages);
      applyCompletionState(payload);
    } catch (error) {
      if (!abortController.signal.aborted) {
        setMessages(nextMessages);
        void persistMessages(nextMessages);
        setTutorError(
          error instanceof Error
            ? error.message
            : "The study tutor could not respond.",
        );
      }
    } finally {
      if (!abortController.signal.aborted) {
        setIsTutorLoading(false);
        if (abortControllerRef.current === abortController) {
          abortControllerRef.current = null;
        }
      }
    }
  }

  async function uploadAssignmentFile(file: File | null) {
    if (!file || !assignment || isUploading) return;

    if (file.size > MAX_STUDY_FILE_BYTES) {
      setUploadNotice(
        `Choose a file ${formatFileSize(MAX_STUDY_FILE_BYTES)} or smaller.`,
      );
      return;
    }

    setIsUploading(true);
    setUploadNotice(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch(`/api/assignments/${assignment.id}/file`, {
        method: "POST",
        body: formData,
      });
      const payload = (await response.json()) as {
        file?: {
          originalFileName: string;
          hasExtractedText: boolean;
          contextVersion: number;
        };
        warning?: string | null;
        error?: string;
      };

      if (!response.ok || !payload.file) {
        throw new Error(
          payload.error ?? "The assignment file could not be uploaded.",
        );
      }

      setAssignment((current) =>
        current
          ? {
              ...current,
              originalFileName: payload.file?.originalFileName ?? null,
              hasExtractedText: payload.file?.hasExtractedText ?? false,
              contextStatus: payload.file?.hasExtractedText ? "ready" : "failed",
              contextVersion:
                payload.file?.contextVersion ?? current.contextVersion,
            }
          : current,
      );
      setUploadNotice(
        payload.warning
        ?? "Assignment instructions added. The tutor is rebuilding this session with the new context.",
      );
      if (payload.file.hasExtractedText) {
        void loadPlanRefinement();
      }
    } catch (error) {
      setUploadNotice(
        error instanceof Error
          ? error.message
          : "The assignment file could not be uploaded.",
      );
    } finally {
      setIsUploading(false);
    }
  }

  async function loadPlanRefinement() {
    if (!assignment || isPlanLoading) return;

    setIsPlanLoading(true);
    try {
      const response = await fetch(
        `/api/assignments/${assignment.id}/plan-refinement`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "preview",
            protectedTaskId: plannerTaskId ?? null,
          }),
        },
      );
      const payload = (await response.json()) as PlanRefinement & { error?: string };

      if (!response.ok) {
        throw new Error(
          payload.error ?? "A refined planner preview could not be created.",
        );
      }

      setPlanRefinement(payload.tasks.length > 0 ? payload : null);
      if (payload.tasks.length === 0) {
        setUploadNotice((current) =>
          `${current ? `${current} ` : ""}${payload.summary}`,
        );
      }
    } catch (error) {
      setUploadNotice((current) =>
        `${current ? `${current} ` : ""}${
          error instanceof Error
            ? error.message
            : "A refined planner preview could not be created."
        }`,
      );
    } finally {
      setIsPlanLoading(false);
    }
  }

  async function applyPlanRefinement() {
    if (!assignment || !planRefinement || isPlanApplying) return;

    setIsPlanApplying(true);
    try {
      const response = await fetch(
        `/api/assignments/${assignment.id}/plan-refinement`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "apply",
            contextVersion: planRefinement.contextVersion,
            tasks: planRefinement.tasks.map(({ id, proposedTitle }) => ({
              id,
              proposedTitle,
            })),
          }),
        },
      );
      const payload = (await response.json()) as {
        updatedTaskCount?: number;
        error?: string;
      };

      if (!response.ok || typeof payload.updatedTaskCount !== "number") {
        throw new Error(payload.error ?? "The planner could not be updated.");
      }

      setUploadNotice(
        `${payload.updatedTaskCount} future planner block${payload.updatedTaskCount === 1 ? "" : "s"} updated from the assignment instructions.`,
      );
      setPlanRefinement(null);
    } catch (error) {
      setUploadNotice(
        error instanceof Error
          ? error.message
          : "The planner could not be updated.",
      );
    } finally {
      setIsPlanApplying(false);
    }
  }

  async function uploadStudyMaterials(files: File[]) {
    if (files.length === 0 || !assignment || isUploading) return;

    const oversizedFile = files.find(
      (file) => file.size > MAX_STUDY_FILE_BYTES,
    );
    if (oversizedFile) {
      setUploadNotice(
        `${oversizedFile.name} must be ${formatFileSize(MAX_STUDY_FILE_BYTES)} or smaller.`,
      );
      return;
    }

    setIsUploading(true);
    setUploadNotice(null);

    try {
      const formData = new FormData();
      files.forEach((file) => formData.append("files", file));
      const response = await fetch(
        `/api/assignments/${assignment.id}/materials`,
        { method: "POST", body: formData },
      );
      const payload = (await response.json()) as {
        materials?: AssignmentSessionContext["materials"];
        warnings?: string[];
        error?: string;
      };

      if (!response.ok || !payload.materials) {
        throw new Error(
          payload.error ?? "The study materials could not be uploaded.",
        );
      }

      setAssignment((current) =>
        current
          ? { ...current, materials: [...current.materials, ...payload.materials!] }
          : current,
      );
      setUploadNotice(
        payload.warnings?.length
          ? payload.warnings.join(" ")
          : `${payload.materials.length} study material${payload.materials.length === 1 ? "" : "s"} added. The tutor can use them on your next message.`,
      );
    } catch (error) {
      setUploadNotice(
        error instanceof Error
          ? error.message
          : "The study materials could not be uploaded.",
      );
    } finally {
      setIsUploading(false);
    }
  }

  async function completeSession() {
    if (!completionUnlocked || isCompleting) return;

    setIsCompleting(true);
    setTutorError(null);

    try {
      const result = await completeStudySession(
        session.id,
        plannerTaskId,
        assignment?.id ?? null,
      );
      window.localStorage.removeItem(`study-session-task:${session.id}`);

      if (result.taskCompletionError || result.assignmentCompletionError) {
        setTutorError(
          result.taskCompletionError
          ?? result.assignmentCompletionError
          ?? "The session was saved, but linked work could not be updated.",
        );
        setIsCompleting(false);
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      setTutorError(
        error instanceof Error
          ? error.message
          : "The study session could not be completed.",
      );
      setIsCompleting(false);
    }
  }

  return (
    <TutorWorkspace
      messages={messages}
      isLoading={isTutorLoading}
      emptyTitle={
        isTutorLoading ? "Tutor is thinking..." : "What are you working on?"
      }
      messageActions={(message) =>
        message.id.startsWith("missing-context-")
        && assignment
        && !assignment.hasExtractedText ? (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={isUploading}
              onClick={() => assignmentFileInputRef.current?.click()}
            >
              <FileUp />
              Upload assignment
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={isUploading}
              onClick={() => materialsInputRef.current?.click()}
            >
              <BookOpen />
              Add materials
            </Button>
            <input
              ref={assignmentFileInputRef}
              type="file"
              className="sr-only"
              accept={ASSIGNMENT_FILE_ACCEPT}
              onChange={(event) => {
                void uploadAssignmentFile(event.target.files?.[0] ?? null);
                event.target.value = "";
              }}
            />
            <input
              ref={materialsInputRef}
              type="file"
              className="sr-only"
              accept={STUDY_FILE_ACCEPT}
              multiple
              onChange={(event) => {
                void uploadStudyMaterials(Array.from(event.target.files ?? []));
                event.target.value = "";
              }}
            />
          </div>
        ) : null
      }
      conversationHeader={(
        <>
          {contextError ? (
            <Notice tone="error">{contextError}</Notice>
          ) : null}
          {!isContextLoading
          && assignment
          && assignment.hasExtractedText ? (
            <Notice>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium text-gray-900">
                    Grounded in {assignment.originalFileName ?? "the assignment instructions"}
                  </p>
                  <p className="mt-1">
                    {assignment.materials.length} linked study material{assignment.materials.length === 1 ? "" : "s"}.
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={isUploading}
                  onClick={() => materialsInputRef.current?.click()}
                >
                  <BookOpen />
                  Add materials
                </Button>
              </div>
              <input
                ref={materialsInputRef}
                type="file"
                className="sr-only"
                accept={STUDY_FILE_ACCEPT}
                multiple
                onChange={(event) => {
                  void uploadStudyMaterials(Array.from(event.target.files ?? []));
                  event.target.value = "";
                }}
              />
            </Notice>
          ) : null}
          {isPlanLoading ? (
            <Notice>Reading the instructions and preparing a planner update…</Notice>
          ) : null}
          {planRefinement ? (
            <div className="mb-7 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="font-semibold">Refine your future planner blocks?</p>
                  <p className="mt-1 text-blue-800">{planRefinement.summary}</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={isPlanApplying}
                    onClick={() => setPlanRefinement(null)}
                  >
                    Keep current
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={isPlanApplying}
                    onClick={() => void applyPlanRefinement()}
                  >
                    {isPlanApplying ? "Updating…" : "Update plan"}
                  </Button>
                </div>
              </div>
              <div className="mt-4 space-y-2">
                {planRefinement.tasks.map((task) => (
                  <div key={task.id} className="rounded-xl border border-blue-100 bg-white px-3 py-2">
                    <p className="text-xs font-medium text-blue-600">
                      {formatPlanDate(task.scheduledDate)}
                    </p>
                    <p className="mt-1 font-medium text-gray-950">
                      {task.proposedTitle}
                    </p>
                    <p className="mt-1 text-xs text-gray-500 line-through">
                      {task.currentTitle}
                    </p>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs text-blue-700">
                Completed, manually created, and current-session tasks will not change.
              </p>
            </div>
          ) : null}
        </>
      )}
      composerHeader={
        completionUnlocked ? (
          <div className="mx-auto -mb-8 flex w-full max-w-2xl flex-col gap-3 rounded-2xl border border-emerald-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between lg:max-w-xl xl:max-w-4xl">
            <div>
              <p className="text-sm font-medium text-emerald-950">
                Ready to complete
              </p>
              {completionReason ? (
                <p className="mt-0.5 text-xs text-emerald-700">
                  {completionReason}
                </p>
              ) : null}
            </div>
            <Button
              type="button"
              className="rounded-full bg-emerald-700 text-white hover:bg-emerald-800"
              disabled={isCompleting}
              onClick={completeSession}
            >
              <Check />
              {isCompleting ? "Saving..." : "Complete session"}
            </Button>
          </div>
        ) : null
      }
      composer={(
        <InputBar
          input={input}
          setInput={setInput}
          handleSend={() => void sendMessage()}
          files={[]}
          onFilesSelected={(files) => {
            if (assignment?.hasExtractedText) {
              void uploadStudyMaterials(files);
            } else {
              void uploadAssignmentFile(files[0] ?? null);
            }
          }}
          onRemoveFile={() => undefined}
          accept={assignment?.hasExtractedText ? STUDY_FILE_ACCEPT : ASSIGNMENT_FILE_ACCEPT}
          multiple={Boolean(assignment?.hasExtractedText)}
          attachmentDisabled={!assignment || isContextLoading}
          attachmentLabel={assignment?.hasExtractedText
            ? "Add study materials"
            : "Add assignment file"}
          placeholder={assignment?.hasExtractedText
            ? "Ask about the assignment"
            : "Describe the problem or what feels confusing"}
          status={
            isUploading ? "Uploading assignment..." : "Tutor is thinking..."
          }
          error={tutorError ?? contextError}
          notice={uploadNotice}
          disabled={isTutorLoading || isUploading || completionUnlocked}
        />
      )}
    />
  );
}

function Notice({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "error";
}) {
  return (
    <div
      className={
        tone === "error"
          ? "mb-7 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          : "mb-7 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-600"
      }
    >
      {children}
    </div>
  );
}

function createMissingContextMessage(
  title: string,
  description: string | null,
  studySessionGoal: AssignmentSessionContext["studySessionGoal"],
): TutorMessage {
  const goalLine = studySessionGoal
    ? `For this study session, aim to complete about **${studySessionGoal.percentage}%** of the assignment — session **${studySessionGoal.sessionNumber}/${studySessionGoal.totalSessions}**.`
    : null;

  return {
    id: `missing-context-${crypto.randomUUID()}`,
    role: "assistant",
    content: [
      "### I need a little more context",
      goalLine,
      description
        ? `I have the title **${title}** and its brief description, but not the full assignment requirements.`
        : `I only know the title **${title}**, so I do not know the assignment's exact requirements yet.`,
      "You can upload the assignment for tailored guidance, add study materials as references, or describe the specific problem or part you are stuck on and I can help from your description.",
    ].filter(Boolean).join("\n\n"),
  };
}

function formatPlanDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getReadyCompletion(messages: TutorMessage[]) {
  return [...messages].reverse().find(
    (message) =>
      message.role === "assistant" && message.completionStatus === "ready",
  ) ?? null;
}

type RequiredTutorResponse = {
  message: string;
  completionStatus: "in_progress" | "ready";
  completionReason: string;
};

async function requestTutorResponse(
  sessionId: string,
  messages: TutorMessage[],
  plannerTaskId: string | null | undefined,
  signal: AbortSignal,
): Promise<RequiredTutorResponse> {
  const requestController = new AbortController();
  const abortRequest = () => requestController.abort();
  const timeout = window.setTimeout(abortRequest, 70_000);

  signal.addEventListener("abort", abortRequest, { once: true });

  try {
    const response = await fetch("/api/study-sessions/tutor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
        plannerTaskId: plannerTaskId ?? null,
        messages: messages.slice(-16).map(({ role, content }) => ({
          role,
          content,
        })),
      }),
      signal: requestController.signal,
    });
    const payload = (await response.json()) as TutorResponse;

    if (
      !response.ok
      || typeof payload.message !== "string"
      || (payload.completionStatus !== "in_progress"
        && payload.completionStatus !== "ready")
      || typeof payload.completionReason !== "string"
    ) {
      throw new Error(payload.error ?? "The study tutor could not respond.");
    }

    return {
      message: payload.message,
      completionStatus: payload.completionStatus,
      completionReason: payload.completionReason,
    };
  } catch (error) {
    if (!signal.aborted && requestController.signal.aborted) {
      throw new Error(
        "The tutor took too long to respond. Please send your message again.",
      );
    }

    throw error;
  } finally {
    window.clearTimeout(timeout);
    signal.removeEventListener("abort", abortRequest);
  }
}
