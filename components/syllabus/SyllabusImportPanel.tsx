"use client";

import {
  type DragEvent,
  type ChangeEvent,
  useEffect,
  useId,
  useMemo,
  useState,
} from "react";
import {
  AlertCircle,
  CheckCircle2,
  FileText,
  Loader2,
  Sparkles,
  Trash2,
  Upload,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  formatFileSize,
  MAX_STUDY_FILE_BYTES,
  SUPPORTED_SYLLABUS_FILE_EXTENSIONS,
  SUPPORTED_SYLLABUS_FILE_LABEL,
  SYLLABUS_FILE_ACCEPT,
} from "@/lib/files/uploadConstraints";
import type {
  StudyPlanImportSummary,
  SyllabusAssignment,
  SyllabusAssignmentDifficulty,
  SyllabusItemKind,
} from "@/types/syllabus";

type ClassOption = {
  id: string;
  name: string;
};

type SyllabusImportPanelProps = {
  classes: ClassOption[];
  defaultClassId?: string;
  presentation?: "page" | "modal";
  onBusyChange?: (isBusy: boolean) => void;
  onImportComplete?: (summary: StudyPlanImportSummary) => void;
};

type ReviewAssignment = SyllabusAssignment & {
  id: string;
};

type AnalyzeResponse = {
  assignments?: SyllabusAssignment[];
  originalFileName?: string;
  sourceCharCount?: number;
  error?: string;
};

type ImportResponse = {
  assignmentCount?: number;
  studySessionCount?: number;
  error?: string;
};

const difficultyOptions: SyllabusAssignmentDifficulty[] = [
  "easy",
  "medium",
  "hard",
];
const itemKindOptions: SyllabusItemKind[] = ["assignment", "exam", "quiz"];

