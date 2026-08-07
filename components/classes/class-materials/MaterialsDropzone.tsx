"use client";

import type { ChangeEvent, RefObject } from "react";
import { Loader2, Upload } from "lucide-react";

import {
  MAX_TUTOR_FILES,
  STUDY_FILE_ACCEPT,
  SUPPORTED_STUDY_FILE_LABEL,
} from "@/lib/files/uploadConstraints";

export function MaterialsDropzone({
  fileInputRef,
  isDragging,
  isAnalyzing,
  isSaving,
  onDraggingChange,
  onFileChange,
  onFilesDropped,
}: {
  fileInputRef: RefObject<HTMLInputElement | null>;
  isDragging: boolean;
  isAnalyzing: boolean;
  isSaving: boolean;
  onDraggingChange: (dragging: boolean) => void;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onFilesDropped: (files: File[]) => void;
}) {
  const disabled = isAnalyzing || isSaving;

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        className="sr-only"
        accept={STUDY_FILE_ACCEPT}
        multiple
        disabled={disabled}
        onChange={onFileChange}
      />
      <button
        type="button"
        disabled={disabled}
        className={`group flex min-h-44 w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-5 py-8 text-center shadow-sm transition duration-200 focus-visible:border-blue-500 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100 active:scale-[0.995] ${
          isDragging
            ? "border-blue-500 bg-blue-50 shadow-md shadow-blue-100"
            : "border-blue-200 bg-blue-50/50 hover:border-blue-400 hover:bg-white hover:shadow-md hover:shadow-blue-100/70"
        } disabled:cursor-not-allowed disabled:opacity-70`}
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) onDraggingChange(true);
        }}
        onDragLeave={() => onDraggingChange(false)}
        onDrop={(event) => {
          event.preventDefault();
          onDraggingChange(false);
          if (!disabled) onFilesDropped(Array.from(event.dataTransfer.files ?? []));
        }}
      >
        <span className={`flex h-14 w-14 items-center justify-center rounded-xl border transition ${
          isDragging
            ? "border-blue-200 bg-white text-blue-700"
            : "border-blue-100 bg-white text-blue-600 group-hover:border-blue-200 group-hover:text-blue-700"
        }`} aria-hidden="true">
          {isAnalyzing ? <Loader2 className="h-7 w-7 animate-spin" /> : <Upload className="h-7 w-7" />}
        </span>
        <span className="mt-4 text-lg font-semibold text-slate-950">
          {isAnalyzing ? "Analyzing files..." : "Drop files here or click to upload"}
        </span>
        <span className="mt-2 text-sm text-slate-600">
          {SUPPORTED_STUDY_FILE_LABEL}, up to {MAX_TUTOR_FILES} files
        </span>
        <span className="mt-4 inline-flex items-center gap-2 rounded-lg bg-slate-950 px-3.5 py-2 text-sm font-semibold text-white transition group-hover:bg-blue-700">
          <Upload className="h-4 w-4" aria-hidden="true" />
          Choose files
        </span>
      </button>
    </>
  );
}
