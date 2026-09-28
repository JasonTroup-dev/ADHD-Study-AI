"use client";

import { CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";

export function CompleteAssignmentButton({
  assignmentId,
  isCompleted,
}: {
  assignmentId: string;
  isCompleted: boolean;
}) {
  const router = useRouter();
  const [isCompleting, setIsCompleting] = useState(false);
  const [wasCompleted, setWasCompleted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const completed = isCompleted || wasCompleted;

  async function handleComplete() {
    setIsCompleting(true);
    setErrorMessage(null);

    try {
      const response = await fetch(
        `/api/assignments/${encodeURIComponent(assignmentId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "completed" }),
        },
      );
      const payload = await readJson(response);

      if (!response.ok) {
        throw new Error(
          getErrorMessage(payload, "The assignment could not be completed."),
        );
      }

      setWasCompleted(true);
      setIsCompleting(false);
      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "The assignment could not be completed.",
      );
      setIsCompleting(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <Button
        type="button"
        onClick={() => void handleComplete()}
        disabled={completed || isCompleting}
        className="h-10 rounded-lg bg-emerald-600 px-4 font-semibold text-white hover:bg-emerald-700 disabled:bg-emerald-100 disabled:text-emerald-700 disabled:opacity-100"
      >
        <CheckCircle2 aria-hidden="true" />
        {completed
          ? "Completed"
          : isCompleting
            ? "Completing..."
            : "Mark complete"}
      </Button>
      {errorMessage ? (
        <p className="max-w-xs text-right text-sm text-red-600" role="alert">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function getErrorMessage(payload: unknown, fallback: string) {
  return isRecord(payload) && typeof payload.error === "string"
    ? payload.error
    : fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
