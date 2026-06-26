"use client";

import { Play } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { createStudySession } from "@/lib/studySessions";
import type { StudySessionType } from "@/types/database";

type StartStudySessionButtonProps = {
  plannerTaskId?: string;
  assignmentId?: string | null;
  classId?: string | null;
  flashcardSetId?: string | null;
  title: string;
  label?: string;
  loadingLabel?: string;
  plannedMinutes?: number | null;
  sessionType?: StudySessionType;
  variant?: "default" | "outline";
  className?: string;
};

export function StartStudySessionButton({
  plannerTaskId,
  assignmentId,
  classId,
  flashcardSetId,
  title,
  label = "Get Started",
  loadingLabel = "Opening...",
  plannedMinutes,
  sessionType = "assignment",
  variant = "outline",
  className,
}: StartStudySessionButtonProps) {
  const router = useRouter();
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleStart() {
    setIsStarting(true);
    setError(null);

    try {
      const { session, isExisting } = await createStudySession({
        assignmentId,
        classId,
        title,
        plannedMinutes,
        sessionType,
      });

      if (!isExisting && plannerTaskId) {
        window.localStorage.setItem(
          `study-session-task:${session.id}`,
          plannerTaskId,
        );
      }

      if (!isExisting && flashcardSetId) {
        window.localStorage.setItem(
          `study-session-flashcards:${session.id}`,
          flashcardSetId,
        );
      }

      const destination =
        session.session_type === "flashcards" && flashcardSetId
          ? `/study/flashcards/${flashcardSetId}?studySessionId=${session.id}`
          : `/study-session/${session.id}`;

      router.push(destination);
    } catch (startError) {
      const rawMessage =
        startError instanceof Error
          ? startError.message
          : getSupabaseErrorMessage(startError);

      setError(getStartErrorMessage(rawMessage));
      setIsStarting(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        size="sm"
        variant={variant}
        className={className}
        disabled={isStarting}
        onClick={handleStart}
      >
        <Play />
        {isStarting ? loadingLabel : label}
      </Button>
      {error && (
        <p className="max-w-56 text-right text-xs text-red-600">{error}</p>
      )}
    </div>
  );
}

function getSupabaseErrorMessage(error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  return null;
}

function getStartErrorMessage(message: string | null) {
  if (message?.toLowerCase().includes("schema cache")) {
    return "Database setup required: run the study-session migration in Supabase.";
  }

  return message || "Could not start the study session.";
}
