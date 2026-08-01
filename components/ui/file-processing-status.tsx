"use client";

import { Check, LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

export type FileProcessingLabels = {
  uploading?: string;
  reading: string;
  preparing: string;
  generating: string;
};

type FileProcessingStatusProps = {
  fileName?: string;
  labels: FileProcessingLabels;
  uploadProgress: number;
  className?: string;
};

export function FileProcessingStatus({
  fileName,
  labels,
  uploadProgress,
  className,
}: FileProcessingStatusProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
    }, 500);

    return () => window.clearInterval(timer);
  }, []);

  const state = getProcessingState(uploadProgress, elapsedSeconds, labels);

  return (
    <div
      className={cn(
        "rounded-2xl border border-blue-200 bg-blue-50/80 p-4 text-left",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white text-blue-700 shadow-sm">
          <LoaderCircle className="size-5 motion-safe:animate-spin" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-950">{state.label}</p>
              {fileName ? (
                <p className="mt-0.5 truncate text-xs text-slate-500">{fileName}</p>
              ) : null}
            </div>
            <span className="shrink-0 text-xs font-semibold tabular-nums text-blue-700">
              {state.progress}%
            </span>
          </div>

          <div
            className="mt-3 h-2 overflow-hidden rounded-full bg-blue-100"
            role="progressbar"
            aria-label={state.label}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={state.progress}
          >
            <div
              className="h-full rounded-full bg-blue-600 transition-[width] duration-500 ease-out"
              style={{ width: `${state.progress}%` }}
            />
          </div>

          <div className="mt-3 grid grid-cols-3 gap-1 text-[11px] font-medium text-slate-500">
            {state.steps.map((step) => (
              <span
                key={step.label}
                className={cn(
                  "flex items-center gap-1",
                  step.isActive && "text-blue-700",
                  step.isComplete && "text-emerald-700",
                )}
              >
                {step.isComplete ? (
                  <Check className="size-3" aria-hidden="true" />
                ) : (
                  <span
                    className={cn(
                      "size-1.5 rounded-full bg-slate-300",
                      step.isActive && "bg-blue-600",
                    )}
                    aria-hidden="true"
                  />
                )}
                <span className="truncate">{step.label}</span>
              </span>
            ))}
          </div>

          <p className="mt-3 text-xs leading-5 text-slate-500">
            {elapsedSeconds >= 20
              ? `Still working — larger files can take a little longer. ${elapsedSeconds}s elapsed.`
              : elapsedSeconds >= 8
                ? `Working in the background · ${elapsedSeconds}s elapsed`
                : "Keep this window open while we finish."}
          </p>
        </div>
      </div>
    </div>
  );
}

function getProcessingState(
  uploadProgress: number,
  elapsedSeconds: number,
  labels: FileProcessingLabels,
) {
  const normalizedUploadProgress = Math.max(0, Math.min(uploadProgress, 1));
  const isUploading = normalizedUploadProgress < 1;
  const processingSeconds = isUploading ? 0 : elapsedSeconds;
  const stage = isUploading ? 0 : processingSeconds < 5 ? 1 : processingSeconds < 12 ? 2 : 3;

  let progress: number;
  if (isUploading) {
    progress = Math.round(5 + normalizedUploadProgress * 20);
  } else if (processingSeconds < 5) {
    progress = 28 + Math.round((processingSeconds / 5) * 20);
  } else if (processingSeconds < 12) {
    progress = 48 + Math.round(((processingSeconds - 5) / 7) * 20);
  } else {
    progress = Math.min(94, 68 + Math.round(((processingSeconds - 12) / 30) * 26));
  }

  const stepLabels = [
    labels.uploading ?? "Upload",
    labels.reading,
    labels.generating,
  ];

  return {
    label:
      stage === 0
        ? `${labels.uploading ?? "Uploading"} ${Math.round(normalizedUploadProgress * 100)}%`
        : stage === 1
          ? labels.reading
          : stage === 2
            ? labels.preparing
            : labels.generating,
    progress,
    steps: stepLabels.map((label, index) => ({
      label,
      isActive: index === Math.min(stage, 2),
      isComplete: index < Math.min(stage, 2),
    })),
  };
}
