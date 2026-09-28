"use client";

import { type FormEvent, useEffect, useRef, useState } from "react";

import type { ClassColor } from "@/lib/classColors";
import { notifyClassesChanged } from "@/lib/classEvents";
import { defaultPlanningPreferences, type PlanningPreferences } from "@/lib/planner/preferences";
import type { PlannerPreview } from "@/lib/planner/types";

import { analyzeSyllabusFile, importStudyPlan } from "./api";
import type {
  ClassResolution,
  ReviewAssignment,
  StudyPlannerModalActions,
  StudyPlannerModalProps,
  StudyPlannerModalState,
} from "./types";
import {
  getLocalDateOnly,
  getReviewValidationError,
  toImportAssignment,
  validateSyllabusFile,
} from "./validation";

export function useStudyPlannerModal({
  onClose,
  onStudyPlanCreated,
}: Pick<StudyPlannerModalProps, "onClose" | "onStudyPlanCreated">): {
  state: StudyPlannerModalState;
  actions: StudyPlannerModalActions;
} {
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<ReviewAssignment[]>([]);
  const [course, setCourse] = useState<StudyPlannerModalState["course"]>(null);
  const [classMatch, setClassMatch] = useState<StudyPlannerModalState["classMatch"]>(null);
  const [classResolution, setClassResolution] = useState<ClassResolution>(null);
  const [selectedClassId, setSelectedClassIdState] = useState("");
  const [newClassName, setNewClassNameState] = useState("");
  const [newClassCode, setNewClassCodeState] = useState("");
  const [newClassInstructor, setNewClassInstructorState] = useState("");
  const [newClassColor, setNewClassColorState] = useState<ClassColor>("blue");
  const [analysisFileName, setAnalysisFileName] = useState("");
  const [isReviewConfirmed, setIsReviewConfirmedState] = useState(false);

  const [preferences, setPreferencesState] = useState<PlanningPreferences>(defaultPlanningPreferences);
  const [preview, setPreview] = useState<PlannerPreview | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [step, setStep] = useState<StudyPlannerModalState["step"]>("upload");
  const analysisControllerRef = useRef<AbortController | null>(null);
  const isBusy = isAnalyzing || isImporting || isPreviewing;

  useEffect(() => () => analysisControllerRef.current?.abort(), []);

  function resetModal() {
    setSourceFile(null);
    setIsDragging(false);
    setIsAnalyzing(false);
    setUploadProgress(0);
    setIsImporting(false);
    setError(null);
    setAssignments([]);
    setCourse(null);
    setClassMatch(null);
    setClassResolution(null);
    setSelectedClassIdState("");
    setNewClassNameState("");
    setNewClassCodeState("");
    setNewClassInstructorState("");
    setNewClassColorState("blue");
    setAnalysisFileName("");
    setIsReviewConfirmedState(false);

    setPreview(null);
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
    setUploadProgress(0);
    const controller = new AbortController();
    analysisControllerRef.current = controller;

    try {
      const payload = await analyzeSyllabusFile(
        sourceFile,
        controller.signal,
        setUploadProgress,
      );
      const reviewAssignments = payload.assignments.map((assignment, index) => ({
        ...assignment,
        id: `${Date.now()}-${index}`,
        notes: assignment.notes ?? "",
      }));

      setAssignments(reviewAssignments);
      setCourse(payload.course);
      setClassMatch(payload.classMatch);
      setSelectedClassIdState(payload.classMatch?.id ?? "");
      setClassResolution(payload.classMatch ? "matched" : null);
      setNewClassNameState(payload.course.name ?? "");
      setNewClassCodeState(payload.course.classCode ?? "");
      setNewClassInstructorState(payload.course.instructor ?? "");
      setNewClassColorState("blue");
      setAnalysisFileName(payload.originalFileName ?? sourceFile.name);
      setIsReviewConfirmedState(false);
      setStep("review");
      const availability = await fetch("/api/planner", { signal: controller.signal });
      const saved = await availability.json();
      if (!availability.ok) throw new Error(saved.error ?? "Your availability could not be loaded.");
      setPreferencesState(saved.preferences);

      if (reviewAssignments.length === 0) {
        setError(
          "The AI did not find any assignments. Try another syllabus or add assignments manually.",
        );
      }
    } catch (analysisError) {
      if (analysisError instanceof DOMException && analysisError.name === "AbortError") {
        setError("Analysis stopped. Your syllabus is ready whenever you want to try again.");
      } else {
        setError(
          analysisError instanceof Error
            ? analysisError.message
            : "Could not analyze this syllabus. Please try again.",
        );
      }
    } finally {
      if (analysisControllerRef.current === controller) {
        analysisControllerRef.current = null;
      }
      setIsAnalyzing(false);
    }
  }

  async function createStudyPlan() {
    if (isBusy) return;
    if (!preview || preview.conflicts.length) return setError("Preview a schedule without conflicts before creating your plan.");
    const validationError = getReviewValidationError(assignments);
    if (validationError) return setError(validationError);
    if (
      (classResolution === "matched" || classResolution === "existing") &&
      !selectedClassId
    ) return setError("Choose the class this syllabus belongs to.");
    if (classResolution === "create") {
      if (!newClassName.trim()) return setError("Enter a name for the new class.");
      if (!newClassCode.trim()) return setError("Enter a course code for the new class.");
      if (!newClassInstructor.trim()) return setError("Enter the instructor for the new class.");
    }
    if (!classResolution) {
      return setError("Confirm whether to create the detected class or choose one.");
    }
    if (!isReviewConfirmed) {
      return setError("Confirm that the extracted information is correct.");
    }

    setError(null);
    setIsImporting(true);
    try {
      const summary = await importStudyPlan({
        classId: classResolution === "create" ? undefined : selectedClassId,
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
        preferences,
        version: preview.version,
        action: "apply",
      });
      if (summary.classCreated) notifyClassesChanged();
      onStudyPlanCreated(summary);
      resetModal();
      onClose();
    } catch (importError) {
      setPreview(null);
      setError(
        importError instanceof Error
          ? importError.message
          : "Could not create this study plan. Please try again.",
      );
    } finally {
      setIsImporting(false);
    }
  }

  function updateAssignment(
    id: string,
    patch: Partial<Omit<ReviewAssignment, "id">>,
  ) {
    setAssignments((current) =>
      current.map((assignment) =>
        assignment.id === id ? { ...assignment, ...patch } : assignment,
      ),
    );
    invalidateConfirmation();
  }

  function invalidateConfirmation() {
    setPreview(null);
    setIsReviewConfirmedState(false);
    setError(null);
  }

  async function previewStudyPlan() {
    if (isBusy) return;
    const validationError = getReviewValidationError(assignments);
    if (validationError) return setError(validationError);
    setIsPreviewing(true);
    setError(null);
    setIsReviewConfirmedState(false);
    try {
      const response = await fetch("/api/syllabus/import", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "preview", assignments: assignments.map(toImportAssignment), planningDate: getLocalDateOnly(), preferences }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "The schedule could not be previewed.");
      setPreview(payload);
    } catch (e) { setError(e instanceof Error ? e.message : "The schedule could not be previewed."); }
    finally { setIsPreviewing(false); }
  }

  return {
    state: {
      sourceFile,
      isDragging,
      isAnalyzing,
      uploadProgress,
      isImporting,
      isBusy,
      error,
      assignments,
      course,
      classMatch,
      classResolution,
      selectedClassId,
      newClassName,
      newClassCode,
      newClassInstructor,
      newClassColor,
      analysisFileName,
      isReviewConfirmed,
      preferences,
      preview,
      isPreviewing,
      step,
    },
    actions: {
      analyzeSyllabus,
      cancelAnalysis: () => analysisControllerRef.current?.abort(),
      chooseClassResolution: (resolution) => {
        setClassResolution(resolution);
        invalidateConfirmation();
      },
      closeModal,
      createStudyPlan,
      previewStudyPlan,
      setPreferences: (value) => { setPreferencesState(value); invalidateConfirmation(); },
      goBack: () => {
        setStep("upload");
        invalidateConfirmation();
      },
      removeAssignment: (id) => {
        setAssignments((current) => current.filter((item) => item.id !== id));
        invalidateConfirmation();
      },
      setIsDragging,
      setIsReviewConfirmed: (confirmed) => {
        setIsReviewConfirmedState(confirmed);
        setError(null);
      },
      setNewClassCode: (value) => {
        setNewClassCodeState(value);
        invalidateConfirmation();
      },
      setNewClassColor: (value) => {
        setNewClassColorState(value);
        invalidateConfirmation();
      },
      setNewClassInstructor: (value) => {
        setNewClassInstructorState(value);
        invalidateConfirmation();
      },
      setNewClassName: (value) => {
        setNewClassNameState(value);
        invalidateConfirmation();
      },
      setSelectedClassId: (value) => {
        setSelectedClassIdState(value);
        invalidateConfirmation();
      },
      updateAssignment,
      updateSourceFile,
    },
  };
}
