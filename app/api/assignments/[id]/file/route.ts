import { NextResponse } from "next/server";

import {
  extractTextFromFile,
  FileTextExtractionError,
} from "@/lib/files/extractTextFromFile";
import {
  formatFileSize,
  MAX_STUDY_FILE_BYTES,
  SUPPORTED_ASSIGNMENT_FILE_EXTENSIONS,
  SUPPORTED_ASSIGNMENT_FILE_LABEL,
  type SupportedAssignmentFileExtension,
} from "@/lib/files/uploadConstraints";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const ASSIGNMENT_FILES_BUCKET = "assignment-files";
const MAX_MULTIPART_OVERHEAD_BYTES = 128 * 1024;

type FileDetails = {
  extension: SupportedAssignmentFileExtension;
  contentType: string;
};

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json(
      { error: "You must be logged in to upload assignment instructions." },
      { status: 401 },
    );
  }

  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";

  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json(
      { error: "Upload assignment instructions using multipart/form-data." },
      { status: 415 },
    );
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (
    Number.isFinite(contentLength) &&
    contentLength > MAX_STUDY_FILE_BYTES + MAX_MULTIPART_OVERHEAD_BYTES
  ) {
    return fileTooLargeResponse();
  }

  const { data: assignment, error: assignmentError } = await supabase
    .from("assignments")
    .select("id, storage_path, context_version")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (assignmentError) {
    console.error("Error loading assignment for file upload:", assignmentError);
    return NextResponse.json(
      { error: "The assignment could not be loaded." },
      { status: 500 },
    );
  }

  if (!assignment) {
    return NextResponse.json(
      { error: "Assignment not found." },
      { status: 404 },
    );
  }

  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "The assignment file could not be read." },
      { status: 400 },
    );
  }

  const fileEntry = formData.get("file");
  if (!(fileEntry instanceof File) || fileEntry.size === 0) {
    return NextResponse.json(
      { error: "Choose an assignment file to upload." },
      { status: 400 },
    );
  }

  if (fileEntry.size > MAX_STUDY_FILE_BYTES) {
    return fileTooLargeResponse();
  }

  const fileDetails = getFileDetails(fileEntry);
  if (!fileDetails) {
    return NextResponse.json(
      {
        error: `Unsupported file type. Upload a ${SUPPORTED_ASSIGNMENT_FILE_LABEL} file.`,
      },
      { status: 415 },
    );
  }

  const storagePath = [
    user.id,
    assignment.id,
    `${Date.now()}-${sanitizeStorageFileName(
      fileEntry.name,
      fileDetails.extension,
    )}`,
  ].join("/");

  let extractedText: string | null = null;
  let warning: string | null = null;

  try {
    const extracted = await extractTextFromFile(fileEntry);
    extractedText = extracted.text;
  } catch (error) {
    warning =
      "The file was attached, but readable text could not be extracted.";

    if (error instanceof FileTextExtractionError) {
      console.warn("Assignment text extraction warning:", error.message);
    } else {
      console.error("Unexpected assignment extraction error:", error);
    }
  }

  const fileBuffer = await fileEntry.arrayBuffer();
  const { error: uploadError } = await supabase.storage
    .from(ASSIGNMENT_FILES_BUCKET)
    .upload(storagePath, fileBuffer, {
      contentType: fileDetails.contentType,
      upsert: true,
    });

  if (uploadError) {
    console.error("Error uploading assignment instructions:", uploadError);
    return NextResponse.json(
      { error: "The assignment file could not be uploaded." },
      { status: 500 },
    );
  }

  const { error: metadataError } = await supabase
    .from("assignments")
    .update({
      original_file_name: fileEntry.name,
      file_type: fileDetails.contentType,
      file_size_bytes: fileEntry.size,
      storage_path: storagePath,
      extracted_text: extractedText,
      context_status: extractedText ? "ready" : "failed",
      context_version: (assignment.context_version ?? 0) + 1,
    })
    .eq("id", assignment.id)
    .eq("user_id", user.id);

  if (metadataError) {
    console.error("Error saving assignment file metadata:", metadataError);
    await supabase.storage
      .from(ASSIGNMENT_FILES_BUCKET)
      .remove([storagePath]);

    return NextResponse.json(
      { error: "The assignment file details could not be saved." },
      { status: 500 },
    );
  }

  if (assignment.storage_path && assignment.storage_path !== storagePath) {
    const { error: cleanupError } = await supabase.storage
      .from(ASSIGNMENT_FILES_BUCKET)
      .remove([assignment.storage_path]);

    if (cleanupError) {
      console.warn("Could not remove replaced assignment file:", cleanupError);
    }
  }

  return NextResponse.json({
    file: {
      originalFileName: fileEntry.name,
      hasExtractedText: Boolean(extractedText),
      contextVersion: (assignment.context_version ?? 0) + 1,
    },
    warning,
  });
}

function getFileDetails(file: File): FileDetails | null {
  const extension = getFileExtension(file.name);

  if (
    !SUPPORTED_ASSIGNMENT_FILE_EXTENSIONS.includes(
      extension as SupportedAssignmentFileExtension,
    )
  ) {
    return null;
  }

  const typedExtension = extension as SupportedAssignmentFileExtension;
  const expectedContentType = getContentType(typedExtension);
  const suppliedContentType = file.type.toLowerCase();
  const acceptedTypes = getAcceptedContentTypes(typedExtension);

  if (
    suppliedContentType &&
    suppliedContentType !== "application/octet-stream" &&
    !acceptedTypes.has(suppliedContentType)
  ) {
    return null;
  }

  return { extension: typedExtension, contentType: expectedContentType };
}

function getAcceptedContentTypes(extension: SupportedAssignmentFileExtension) {
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
  }
}

function getContentType(extension: SupportedAssignmentFileExtension) {
  switch (extension) {
    case ".pdf":
      return "application/pdf";
    case ".docx":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    case ".txt":
      return "text/plain";
    case ".md":
      return "text/markdown";
  }
}

function getFileExtension(fileName: string) {
  const lastDotIndex = fileName.lastIndexOf(".");
  return lastDotIndex === -1 ? "" : fileName.slice(lastDotIndex).toLowerCase();
}

function sanitizeStorageFileName(
  fileName: string,
  extension: SupportedAssignmentFileExtension,
) {
  const baseName = fileName
    .replace(/\\/g, "/")
    .split("/")
    .pop()
    ?.replace(/\.[^.]+$/, "")
    .normalize("NFKD")
    .replace(/[^\w.-]+/g, "_")
    .replace(/^[_\-.]+|[_\-.]+$/g, "")
    .slice(0, 160);

  return `${baseName || "assignment-file"}${extension}`;
}

function fileTooLargeResponse() {
  return NextResponse.json(
    {
      error: `File too large. Upload a file ${formatFileSize(
        MAX_STUDY_FILE_BYTES,
      )} or smaller.`,
    },
    { status: 413 },
  );
}
