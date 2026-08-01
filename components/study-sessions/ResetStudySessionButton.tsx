"use client";

import { RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { resetStudySessionTask } from "@/lib/studySessions";

type ResetStudySessionButtonProps = {
  plannerTaskId: string;
  className?: string;
};

export function ResetStudySessionButton({
  plannerTaskId,
  className,
}: ResetStudySessionButtonProps) {
  const router = useRouter();
  const [isResetting, setIsResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleReset() {
    setIsResetting(true);
    setError(null);
    setNotice(null);

    try {
      const { clearedSessionIds } = await resetStudySessionTask(plannerTaskId);
      clearStudySessionResumeStorage();

      setNotice(
        clearedSessionIds.length > 0
          ? "Session cleared. Start the task for a clean slate."
          : "Task reset.",
      );
      router.refresh();
    } catch (resetError) {
      setError(
        resetError instanceof Error
          ? resetError.message
          : "Could not reset the study session.",
      );
    } finally {
      setIsResetting(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        size="sm"
        variant="outline"
        className={className}
        disabled={isResetting}
        onClick={handleReset}
      >
        <RotateCcw aria-hidden="true" />
        {isResetting ? "Resetting..." : "Reset session"}
      </Button>
      {error ? (
        <p className="max-w-56 text-right text-xs text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="max-w-56 text-right text-xs text-emerald-700" role="status">
          {notice}
        </p>
      ) : null}
    </div>
  );
}

const STUDY_SESSION_STORAGE_PREFIXES = [
  "study-session-task:",
  "study-session-flashcards:",
];

function clearStudySessionResumeStorage() {
  const keysToRemove: string[] = [];

  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (
      key
      && STUDY_SESSION_STORAGE_PREFIXES.some((prefix) => key.startsWith(prefix))
    ) {
      keysToRemove.push(key);
    }
  }

  keysToRemove.forEach((key) => window.localStorage.removeItem(key));
}
