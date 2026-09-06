"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { withTutorQuote } from "@/lib/ai/tutorQuote";

import { formatFileSize, MAX_STUDY_FILE_BYTES } from "@/lib/files/uploadConstraints";
import {
  completeStudySession,
  normalizeStudySessionMessages,
  saveStudySessionMessages,
} from "@/lib/studySessions";

import {
  applyPlanRefinementRequest,
  loadAssignmentContext,
  previewPlanRefinement,
  requestTutorResponse,
  uploadAssignmentContextFile,
  uploadAssignmentMaterials,
} from "./api";
import {
  getReadyCompletion,
  removePendingTutorMessage,
} from "./domain";
import type {
  AssignmentSessionContext,
  GuidedSessionController,
  GuidedStudySessionProps,
  PlanRefinement,
  RequiredTutorResponse,
  TutorMessage,
} from "./types";

export function useGuidedStudySession({
  session,
  plannerTaskId,
}: GuidedStudySessionProps): GuidedSessionController {
  const router = useRouter();
  const savedMessages = normalizeStudySessionMessages(session.messages);
  const savedCompletion = getReadyCompletion(savedMessages);
  const [assignment, setAssignment] = useState<AssignmentSessionContext | null>(null);
  const [messages, setMessages] = useState<TutorMessage[]>(savedMessages);
  const [input, setInput] = useState("");
  const [selectedQuote, setSelectedQuote] = useState<string | null>(null);
  const [contextError, setContextError] = useState<string | null>(null);
  const [tutorError, setTutorError] = useState<string | null>(null);
  const [uploadNotice, setUploadNotice] = useState<string | null>(null);
  const [isContextLoading, setIsContextLoading] = useState(session.session_type === "assignment");
  const [isTutorLoading, setIsTutorLoading] = useState(savedMessages.length === 0);
  const [isUploading, setIsUploading] = useState(false);
  const [isPlanLoading, setIsPlanLoading] = useState(false);
  const [isPlanApplying, setIsPlanApplying] = useState(false);
  const [planRefinement, setPlanRefinement] = useState<PlanRefinement | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);
  const [completionUnlocked, setCompletionUnlocked] = useState(Boolean(savedCompletion));
  const [completionReason, setCompletionReason] = useState(savedCompletion?.completionReason ?? "");
  const abortControllerRef = useRef<AbortController | null>(null);
  const startedContextVersionRef = useRef<number | null>(null);
  const hasSavedMessagesRef = useRef(savedMessages.length > 0);

  useEffect(() => () => { abortControllerRef.current?.abort(); }, []);

  const assignmentContextVersion = assignment?.contextVersion ?? -1;
  const hasLinkedAssignment = Boolean(assignment);

  const persistMessages = useCallback(
    async (nextMessages: TutorMessage[], { quiet = false }: { quiet?: boolean } = {}) => {
      try {
        await saveStudySessionMessages(session.id, nextMessages);
      } catch (error) {
        console.error("Error saving study session messages:", error);
        if (!quiet) {
          setTutorError((current) =>
            current ?? "This conversation is visible, but it could not be saved for resume.",
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
        const nextAssignment = await loadAssignmentContext(session.id, plannerTaskId);
        if (isMounted) setAssignment(nextAssignment);
      } catch (error) {
        if (isMounted) {
          setContextError(error instanceof Error ? error.message : "The linked assignment could not be loaded.");
          setIsTutorLoading(false);
        }
      } finally {
        if (isMounted) setIsContextLoading(false);
      }
    }

    void loadAssignment();
    return () => { isMounted = false; };
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

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    async function beginSession() {
      const assistantMessageId = `${crypto.randomUUID()}-assistant`;
      setIsTutorLoading(true);
      setTutorError(null);
      setMessages([{ id: assistantMessageId, role: "assistant", content: "" }]);
      try {
        const payload = await requestTutorResponse(
          session.id,
          [],
          plannerTaskId,
          abortController.signal,
          (content) => {
            if (!abortController.signal.aborted) {
              setMessages((current) => current.map((message) =>
                message.id === assistantMessageId ? { ...message, content } : message));
            }
          },
        );
        if (abortController.signal.aborted) return;
        const nextMessages: TutorMessage[] = [{
          id: assistantMessageId,
          role: "assistant",
          content: payload.message,
          completionStatus: payload.completionStatus,
          completionReason: payload.completionReason,
        }];
        hasSavedMessagesRef.current = true;
        setMessages(nextMessages);
        void persistMessages(nextMessages);
        applyCompletionState(payload);
      } catch (error) {
        if (!abortController.signal.aborted) {
          setMessages((current) => current.filter((message) => message.id !== assistantMessageId));
          setTutorError(error instanceof Error ? error.message : "The study tutor could not get started.");
        }
      } finally {
        if (!abortController.signal.aborted) setIsTutorLoading(false);
      }
    }

    void beginSession();
    return () => {
      abortController.abort();
      if (abortControllerRef.current === abortController) abortControllerRef.current = null;
    };
  }, [
    assignmentContextVersion,
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
    if (!input.trim() || isTutorLoading) return;
    const content = withTutorQuote(input, selectedQuote);
    const userMessage: TutorMessage = { id: crypto.randomUUID(), role: "user", content };
    const nextMessages = [...messages, userMessage];
    const abortController = new AbortController();
    const assistantMessageId = `${crypto.randomUUID()}-assistant`;

    abortControllerRef.current?.abort();
    abortControllerRef.current = abortController;
    hasSavedMessagesRef.current = true;
    setMessages([...nextMessages, { id: assistantMessageId, role: "assistant", content: "" }]);
    setInput("");
    setSelectedQuote(null);
    setTutorError(null);
    setIsTutorLoading(true);
    void persistMessages(nextMessages, { quiet: true });

    try {
      const payload = await requestTutorResponse(
        session.id,
        nextMessages,
        plannerTaskId,
        abortController.signal,
        (content) => {
          if (!abortController.signal.aborted) {
            setMessages((current) => current.map((message) =>
              message.id === assistantMessageId ? { ...message, content } : message));
          }
        },
      );
      if (abortController.signal.aborted) return;
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
        setTutorError(error instanceof Error ? error.message : "The study tutor could not respond.");
      }
    } finally {
      if (!abortController.signal.aborted) {
        setIsTutorLoading(false);
        if (abortControllerRef.current === abortController) abortControllerRef.current = null;
      }
    }
  }

  function stopTutorResponse() {
    const abortController = abortControllerRef.current;
    if (!abortController || !isTutorLoading) return;

    abortControllerRef.current = null;
    abortController.abort();
    const stoppedMessages = removePendingTutorMessage(messages);
    setMessages(stoppedMessages);
    if (stoppedMessages.length > 0) hasSavedMessagesRef.current = true;
    void persistMessages(stoppedMessages);
    setTutorError("Response stopped. You can ask another question.");
    setIsTutorLoading(false);
  }

  async function uploadAssignmentFile(file: File | null) {
    if (!file || !assignment || isUploading) return;
    if (file.size > MAX_STUDY_FILE_BYTES) {
      setUploadNotice(`Choose a file ${formatFileSize(MAX_STUDY_FILE_BYTES)} or smaller.`);
      return;
    }
    setIsUploading(true);
    setUploadNotice(null);
    try {
      const payload = await uploadAssignmentContextFile(assignment.id, file);
      setAssignment((current) => current ? {
        ...current,
        originalFileName: payload.file.originalFileName,
        hasExtractedText: payload.file.hasExtractedText,
        contextStatus: payload.file.hasExtractedText ? "ready" : "failed",
        contextVersion: payload.file.contextVersion,
      } : current);
      setUploadNotice(payload.warning ?? "Assignment instructions added. The tutor is rebuilding this session with the new context.");
      if (payload.file.hasExtractedText) void loadPlanRefinement(assignment.id);
    } catch (error) {
      setUploadNotice(error instanceof Error ? error.message : "The assignment file could not be uploaded.");
    } finally {
      setIsUploading(false);
    }
  }

  async function loadPlanRefinement(assignmentId: string) {
    if (isPlanLoading) return;
    setIsPlanLoading(true);
    try {
      const payload = await previewPlanRefinement(assignmentId, plannerTaskId);
      setPlanRefinement(payload.tasks.length > 0 ? payload : null);
      if (payload.tasks.length === 0) {
        setUploadNotice((current) => `${current ? `${current} ` : ""}${payload.summary}`);
      }
    } catch (error) {
      setUploadNotice((current) => `${current ? `${current} ` : ""}${error instanceof Error ? error.message : "A refined planner preview could not be created."}`);
    } finally {
      setIsPlanLoading(false);
    }
  }

  async function applyPlanRefinement() {
    if (!assignment || !planRefinement || isPlanApplying) return;
    setIsPlanApplying(true);
    try {
      const updatedTaskCount = await applyPlanRefinementRequest(assignment.id, planRefinement);
      setUploadNotice(`${updatedTaskCount} future planner block${updatedTaskCount === 1 ? "" : "s"} updated from the assignment instructions.`);
      setPlanRefinement(null);
    } catch (error) {
      setUploadNotice(error instanceof Error ? error.message : "The planner could not be updated.");
    } finally {
      setIsPlanApplying(false);
    }
  }

  async function uploadStudyMaterials(files: File[]) {
    if (files.length === 0 || !assignment || isUploading) return;
    const oversizedFile = files.find((file) => file.size > MAX_STUDY_FILE_BYTES);
    if (oversizedFile) {
      setUploadNotice(`${oversizedFile.name} must be ${formatFileSize(MAX_STUDY_FILE_BYTES)} or smaller.`);
      return;
    }
    setIsUploading(true);
    setUploadNotice(null);
    try {
      const payload = await uploadAssignmentMaterials(assignment.id, files);
      setAssignment((current) => current ? { ...current, materials: [...current.materials, ...payload.materials] } : current);
      setUploadNotice(payload.warnings.length
        ? payload.warnings.join(" ")
        : `${payload.materials.length} study material${payload.materials.length === 1 ? "" : "s"} added. The tutor can use them on your next message.`);
    } catch (error) {
      setUploadNotice(error instanceof Error ? error.message : "The study materials could not be uploaded.");
    } finally {
      setIsUploading(false);
    }
  }

  async function completeSession() {
    if (!completionUnlocked || isCompleting) return;
    setIsCompleting(true);
    setTutorError(null);
    try {
      const result = await completeStudySession(session.id, plannerTaskId);
      window.localStorage.removeItem(`study-session-task:${session.id}`);
      if (result.taskCompletionError || result.assignmentCompletionError) {
        setTutorError(result.taskCompletionError ?? result.assignmentCompletionError ?? "The session was saved, but linked work could not be updated.");
        setIsCompleting(false);
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      setTutorError(error instanceof Error ? error.message : "The study session could not be completed.");
      setIsCompleting(false);
    }
  }

  return {
    assignment,
    messages,
    input,
    contextError,
    tutorError,
    uploadNotice,
    isContextLoading,
    isTutorLoading,
    isUploading,
    isPlanLoading,
    isPlanApplying,
    planRefinement,
    isCompleting,
    completionUnlocked,
    completionReason,
    setInput,
    selectedQuote,
    setSelectedQuote,
    dismissPlanRefinement: () => setPlanRefinement(null),
    sendMessage,
    uploadAssignmentFile,
    uploadStudyMaterials,
    applyPlanRefinement,
    stopTutorResponse,
    completeSession,
  };
}
