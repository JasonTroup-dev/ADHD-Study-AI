"use client";

import {
  AlertCircle,
  CheckCircle2,
  FileText,
  Loader2,
  RefreshCw,
  ScanText,
  UploadCloud,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { FileProcessingStatus } from "@/components/ui/file-processing-status";
import { getClipboardFiles } from "@/lib/files/clipboardFiles";
import {
  ASSIGNMENT_MATERIAL_FILE_ACCEPT,
  formatFileSize,
  MAX_STUDY_FILE_BYTES,
  MAX_TUTOR_FILES,
  SUPPORTED_ASSIGNMENT_MATERIAL_FILE_EXTENSIONS,
  SUPPORTED_ASSIGNMENT_MATERIAL_FILE_LABEL,
} from "@/lib/files/uploadConstraints";
import { uploadFormData } from "@/lib/files/uploadFormData";
import { cn } from "@/lib/utils";

export type AssignmentMaterialSummary = {
  id: string;
  originalFileName: string;
  fileType: string;
  hasExtractedText: boolean;
};

type MaterialsUploadResponse = {
  materials?: AssignmentMaterialSummary[];
  warnings?: string[];
  updatedTaskCount?: number;
  remainingUnreadCount?: number;
  error?: string;
};

type PlanRefinementResponse = {
  contextVersion?: number;
  summary?: string;
  tasks?: Array<{
    id: string;
    proposedTitle: string;
  }>;
  updatedTaskCount?: number;
  error?: string;
};

export function AssignmentMaterialsPanel({
  assignmentId,
  initialMaterials,
}: {
  assignmentId: string;
  initialMaterials: AssignmentMaterialSummary[];
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const uploadControllerRef = useRef<AbortController | null>(null);
  const [materials, setMaterials] = useState(initialMaterials);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isReanalyzing, setIsReanalyzing] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadingFileNames, setUploadingFileNames] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const unreadImageCount = materials.filter(
    (material) => material.fileType.startsWith("image/") && !material.hasExtractedText,
  ).length;
  const imageMaterials = materials.filter(
    (material) => material.fileType.startsWith("image/"),
  );
  const hasReadableMaterials = materials.some(
    (material) => material.hasExtractedText,
  );
  const isProcessing = isUploading || isAnalyzing || isReanalyzing || isRefining;

  useEffect(() => {
    return () => uploadControllerRef.current?.abort();
  }, []);

  async function uploadFiles(files: File[]) {
    if (isProcessing || files.length === 0) return;

    const validationError = validateFiles(files);
    if (validationError) {
      setError(validationError);
      setNotice(null);
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setUploadingFileNames(files.map((file) => file.name));
    setError(null);
    setNotice(null);
    const controller = new AbortController();
    uploadControllerRef.current = controller;

    try {
      const formData = new FormData();
      files.forEach((file) => formData.append("files", file));
      const response = await uploadFormData<MaterialsUploadResponse>(
        `/api/assignments/${assignmentId}/materials`,
        formData,
        {
          signal: controller.signal,
          onUploadProgress: setUploadProgress,
        },
      );
      const payload = response.data ?? {};

      if (!response.ok || !payload.materials) {
        throw new Error(
          payload.error ?? "The study materials could not be uploaded.",
        );
      }

      setMaterials((current) => mergeMaterials(current, payload.materials ?? []));
      const uploadedCount = payload.materials.length;
      const successMessage = `${uploadedCount} study material${uploadedCount === 1 ? "" : "s"} uploaded.`;
      const taskMessage = payload.updatedTaskCount
        ? ` ${payload.updatedTaskCount} assignment task${payload.updatedTaskCount === 1 ? " was" : "s were"} updated from the material.`
        : "";
      setNotice(
        payload.warnings?.length
          ? `${successMessage}${taskMessage} ${payload.warnings.join(" ")}`
          : `${successMessage}${taskMessage}`,
      );
      setUploadingFileNames([]);
      router.refresh();
    } catch (uploadError) {
      if (uploadError instanceof DOMException && uploadError.name === "AbortError") {
        setError("Upload stopped. Choose the files again to retry.");
        return;
      }

      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "The study materials could not be uploaded.",
      );
    } finally {
      if (uploadControllerRef.current === controller) {
        uploadControllerRef.current = null;
      }
      setIsUploading(false);
    }
  }

  async function analyzeUnreadImages() {
    if (isProcessing || unreadImageCount === 0) return;

    setIsAnalyzing(true);
    setError(null);
    setNotice(null);
    let analyzedCount = 0;
    let updatedTaskCount = 0;
    let remainingUnreadCount = unreadImageCount;
    const warnings: string[] = [];

    try {
      while (remainingUnreadCount > 0) {
        const response = await fetch(`/api/assignments/${assignmentId}/materials`, {
          method: "PATCH",
        });
        const payload = await response.json() as MaterialsUploadResponse;
        if (!response.ok || !payload.materials) {
          throw new Error(payload.error ?? "The attached images could not be analyzed.");
        }

        setMaterials((current) => mergeMaterials(current, payload.materials ?? []));
        analyzedCount += payload.materials.length;
        updatedTaskCount = Math.max(
          updatedTaskCount,
          payload.updatedTaskCount ?? 0,
        );
        warnings.push(...(payload.warnings ?? []));
        const nextRemainingCount = payload.remainingUnreadCount ?? 0;
        if (payload.materials.length === 0 || nextRemainingCount >= remainingUnreadCount) {
          remainingUnreadCount = nextRemainingCount;
          break;
        }
        remainingUnreadCount = nextRemainingCount;
      }

      const taskMessage = updatedTaskCount
        ? ` ${updatedTaskCount} assignment task${updatedTaskCount === 1 ? " was" : "s were"} updated.`
        : "";
      const remainingMessage = remainingUnreadCount
        ? ` ${remainingUnreadCount} image${remainingUnreadCount === 1 ? " still needs" : "s still need"} analysis.`
        : "";
      setNotice(
        `${analyzedCount} assignment image${analyzedCount === 1 ? " was" : "s were"} analyzed.${taskMessage}${remainingMessage}${warnings.length ? ` ${warnings.join(" ")}` : ""}`,
      );
      router.refresh();
    } catch (analysisError) {
      setError(
        analysisError instanceof Error
          ? analysisError.message
          : "The attached images could not be analyzed.",
      );
    } finally {
      setIsAnalyzing(false);
    }
  }

  async function redistributeTasks() {
    if (isProcessing || !hasReadableMaterials) return;

    setIsRefining(true);
    setError(null);
    setNotice(null);

    try {
      const previewResponse = await fetch(
        `/api/assignments/${assignmentId}/plan-refinement`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "preview" }),
        },
      );
      const preview = await previewResponse.json() as PlanRefinementResponse;
      if (!previewResponse.ok || !preview.tasks || preview.contextVersion === undefined) {
        throw new Error(preview.error ?? "The assignment tasks could not be redistributed.");
      }

      if (preview.tasks.length === 0) {
        setNotice(preview.summary ?? "The assignment tasks already match the analyzed material.");
        return;
      }

      const applyResponse = await fetch(
        `/api/assignments/${assignmentId}/plan-refinement`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "apply",
            contextVersion: preview.contextVersion,
            tasks: preview.tasks,
          }),
        },
      );
      const applied = await applyResponse.json() as PlanRefinementResponse;
      if (!applyResponse.ok || applied.updatedTaskCount === undefined) {
        throw new Error(applied.error ?? "The assignment tasks could not be redistributed.");
      }

      setNotice(
        `${applied.updatedTaskCount} assignment task${applied.updatedTaskCount === 1 ? " was" : "s were"} redistributed from the analyzed material.`,
      );
      router.refresh();
    } catch (refinementError) {
      setError(
        refinementError instanceof Error
          ? refinementError.message
          : "The assignment tasks could not be redistributed.",
      );
    } finally {
      setIsRefining(false);
    }
  }

  async function reanalyzeImages() {
    if (isProcessing || imageMaterials.length === 0) return;

    setIsReanalyzing(true);
    setError(null);
    setNotice(null);
    let analyzedCount = 0;
    let updatedTaskCount = 0;
    const warnings: string[] = [];

    try {
      for (let start = 0; start < imageMaterials.length; start += MAX_TUTOR_FILES) {
        const batch = imageMaterials.slice(start, start + MAX_TUTOR_FILES);
        const isFinalBatch = start + MAX_TUTOR_FILES >= imageMaterials.length;
        const response = await fetch(`/api/assignments/${assignmentId}/materials`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            materialIds: batch.map((material) => material.id),
            updateTasks: isFinalBatch,
          }),
        });
        const payload = await response.json() as MaterialsUploadResponse;
        if (!response.ok || !payload.materials) {
          throw new Error(payload.error ?? "The attached images could not be reanalyzed.");
        }

        setMaterials((current) => mergeMaterials(current, payload.materials ?? []));
        analyzedCount += payload.materials.length;
        updatedTaskCount = Math.max(updatedTaskCount, payload.updatedTaskCount ?? 0);
        warnings.push(...(payload.warnings ?? []));
      }

      const taskMessage = updatedTaskCount
        ? ` ${updatedTaskCount} assignment task${updatedTaskCount === 1 ? " was" : "s were"} redistributed using those counters.`
        : "";
      setNotice(
        `${analyzedCount} assignment image${analyzedCount === 1 ? " was" : "s were"} reanalyzed using assignment counters.${taskMessage}${warnings.length ? ` ${warnings.join(" ")}` : ""}`,
      );
      router.refresh();
    } catch (analysisError) {
      setError(
        analysisError instanceof Error
          ? analysisError.message
          : "The attached images could not be reanalyzed.",
      );
    } finally {
      setIsReanalyzing(false);
    }
  }

  return (
    <section
      className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6"
      aria-labelledby="assignment-materials-heading"
      aria-busy={isProcessing}
    >
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-violet-700">
          Supporting context
        </p>
        <h2
          id="assignment-materials-heading"
          className="mt-1 text-xl font-semibold text-slate-950"
        >
          Assignment materials
        </h2>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          Add readings, notes, examples, or reference files related to this assignment.
        </p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ASSIGNMENT_MATERIAL_FILE_ACCEPT}
        multiple
        className="sr-only"
        disabled={isProcessing}
        aria-label="Upload assignment study materials"
        onChange={(event) => {
          void uploadFiles(Array.from(event.target.files ?? []));
          event.target.value = "";
        }}
      />

      <button
        type="button"
        disabled={isProcessing}
        className={cn(
          "group mt-5 flex min-h-36 w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-5 py-6 text-center transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100 disabled:cursor-wait disabled:opacity-70",
          isDragging
            ? "border-blue-500 bg-blue-50"
            : "border-slate-300 bg-slate-50 hover:border-blue-400 hover:bg-blue-50/50",
        )}
        onClick={() => inputRef.current?.click()}
        onPaste={(event) => {
          const files = getClipboardFiles(event.clipboardData);
          if (files.length === 0 || isProcessing) return;
          event.preventDefault();
          void uploadFiles(files);
        }}
        onDragEnter={(event) => {
          event.preventDefault();
          if (!isProcessing) setIsDragging(true);
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
          void uploadFiles(Array.from(event.dataTransfer.files ?? []));
        }}
      >
        <span
          className="flex size-11 items-center justify-center rounded-xl bg-white text-blue-700 shadow-sm"
          aria-hidden="true"
        >
          {isUploading ? (
            <Loader2 className="size-5 animate-spin" />
          ) : (
            <UploadCloud className="size-5" />
          )}
        </span>
        <span className="mt-3 font-semibold text-slate-950">
          {isUploading
            ? "Uploading materials..."
            : isAnalyzing
              ? "Analyzing attached images..."
              : isReanalyzing
                ? "Reanalyzing assignment images..."
              : isRefining
                ? "Redistributing assignment tasks..."
              : "Drop, paste, or click to upload"}
        </span>
        <span className="mt-1 text-xs leading-5 text-slate-500">
          {SUPPORTED_ASSIGNMENT_MATERIAL_FILE_LABEL} · up to {MAX_TUTOR_FILES} files · {formatFileSize(MAX_STUDY_FILE_BYTES)} each
        </span>
      </button>

      {isUploading ? (
        <FileProcessingStatus
          fileName={formatUploadingFiles(uploadingFileNames)}
          uploadProgress={uploadProgress}
          labels={{
            uploading: "Uploading",
            reading: "Reading material",
            preparing: "Saving assignment context",
            generating: "Updating assignment tasks",
          }}
          className="mt-3"
        />
      ) : null}

      {isAnalyzing || isReanalyzing ? (
        <FileProcessingStatus
          fileName={`${isReanalyzing ? imageMaterials.length : unreadImageCount} attached image${(isReanalyzing ? imageMaterials.length : unreadImageCount) === 1 ? "" : "s"}`}
          uploadProgress={1}
          labels={{
            uploading: "Ready",
            reading: "Reading image content",
            preparing: "Saving assignment context",
            generating: "Updating assignment tasks",
          }}
          className="mt-3"
        />
      ) : null}

      {isRefining ? (
        <FileProcessingStatus
          fileName="Analyzed assignment materials"
          uploadProgress={1}
          labels={{
            uploading: "Ready",
            reading: "Reviewing assignment work",
            preparing: "Dividing work across task slots",
            generating: "Updating assignment tasks",
          }}
          className="mt-3"
        />
      ) : null}

      {unreadImageCount > 0 || hasReadableMaterials ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {unreadImageCount > 0 && !isAnalyzing ? (
            <button
              type="button"
              disabled={isProcessing}
              onClick={() => void analyzeUnreadImages()}
              className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-semibold text-violet-800 transition-colors hover:bg-violet-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-100 disabled:cursor-wait disabled:opacity-60"
            >
              <ScanText className="size-4" aria-hidden="true" />
              Analyze {unreadImageCount} attached image{unreadImageCount === 1 ? "" : "s"}
            </button>
          ) : null}
          {hasReadableMaterials && !isRefining ? (
            <button
              type="button"
              disabled={isProcessing}
              onClick={() => void redistributeTasks()}
              className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-800 transition-colors hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100 disabled:cursor-wait disabled:opacity-60"
            >
              <RefreshCw className="size-4" aria-hidden="true" />
              Redistribute work across tasks
            </button>
          ) : null}
          {imageMaterials.length > 0 && !isReanalyzing ? (
            <button
              type="button"
              disabled={isProcessing}
              onClick={() => void reanalyzeImages()}
              className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-100 disabled:cursor-wait disabled:opacity-60"
            >
              <ScanText className="size-4" aria-hidden="true" />
              Reanalyze images using counters
            </button>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <p
          className="mt-3 flex items-start gap-2 text-sm font-medium text-red-700"
          role="alert"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {error}
        </p>
      ) : null}
      {notice ? (
        <p
          className="mt-3 flex items-start gap-2 text-sm font-medium text-emerald-700"
          role="status"
        >
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {notice}
        </p>
      ) : null}

      {materials.length ? (
        <ul className="mt-5 grid gap-2 sm:grid-cols-2" aria-label="Uploaded assignment materials">
          {materials.map((material) => (
            <li
              key={material.id}
              className="flex min-w-0 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white text-slate-600 shadow-xs">
                <FileText className="size-4" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900">
                  {material.originalFileName}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {material.hasExtractedText
                    ? material.fileType.startsWith("image/")
                      ? "Image ready for study tools"
                      : "Text ready for study tools"
                    : material.fileType.startsWith("image/")
                      ? "Image attached · analysis needed"
                      : "Attached without readable text"}
                </p>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-slate-500">No supporting materials uploaded yet.</p>
      )}
    </section>
  );
}

function validateFiles(files: File[]) {
  if (files.length > MAX_TUTOR_FILES) {
    return `Choose ${MAX_TUTOR_FILES} files or fewer at a time.`;
  }

  for (const file of files) {
    if (file.size <= 0 || file.size > MAX_STUDY_FILE_BYTES) {
      return `${file.name} must be between 1 byte and ${formatFileSize(MAX_STUDY_FILE_BYTES)}.`;
    }

    const extension = getFileExtension(file.name);
    if (!SUPPORTED_ASSIGNMENT_MATERIAL_FILE_EXTENSIONS.includes(
      extension as (typeof SUPPORTED_ASSIGNMENT_MATERIAL_FILE_EXTENSIONS)[number],
    )) {
      return `${file.name}: upload a ${SUPPORTED_ASSIGNMENT_MATERIAL_FILE_LABEL} file.`;
    }
  }

  return null;
}

function getFileExtension(fileName: string) {
  const lastDotIndex = fileName.lastIndexOf(".");
  return lastDotIndex === -1 ? "" : fileName.slice(lastDotIndex).toLowerCase();
}

function mergeMaterials(
  current: AssignmentMaterialSummary[],
  uploaded: AssignmentMaterialSummary[],
) {
  const uploadedIds = new Set(uploaded.map((material) => material.id));
  return [...uploaded, ...current.filter((material) => !uploadedIds.has(material.id))];
}

function formatUploadingFiles(fileNames: string[]) {
  if (fileNames.length === 0) return undefined;
  if (fileNames.length === 1) return fileNames[0];
  return `${fileNames[0]} and ${fileNames.length - 1} more`;
}
