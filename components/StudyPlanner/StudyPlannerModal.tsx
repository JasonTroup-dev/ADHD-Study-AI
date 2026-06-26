"use client";

import { type FormEvent, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  CircleAlert,
  FileText,
  LoaderCircle,
  Sparkles,
  Trash2,
  Upload,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { classColorOptions, type ClassColor } from "@/lib/classColors";
import { notifyClassesChanged } from "@/lib/classEvents";
import {
  formatFileSize,
  MAX_STUDY_FILE_BYTES,
  SUPPORTED_SYLLABUS_FILE_EXTENSIONS,
  SUPPORTED_SYLLABUS_FILE_LABEL,
  SYLLABUS_FILE_ACCEPT,
} from "@/lib/files/uploadConstraints";
import type {
  DetectedSyllabusCourse,
  StudyPlanImportSummary,
  SyllabusAssignment,
  SyllabusAssignmentDifficulty,
  SyllabusItemKind,
  SyllabusClassMatch,
} from "@/types/syllabus";

type ClassOption = {
  id: string;
  name: string;
};

type GenerateStudyPlanModalProps = {
  isOpen: boolean;
  classes: ClassOption[];
  onClose: () => void;
  onStudyPlanCreated: (summary: StudyPlanImportSummary) => void;
};

type ReviewAssignment = SyllabusAssignment & {
  id: string;
};

type AnalyzeResponse = {
  course?: DetectedSyllabusCourse;
  classMatch?: SyllabusClassMatch | null;
  assignments?: SyllabusAssignment[];
  originalFileName?: string;
  error?: string;
};

type ImportResponse = Partial<StudyPlanImportSummary> & {
  error?: string;
};

type ClassResolution = "matched" | "existing" | "create" | null;

const difficultyOptions: SyllabusAssignmentDifficulty[] = [
  "easy",
  "medium",
  "hard",
];
const itemKindOptions: SyllabusItemKind[] = ["assignment", "exam", "quiz"];

export default function StudyPlannerModal({
  isOpen,
  classes,
  onClose,
  onStudyPlanCreated,
}: GenerateStudyPlanModalProps) {
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<ReviewAssignment[]>([]);
  const [course, setCourse] = useState<DetectedSyllabusCourse | null>(null);
  const [classMatch, setClassMatch] = useState<SyllabusClassMatch | null>(null);
  const [classResolution, setClassResolution] =
    useState<ClassResolution>(null);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [newClassName, setNewClassName] = useState("");
  const [newClassCode, setNewClassCode] = useState("");
  const [newClassInstructor, setNewClassInstructor] = useState("");
  const [newClassColor, setNewClassColor] = useState<ClassColor>("blue");
  const [analysisFileName, setAnalysisFileName] = useState("");
  const [isReviewConfirmed, setIsReviewConfirmed] = useState(false);
  const [maxTasksPerDay, setMaxTasksPerDay] = useState(3);
  const [step, setStep] = useState<"upload" | "review">("upload");

  const isBusy = isAnalyzing || isImporting;

  if (!isOpen) return null;

  function resetModal() {
    setSourceFile(null);
    setIsDragging(false);
    setIsAnalyzing(false);
    setIsImporting(false);
    setError(null);
    setAssignments([]);
    setCourse(null);
    setClassMatch(null);
    setClassResolution(null);
    setSelectedClassId("");
    setNewClassName("");
    setNewClassCode("");
    setNewClassInstructor("");
    setNewClassColor("blue");
    setAnalysisFileName("");
    setIsReviewConfirmed(false);
    setMaxTasksPerDay(3);
    setStep("upload");
  }

  function closeModal() {
    if (isBusy) return;

    resetModal();
    onClose();
  }

  function updateSourceFile(file: File | null) {
    if (!file) {
      setSourceFile(null);
      return;
    }

    const validationError = validateSyllabusFile(file);
    if (validationError) {
      setSourceFile(null);
      setError(validationError);
      return;
    }

    setError(null);
    setSourceFile(file);
  }

  async function analyzeSyllabus(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!sourceFile || isBusy) {
      if (!sourceFile) setError("Choose a syllabus before continuing.");
      return;
    }

    setError(null);
    setIsAnalyzing(true);

    try {
      const formData = new FormData();
      formData.append("file", sourceFile);

      const response = await fetch("/api/syllabus/analyze", {
        method: "POST",
        body: formData,
      });
      const payload = await readAnalyzeResponse(response);

      if (!response.ok) {
        setError(payload.error ?? "Could not analyze this syllabus.");
        return;
      }

      if (!payload.course || !Array.isArray(payload.assignments)) {
        setError("The syllabus analysis response was incomplete.");
        return;
      }

      const reviewAssignments = payload.assignments.map(
        (assignment, index) => ({
          ...assignment,
          id: `${Date.now()}-${index}`,
          notes: assignment.notes ?? "",
        }),
      );

      setAssignments(reviewAssignments);
      setCourse(payload.course);
      setClassMatch(payload.classMatch ?? null);
      setSelectedClassId(payload.classMatch?.id ?? "");
      setClassResolution(payload.classMatch ? "matched" : null);
      setNewClassName(payload.course.name ?? "");
      setNewClassCode(payload.course.classCode ?? "");
      setNewClassInstructor(payload.course.instructor ?? "");
      setNewClassColor("blue");
      setAnalysisFileName(payload.originalFileName ?? sourceFile.name);
      setIsReviewConfirmed(false);
      setStep("review");

      if (reviewAssignments.length === 0) {
        setError(
          "The AI did not find any assignments. Try another syllabus or add assignments manually.",
        );
      }
    } catch {
      setError("Could not analyze this syllabus. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  }

  async function createStudyPlan() {
    const validationError = getReviewValidationError(assignments);
    if (validationError) {
      setError(validationError);
      return;
    }

    if (
      (classResolution === "matched" || classResolution === "existing") &&
      !selectedClassId
    ) {
      setError("Choose the class this syllabus belongs to.");
      return;
    }

    if (classResolution === "create") {
      if (!newClassName.trim()) {
        setError("Enter a name for the new class.");
        return;
      }

      if (!newClassCode.trim()) {
        setError("Enter a course code for the new class.");
        return;
      }

      if (!newClassInstructor.trim()) {
        setError("Enter the instructor for the new class.");
        return;
      }
    }

    if (!classResolution) {
      setError("Confirm whether to create the detected class or choose one.");
      return;
    }

    if (!isReviewConfirmed) {
      setError("Confirm that the extracted information is correct.");
      return;
    }

    setError(null);
    setIsImporting(true);

    try {
      const response = await fetch("/api/syllabus/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId:
            classResolution === "create" ? undefined : selectedClassId,
          newClass:
            classResolution === "create"
              ? {
                  name: newClassName,
                  classCode: newClassCode,
                  professorName: newClassInstructor,
                  color: newClassColor,
                }
              : undefined,
          assignments: assignments.map(toImportAssignment),
          planningDate: getLocalDateOnly(),
          maxTasksPerDay,
        }),
      });
      const payload = await readImportResponse(response);

      if (!response.ok) {
        setError(payload.error ?? "Could not create this study plan.");
        return;
      }

      if (
        typeof payload.assignmentCount !== "number" ||
        typeof payload.studySessionCount !== "number" ||
        typeof payload.classId !== "string" ||
        typeof payload.className !== "string" ||
        typeof payload.classCreated !== "boolean"
      ) {
        setError("The generated study plan response was incomplete.");
        return;
      }

      if (payload.classCreated) {
        notifyClassesChanged();
      }

      onStudyPlanCreated({
        assignmentCount: payload.assignmentCount,
        studySessionCount: payload.studySessionCount,
        classId: payload.classId,
        className: payload.className,
        classCreated: payload.classCreated,
      });
      resetModal();
      onClose();
    } catch {
      setError("Could not create this study plan. Please try again.");
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

  function chooseClassResolution(resolution: ClassResolution) {
    setClassResolution(resolution);
    setIsReviewConfirmed(false);
    setError(null);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-8"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) closeModal();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="study-plan-upload-title"
        aria-describedby="study-plan-upload-description"
        aria-busy={isBusy}
        className="max-h-[calc(100vh-4rem)] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              id="study-plan-upload-title"
              className="text-xl font-semibold text-slate-950"
            >
              Generate Study Plan
            </h2>
            <p
              id="study-plan-upload-description"
              className="mt-1 text-sm text-slate-500"
            >
              {step === "upload"
                ? "Upload a syllabus to build your plan."
                : "Review the AI-extracted details before anything is saved."}
            </p>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={closeModal}
            disabled={isBusy}
            aria-label="Close generate study plan dialog"
            className="shrink-0 rounded-lg text-slate-500"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>

        {step === "upload" ? (
          <UploadStep
            sourceFile={sourceFile}
            isDragging={isDragging}
            isAnalyzing={isAnalyzing}
            error={error}
            onSubmit={analyzeSyllabus}
            onClose={closeModal}
            onDraggingChange={setIsDragging}
            onFileChange={updateSourceFile}
          />
        ) : (
          <ReviewStep
            assignments={assignments}
            course={course}
            classMatch={classMatch}
            classes={classes}
            classResolution={classResolution}
            selectedClassId={selectedClassId}
            newClassName={newClassName}
            newClassCode={newClassCode}
            newClassInstructor={newClassInstructor}
            newClassColor={newClassColor}
            analysisFileName={analysisFileName}
            isBusy={isBusy}
            isImporting={isImporting}
            isReviewConfirmed={isReviewConfirmed}
            maxTasksPerDay={maxTasksPerDay}
            error={error}
            onAssignmentChange={updateAssignment}
            onAssignmentRemove={(id) => {
              setAssignments((currentAssignments) =>
                currentAssignments.filter((assignment) => assignment.id !== id),
              );
              setIsReviewConfirmed(false);
            }}
            onClassResolutionChange={chooseClassResolution}
            onSelectedClassChange={(classId) => {
              setSelectedClassId(classId);
              setIsReviewConfirmed(false);
              setError(null);
            }}
            onNewClassNameChange={(value) => {
              setNewClassName(value);
              setIsReviewConfirmed(false);
            }}
            onNewClassCodeChange={(value) => {
              setNewClassCode(value);
              setIsReviewConfirmed(false);
            }}
            onNewClassInstructorChange={(value) => {
              setNewClassInstructor(value);
              setIsReviewConfirmed(false);
            }}
            onNewClassColorChange={(value) => {
              setNewClassColor(value);
              setIsReviewConfirmed(false);
            }}
            onReviewConfirmedChange={(confirmed) => {
              setIsReviewConfirmed(confirmed);
              setError(null);
            }}
            onMaxTasksPerDayChange={(value) => {
              setMaxTasksPerDay(value);
              setIsReviewConfirmed(false);
            }}
            onBack={() => {
              setStep("upload");
              setError(null);
              setIsReviewConfirmed(false);
            }}
            onCreate={createStudyPlan}
          />
        )}
      </div>
    </div>
  );
}

function UploadStep({
  sourceFile,
  isDragging,
  isAnalyzing,
  error,
  onSubmit,
  onClose,
  onDraggingChange,
  onFileChange,
}: {
  sourceFile: File | null;
  isDragging: boolean;
  isAnalyzing: boolean;
  error: string | null;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
  onDraggingChange: (isDragging: boolean) => void;
  onFileChange: (file: File | null) => void;
}) {
  return (
    <form onSubmit={onSubmit} className="mt-6">
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
          onDraggingChange(true);
        }}
        onDragLeave={() => onDraggingChange(false)}
        onDrop={(event) => {
          event.preventDefault();
          onDraggingChange(false);
          onFileChange(event.dataTransfer.files?.[0] ?? null);
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
            <p className="mt-3 text-sm text-slate-600">Drag syllabus here</p>
            <p className="mt-1 text-xs text-slate-400">
              {SUPPORTED_SYLLABUS_FILE_LABEL}, up to{" "}
              {formatFileSize(MAX_STUDY_FILE_BYTES)}
            </p>
          </>
        )}
      </label>

      {error ? <ErrorMessage message={error} /> : null}

      <div className="mt-4 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={isAnalyzing}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={!sourceFile || isAnalyzing}>
          {isAnalyzing ? (
            <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Sparkles className="h-4 w-4" aria-hidden="true" />
          )}
          {isAnalyzing ? "Reading syllabus..." : "Generate study plan"}
        </Button>
      </div>
    </form>
  );
}

