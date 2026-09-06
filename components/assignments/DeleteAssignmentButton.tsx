"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

export function DeleteAssignmentButton({
  assignmentId,
  assignmentTitle,
  returnHref,
}: {
  assignmentId: string;
  assignmentTitle: string;
  returnHref: string;
}) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleDelete() {
    const confirmed = window.confirm(
      `Delete "${assignmentTitle}"? Any attached assignment file and study materials will also be deleted.`,
    );

    if (!confirmed) return;

    setIsDeleting(true);
    setErrorMessage(null);

    try {
      const response = await fetch(
        `/api/assignments/${encodeURIComponent(assignmentId)}`,
        { method: "DELETE" },
      );
      const payload = await readJson(response);

      if (!response.ok) {
        throw new Error(
          getErrorMessage(payload, "The assignment could not be deleted."),
        );
      }

      router.replace(returnHref);
      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "The assignment could not be deleted.",
      );
      setIsDeleting(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <Button
        type="button"
        variant="outline"
        onClick={() => void handleDelete()}
        disabled={isDeleting}
        className="h-10 rounded-lg border-red-200 bg-white px-4 text-sm font-semibold text-red-700 shadow-none hover:bg-red-50 hover:text-red-800"
      >
        <Trash2 className="h-4 w-4" aria-hidden="true" />
        {isDeleting ? "Deleting..." : "Delete Assignment"}
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
