"use client";

import { Check, CheckCircle2, Clock3, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  cancelStudySession,
  completeStudySession,
  getSessionTypeLabel,
} from "@/lib/studySessions";
import type { StudySession } from "@/types/database";
import { cn } from "@/lib/utils";

type StudySessionTimerProps = {
  session: StudySession;
  plannerTaskId?: string | null;
  assignmentId?: string | null;
  cancelHref?: string;
  className?: string;
};

export function StudySessionTimer({
  session,
  plannerTaskId,
  assignmentId,
  cancelHref = "/planner",
  className,
}: StudySessionTimerProps) {
  const router = useRouter();
  const [now, setNow] = useState(() => Date.now());
  const [isCompleting, setIsCompleting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completedMinutes, setCompletedMinutes] = useState<number | null>(null);
  const [markAssignmentCompleted, setMarkAssignmentCompleted] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, []);

  const elapsedSeconds = useMemo(() => {
    const startedAt = session.started_at
      ? new Date(session.started_at).getTime()
      : now;
    return Math.max(0, Math.floor((now - startedAt) / 1_000));
  }, [now, session.started_at]);

  async function handleComplete() {
    setIsCompleting(true);
    setError(null);

    try {
      const result = await completeStudySession(
        session.id,
        plannerTaskId,
        markAssignmentCompleted ? assignmentId : null,
      );
      window.localStorage.removeItem(`study-session-task:${session.id}`);
      setCompletedMinutes(result.session.actual_minutes ?? 1);

      if (result.taskCompletionError) {
        setError(
          `Your session was saved, but the linked task could not be completed: ${result.taskCompletionError}`,
        );
        return;
      }

      if (result.assignmentCompletionError) {
        setError(
          `Your session was saved, but the assignment could not be completed: ${result.assignmentCompletionError}`,
        );
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch (completionError) {
      setError(
        completionError instanceof Error
          ? completionError.message
          : "Could not complete the study session.",
      );
      setIsCompleting(false);
    }
  }

  async function handleCancel() {
    if (!window.confirm("Cancel this study session? Studied time will not be saved.")) {
      return;
    }

    setIsCancelling(true);
    setError(null);

    try {
      await cancelStudySession(session.id);
      window.localStorage.removeItem(`study-session-task:${session.id}`);
      router.push(cancelHref);
      router.refresh();
    } catch (cancelError) {
      setError(
        cancelError instanceof Error
          ? cancelError.message
          : "Could not cancel the study session.",
      );
      setIsCancelling(false);
    }
  }

  if (completedMinutes !== null) {
    return (
      <div
        className={cn(
          "w-full rounded-3xl border border-emerald-200 bg-white px-5 py-4 shadow-sm",
          className,
        )}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </span>
            <div>
              <p className="font-medium text-gray-950">Session complete</p>
              <p className="text-sm text-gray-500">
                {completedMinutes}{" "}
                {completedMinutes === 1 ? "minute" : "minutes"} saved
              </p>
            </div>
          </div>
          <Button asChild className="rounded-full">
            <Link href="/dashboard">View dashboard</Link>
          </Button>
        </div>
        {error && <p className="mt-3 text-sm text-amber-700">{error}</p>}
      </div>
    );
  }

  const isBusy = isCompleting || isCancelling;

  return (
    <div
      className={cn(
        "w-full rounded-3xl border border-gray-200 bg-white px-4 py-3 shadow-sm",
        className,
      )}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-600">
            <Clock3 className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
              <p className="font-mono text-xl font-semibold tracking-tight text-gray-950">
                {formatElapsedTime(elapsedSeconds)}
              </p>
              <p className="text-xs text-gray-500">
                {getSessionTypeLabel(session.session_type)}
                {session.planned_minutes
                  ? ` · ${session.planned_minutes} min planned`
                  : " · Study at your pace"}
              </p>
            </div>
            {assignmentId ? (
              <label className="mt-1 inline-flex cursor-pointer items-center gap-2 text-xs text-gray-500">
                <input
                  type="checkbox"
                  checked={markAssignmentCompleted}
                  disabled={isBusy}
                  onChange={(event) =>
                    setMarkAssignmentCompleted(event.target.checked)
                  }
                  className="h-3.5 w-3.5 rounded border-gray-300"
                />
                Also mark assignment complete
              </label>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="rounded-full text-gray-500"
            disabled={isBusy}
            onClick={handleCancel}
          >
            <X className="h-4 w-4" />
            {isCancelling ? "Cancelling..." : "Cancel"}
          </Button>
          <Button
            type="button"
            size="sm"
            className="rounded-full bg-black px-4 text-white hover:bg-gray-700"
            disabled={isBusy}
            onClick={handleComplete}
          >
            <Check className="h-4 w-4" />
            {isCompleting ? "Saving..." : "Complete"}
          </Button>
        </div>
      </div>

      {error && <p className="mt-3 px-2 text-sm text-red-700">{error}</p>}
    </div>
  );
}

function formatElapsedTime(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
}
