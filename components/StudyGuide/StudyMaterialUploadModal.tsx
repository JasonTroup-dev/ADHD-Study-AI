"use client";

import { Button } from "@/components/ui/button";
import { FileProcessingStatus } from "@/components/ui/file-processing-status";
import type { GeneratedStudyGuide } from "./types";
import {
  formatFileSize,
  MAX_STUDY_FILE_BYTES,
  STUDY_FILE_ACCEPT,
  SUPPORTED_STUDY_FILE_LABEL,
} from "@/lib/files/uploadConstraints";
import { uploadFormData } from "@/lib/files/uploadFormData";
import {
  CircleAlert,
  FileCheck2,
  FileText,
  Layers3,
  LoaderCircle,
  Sparkles,
  Upload,
  WandSparkles,
  X,
} from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";

type StudyMaterialUploadModalProps = {
  isOpen: boolean;
  isLoading: boolean;
  error: string | null;
  onClose: () => void;
  onCreateStudyGuide: (studyGuide: GeneratedStudyGuide) => void;
  onLoadingChange: (isLoading: boolean) => void;
  onError: (error: string | null) => void;
};

type GenerateStudyGuideResponse = Partial<GeneratedStudyGuide> & {
  error?: string;
};

export default function StudyMaterialUploadModal({
  isOpen,
  isLoading,
  error,
  onClose,
  onCreateStudyGuide,
  onLoadingChange,
  onError,
}: StudyMaterialUploadModalProps) {
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const requestControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => requestControllerRef.current?.abort();
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    const previouslyFocusedElement = document.activeElement as HTMLElement | null;

    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      previouslyFocusedElement?.focus();
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isLoading) {
        setSourceFile(null);
        onError(null);
        onClose();
      }

      if (event.key !== "Tab") return;

      const focusableElements = dialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
      );

      if (!focusableElements?.length) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isLoading, isOpen, onClose, onError]);

  if (!isOpen) {
    return null;
  }

  function closeModal() {
    if (isLoading) return;

    setSourceFile(null);
    onError(null);
    onClose();
  }

  function updateSourceFile(file: File | null) {
    if (!file) {
      setSourceFile(null);
      return;
    }

    if (file.size > MAX_STUDY_FILE_BYTES) {
      setSourceFile(null);
      onError(
        `Upload a file ${formatFileSize(MAX_STUDY_FILE_BYTES)} or smaller.`,
      );
      return;
    }

    onError(null);
    setSourceFile(file);
  }

  async function generateStudyGuide(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!sourceFile || isLoading) {
      if (!sourceFile) {
        onError("Choose a study document before generating a guide.");
      }

      return;
    }

    onError(null);
    onLoadingChange(true);
    setUploadProgress(0);
    const controller = new AbortController();
    requestControllerRef.current = controller;

    try {
      const formData = new FormData();
      formData.append("file", sourceFile);

      const response = await uploadFormData<GenerateStudyGuideResponse>(
        "/api/study-guides/generate",
        formData,
        {
          signal: controller.signal,
          onUploadProgress: setUploadProgress,
        },
      );
      const payload = response.data ?? {};

      if (!response.ok) {
        onError(payload.error ?? "Could not generate a study guide.");
        return;
      }

      if (
        typeof payload.title !== "string" ||
        typeof payload.content !== "string" ||
        typeof payload.originalFileName !== "string"
      ) {
        onError("The generated study guide response was incomplete.");
        return;
      }

      onCreateStudyGuide({
        title: payload.title,
        content: payload.content,
        originalFileName: payload.originalFileName,
      });
      setSourceFile(null);
      onClose();
    } catch (generationError) {
      if (
        generationError instanceof DOMException &&
        generationError.name === "AbortError"
      ) {
        onError(
          "Generation stopped. Your file is ready whenever you want to try again.",
        );
        return;
      }

      onError("Could not generate a study guide. Please try again.");
    } finally {
      if (requestControllerRef.current === controller) {
        requestControllerRef.current = null;
      }
      onLoadingChange(false);
    }
  }

  function cancelGeneration() {
    requestControllerRef.current?.abort();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center overflow-hidden bg-slate-950/65 px-4 py-3 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          closeModal();
        }
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="study-guide-upload-title"
        aria-describedby="study-guide-upload-description"
        aria-busy={isLoading}
        className="mx-auto flex max-h-[calc(100svh-1.5rem)] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-white/20 bg-white shadow-2xl"
      >
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-100 px-6 py-4 sm:px-7">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
              <WandSparkles className="size-5" aria-hidden="true" />
            </span>
            <div>
            <h2
              id="study-guide-upload-title"
              className="text-lg font-semibold text-slate-950 sm:text-xl"
            >
              Create a study guide
            </h2>
            <p
              id="study-guide-upload-description"
              className="mt-1 text-sm leading-5 text-slate-500"
            >
              Add one source and we’ll organize it into a focused guide.
            </p>
            </div>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            ref={closeButtonRef}
            onClick={closeModal}
            disabled={isLoading}
            aria-label="Close upload dialog"
            className="shrink-0 rounded-xl text-slate-500"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        </header>

        <form onSubmit={generateStudyGuide} className="flex min-h-0 flex-1 flex-col">
          <input
            id="study-guide-source-file"
            type="file"
            accept={STUDY_FILE_ACCEPT}
            disabled={isLoading}
            onChange={(event) => {
              updateSourceFile(event.target.files?.[0] ?? null);
              event.target.value = "";
            }}
            className="sr-only"
          />

          <div className="grid min-h-0 flex-1 md:grid-cols-[15rem_minmax(0,1fr)]">
            <div className="hidden overflow-hidden bg-slate-950 p-6 text-white md:block">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-300">
                What you’ll get
              </p>
              <ul className="mt-6 space-y-5">
                <li className="flex gap-3">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/10 text-blue-200">
                    <FileText className="size-4" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold">Short summaries</p>
                    <p className="mt-1 text-xs leading-5 text-slate-400">The big picture without the wall of text.</p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/10 text-blue-200">
                    <Layers3 className="size-4" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold">Clear sections</p>
                    <p className="mt-1 text-xs leading-5 text-slate-400">Concepts broken into manageable chunks.</p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/10 text-blue-200">
                    <Sparkles className="size-4" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold">A next-step plan</p>
                    <p className="mt-1 text-xs leading-5 text-slate-400">A practical way to start studying.</p>
                  </div>
                </li>
              </ul>
            </div>

            <div className="flex min-h-0 flex-col p-5 sm:p-6">
              <p className="mb-3 text-sm font-semibold text-slate-900">Choose your source</p>
              <label
                htmlFor="study-guide-source-file"
                onDragOver={(event) => {
                  event.preventDefault();
                  if (!isLoading) setIsDragging(true);
                }}
                onDragLeave={() => {
                  setIsDragging(false);
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  setIsDragging(false);
                  if (!isLoading) {
                    updateSourceFile(event.dataTransfer.files?.[0] ?? null);
                  }
                }}
                className={`flex min-h-52 flex-1 flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed px-5 text-center transition ${
                  isLoading
                    ? "cursor-wait border-blue-200 bg-blue-50/60"
                    : isDragging
                      ? "cursor-copy border-blue-500 bg-blue-50"
                      : "cursor-pointer border-slate-300 bg-slate-50/70 hover:border-blue-400 hover:bg-blue-50/50"
                }`}
              >
                {isLoading ? (
                  <FileProcessingStatus
                    fileName={sourceFile?.name}
                    uploadProgress={uploadProgress}
                    labels={{
                      uploading: "Uploading",
                      reading: "Reading your material",
                      preparing: "Organizing the key ideas",
                      generating: "Writing your study guide",
                    }}
                    className="w-full max-w-md"
                  />
                ) : sourceFile ? (
                  <>
                    <span className="flex size-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                      <FileCheck2 className="size-7" aria-hidden="true" />
                    </span>
                    <p className="mt-4 max-w-full truncate font-semibold text-slate-900">
                      {sourceFile.name}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {formatUploadSize(sourceFile.size)} · Ready to generate
                    </p>
                    <span className="mt-4 text-xs font-semibold text-blue-700">Choose a different file</span>
                  </>
                ) : (
                  <>
                    <span className="flex size-14 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
                      <Upload className="size-6" aria-hidden="true" />
                    </span>
                    <p className="mt-4 font-semibold text-slate-900">Drop your study material here</p>
                    <p className="mt-1 text-sm text-slate-500">or click to browse your files</p>
                    <p className="mt-5 text-xs leading-5 text-slate-400">
                      {SUPPORTED_STUDY_FILE_LABEL}<br />Up to {formatFileSize(MAX_STUDY_FILE_BYTES)}
                    </p>
                  </>
                )}
              </label>

              {error ? (
                <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
                  <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  <span>{error}</span>
                </div>
              ) : null}
            </div>
          </div>

          <p className="sr-only" role="status" aria-live="polite">
            {isLoading
              ? "Generating your study guide. This may take a moment."
              : ""}
          </p>

          <div className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-slate-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
            <p className="text-xs text-slate-500">
              Your original file won’t be changed.
            </p>
            <div className="flex flex-col-reverse gap-3 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={isLoading ? cancelGeneration : closeModal}
              className="rounded-xl bg-white"
            >
              {isLoading ? "Stop generation" : "Cancel"}
            </Button>
            <Button type="submit" disabled={!sourceFile || isLoading} className="rounded-xl px-5">
              {isLoading ? (
                <LoaderCircle
                  className="h-4 w-4 animate-spin"
                  aria-hidden="true"
                />
              ) : (
                <Sparkles className="h-4 w-4" aria-hidden="true" />
              )}
              {isLoading ? "Generating guide..." : "Generate study guide"}
            </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

function formatUploadSize(bytes: number) {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))}KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}
