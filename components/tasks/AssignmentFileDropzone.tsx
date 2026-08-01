"use client";

import { UploadCloud } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { FileProcessingStatus } from "@/components/ui/file-processing-status";
import {
  ASSIGNMENT_FILE_ACCEPT,
  formatFileSize,
  MAX_STUDY_FILE_BYTES,
  SUPPORTED_ASSIGNMENT_FILE_EXTENSIONS,
  SUPPORTED_ASSIGNMENT_FILE_LABEL,
} from "@/lib/files/uploadConstraints";
import { uploadFormData } from "@/lib/files/uploadFormData";
import { cn } from "@/lib/utils";

type AssignmentFileDropzoneProps = {
  taskId: string;
  assignmentId: string | null;
  currentFileName: string | null;
};

export function AssignmentFileDropzone({
  taskId,
  assignmentId,
  currentFileName,
}: AssignmentFileDropzoneProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const uploadControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => uploadControllerRef.current?.abort();
  }, []);

  async function uploadFile(file: File | undefined) {
    if (!file || isUploading) return;

    const extension = getFileExtension(file.name);
    if (
      !SUPPORTED_ASSIGNMENT_FILE_EXTENSIONS.includes(
        extension as (typeof SUPPORTED_ASSIGNMENT_FILE_EXTENSIONS)[number],
      )
    ) {
      setError(`Upload a ${SUPPORTED_ASSIGNMENT_FILE_LABEL} file.`);
      return;
    }

    if (file.size <= 0 || file.size > MAX_STUDY_FILE_BYTES) {
      setError(
        `Choose a file between 1 byte and ${formatFileSize(MAX_STUDY_FILE_BYTES)}.`,
      );
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setPendingFile(file);
    setError(null);
    setNotice(null);
    const controller = new AbortController();
    uploadControllerRef.current = controller;

    try {
      let targetAssignmentId = assignmentId;

      if (!targetAssignmentId) {
        const linkResponse = await fetch(
          `/api/study-plan-tasks/${taskId}/assignment`,
          { method: "POST", signal: controller.signal },
        );
        const linkPayload = await readJson(linkResponse);

        if (!linkResponse.ok || typeof linkPayload.assignmentId !== "string") {
          throw new Error(
            typeof linkPayload.error === "string"
              ? linkPayload.error
              : "The task could not be prepared for an upload.",
          );
        }

        targetAssignmentId = linkPayload.assignmentId;
      }

      const formData = new FormData();
      formData.append("file", file);
      const uploadResponse = await uploadFormData<Record<string, unknown>>(
        `/api/assignments/${targetAssignmentId}/file`,
        formData,
        {
          signal: controller.signal,
          onUploadProgress: setUploadProgress,
        },
      );
      const uploadPayload = uploadResponse.data ?? {};

      if (!uploadResponse.ok) {
        throw new Error(
          typeof uploadPayload.error === "string"
            ? uploadPayload.error
            : "The assignment file could not be uploaded.",
        );
      }

      setNotice(
        typeof uploadPayload.warning === "string"
          ? uploadPayload.warning
          : `${file.name} is ready.`,
      );
      setPendingFile(null);
      router.refresh();
    } catch (uploadError) {
      if (uploadError instanceof DOMException && uploadError.name === "AbortError") {
        setError("Upload stopped. Your file is ready to retry.");
        return;
      }

      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "The assignment file could not be uploaded.",
      );
    } finally {
      if (uploadControllerRef.current === controller) {
        uploadControllerRef.current = null;
      }
      setIsUploading(false);
    }
  }

  function cancelUpload() {
    uploadControllerRef.current?.abort();
  }

  return (
    <div aria-busy={isUploading}>
      <input
        ref={inputRef}
        type="file"
        accept={ASSIGNMENT_FILE_ACCEPT}
        className="sr-only"
        disabled={isUploading}
        aria-label="Upload assignment file"
        onChange={(event) => {
          void uploadFile(event.target.files?.[0]);
          event.target.value = "";
        }}
      />

      <div
        onDragEnter={(event) => {
          event.preventDefault();
          if (!isUploading) setIsDragging(true);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
            setIsDragging(false);
          }
        }}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          void uploadFile(event.dataTransfer.files?.[0]);
        }}
        className={cn(
          "flex items-center gap-4 rounded-xl border-2 border-dashed px-5 py-4 text-left transition-colors",
          isDragging
            ? "border-blue-500 bg-blue-50"
            : "border-slate-300 bg-slate-50 hover:border-slate-400 hover:bg-slate-100/70",
          isUploading && "cursor-wait opacity-70",
        )}
      >
        <UploadCloud className="size-7 shrink-0 text-slate-500" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-slate-950">
            {isUploading
              ? "Uploading assignment brief..."
              : currentFileName
                ? "Replace the assignment file"
                : "Drop the assignment file here"}
          </h3>
          <p className="mt-0.5 truncate text-xs text-slate-500">
            {currentFileName
              ? currentFileName
              : `${SUPPORTED_ASSIGNMENT_FILE_LABEL}, up to ${formatFileSize(MAX_STUDY_FILE_BYTES)}`}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0 bg-white"
          onClick={
            isUploading
              ? cancelUpload
              : pendingFile
                ? () => void uploadFile(pendingFile)
                : () => inputRef.current?.click()
          }
        >
          {isUploading
            ? "Stop"
            : pendingFile
              ? "Retry"
              : currentFileName
                ? "Replace"
                : "Choose file"}
        </Button>
      </div>

      {isUploading ? (
        <FileProcessingStatus
          fileName={pendingFile?.name}
          uploadProgress={uploadProgress}
          labels={{
            uploading: "Uploading",
            reading: "Reading assignment instructions",
            preparing: "Saving assignment context",
            generating: "Refreshing task details",
          }}
          className="mt-3"
        />
      ) : null}

      {error ? (
        <p className="mt-3 text-sm font-medium text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="mt-3 text-sm font-medium text-emerald-700" role="status">
          {notice}
        </p>
      ) : null}
    </div>
  );
}

function getFileExtension(fileName: string) {
  const lastDotIndex = fileName.lastIndexOf(".");
  return lastDotIndex === -1 ? "" : fileName.slice(lastDotIndex).toLowerCase();
}

async function readJson(response: Response): Promise<Record<string, unknown>> {
  try {
    return (await response.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}
