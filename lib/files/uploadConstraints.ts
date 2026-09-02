export const MAX_STUDY_FILE_BYTES = 25 * 1024 * 1024;
export const MAX_TUTOR_FILES = 5;
export const MAX_TUTOR_ATTACHMENT_CHARS = 60_000;
export const MAX_TUTOR_IMAGE_BYTES = 512 * 1024;

export const SUPPORTED_TUTOR_IMAGE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
] as const;

export type SupportedTutorImageType =
  (typeof SUPPORTED_TUTOR_IMAGE_TYPES)[number];

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
export const TUTOR_ATTACHMENT_ACCEPT = [
  STUDY_FILE_ACCEPT,
  ...SUPPORTED_TUTOR_IMAGE_TYPES,
].join(",");

export type SupportedStudyFileExtension =
  (typeof SUPPORTED_STUDY_FILE_EXTENSIONS)[number];

export const SUPPORTED_ASSIGNMENT_FILE_EXTENSIONS = [
  ".txt",
  ".md",
  ".pdf",
  ".docx",
] as const;

export const ASSIGNMENT_FILE_ACCEPT =
  SUPPORTED_ASSIGNMENT_FILE_EXTENSIONS.join(",");
export const SUPPORTED_ASSIGNMENT_FILE_LABEL = "PDF, DOCX, TXT, or MD";

export type SupportedAssignmentFileExtension =
  (typeof SUPPORTED_ASSIGNMENT_FILE_EXTENSIONS)[number];

export const SUPPORTED_SYLLABUS_FILE_EXTENSIONS = [".pdf", ".docx"] as const;
export const SYLLABUS_FILE_ACCEPT = SUPPORTED_SYLLABUS_FILE_EXTENSIONS.join(",");
export const SUPPORTED_SYLLABUS_FILE_LABEL = "PDF or DOCX";

export type SupportedSyllabusFileExtension =
  (typeof SUPPORTED_SYLLABUS_FILE_EXTENSIONS)[number];

export function formatFileSize(bytes: number) {
  const megabytes = bytes / (1024 * 1024);

  return `${Number.isInteger(megabytes) ? megabytes : megabytes.toFixed(1)}MB`;
}
