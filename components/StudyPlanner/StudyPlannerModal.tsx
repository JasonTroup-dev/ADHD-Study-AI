"use client";

import { type FormEvent, useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  Clock3,
  FileText,
  ListChecks,
  LoaderCircle,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Upload,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
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
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) closeModal();
      }}
    >
      <DialogContent
        showCloseButton={false}
        aria-busy={isBusy}
        onEscapeKeyDown={(event) => {
          if (isBusy) event.preventDefault();
        }}
        onPointerDownOutside={(event) => {
          if (isBusy) event.preventDefault();
        }}
        className={`h-[calc(100svh-1rem)] max-h-[calc(100svh-1rem)] grid-rows-[auto_minmax(0,1fr)] overflow-hidden gap-0 border-slate-200 bg-slate-50 p-0 sm:max-h-[calc(100svh-3rem)] ${
          step === "upload"
            ? "max-w-4xl sm:h-auto sm:grid-rows-none"
            : "max-w-6xl sm:h-[calc(100svh-3rem)]"
        }`}
      >
        <header className="flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white shadow-sm">
              <Sparkles className="size-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="truncate text-lg text-slate-950">
                Build your study plan
              </DialogTitle>
              <DialogDescription className="mt-1 hidden text-xs text-slate-500 sm:block">
                Turn one syllabus into a realistic, ready-to-use schedule.
              </DialogDescription>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <StepIndicator step={step} />
            <div className="h-6 w-px bg-slate-200" aria-hidden="true" />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={closeModal}
              disabled={isBusy}
              aria-label="Close generate study plan dialog"
              className="rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-950"
            >
              <X className="size-4" aria-hidden="true" />
            </Button>
          </div>
        </header>

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
      </DialogContent>
    </Dialog>
  );
}

