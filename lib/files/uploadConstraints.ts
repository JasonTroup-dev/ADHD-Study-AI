export const MAX_STUDY_FILE_BYTES = 25 * 1024 * 1024;

export const SUPPORTED_STUDY_FILE_EXTENSIONS = [
  ".txt",
  ".md",
  ".pdf",
  ".docx",
  ".csv",
  ".json",
] as const;

export const STUDY_FILE_ACCEPT = SUPPORTED_STUDY_FILE_EXTENSIONS.join(",");
export const SUPPORTED_STUDY_FILE_LABEL = "TXT, MD, PDF, DOCX, CSV, or JSON";

export type SupportedStudyFileExtension =
  (typeof SUPPORTED_STUDY_FILE_EXTENSIONS)[number];

export function formatFileSize(bytes: number) {
  const megabytes = bytes / (1024 * 1024);

  return `${Number.isInteger(megabytes) ? megabytes : megabytes.toFixed(1)}MB`;
}
