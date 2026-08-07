"use client";

import type { FormEvent } from "react";
import {
  BookOpen,
  CalendarDays,
  FileText,
  LoaderCircle,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Upload,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { FileProcessingStatus } from "@/components/ui/file-processing-status";
import {
  formatFileSize,
  MAX_STUDY_FILE_BYTES,
  SUPPORTED_SYLLABUS_FILE_LABEL,
  SYLLABUS_FILE_ACCEPT,
} from "@/lib/files/uploadConstraints";

import { ErrorMessage } from "./ErrorMessage";

export function UploadStep({
  sourceFile,
  isDragging,
  isAnalyzing,
  uploadProgress,
  error,
  onSubmit,
  onClose,
  onCancelAnalysis,
  onDraggingChange,
  onFileChange,
}: {
  sourceFile: File | null;
  isDragging: boolean;
  isAnalyzing: boolean;
  uploadProgress: number;
  error: string | null;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
  onCancelAnalysis: () => void;
  onDraggingChange: (isDragging: boolean) => void;
  onFileChange: (file: File | null) => void;
}) {
  return (
    <form onSubmit={onSubmit} className="min-h-0 overflow-y-auto">
      <div className="grid gap-5 p-5 sm:p-6 md:grid-cols-[0.9fr_1.1fr]">
        <section className="relative overflow-hidden rounded-2xl bg-slate-950 p-5 text-white sm:p-7">
          <div className="absolute -right-16 -top-20 size-52 rounded-full bg-blue-500/25 blur-3xl" aria-hidden="true" />
          <div className="absolute -bottom-16 left-4 size-44 rounded-full bg-violet-500/20 blur-3xl" aria-hidden="true" />
          <div className="relative">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-slate-200">
              <Sparkles className="size-3.5 text-blue-300" aria-hidden="true" />
              AI-powered planning
            </span>
            <h2 className="mt-4 max-w-xs text-xl font-semibold leading-tight tracking-tight sm:mt-6 sm:text-3xl">
              Your syllabus, turned into a plan you can follow.
            </h2>
            <p className="mt-3 max-w-sm text-sm leading-6 text-slate-300">
              We&apos;ll find important dates, estimate the workload, and spread the work into manageable study blocks.
            </p>
            <div className="mt-8 hidden space-y-3 md:block">
              <Feature icon={BookOpen} label="Detect class details and assignments" />
              <Feature icon={CalendarDays} label="Build around every due date" />
              <Feature icon={SlidersHorizontal} label="Keep your daily workload realistic" />
            </div>
          </div>
        </section>

        <section className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Step 1 of 2</p>
            <h3 className="mt-2 text-xl font-semibold text-slate-950">Add your syllabus</h3>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Upload the file your instructor provided. You&apos;ll review everything before it is added.
            </p>
          </div>
          <input
            id="study-plan-source-file"
            type="file"
            accept={SYLLABUS_FILE_ACCEPT}
            disabled={isAnalyzing}
            onChange={(event) => {
              onFileChange(event.target.files?.[0] ?? null);
              event.target.value = "";
            }}
            className="sr-only"
          />
          <label
            htmlFor="study-plan-source-file"
            onDragOver={(event) => {
              event.preventDefault();
              if (!isAnalyzing) onDraggingChange(true);
            }}
            onDragLeave={() => onDraggingChange(false)}
            onDrop={(event) => {
              event.preventDefault();
              onDraggingChange(false);
              if (!isAnalyzing) onFileChange(event.dataTransfer.files?.[0] ?? null);
            }}
            className={`mt-5 flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-5 text-center transition-all md:min-h-56 ${
              isAnalyzing
                ? "cursor-wait border-blue-200 bg-blue-50/50"
                : isDragging
                  ? "scale-[1.01] border-blue-500 bg-blue-50"
                  : sourceFile
                    ? "border-emerald-300 bg-emerald-50/60 hover:bg-emerald-50"
                    : "border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-slate-100/70"
            }`}
          >
            <span className={`flex size-12 items-center justify-center rounded-2xl shadow-sm ${sourceFile ? "bg-emerald-600 text-white" : "bg-white text-slate-700"}`}>
              {sourceFile ? <FileText className="size-6" aria-hidden="true" /> : <Upload className="size-6" aria-hidden="true" />}
            </span>
            {sourceFile ? (
              <>
                <p className="mt-4 max-w-full truncate text-sm font-semibold text-slate-900">{sourceFile.name}</p>
                <p className="mt-1 text-xs text-slate-500">{formatFileSize(sourceFile.size)} · Ready to analyze</p>
                <span className="mt-3 text-xs font-semibold text-emerald-700">Choose a different file</span>
              </>
            ) : (
              <>
                <p className="mt-4 text-sm font-semibold text-slate-900">Drop your syllabus here</p>
                <p className="mt-1 text-xs text-slate-500">or click to browse your files</p>
                <p className="mt-4 text-[11px] text-slate-400">{SUPPORTED_SYLLABUS_FILE_LABEL} · Max {formatFileSize(MAX_STUDY_FILE_BYTES)}</p>
              </>
            )}
          </label>
          {isAnalyzing ? (
            <FileProcessingStatus
              fileName={sourceFile?.name}
              uploadProgress={uploadProgress}
              labels={{
                uploading: "Uploading",
                reading: "Reading your syllabus",
                preparing: "Finding classes and deadlines",
                generating: "Preparing assignments for review",
              }}
              className="mt-4"
            />
          ) : null}
          <div className="mt-4 flex items-start gap-2 text-xs leading-5 text-slate-500">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-slate-400" aria-hidden="true" />
            Your file is only used to extract the course details needed for this plan.
          </div>
          {error ? <ErrorMessage message={error} /> : null}
        </section>
      </div>
      <footer className="sticky bottom-0 flex flex-col-reverse gap-3 border-t border-slate-200 bg-white/95 px-5 py-4 backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="hidden text-xs text-slate-400 sm:block">Nothing is saved until you confirm the next step.</p>
        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          <Button type="button" variant="outline" onClick={isAnalyzing ? onCancelAnalysis : onClose} className="sm:min-w-24">
            {isAnalyzing ? "Stop analysis" : "Cancel"}
          </Button>
          <Button type="submit" disabled={!sourceFile || isAnalyzing} className="min-w-44 bg-blue-600 text-white hover:bg-blue-700">
            {isAnalyzing ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Sparkles className="size-4" aria-hidden="true" />}
            {isAnalyzing ? "Reading syllabus..." : "Analyze syllabus"}
          </Button>
        </div>
      </footer>
    </form>
  );
}

function Feature({ icon: Icon, label }: { icon: typeof BookOpen; label: string }) {
  return (
    <div className="flex items-center gap-3 text-sm text-slate-200">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/10">
        <Icon className="size-4 text-blue-300" aria-hidden="true" />
      </span>
      {label}
    </div>
  );
}
