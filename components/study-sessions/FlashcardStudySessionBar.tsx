"use client";

import { CheckCircle2, Clock3, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { StudyTimeInput } from "./StudyTimeInput";

import { Button } from "@/components/ui/button";
import {
  cancelStudySession,
  completeStudySession,
  getStudySessionById,
} from "@/lib/studySessions";
import type { StudySession } from "@/types/database";

export function FlashcardStudySessionBar({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [session, setSession] = useState<StudySession | null>(null);
  const [studyMinutes, setStudyMinutes] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    getStudySessionById(sessionId)
      .then((loadedSession) => {
        if (
          isMounted &&
          loadedSession?.status === "active" &&
          loadedSession.session_type === "flashcards"
        ) {
          setSession(loadedSession);
        }
      })
      .catch(() => {
        if (isMounted) setError("Could not load the study session.");
      });

    return () => {
      isMounted = false;
    };
  }, [sessionId]);


  async function completeSession() {
    if (!session) return;
    setIsSaving(true);
    setError(null);

    try {
      const plannerTaskId = window.localStorage.getItem(
        `study-session-task:${session.id}`,
      );
      const result = await completeStudySession(session.id, plannerTaskId, null, studyMinutes);
      if (result.taskCompletionError) throw new Error(`Session saved, but the task could not be completed: ${result.taskCompletionError}`);
      clearSessionStorage(session.id);
      router.push("/dashboard");
      router.refresh();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Could not complete the session.",
      );
      setIsSaving(false);
    }
  }

  async function cancelSession() {
    if (
      !session ||
      !window.confirm(
        "Cancel this study session? Studied time will not be saved.",
      )
    ) {
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await cancelStudySession(session.id);
      clearSessionStorage(session.id);
      router.push("/study/flashcards");
      router.refresh();
    } catch (cancelError) {
      setError(
        cancelError instanceof Error
          ? cancelError.message
          : "Could not cancel the session.",
      );
      setIsSaving(false);
    }
  }

  if (!session && !error) return null;

  return (
    <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-blue-800">
            <Clock3 className="h-4 w-4" aria-hidden="true" />
            Study Session · Flashcards
          </div>
          {session ? (
            <div className="mt-3"><StudyTimeInput value={studyMinutes} onChange={setStudyMinutes} disabled={isSaving} /></div>
          ) : null}
          {error ? <p className="mt-1 text-sm text-red-700">{error}</p> : null}
        </div>

        {session ? (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={isSaving}
              onClick={cancelSession}
            >
              <X className="h-4 w-4" aria-hidden="true" />
              Cancel Session
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={isSaving}
              onClick={completeSession}
            >
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              {isSaving ? "Saving..." : "Complete Session"}
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function clearSessionStorage(sessionId: string) {
  window.localStorage.removeItem(`study-session-task:${sessionId}`);
  window.localStorage.removeItem(`study-session-flashcards:${sessionId}`);
}
