import {
  formatFileSize,
  MAX_STUDY_FILE_BYTES,
  MAX_TUTOR_FILES,
  SUPPORTED_ASSIGNMENT_FILE_EXTENSIONS,
  SUPPORTED_STUDY_FILE_EXTENSIONS,
  SUPPORTED_STUDY_FILE_LABEL,
} from "@/lib/files/uploadConstraints";

import type {
  AnalysisSuggestion,
  ConfirmationItem,
} from "./types";

export function toConfirmationItem(
  suggestion: AnalysisSuggestion,
  files: File[],
): ConfirmationItem {
  const file = files[suggestion.fileIndex];
  const canUseAsAssignmentFile = file
    ? isAssignmentFileCompatible(file.name)
    : true;
  const kind =
    suggestion.kind === "assignment_file" && !canUseAsAssignmentFile
      ? "study_material"
      : suggestion.kind;

  return {
    ...suggestion,
    kind,
    originalFileName: file?.name ?? suggestion.originalFileName,
    clientId: `${suggestion.fileIndex}-${suggestion.originalFileName}`,
    newAssignmentTitle:
      suggestion.newAssignmentTitle ??
      deriveTitleFromFileName(file?.name ?? suggestion.originalFileName),
  };
}

export function validateFiles(files: File[]) {
  if (files.length === 0) return null;

  if (files.length > MAX_TUTOR_FILES) {
    return `Upload ${MAX_TUTOR_FILES} files or fewer at a time.`;
  }

  const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
  if (totalBytes > MAX_STUDY_FILE_BYTES) {
    return `Files must be ${formatFileSize(MAX_STUDY_FILE_BYTES)} or smaller in total.`;
  }

  for (const file of files) {
    const extension = getFileExtension(file.name);

    if (
      !SUPPORTED_STUDY_FILE_EXTENSIONS.includes(
        extension as (typeof SUPPORTED_STUDY_FILE_EXTENSIONS)[number],
      )
    ) {
      return `${file.name} is not supported. Upload ${SUPPORTED_STUDY_FILE_LABEL} files.`;
    }

    if (file.size > MAX_STUDY_FILE_BYTES) {
      return `${file.name} must be ${formatFileSize(MAX_STUDY_FILE_BYTES)} or smaller.`;
    }
  }

  return null;
}

export function isAssignmentFileCompatible(fileName: string) {
  const extension = getFileExtension(fileName);
  return SUPPORTED_ASSIGNMENT_FILE_EXTENSIONS.includes(
    extension as (typeof SUPPORTED_ASSIGNMENT_FILE_EXTENSIONS)[number],
  );
}

export function formatDueDate(dateKey: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(`${dateKey.slice(0, 10)}T00:00:00`));
}

export function deriveTitleFromFileName(fileName: string) {
  const title = fileName
    .replace(/\.[^.]+$/, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return title || "Uploaded assignment";
}

function getFileExtension(fileName: string) {
  const lastDotIndex = fileName.lastIndexOf(".");
  return lastDotIndex === -1 ? "" : fileName.slice(lastDotIndex).toLowerCase();
}
