"use client";

import { type FormEvent, useState } from "react";
import { FileText, Upload, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ASSIGNMENT_FILE_ACCEPT,
  formatFileSize,
  MAX_STUDY_FILE_BYTES,
  MAX_TUTOR_FILES,
  STUDY_FILE_ACCEPT,
  SUPPORTED_ASSIGNMENT_FILE_EXTENSIONS,
  SUPPORTED_ASSIGNMENT_FILE_LABEL,
  SUPPORTED_STUDY_FILE_EXTENSIONS,
  SUPPORTED_STUDY_FILE_LABEL,
} from "@/lib/files/uploadConstraints";
import type {
  AssignmentClassOption,
  AssignmentImportance,
  NewAssignment,
} from "@/types/assignments";

type AssignmentModalProps = {
  isOpen: boolean;
  classes: AssignmentClassOption[];
  defaultClassId?: string;
  allowNoClass?: boolean;
  isSubmitting?: boolean;
  error?: string | null;
  onClose: () => void;
  onClearError?: () => void;
  onSubmit: (assignment: NewAssignment) => Promise<void> | void;
};

function getInitialDueDate() {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  return date.toISOString().split("T")[0];
}

export default function AssignmentModal({
  isOpen,
  classes,
  defaultClassId,
  allowNoClass = true,
  isSubmitting = false,
  error,
  onClose,
  onClearError,
  onSubmit,
}: AssignmentModalProps) {
  const [title, setTitle] = useState("");
  const [classId, setClassId] = useState(
    defaultClassId ?? (allowNoClass ? "" : (classes[0]?.id ?? "")),
  );
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState(getInitialDueDate);
  const [importance, setImportance] =
    useState<AssignmentImportance>("medium");
  const [points, setPoints] = useState("");
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [materialFiles, setMaterialFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  if (!isOpen) return null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedTitle = title.trim();
    if (!trimmedTitle || !dueDate) return;

    await onSubmit({
      title: trimmedTitle,
      classId: classId || null,
      description: description.trim() || null,
      dueDate,
      importance,
      points: points === "" ? null : Number(points),
      file: sourceFile,
      materials: materialFiles,
    });
  }

  function updateSourceFile(file: File | null) {
    if (!file) {
      setSourceFile(null);
      setFileError(null);
      onClearError?.();
      return;
    }

    const extension = getFileExtension(file.name);

    if (
      !SUPPORTED_ASSIGNMENT_FILE_EXTENSIONS.includes(
        extension as (typeof SUPPORTED_ASSIGNMENT_FILE_EXTENSIONS)[number],
      )
    ) {
      setSourceFile(null);
      setFileError(
        `Unsupported file type. Upload a ${SUPPORTED_ASSIGNMENT_FILE_LABEL} file.`,
      );
      return;
    }

    if (file.size > MAX_STUDY_FILE_BYTES) {
      setSourceFile(null);
      setFileError(
        `File too large. Upload a file ${formatFileSize(
          MAX_STUDY_FILE_BYTES,
        )} or smaller.`,
      );
      return;
    }

    setFileError(null);
    onClearError?.();
    setSourceFile(file);
  }

  function addMaterialFiles(files: File[]) {
    const nextFiles = files.filter((file) => {
      const extension = getFileExtension(file.name);
      return SUPPORTED_STUDY_FILE_EXTENSIONS.includes(
        extension as (typeof SUPPORTED_STUDY_FILE_EXTENSIONS)[number],
      ) && file.size <= MAX_STUDY_FILE_BYTES;
    });
    const invalidFile = files.find((file) => !nextFiles.includes(file));

    if (invalidFile) {
      setFileError(
        `${invalidFile.name} must be a supported ${SUPPORTED_STUDY_FILE_LABEL} file no larger than ${formatFileSize(MAX_STUDY_FILE_BYTES)}.`,
      );
      return;
    }

    const combinedFiles = [...materialFiles, ...nextFiles].filter(
      (file, index, allFiles) =>
        allFiles.findIndex(
          (candidate) =>
            candidate.name === file.name
            && candidate.size === file.size
            && candidate.lastModified === file.lastModified,
        ) === index,
    );

    if (combinedFiles.length > MAX_TUTOR_FILES) {
      setFileError(`Add ${MAX_TUTOR_FILES} study materials or fewer.`);
      return;
    }

    setMaterialFiles(combinedFiles);
    setFileError(null);
    onClearError?.();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isSubmitting) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="assignment-modal-title"
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              id="assignment-modal-title"
              className="text-2xl font-semibold text-gray-950"
            >
              Add Assignment
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              Add the details you need to plan this assignment.
            </p>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Close assignment modal"
            disabled={isSubmitting}
            onClick={onClose}
          >
            <X />
          </Button>
        </div>

        <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="assignment-title">Title</Label>
            <Input
              id="assignment-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="e.g., Research paper draft"
              autoFocus
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="assignment-class">Class</Label>
            <select
              id="assignment-class"
              value={classId}
              onChange={(event) => setClassId(event.target.value)}
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {allowNoClass ? <option value="">No class</option> : null}
              {classes.map((classItem) => (
                <option key={classItem.id} value={classItem.id}>
                  {classItem.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="assignment-description">Description</Label>
            <Textarea
              id="assignment-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Add a short description or key requirements"
              rows={3}
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="assignment-due-date">Due date</Label>
              <Input
                id="assignment-due-date"
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="assignment-importance">Importance</Label>
              <select
                id="assignment-importance"
                value={importance}
                onChange={(event) =>
                  setImportance(event.target.value as AssignmentImportance)
                }
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="assignment-points">Points</Label>
              <Input
                id="assignment-points"
                type="number"
                min="0"
                step="0.01"
                value={points}
                onChange={(event) => setPoints(event.target.value)}
                placeholder="100"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="assignment-file">Assignment file (optional)</Label>
            <input
              id="assignment-file"
              type="file"
              accept={ASSIGNMENT_FILE_ACCEPT}
              disabled={isSubmitting}
              onChange={(event) => {
                updateSourceFile(event.target.files?.[0] ?? null);
                event.target.value = "";
              }}
              className="sr-only"
            />
            <label
              htmlFor="assignment-file"
              onDragOver={(event) => {
                event.preventDefault();
                if (!isSubmitting) setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(event) => {
                event.preventDefault();
                setIsDragging(false);
                if (!isSubmitting) {
                  updateSourceFile(event.dataTransfer.files?.[0] ?? null);
                }
              }}
              className={`flex min-h-32 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed px-5 py-6 transition ${
                isDragging
                  ? "border-gray-500 bg-gray-100"
                  : "border-gray-300 bg-gray-50 hover:bg-gray-100"
              } ${isSubmitting ? "cursor-not-allowed opacity-60" : ""}`}
            >
              {sourceFile ? (
                <div className="flex w-full min-w-0 items-center gap-3">
                  <FileText className="h-6 w-6 shrink-0 text-gray-600" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900">
                      {sourceFile.name}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      {formatSelectedFileSize(sourceFile.size)}. Click or drop
                      another file to replace it.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Remove selected assignment file"
                    disabled={isSubmitting}
                    onClick={(event) => {
                      event.preventDefault();
                      updateSourceFile(null);
                    }}
                  >
                    <X />
                  </Button>
                </div>
              ) : (
                <div className="text-center">
                  <Upload className="mx-auto h-6 w-6 text-gray-600" />
                  <p className="mt-2 text-sm font-medium text-gray-800">
                    Choose a file or drag it here
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    {SUPPORTED_ASSIGNMENT_FILE_LABEL}, up to{" "}
                    {formatFileSize(MAX_STUDY_FILE_BYTES)}
                  </p>
                </div>
              )}
            </label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="assignment-materials">
              Study materials (optional)
            </Label>
            <p className="text-xs text-gray-500">
              Add notes, readings, slides, or examples the tutor can reference.
            </p>
            <input
              id="assignment-materials"
              type="file"
              accept={STUDY_FILE_ACCEPT}
              multiple
              disabled={isSubmitting}
              onChange={(event) => {
                addMaterialFiles(Array.from(event.target.files ?? []));
                event.target.value = "";
              }}
              className="sr-only"
            />
            <label
              htmlFor="assignment-materials"
              className={`flex min-h-24 cursor-pointer items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 px-5 py-4 text-center transition hover:bg-gray-100 ${
                isSubmitting ? "cursor-not-allowed opacity-60" : ""
              }`}
            >
              <div>
                <Upload className="mx-auto h-5 w-5 text-gray-600" />
                <p className="mt-2 text-sm font-medium text-gray-800">
                  Add up to {MAX_TUTOR_FILES} study materials
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  {SUPPORTED_STUDY_FILE_LABEL}
                </p>
              </div>
            </label>

            {materialFiles.length > 0 ? (
              <div className="space-y-2">
                {materialFiles.map((file, index) => (
                  <div
                    key={`${file.name}-${file.size}-${file.lastModified}`}
                    className="flex items-center gap-3 rounded-lg border border-gray-200 px-3 py-2"
                  >
                    <FileText className="h-4 w-4 shrink-0 text-gray-500" />
                    <span className="min-w-0 flex-1 truncate text-sm text-gray-700">
                      {file.name}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      aria-label={`Remove ${file.name}`}
                      disabled={isSubmitting}
                      onClick={() =>
                        setMaterialFiles((current) =>
                          current.filter((_, fileIndex) => fileIndex !== index),
                        )
                      }
                    >
                      <X />
                    </Button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          {fileError || error ? (
            <p className="text-sm font-medium text-red-600" role="alert">
              {fileError ?? error}
            </p>
          ) : null}

          <div className="flex justify-end gap-3 pt-1">
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? sourceFile
                  ? "Uploading and saving..."
                  : "Saving..."
                : "Add Assignment"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function getFileExtension(fileName: string) {
  const lastDotIndex = fileName.lastIndexOf(".");
  return lastDotIndex === -1 ? "" : fileName.slice(lastDotIndex).toLowerCase();
}

function formatSelectedFileSize(bytes: number) {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))}KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}
