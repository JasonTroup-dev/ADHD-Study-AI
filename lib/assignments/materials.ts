import type { SupabaseClient } from "@supabase/supabase-js";

import {
  extractTextFromFile,
  FileTextExtractionError,
} from "@/lib/files/extractTextFromFile";
import {
  MAX_STUDY_FILE_BYTES,
  SUPPORTED_STUDY_FILE_EXTENSIONS,
  type SupportedStudyFileExtension,
} from "@/lib/files/uploadConstraints";
import type { Database } from "@/types/database";

const ASSIGNMENT_FILES_BUCKET = "assignment-files";

export type AssignmentMaterial = {
  id: string;
  originalFileName: string;
  hasExtractedText: boolean;
};

export type StudyFileDetails = {
  extension: SupportedStudyFileExtension;
  contentType: string;
};

export function getStudyFileDetails(file: File): StudyFileDetails | null {
  if (file.size <= 0 || file.size > MAX_STUDY_FILE_BYTES) return null;

  const extension = getFileExtension(file.name);
  if (
    !SUPPORTED_STUDY_FILE_EXTENSIONS.includes(
      extension as SupportedStudyFileExtension,
    )
  ) {
    return null;
  }

  const typedExtension = extension as SupportedStudyFileExtension;
  const contentType = getContentType(typedExtension);
  const suppliedContentType = file.type.toLowerCase();
  const acceptedTypes = getAcceptedContentTypes(typedExtension);

  if (
    suppliedContentType
    && suppliedContentType !== "application/octet-stream"
    && !acceptedTypes.has(suppliedContentType)
  ) {
    return null;
  }

  return { extension: typedExtension, contentType };
}

export async function saveAssignmentMaterial(
  supabase: SupabaseClient<Database>,
  input: {
    userId: string;
    assignmentId: string;
    file: File;
    details: StudyFileDetails;
  },
): Promise<{ material: AssignmentMaterial; warning: string | null }> {
  const { userId, assignmentId, file, details } = input;
  const storagePath = [
    userId,
    assignmentId,
    "materials",
    `${crypto.randomUUID()}-${sanitizeFileName(file.name, details.extension)}`,
  ].join("/");
  let extractedText: string | null = null;
  let warning: string | null = null;

  try {
    extractedText = (await extractTextFromFile(file)).text;
  } catch (error) {
    warning = `${file.name} was attached, but readable text could not be extracted.`;
    if (error instanceof FileTextExtractionError) {
      console.warn("Assignment material extraction warning:", error.message);
    } else {
      console.error("Unexpected assignment material extraction error:", error);
    }
  }

  const { error: uploadError } = await supabase.storage
    .from(ASSIGNMENT_FILES_BUCKET)
    .upload(storagePath, await file.arrayBuffer(), {
      contentType: details.contentType,
      upsert: false,
    });

  if (uploadError) throw uploadError;

  const { data, error: insertError } = await supabase
    .from("assignment_materials")
    .insert({
      assignment_id: assignmentId,
      user_id: userId,
      original_file_name: file.name,
      file_type: details.contentType,
      file_size_bytes: file.size,
      storage_path: storagePath,
      extracted_text: extractedText,
    })
    .select("id, original_file_name, extracted_text")
    .single();

  if (insertError || !data) {
    await supabase.storage.from(ASSIGNMENT_FILES_BUCKET).remove([storagePath]);
    throw insertError ?? new Error("The study material could not be saved.");
  }

  return {
    material: {
      id: data.id,
      originalFileName: data.original_file_name,
      hasExtractedText: Boolean(data.extracted_text),
    },
    warning,
  };
}

function getFileExtension(fileName: string) {
  const lastDotIndex = fileName.lastIndexOf(".");
  return lastDotIndex === -1 ? "" : fileName.slice(lastDotIndex).toLowerCase();
}

function sanitizeFileName(
  fileName: string,
  extension: SupportedStudyFileExtension,
) {
  const baseName = fileName
    .replace(/\\/g, "/")
    .split("/")
    .pop()
    ?.replace(/\.[^.]+$/, "")
    .normalize("NFKD")
    .replace(/[^\w.-]+/g, "_")
    .replace(/^[_\-.]+|[_\-.]+$/g, "")
    .slice(0, 140);

  return `${baseName || "study-material"}${extension}`;
}

function getContentType(extension: SupportedStudyFileExtension) {
  switch (extension) {
    case ".pdf":
      return "application/pdf";
    case ".docx":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    case ".txt":
      return "text/plain";
    case ".md":
      return "text/markdown";
    case ".csv":
      return "text/csv";
    case ".json":
      return "application/json";
  }
}

function getAcceptedContentTypes(extension: SupportedStudyFileExtension) {
  switch (extension) {
    case ".pdf":
      return new Set(["application/pdf"]);
    case ".docx":
      return new Set([
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ]);
    case ".txt":
      return new Set(["text/plain"]);
    case ".md":
      return new Set(["text/markdown", "text/plain", "text/x-markdown"]);
    case ".csv":
      return new Set(["text/csv", "application/csv", "text/plain"]);
    case ".json":
      return new Set(["application/json", "text/json", "text/plain"]);
  }
}