function ReviewStep({
  assignments,
  course,
  classMatch,
  classes,
  classResolution,
  selectedClassId,
  newClassName,
  newClassCode,
  newClassInstructor,
  newClassColor,
  analysisFileName,
  isBusy,
  isImporting,
  isReviewConfirmed,
  maxTasksPerDay,
  error,
  onAssignmentChange,
  onAssignmentRemove,
  onClassResolutionChange,
  onSelectedClassChange,
  onNewClassNameChange,
  onNewClassCodeChange,
  onNewClassInstructorChange,
  onNewClassColorChange,
  onReviewConfirmedChange,
  onMaxTasksPerDayChange,
  onBack,
  onCreate,
}: {
  assignments: ReviewAssignment[];
  course: DetectedSyllabusCourse | null;
  classMatch: SyllabusClassMatch | null;
  classes: ClassOption[];
  classResolution: ClassResolution;
  selectedClassId: string;
  newClassName: string;
  newClassCode: string;
  newClassInstructor: string;
  newClassColor: ClassColor;
  analysisFileName: string;
  isBusy: boolean;
  isImporting: boolean;
  isReviewConfirmed: boolean;
  maxTasksPerDay: number;
  error: string | null;
  onAssignmentChange: (
    id: string,
    patch: Partial<Omit<ReviewAssignment, "id">>,
  ) => void;
  onAssignmentRemove: (id: string) => void;
  onClassResolutionChange: (resolution: ClassResolution) => void;
  onSelectedClassChange: (classId: string) => void;
  onNewClassNameChange: (value: string) => void;
  onNewClassCodeChange: (value: string) => void;
  onNewClassInstructorChange: (value: string) => void;
  onNewClassColorChange: (value: ClassColor) => void;
  onReviewConfirmedChange: (confirmed: boolean) => void;
  onMaxTasksPerDayChange: (value: number) => void;
  onBack: () => void;
  onCreate: () => void;
}) {
  const detectedLabel =
    [course?.classCode, course?.name].filter(Boolean).join(" — ") ||
    "Unknown course";

  return (
    <div className="mt-5">
      <div
        className={`rounded-xl border p-4 ${
          classMatch
            ? "border-emerald-200 bg-emerald-50"
            : "border-amber-200 bg-amber-50"
        }`}
      >
        <div className="flex items-start gap-3">
          {classMatch ? (
            <CheckCircle2
              className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700"
              aria-hidden="true"
            />
          ) : (
            <CircleAlert
              className="mt-0.5 h-5 w-5 shrink-0 text-amber-700"
              aria-hidden="true"
            />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-950">
              AI detected {detectedLabel}
            </p>
            {classMatch ? (
              <>
                <p className="mt-1 text-sm text-slate-600">
                  Matched to your existing class: {classMatch.name}
                </p>
                {classResolution === "matched" ? (
                  <button
                    type="button"
                    className="mt-2 text-xs font-semibold text-slate-700 underline"
                    onClick={() => onClassResolutionChange("existing")}
                    disabled={isBusy}
                  >
                    Choose a different class
                  </button>
                ) : null}
              </>
            ) : (
              <>
                <p className="mt-1 text-sm text-slate-700">
                  This does not match any of your classes. Would you like to
                  create a new class?
                </p>
                {classResolution === null ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => onClassResolutionChange("create")}
                    >
                      Yes, create class
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={classes.length === 0}
                      onClick={() => onClassResolutionChange("existing")}
                    >
                      Choose existing
                    </Button>
                  </div>
                ) : null}
              </>
            )}
          </div>
        </div>

        {classResolution === "existing" ? (
          <div className="mt-4">
            <Label htmlFor="study-plan-existing-class">Use class</Label>
            <select
              id="study-plan-existing-class"
              value={selectedClassId}
              disabled={isBusy}
              onChange={(event) => onSelectedClassChange(event.target.value)}
              className="mt-1 h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
            >
              <option value="">Choose a class</option>
              {classes.map((classItem) => (
                <option key={classItem.id} value={classItem.id}>
                  {classItem.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="mt-2 text-xs font-semibold text-slate-700 underline"
              disabled={isBusy}
              onClick={() => onClassResolutionChange("create")}
            >
              Create a new class instead
            </button>
          </div>
        ) : null}

        {classResolution === "create" ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="detected-class-name">Class name</Label>
              <Input
                id="detected-class-name"
                value={newClassName}
                disabled={isBusy}
                onChange={(event) => onNewClassNameChange(event.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="detected-class-code">Course code</Label>
              <Input
                id="detected-class-code"
                value={newClassCode}
                disabled={isBusy}
                onChange={(event) => onNewClassCodeChange(event.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="detected-class-instructor">Instructor</Label>
              <Input
                id="detected-class-instructor"
                value={newClassInstructor}
                disabled={isBusy}
                onChange={(event) =>
                  onNewClassInstructorChange(event.target.value)
                }
              />
            </div>
            <div className="sm:col-span-2">
              <Label id="detected-class-color-label">Class color</Label>
              <div
                role="radiogroup"
                aria-labelledby="detected-class-color-label"
                className="mt-2 flex flex-wrap gap-2"
              >
                {classColorOptions.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    role="radio"
                    aria-checked={newClassColor === color.value}
                    aria-label={color.name}
                    disabled={isBusy}
                    onClick={() => onNewClassColorChange(color.value)}
                    className={`flex h-9 w-9 items-center justify-center rounded-full transition disabled:cursor-not-allowed disabled:opacity-50 ${
                      newClassColor === color.value
                        ? "ring-2 ring-slate-950 ring-offset-2"
                        : "hover:scale-105"
                    }`}
                  >
                    <span className={`h-6 w-6 rounded-full ${color.accent}`} />
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap gap-2 sm:col-span-2">
              {classes.length > 0 ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => onClassResolutionChange("existing")}
                >
                  Use an existing class instead
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      <div className="mt-5 flex items-start justify-between gap-4">
        <div>
          <h3 className="font-semibold text-slate-950">
            Review extracted assignments
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            {assignments.length} found in {analysisFileName}
          </p>
        </div>
        <div className="w-36 shrink-0">
          <Label htmlFor="study-plan-daily-limit">Daily task limit</Label>
          <select
            id="study-plan-daily-limit"
            value={maxTasksPerDay}
            disabled={isBusy}
            onChange={(event) =>
              onMaxTasksPerDayChange(Number(event.target.value))
            }
            className="mt-1 h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-sm"
          >
            {[1, 2, 3, 4, 5].map((limit) => (
              <option key={limit} value={limit}>
                {limit} {limit === 1 ? "task" : "tasks"}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-3 space-y-3">
        {assignments.map((assignment, index) => (
          <div
            key={assignment.id}
            className="rounded-xl border border-slate-200 bg-slate-50 p-3"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold text-slate-500">
                Assignment {index + 1} · {Math.round(assignment.confidence * 100)}%
                confidence
              </p>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={isBusy}
                aria-label={`Remove ${assignment.title || "assignment"}`}
                onClick={() => onAssignmentRemove(assignment.id)}
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>

            {getAssignmentReviewWarning(assignment) ? (
              <div className="mt-2 flex items-start gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2 text-xs text-amber-800">
                <CircleAlert
                  className="mt-0.5 h-3.5 w-3.5 shrink-0"
                  aria-hidden="true"
                />
                <span>{getAssignmentReviewWarning(assignment)}</span>
              </div>
            ) : null}

            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor={`${assignment.id}-title`}>Title</Label>
                <Input
                  id={`${assignment.id}-title`}
                  value={assignment.title}
                  disabled={isBusy}
                  onChange={(event) =>
                    onAssignmentChange(assignment.id, {
                      title: event.target.value,
                    })
                  }
                />
              </div>
              <div>
                <Label htmlFor={`${assignment.id}-kind`}>Type</Label>
                <select
                  id={`${assignment.id}-kind`}
                  value={assignment.kind}
                  disabled={isBusy}
                  onChange={(event) =>
                    onAssignmentChange(assignment.id, {
                      kind: event.target.value as SyllabusItemKind,
                    })
                  }
                  className="h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-sm"
                >
                  {itemKindOptions.map((kind) => (
                    <option key={kind} value={kind}>
                      {capitalize(kind)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor={`${assignment.id}-due-date`}>Due date</Label>
                <Input
                  id={`${assignment.id}-due-date`}
                  type="date"
                  value={assignment.dueDate ?? ""}
                  disabled={isBusy}
                  onChange={(event) =>
                    onAssignmentChange(assignment.id, {
                      dueDate: event.target.value || null,
                      dueDateStatus: event.target.value
                        ? "explicit"
                        : "missing",
                    })
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-2 sm:col-span-2">
                <div>
                  <Label htmlFor={`${assignment.id}-points`}>Points</Label>
                  <Input
                    id={`${assignment.id}-points`}
                    type="number"
                    min="0"
                    value={assignment.points ?? ""}
                    disabled={isBusy}
                    onChange={(event) =>
                      onAssignmentChange(assignment.id, {
                        points:
                          event.target.value === ""
                            ? null
                            : Number(event.target.value),
                      })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor={`${assignment.id}-difficulty`}>
                    Difficulty
                  </Label>
                  <select
                    id={`${assignment.id}-difficulty`}
                    value={assignment.difficulty}
                    disabled={isBusy}
                    onChange={(event) =>
                      onAssignmentChange(assignment.id, {
                        difficulty: event.target
                          .value as SyllabusAssignmentDifficulty,
                      })
                    }
                    className="h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-sm"
                  >
                    {difficultyOptions.map((difficulty) => (
                      <option key={difficulty} value={difficulty}>
                        {capitalize(difficulty)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor={`${assignment.id}-notes`}>Notes</Label>
                <Textarea
                  id={`${assignment.id}-notes`}
                  value={assignment.notes}
                  disabled={isBusy}
                  rows={2}
                  onChange={(event) =>
                    onAssignmentChange(assignment.id, {
                      notes: event.target.value,
                    })
                  }
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <label className="mt-4 flex cursor-pointer items-start gap-2 rounded-lg border border-slate-200 px-3 py-3 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={isReviewConfirmed}
          disabled={isBusy}
          onChange={(event) =>
            onReviewConfirmedChange(event.target.checked)
          }
          className="mt-0.5 h-4 w-4 rounded border-slate-300"
        />
        <span>
          I reviewed the detected class and assignments and confirm the
          information is correct.
        </span>
      </label>

      {error ? <ErrorMessage message={error} /> : null}

      <div className="mt-4 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          disabled={isBusy}
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back
        </Button>
        <Button
          type="button"
          onClick={onCreate}
          disabled={
            isBusy ||
            assignments.length === 0 ||
            !classResolution ||
            !isReviewConfirmed
          }
        >
          {isImporting ? (
            <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Sparkles className="h-4 w-4" aria-hidden="true" />
          )}
          {isImporting ? "Creating study plan..." : "Confirm & create plan"}
        </Button>
      </div>
    </div>
  );
}

function ErrorMessage({ message }: { message: string }) {
  return (
    <div
      className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
      role="alert"
    >
      <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </div>
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
    return `Upload a file ${formatFileSize(MAX_STUDY_FILE_BYTES)} or smaller.`;
  }

  return null;
}

function getReviewValidationError(assignments: ReviewAssignment[]) {
  if (assignments.length === 0) return "Keep at least one assignment.";

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

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