export default function SyllabusImportPanel({
  classes,
  defaultClassId = "",
  presentation = "page",
  onBusyChange,
  onImportComplete,
}: SyllabusImportPanelProps) {
  const fileInputId = useId();
  const [selectedClassId, setSelectedClassId] = useState(defaultClassId);
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [assignments, setAssignments] = useState<ReviewAssignment[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [analysisFileName, setAnalysisFileName] = useState<string | null>(null);
  const [isReviewConfirmed, setIsReviewConfirmed] = useState(false);
  const [maxTasksPerDay, setMaxTasksPerDay] = useState(3);

  const selectedClassName = useMemo(
    () =>
      classes.find((classItem) => classItem.id === selectedClassId)?.name ??
      "Selected class",
    [classes, selectedClassId],
  );
  const isBusy = isAnalyzing || isImporting;
  const hasReviewRows = assignments.length > 0;
  const isModal = presentation === "modal";

  useEffect(() => {
    onBusyChange?.(isBusy);
  }, [isBusy, onBusyChange]);

  function updateSourceFile(file: File | null) {
    if (!file) {
      setSourceFile(null);
      setIsReviewConfirmed(false);
      setError(null);
      return;
    }

    const validationError = validateSyllabusFile(file);
    if (validationError) {
      setSourceFile(null);
      setError(validationError);
      return;
    }

    setSourceFile(file);
    setAssignments([]);
    setAnalysisFileName(null);
    setIsReviewConfirmed(false);
    setError(null);
    setNotice("File ready. Analysis will only create a draft for review.");
  }

  async function handleAnalyze() {
    if (!selectedClassId) {
      setError("Choose the class this syllabus belongs to.");
      return;
    }

    if (!sourceFile) {
      setError("Attach a syllabus PDF or DOCX first.");
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setNotice("Reading the syllabus. Nothing is being saved.");

    try {
      const formData = new FormData();
      formData.append("class_id", selectedClassId);
      formData.append("file", sourceFile);

      const response = await fetch("/api/syllabus/analyze", {
        method: "POST",
        body: formData,
      });
      const payload = await readAnalyzeResponse(response);

      if (!response.ok) {
        setError(payload.error ?? "Could not analyze this syllabus.");
        setNotice(null);
        return;
      }

      const reviewRows = (payload.assignments ?? []).map(
        (assignment, index) => ({
          ...assignment,
          id: `${Date.now()}-${index}`,
          notes: assignment.notes ?? "",
        }),
      );

      setAssignments(reviewRows);
      setAnalysisFileName(payload.originalFileName ?? sourceFile.name);
      setIsReviewConfirmed(false);
      setNotice(
        reviewRows.length > 0
          ? `Found ${reviewRows.length} possible assignment${
              reviewRows.length === 1 ? "" : "s"
            }. Review each row before importing.`
          : "No assignment rows were found. Nothing was saved.",
      );
    } catch (analyzeError) {
      console.error("Syllabus analyze error:", analyzeError);
      setError("Could not analyze this syllabus. Nothing was saved.");
      setNotice(null);
    } finally {
      setIsAnalyzing(false);
    }
  }

  async function handleImport() {
    const validationError = getReviewValidationError(assignments);

    if (!selectedClassId) {
      setError("Choose the class these assignments belong to.");
      return;
    }

    if (validationError) {
      setError(validationError);
      return;
    }

    if (!isReviewConfirmed) {
      setError(
        "Confirm that you reviewed the extracted information before creating the study plan.",
      );
      return;
    }

    setIsImporting(true);
    setError(null);
    setNotice("Saving reviewed assignments and study blocks.");

    try {
      const response = await fetch("/api/syllabus/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          classId: selectedClassId,
          assignments: assignments.map(toImportAssignment),
          planningDate: getLocalDateOnly(),
          maxTasksPerDay,
        }),
      });
      const payload = await readImportResponse(response);

      if (!response.ok) {
        setError(payload.error ?? "Could not import these assignments.");
        setNotice(null);
        return;
      }

      setAssignments([]);
      setSourceFile(null);
      setAnalysisFileName(null);
      setIsReviewConfirmed(false);
      const summary = {
        assignmentCount: payload.assignmentCount ?? 0,
        studySessionCount: payload.studySessionCount ?? 0,
        classId: selectedClassId,
        className: selectedClassName,
        classCreated: false,
      };
      setNotice(
        `Saved ${summary.assignmentCount} assignment${
          summary.assignmentCount === 1 ? "" : "s"
        } and ${summary.studySessionCount} study block${
          summary.studySessionCount === 1 ? "" : "s"
        } for ${selectedClassName}.`,
      );
      onImportComplete?.(summary);
    } catch (importError) {
      console.error("Syllabus import error:", importError);
      setError("Could not import these assignments. Nothing was saved.");
      setNotice(null);
    } finally {
      setIsImporting(false);
    }
  }

  function updateAssignment(
    id: string,
    patch: Partial<Omit<ReviewAssignment, "id">>,
  ) {
    setAssignments((currentAssignments) =>
      currentAssignments.map((assignment) =>
        assignment.id === id ? { ...assignment, ...patch } : assignment,
      ),
    );
    setIsReviewConfirmed(false);
    setError(null);
  }

  function removeAssignment(id: string) {
    setAssignments((currentAssignments) =>
      currentAssignments.filter((assignment) => assignment.id !== id),
    );
    setIsReviewConfirmed(false);
    setError(null);
  }

  return (
    <section
      className={
        isModal
          ? "pt-5"
          : "rounded-2xl border border-blue-200 bg-white p-6 shadow-sm"
      }
    >
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="max-w-2xl">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-700" aria-hidden="true" />
            <h2 className="text-xl font-semibold text-gray-950">
              {isModal
                ? "1. Upload and analyze"
                : "Import assignments from a syllabus"}
            </h2>
          </div>
          <p className="mt-2 text-sm leading-6 text-gray-600">
            Upload a PDF or DOCX. The AI creates a draft only; nothing is saved
            until you review and confirm it.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="outline"
            disabled={isBusy || !sourceFile}
            onClick={() => {
              setSourceFile(null);
              setAssignments([]);
              setAnalysisFileName(null);
              setIsReviewConfirmed(false);
              setError(null);
              setNotice(null);
            }}
          >
            <X className="h-4 w-4" aria-hidden="true" />
            Clear
          </Button>
          <Button
            type="button"
            disabled={isBusy || !selectedClassId || !sourceFile}
            onClick={handleAnalyze}
          >
            {isAnalyzing ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Upload className="h-4 w-4" aria-hidden="true" />
            )}
            {isAnalyzing ? "Analyzing..." : "Analyze Syllabus"}
          </Button>
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(220px,280px)_minmax(0,1fr)]">
        <div className="space-y-2">
          <Label htmlFor="syllabus-class">Class</Label>
          <select
            id="syllabus-class"
            value={selectedClassId}
            disabled={isBusy}
            onChange={(event) => {
              setSelectedClassId(event.target.value);

              if (hasReviewRows) {
                setAssignments([]);
                setAnalysisFileName(null);
                setIsReviewConfirmed(false);
                setNotice("Class changed. Analyze the syllabus again before importing.");
              }

              setError(null);
            }}
            className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="">
              {classes.length ? "Choose a class" : "No classes loaded"}
            </option>
            {classes.map((classItem) => (
              <option key={classItem.id} value={classItem.id}>
                {classItem.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor={fileInputId}>Syllabus file</Label>
          <input
            id={fileInputId}
            type="file"
            accept={SYLLABUS_FILE_ACCEPT}
            disabled={isBusy}
            onChange={(event: ChangeEvent<HTMLInputElement>) => {
              updateSourceFile(event.target.files?.[0] ?? null);
              event.target.value = "";
            }}
            className="sr-only"
          />
          <label
            htmlFor={fileInputId}
            onDragOver={(event: DragEvent<HTMLLabelElement>) => {
              event.preventDefault();
              if (!isBusy) setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(event: DragEvent<HTMLLabelElement>) => {
              event.preventDefault();
              setIsDragging(false);
              if (!isBusy) updateSourceFile(event.dataTransfer.files?.[0] ?? null);
            }}
            className={`flex min-h-24 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed px-5 py-5 transition ${
              isDragging
                ? "border-blue-500 bg-blue-50"
                : "border-gray-300 bg-gray-50 hover:bg-gray-100"
            } ${isBusy ? "cursor-not-allowed opacity-60" : ""}`}
          >
            {sourceFile ? (
              <div className="flex w-full min-w-0 items-center gap-3">
                <FileText className="h-6 w-6 shrink-0 text-gray-600" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-gray-900">
                    {sourceFile.name}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    {formatSelectedFileSize(sourceFile.size)}. Ready to
                    analyze.
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center">
                <Upload className="mx-auto h-6 w-6 text-gray-600" />
                <p className="mt-2 text-sm font-semibold text-gray-800">
                  Choose a syllabus or drag it here
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  {SUPPORTED_SYLLABUS_FILE_LABEL}, up to{" "}
                  {formatFileSize(MAX_STUDY_FILE_BYTES)}
                </p>
              </div>
            )}
          </label>
        </div>
      </div>

      {error ? (
        <StatusMessage tone="error" message={error} className="mt-4" />
      ) : null}

      {notice ? (
        <StatusMessage tone="info" message={notice} className="mt-4" />
      ) : null}

      {hasReviewRows ? (
        <div className="mt-6 border-t border-gray-200 pt-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-950">
                2. Review the extracted information
              </h3>
              <p className="mt-1 text-sm text-gray-600">
                Correct any details the AI got wrong and remove anything that
                does not belong. Your plan will use exactly what is shown here.
              </p>
              {analysisFileName ? (
                <p className="mt-1 text-xs text-gray-500">
                  Drafted from {analysisFileName}
                </p>
              ) : null}
            </div>

            <div className="space-y-3 sm:min-w-80">
              <div className="space-y-2">
                <Label htmlFor="syllabus-daily-task-limit">
                  Daily planner task limit
                </Label>
                <select
                  id="syllabus-daily-task-limit"
                  value={maxTasksPerDay}
                  disabled={isBusy}
                  onChange={(event) => {
                    setMaxTasksPerDay(Number(event.target.value));
                    setIsReviewConfirmed(false);
                  }}
                  className="h-9 w-full rounded-md border border-input bg-white px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {[1, 2, 3, 4, 5].map((limit) => (
                    <option key={limit} value={limit}>
                      {limit} {limit === 1 ? "task" : "tasks"}
                    </option>
                  ))}
                </select>
              </div>

              <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={isReviewConfirmed}
                  disabled={isBusy}
                  onChange={(event) => {
                    setIsReviewConfirmed(event.target.checked);
                    setError(null);
                  }}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300"
                />
                <span>
                  I reviewed the extracted information and confirm it is
                  correct.
                </span>
              </label>

              <Button
                type="button"
                className="w-full"
                disabled={
                  isBusy || assignments.length === 0 || !isReviewConfirmed
                }
                onClick={handleImport}
              >
                {isImporting ? (
                  <Loader2
                    className="h-4 w-4 animate-spin"
                    aria-hidden="true"
                  />
                ) : (
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                )}
                {isImporting
                  ? "Creating study plan..."
                  : isModal
                    ? "Confirm & create study plan"
                    : "Confirm & import"}
              </Button>
            </div>
          </div>

          <div className="mt-4 space-y-4">
            {assignments.map((assignment, index) => (
              <div
                key={assignment.id}
                className="rounded-xl border border-gray-200 bg-gray-50 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-500">
                      Assignment {index + 1}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      Confidence {Math.round(assignment.confidence * 100)}%
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Remove ${assignment.title || "assignment"}`}
                    disabled={isBusy}
                    onClick={() => removeAssignment(assignment.id)}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>

                {getAssignmentReviewWarning(assignment) ? (
                  <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    <AlertCircle
                      className="mt-0.5 h-3.5 w-3.5 shrink-0"
                      aria-hidden="true"
                    />
                    <span>{getAssignmentReviewWarning(assignment)}</span>
                  </div>
                ) : null}

                <div className="mt-4 grid gap-4 lg:grid-cols-12">
                  <div className="space-y-2 lg:col-span-4">
                    <Label htmlFor={`${assignment.id}-title`}>Title</Label>
                    <Input
                      id={`${assignment.id}-title`}
                      value={assignment.title}
                      disabled={isBusy}
                      onChange={(event) =>
                        updateAssignment(assignment.id, {
                          title: event.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="space-y-2 lg:col-span-2">
                    <Label htmlFor={`${assignment.id}-kind`}>Type</Label>
                    <select
                      id={`${assignment.id}-kind`}
                      value={assignment.kind}
                      disabled={isBusy}
                      onChange={(event) =>
                        updateAssignment(assignment.id, {
                          kind: event.target.value as SyllabusItemKind,
                        })
                      }
                      className="h-9 w-full rounded-md border border-input bg-white px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {itemKindOptions.map((kind) => (
                        <option key={kind} value={kind}>
                          {capitalize(kind)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2 lg:col-span-2">
                    <Label htmlFor={`${assignment.id}-due-date`}>
                      Due date
                    </Label>
                    <Input
                      id={`${assignment.id}-due-date`}
                      type="date"
                      value={assignment.dueDate ?? ""}
                      disabled={isBusy}
                      onChange={(event) =>
                        updateAssignment(assignment.id, {
                          dueDate: event.target.value || null,
                          dueDateStatus: event.target.value
                            ? "explicit"
                            : "missing",
                        })
                      }
                    />
                  </div>

                  <div className="space-y-2 lg:col-span-2">
                    <Label htmlFor={`${assignment.id}-points`}>Points</Label>
                    <Input
                      id={`${assignment.id}-points`}
                      type="number"
                      min="0"
                      step="0.01"
                      value={assignment.points ?? ""}
                      disabled={isBusy}
                      onChange={(event) =>
                        updateAssignment(assignment.id, {
                          points:
                            event.target.value === ""
                              ? null
                              : Number(event.target.value),
                        })
                      }
                    />
                  </div>

                  <div className="space-y-2 lg:col-span-2">
                    <Label htmlFor={`${assignment.id}-difficulty`}>
                      Difficulty
                    </Label>
                    <select
                      id={`${assignment.id}-difficulty`}
                      value={assignment.difficulty}
                      disabled={isBusy}
                      onChange={(event) =>
                        updateAssignment(assignment.id, {
                          difficulty: event.target
                            .value as SyllabusAssignmentDifficulty,
                        })
                      }
                      className="h-9 w-full rounded-md border border-input bg-white px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {difficultyOptions.map((difficulty) => (
                        <option key={difficulty} value={difficulty}>
                          {capitalize(difficulty)}
                        </option>
                      ))}
                    </select>
                  </div>

                </div>

                <div className="mt-4 space-y-2">
                  <Label htmlFor={`${assignment.id}-notes`}>Notes</Label>
                  <Textarea
                    id={`${assignment.id}-notes`}
                    value={assignment.notes}
                    disabled={isBusy}
                    rows={2}
                    onChange={(event) =>
                      updateAssignment(assignment.id, {
                        notes: event.target.value,
                      })
                    }
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function validateSyllabusFile(file: File) {
  const extension = getFileExtension(file.name);

  if (
    !SUPPORTED_SYLLABUS_FILE_EXTENSIONS.includes(
      extension as (typeof SUPPORTED_SYLLABUS_FILE_EXTENSIONS)[number],
    )
  ) {
    return `Unsupported file type. Upload a ${SUPPORTED_SYLLABUS_FILE_LABEL} syllabus.`;
  }

  if (file.size > MAX_STUDY_FILE_BYTES) {
    return `File too large. Upload a file ${formatFileSize(
      MAX_STUDY_FILE_BYTES,
    )} or smaller.`;
  }

  return null;
}

function toImportAssignment(assignment: ReviewAssignment): SyllabusAssignment {
  return {
    title: assignment.title,
    kind: assignment.kind,
    dueDate: assignment.dueDate,
    dueDateStatus: assignment.dueDateStatus,
    points: assignment.points,
    difficulty: assignment.difficulty,
    confidence: assignment.confidence,
    notes: assignment.notes,
  };
}

function getReviewValidationError(assignments: ReviewAssignment[]) {
  if (assignments.length === 0) {
    return "Keep at least one reviewed assignment before importing.";
  }

  for (const assignment of assignments) {
    if (!assignment.title.trim()) return "Every assignment needs a title.";
    if (assignment.dueDate && assignment.dueDate < getLocalDateOnly()) {
      return `"${assignment.title}" is past due. Update its date, clear the date to keep it unscheduled, or remove it.`;
    }
    if (
      assignment.points !== null &&
      (!Number.isFinite(assignment.points) || assignment.points < 0)
    ) {
      return `"${assignment.title}" has an invalid point value.`;
    }
  }

  return null;
}

function getAssignmentReviewWarning(assignment: ReviewAssignment) {
  if (assignment.dueDate && assignment.dueDate < getLocalDateOnly()) {
    return "This deadline has passed. Update it, clear it to keep the assignment unscheduled, or remove the row.";
  }

  if (!assignment.dueDate) {
    return "No exact deadline was found. This will be saved under No due date and will not create planner tasks.";
  }

  if (assignment.dueDateStatus === "inferred") {
    return "The year was inferred from the syllabus context. Verify the deadline before importing.";
  }

  if (assignment.confidence < 0.7) {
    return "Low-confidence extraction. Verify the title, type, and deadline before importing.";
  }

  return null;
}

function getLocalDateOnly(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function StatusMessage({
  tone,
  message,
  className = "",
}: {
  tone: "error" | "info";
  message: string;
  className?: string;
}) {
  const isError = tone === "error";
  const Icon = isError ? AlertCircle : CheckCircle2;

  return (
    <div
      className={`flex items-start gap-2 rounded-xl border px-4 py-3 text-sm ${
        isError
          ? "border-red-200 bg-red-50 text-red-700"
          : "border-blue-200 bg-blue-50 text-blue-800"
      } ${className}`}
      role={isError ? "alert" : "status"}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}

async function readAnalyzeResponse(response: Response) {
  try {
    return (await response.json()) as AnalyzeResponse;
  } catch {
    return {};
  }
}

async function readImportResponse(response: Response) {
  try {
    return (await response.json()) as ImportResponse;
  } catch {
    return {};
  }
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

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
