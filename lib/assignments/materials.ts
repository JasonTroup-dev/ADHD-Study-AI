import type { SupabaseClient } from "@supabase/supabase-js";

import { extractAssignmentMaterialImageText } from "@/lib/ai/assignmentMaterialImage";
import {
  extractTextFromFile,
  FileTextExtractionError,
} from "@/lib/files/extractTextFromFile";
import {
  MAX_STUDY_FILE_BYTES,
  SUPPORTED_ASSIGNMENT_MATERIAL_FILE_EXTENSIONS,
  SUPPORTED_STUDY_FILE_EXTENSIONS,
  type SupportedAssignmentMaterialFileExtension,
} from "@/lib/files/uploadConstraints";
import type { Database } from "@/types/database";

const ASSIGNMENT_FILES_BUCKET = "assignment-files";

export type AssignmentMaterial = {
  id: string;
  originalFileName: string;
  fileType: string;
  hasExtractedText: boolean;
};

export type PreparedAssignmentMaterial = {
  file: File;
  details: StudyFileDetails;
  extractedText: string | null;
  warning: string | null;
};

export type StudyFileDetails = {
  extension: SupportedAssignmentMaterialFileExtension;
  contentType: string;
};

export function getStudyFileDetails(file: File): StudyFileDetails | null {
  if (file.size <= 0 || file.size > MAX_STUDY_FILE_BYTES) return null;

  const extension = getFileExtension(file.name);
  if (
    !SUPPORTED_ASSIGNMENT_MATERIAL_FILE_EXTENSIONS.includes(
      extension as SupportedAssignmentMaterialFileExtension,
    )
  ) {
    return null;
  }

  const typedExtension = extension as SupportedAssignmentMaterialFileExtension;
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
    extractedText: string | null;
    warning: string | null;
  },
): Promise<{ material: AssignmentMaterial; warning: string | null }> {
  const {
    userId,
    assignmentId,
    file,
    details,
    extractedText,
    warning,
  } = input;
  const storagePath = [
    userId,
    assignmentId,
    "materials",
    `${crypto.randomUUID()}-${sanitizeFileName(file.name, details.extension)}`,
  ].join("/");
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
    .select("id, original_file_name, file_type, extracted_text")
    .single();

  if (insertError || !data) {
    await supabase.storage.from(ASSIGNMENT_FILES_BUCKET).remove([storagePath]);
    throw insertError ?? new Error("The study material could not be saved.");
  }

  return {
    material: {
      id: data.id,
      originalFileName: data.original_file_name,
      fileType: data.file_type,
      hasExtractedText: Boolean(data.extracted_text),
    },
    warning,
  };
}

export async function prepareAssignmentMaterials(
  files: Array<{ file: File; details: StudyFileDetails }>,
  input: { safetyIdentifier: string; signal?: AbortSignal },
): Promise<PreparedAssignmentMaterial[]> {
  const prepared: PreparedAssignmentMaterial[] = await Promise.all(
    files.map(async ({ file, details }): Promise<PreparedAssignmentMaterial> => {
    if (!isTextExtractableExtension(details.extension)) {
      return { file, details, extractedText: null, warning: null };
    }

    try {
      return {
        file,
        details,
        extractedText: (await extractTextFromFile(file)).text,
        warning: null,
      };
    } catch (error) {
      if (error instanceof FileTextExtractionError) {
        console.warn("Assignment material extraction warning:", error.message);
      } else {
        console.error("Unexpected assignment material extraction error:", error);
      }
      return {
        file,
        details,
        extractedText: null,
        warning: `${file.name} was attached, but readable text could not be extracted.`,
      };
    }
    }),
  );
  const imageMaterials = prepared.flatMap((material, index) =>
    isImageContentType(material.details.contentType)
      ? [{
          index,
          name: material.file.name,
          mediaType: material.details.contentType,
          file: material.file,
        }]
      : [],
  );

  if (imageMaterials.length === 0) return prepared;

  try {
    const extractedByIndex = await extractAssignmentMaterialImageText({
      images: await Promise.all(imageMaterials.map(async (material) => ({
        index: material.index,
        name: material.name,
        mediaType: material.mediaType,
        bytes: await material.file.arrayBuffer(),
      }))),
      safetyIdentifier: input.safetyIdentifier,
      signal: input.signal,
    });

    imageMaterials.forEach((material) => {
      const extractedText = extractedByIndex.get(material.index) ?? null;
      prepared[material.index] = {
        ...prepared[material.index],
        extractedText,
        warning: extractedText
          ? null
          : `${material.name} was attached, but the image content could not be read.`,
      };
    });
  } catch (error) {
    console.error(
      "Assignment material image batch analysis error; retrying images individually:",
      error,
    );

    for (const material of imageMaterials) {
      try {
        const extractedByIndex = await extractAssignmentMaterialImageText({
          images: [{
            index: 0,
            name: material.name,
            mediaType: material.mediaType,
            bytes: await material.file.arrayBuffer(),
          }],
          safetyIdentifier: input.safetyIdentifier,
          signal: input.signal,
        });
        const extractedText = extractedByIndex.get(0) ?? null;
        prepared[material.index] = {
          ...prepared[material.index],
          extractedText,
          warning: extractedText
            ? null
            : `${material.name} was attached, but the image content could not be read.`,
        };
      } catch (retryError) {
        console.error(
          `Assignment material image analysis retry failed for ${material.name}:`,
          retryError,
        );
        prepared[material.index] = {
          ...prepared[material.index],
          warning: `${material.name} was attached, but the image content could not be read.`,
        };
      }
    }
  }

  return prepared;
}

export function isImageContentType(contentType: string) {
  return contentType === "image/png"
    || contentType === "image/jpeg"
    || contentType === "image/webp"
    || contentType === "image/gif";
}

function getFileExtension(fileName: string) {
  const lastDotIndex = fileName.lastIndexOf(".");
  return lastDotIndex === -1 ? "" : fileName.slice(lastDotIndex).toLowerCase();
}

function sanitizeFileName(
  fileName: string,
  extension: SupportedAssignmentMaterialFileExtension,
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

function getContentType(extension: SupportedAssignmentMaterialFileExtension) {
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
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".webp":
      return "image/webp";
    case ".gif":
      return "image/gif";
  }
}

function getAcceptedContentTypes(
  extension: SupportedAssignmentMaterialFileExtension,
) {
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
    case ".png":
      return new Set(["image/png"]);
    case ".jpg":
    case ".jpeg":
      return new Set(["image/jpeg"]);
    case ".webp":
      return new Set(["image/webp"]);
    case ".gif":
      return new Set(["image/gif"]);
  }
}

function isTextExtractableExtension(
  extension: SupportedAssignmentMaterialFileExtension,
) {
  return SUPPORTED_STUDY_FILE_EXTENSIONS.includes(
    extension as (typeof SUPPORTED_STUDY_FILE_EXTENSIONS)[number],
  );
}
