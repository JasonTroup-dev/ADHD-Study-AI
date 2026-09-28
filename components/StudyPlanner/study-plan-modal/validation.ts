import {
  formatFileSize,
  MAX_STUDY_FILE_BYTES,
  SUPPORTED_SYLLABUS_FILE_EXTENSIONS,
  SUPPORTED_SYLLABUS_FILE_LABEL,
} from "@/lib/files/uploadConstraints";
import type { SyllabusAssignment } from "@/types/syllabus";

import type { ReviewAssignment } from "./types";

export function validateSyllabusFile(file: File) {
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

export function getReviewValidationError(assignments: ReviewAssignment[]) {
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

export function toImportAssignment(
  assignment: ReviewAssignment,
): SyllabusAssignment {
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

export function getAssignmentReviewWarning(assignment: ReviewAssignment) {
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

export function getLocalDateOnly(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getFileExtension(fileName: string) {
  const lastDotIndex = fileName.lastIndexOf(".");
  return lastDotIndex === -1 ? "" : fileName.slice(lastDotIndex).toLowerCase();
}
