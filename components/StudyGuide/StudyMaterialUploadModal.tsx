"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  formatFileSize,
  MAX_STUDY_FILE_BYTES,
  STUDY_FILE_ACCEPT,
  SUPPORTED_STUDY_FILE_LABEL,
} from "@/lib/files/uploadConstraints";
import {
  CircleAlert,
  FileText,
  LoaderCircle,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";

export type GeneratedStudyGuide = {
  title: string;
  content: string;
  originalFileName: string;
};

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

async function readGenerateResponse(
  response: Response,
): Promise<GenerateStudyGuideResponse> {
  try {
    return (await response.json()) as GenerateStudyGuideResponse;
  } catch {
    return {};
  }
}

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
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isLoading) {
        setSourceFile(null);
        onError(null);
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
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

    try {
      const formData = new FormData();
      formData.append("file", sourceFile);

      const response = await fetch("/api/study-guides/generate", {
        method: "POST",
        body: formData,
      });
      const payload = await readGenerateResponse(response);

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
    } catch {
      onError("Could not generate a study guide. Please try again.");
    } finally {
      onLoadingChange(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-8"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          closeModal();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="study-guide-upload-title"
        aria-describedby="study-guide-upload-description"
        aria-busy={isLoading}
        className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              id="study-guide-upload-title"
              className="text-xl font-semibold text-slate-950"
            >
              Generate a study guide
            </h2>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            ref={closeButtonRef}
            onClick={closeModal}
            disabled={isLoading}
            aria-label="Close upload dialog"
            className="shrink-0 rounded-lg text-slate-500"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>

        <form onSubmit={generateStudyGuide} className="mt-6">
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

          <label
            htmlFor="study-guide-source-file"
            onDragOver={(event) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => {
              setIsDragging(false);
            }}
            onDrop={(event) => {
              event.preventDefault();
              setIsDragging(false);
              updateSourceFile(event.dataTransfer.files?.[0] ?? null);
            }}
            className={`flex min-h-72 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed transition ${
              isDragging
                ? "border-slate-500 bg-slate-100"
                : "border-slate-300 bg-white hover:bg-slate-50"
            }`}
          >
            {sourceFile ? (
              <>
                <FileText className="h-8 w-8 text-slate-600" aria-hidden="true" />
                <p className="mt-3 max-w-sm truncate text-sm font-medium text-slate-800">
                  {sourceFile.name}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Click or drag another file to replace it
                </p>
              </>
            ) : (
              <>
                <Upload className="h-8 w-8 text-slate-600" aria-hidden="true" />
                <p className="mt-3 text-sm text-slate-600">Drag sources here</p>
                <p className="mt-1 text-xs text-slate-400">
                  {SUPPORTED_STUDY_FILE_LABEL}, up to {formatFileSize(MAX_STUDY_FILE_BYTES)}
                </p>
              </>
            )}
          </label>

          {error ? (
            <div
              className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
              role="alert"
            >
              <CircleAlert
                className="mt-0.5 h-4 w-4 shrink-0"
                aria-hidden="true"
              />
              <span>{error}</span>
            </div>
          ) : null}

          <p className="sr-only" role="status" aria-live="polite">
            {isLoading
              ? "Generating your study guide. This may take a moment."
              : ""}
          </p>

          <div className="mt-4 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={closeModal}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!sourceFile || isLoading}>
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
        </form>
      </div>
    </div>
  );
}