function StepIndicator({ step }: { step: "upload" | "review" }) {
  const isReview = step === "review";

  return (
    <div className="hidden items-center gap-2 text-xs font-medium sm:flex" aria-label="Study plan progress">
      <span className="flex items-center gap-1.5 text-slate-950">
        <span
          className={`flex size-5 items-center justify-center rounded-full text-[10px] ${
            isReview ? "bg-emerald-100 text-emerald-700" : "bg-slate-950 text-white"
          }`}
        >
          {isReview ? <CheckCircle2 className="size-3.5" aria-hidden="true" /> : "1"}
        </span>
        Syllabus
      </span>
      <span className="h-px w-5 bg-slate-200" aria-hidden="true" />
      <span className={isReview ? "flex items-center gap-1.5 text-slate-950" : "flex items-center gap-1.5 text-slate-400"}>
        <span className={`flex size-5 items-center justify-center rounded-full text-[10px] ${isReview ? "bg-slate-950 text-white" : "bg-slate-100"}`}>
          2
        </span>
        Review
      </span>
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
              We’ll find important dates, estimate the workload, and spread the work into manageable study blocks.
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
              Upload the file your instructor provided. You’ll review everything before it is added.
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
              onDraggingChange(true);
            }}
            onDragLeave={() => onDraggingChange(false)}
            onDrop={(event) => {
              event.preventDefault();
              onDraggingChange(false);
              onFileChange(event.dataTransfer.files?.[0] ?? null);
            }}
            className={`mt-5 flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-5 text-center transition-all md:min-h-56 ${
              isDragging
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
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isAnalyzing}
            className="sm:min-w-24"
          >
            Cancel
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
    <div className="flex min-h-0 flex-col overflow-hidden">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="grid items-start gap-5 p-5 sm:p-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
          <aside className="space-y-4 lg:sticky lg:top-0">
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 p-4">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                  <BookOpen className="size-3.5" aria-hidden="true" />
                  Course
                </div>
                <h3 className="mt-3 text-base font-semibold leading-snug text-slate-950">{detectedLabel}</h3>
                <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                  <span>{course?.instructor || "Instructor not found"}</span>
                  <span aria-hidden="true">·</span>
                  <span>{Math.round((course?.confidence ?? 0) * 100)}% confidence</span>
                </div>
              </div>

              <div className="p-4">
                {classMatch && classResolution === "matched" ? (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                    <div className="flex items-start gap-2.5">
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-700" aria-hidden="true" />
                      <div>
                        <p className="text-xs font-semibold text-emerald-900">Matched to your class</p>
                        <p className="mt-1 text-sm text-emerald-800">{classMatch.name}</p>
                      </div>
                    </div>
                    <button type="button" className="mt-3 text-xs font-semibold text-emerald-800 underline underline-offset-2" onClick={() => onClassResolutionChange("existing")} disabled={isBusy}>
                      Use a different class
                    </button>
                  </div>
                ) : null}

                {!classMatch && classResolution === null ? (
                  <div>
                    <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3">
                      <CircleAlert className="mt-0.5 size-4 shrink-0 text-amber-700" aria-hidden="true" />
                      <p className="text-xs leading-5 text-amber-900">We couldn’t match this syllabus to one of your classes.</p>
                    </div>
                    <div className="mt-3 grid gap-2">
                      <Button type="button" size="sm" onClick={() => onClassResolutionChange("create")}>Create detected class</Button>
                      <Button type="button" size="sm" variant="outline" disabled={classes.length === 0} onClick={() => onClassResolutionChange("existing")}>Choose existing class</Button>
                    </div>
                  </div>
                ) : null}

                {classResolution === "existing" ? (
                  <div>
                    <Label htmlFor="study-plan-existing-class" className="text-xs text-slate-600">Use an existing class</Label>
                    <div className="relative mt-2">
                      <select id="study-plan-existing-class" value={selectedClassId} disabled={isBusy} onChange={(event) => onSelectedClassChange(event.target.value)} className={selectClassName}>
                        <option value="">Choose a class</option>
                        {classes.map((classItem) => <option key={classItem.id} value={classItem.id}>{classItem.name}</option>)}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                    </div>
                    <button type="button" className="mt-3 text-xs font-semibold text-slate-600 underline underline-offset-2" disabled={isBusy} onClick={() => onClassResolutionChange("create")}>
                      Create a new class instead
                    </button>
                  </div>
                ) : null}

                {classResolution === "create" ? (
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="detected-class-name" className="text-xs text-slate-600">Class name</Label>
                      <Input id="detected-class-name" value={newClassName} disabled={isBusy} onChange={(event) => onNewClassNameChange(event.target.value)} className="mt-1.5" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label htmlFor="detected-class-code" className="text-xs text-slate-600">Course code</Label>
                        <Input id="detected-class-code" value={newClassCode} disabled={isBusy} onChange={(event) => onNewClassCodeChange(event.target.value)} className="mt-1.5" />
                      </div>
                      <div>
                        <Label htmlFor="detected-class-instructor" className="text-xs text-slate-600">Instructor</Label>
                        <Input id="detected-class-instructor" value={newClassInstructor} disabled={isBusy} onChange={(event) => onNewClassInstructorChange(event.target.value)} className="mt-1.5" />
                      </div>
                    </div>
                    <div>
                      <Label id="detected-class-color-label" className="text-xs text-slate-600">Color</Label>
                      <div role="radiogroup" aria-labelledby="detected-class-color-label" className="mt-2 flex flex-wrap gap-2">
                        {classColorOptions.map((color) => (
                          <button key={color.value} type="button" role="radio" aria-checked={newClassColor === color.value} aria-label={color.name} disabled={isBusy} onClick={() => onNewClassColorChange(color.value)} className={`flex size-7 items-center justify-center rounded-full transition disabled:opacity-50 ${newClassColor === color.value ? "ring-2 ring-slate-900 ring-offset-2" : "hover:scale-110"}`}>
                            <span className={`size-5 rounded-full ${color.accent}`} />
                          </button>
                        ))}
                      </div>
                    </div>
                    {classes.length > 0 ? (
                      <button type="button" className="text-xs font-semibold text-slate-600 underline underline-offset-2" onClick={() => onClassResolutionChange("existing")}>
                        Use an existing class
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                <SlidersHorizontal className="size-3.5" aria-hidden="true" />
                Workload
              </div>
              <Label htmlFor="study-plan-daily-limit" className="mt-4 text-xs text-slate-600">Maximum study blocks per day</Label>
              <div className="relative mt-2">
                <select id="study-plan-daily-limit" value={maxTasksPerDay} disabled={isBusy} onChange={(event) => onMaxTasksPerDayChange(Number(event.target.value))} className={selectClassName}>
                  {[1, 2, 3, 4, 5].map((limit) => <option key={limit} value={limit}>{limit} {limit === 1 ? "block" : "blocks"} per day</option>)}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              </div>
              <div className="mt-3 flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-500">
                <Clock3 className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                We’ll spread work across available days and never exceed this limit.
              </div>
            </section>
          </aside>

          <section className="min-w-0">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Step 2 of 2</p>
                <h2 className="mt-2 text-xl font-semibold text-slate-950">Review your assignments</h2>
                <p className="mt-1 text-sm text-slate-500">Check the details we found before building your schedule.</p>
              </div>
              <div className="flex max-w-full items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500">
                <FileText className="size-3.5 shrink-0" aria-hidden="true" />
                <span className="max-w-48 truncate">{analysisFileName}</span>
                <span className="font-semibold text-slate-700">· {assignments.length} found</span>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {assignments.map((assignment, index) => {
                const warning = getAssignmentReviewWarning(assignment);
                const confidence = Math.round(assignment.confidence * 100);

                return (
                  <article key={assignment.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-semibold text-slate-600">{index + 1}</span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-900">{assignment.title || `Assignment ${index + 1}`}</p>
                          <p className={`mt-0.5 text-[11px] font-medium ${confidence >= 80 ? "text-emerald-600" : "text-amber-600"}`}>{confidence}% extraction confidence</p>
                        </div>
                      </div>
                      <Button type="button" variant="ghost" size="icon-sm" disabled={isBusy} aria-label={`Remove ${assignment.title || "assignment"}`} onClick={() => onAssignmentRemove(assignment.id)} className="text-slate-400 hover:bg-red-50 hover:text-red-600">
                        <Trash2 className="size-4" aria-hidden="true" />
                      </Button>
                    </div>

                    {warning ? (
                      <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                        <CircleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                        <span>{warning}</span>
                      </div>
                    ) : null}

                    <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-12">
                      <div className="xl:col-span-6">
                        <Label htmlFor={`${assignment.id}-title`} className="text-xs text-slate-600">Assignment title</Label>
                        <Input id={`${assignment.id}-title`} value={assignment.title} disabled={isBusy} onChange={(event) => onAssignmentChange(assignment.id, { title: event.target.value })} className="mt-1.5" />
                      </div>
                      <div className="xl:col-span-3">
                        <Label htmlFor={`${assignment.id}-kind`} className="text-xs text-slate-600">Type</Label>
                        <div className="relative mt-1.5">
                          <select id={`${assignment.id}-kind`} value={assignment.kind} disabled={isBusy} onChange={(event) => onAssignmentChange(assignment.id, { kind: event.target.value as SyllabusItemKind })} className={selectClassName}>
                            {itemKindOptions.map((kind) => <option key={kind} value={kind}>{capitalize(kind)}</option>)}
                          </select>
                          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                        </div>
                      </div>
                      <div className="xl:col-span-3">
                        <Label htmlFor={`${assignment.id}-due-date`} className="text-xs text-slate-600">Due date</Label>
                        <Input id={`${assignment.id}-due-date`} type="date" value={assignment.dueDate ?? ""} disabled={isBusy} onChange={(event) => onAssignmentChange(assignment.id, { dueDate: event.target.value || null, dueDateStatus: event.target.value ? "explicit" : "missing" })} className="mt-1.5" />
                      </div>
                      <div className="xl:col-span-3">
                        <Label htmlFor={`${assignment.id}-points`} className="text-xs text-slate-600">Points <span className="font-normal text-slate-400">(optional)</span></Label>
                        <Input id={`${assignment.id}-points`} type="number" min="0" value={assignment.points ?? ""} disabled={isBusy} onChange={(event) => onAssignmentChange(assignment.id, { points: event.target.value === "" ? null : Number(event.target.value) })} className="mt-1.5" />
                      </div>
                      <div className="xl:col-span-3">
                        <Label htmlFor={`${assignment.id}-difficulty`} className="text-xs text-slate-600">Difficulty</Label>
                        <div className="relative mt-1.5">
                          <select id={`${assignment.id}-difficulty`} value={assignment.difficulty} disabled={isBusy} onChange={(event) => onAssignmentChange(assignment.id, { difficulty: event.target.value as SyllabusAssignmentDifficulty })} className={selectClassName}>
                            {difficultyOptions.map((difficulty) => <option key={difficulty} value={difficulty}>{capitalize(difficulty)}</option>)}
                          </select>
                          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                        </div>
                      </div>
                      <div className="sm:col-span-2 xl:col-span-6">
                        <Label htmlFor={`${assignment.id}-notes`} className="text-xs text-slate-600">Notes <span className="font-normal text-slate-400">(optional)</span></Label>
                        <Textarea id={`${assignment.id}-notes`} value={assignment.notes} disabled={isBusy} rows={1} onChange={(event) => onAssignmentChange(assignment.id, { notes: event.target.value })} placeholder="Reading, chapters, or anything helpful" className="mt-1.5 min-h-9 resize-none" />
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            <label className={`mt-4 flex cursor-pointer items-start gap-3 rounded-2xl border bg-white p-4 shadow-sm transition ${isReviewConfirmed ? "border-emerald-300 ring-2 ring-emerald-100" : "border-slate-200 hover:border-slate-300"}`}>
              <input type="checkbox" checked={isReviewConfirmed} disabled={isBusy} onChange={(event) => onReviewConfirmedChange(event.target.checked)} className="mt-0.5 size-4 rounded border-slate-300 accent-emerald-600" />
              <span>
                <span className="block text-sm font-semibold text-slate-900">Everything looks right</span>
                <span className="mt-1 block text-xs leading-5 text-slate-500">I reviewed the course, workload, and assignment details above.</span>
              </span>
            </label>

            {error ? <ErrorMessage message={error} /> : null}
          </section>
        </div>
      </div>

      <footer className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          disabled={isBusy}
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to upload
        </Button>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="hidden items-center gap-2 pr-2 text-xs text-slate-500 md:flex">
            <ListChecks className="size-4" aria-hidden="true" />
            {assignments.length} assignment{assignments.length === 1 ? "" : "s"} ready
          </div>
          <Button type="button" onClick={onCreate} disabled={isBusy || assignments.length === 0 || !classResolution || !isReviewConfirmed} className="min-w-48 bg-blue-600 text-white hover:bg-blue-700">
            {isImporting ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Sparkles className="size-4" aria-hidden="true" />}
            {isImporting ? "Building your plan..." : "Create study plan"}
          </Button>
        </div>
      </footer>
    </div>
  );
}

const selectClassName =
  "h-9 w-full appearance-none rounded-md border border-input bg-white px-3 pr-9 text-sm shadow-xs outline-none transition focus:border-ring focus:ring-[3px] focus:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50";

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
