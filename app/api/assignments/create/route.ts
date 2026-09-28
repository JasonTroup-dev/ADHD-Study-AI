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
const importanceValues = new Set(["low", "medium", "high", "critical"]);

const assignmentSelect = `
  id,
  user_id,
  class_id,
  title,
  description,
  due_date,
  importance,
  points,
  status,
  original_file_name,
  file_type,
  file_size_bytes,
  storage_path,
  extracted_text,
  context_status,
  context_version,
  created_at,
  updated_at,
  classes (
    name,
    color
  )
`;

type AssignmentFileDetails = {
  extension: SupportedAssignmentFileExtension;
  contentType: string;
};

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";

  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json(
      { error: "Create assignments using multipart/form-data." },
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

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json(
      { error: "You must be logged in to create an assignment." },
      { status: 401 },
    );
  }

  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "The assignment form data could not be read." },
      { status: 400 },
    );
  }

  const title = getString(formData, "title").trim();
  const description = getNullableString(formData, "description");
  const classId = getNullableString(formData, "class_id");
  const dueDate = getString(formData, "due_date").trim();
  const importance = getString(formData, "importance").trim();
  const pointsResult = parsePoints(formData.get("points"));
  const fileEntry = formData.get("file");
  const file =
    fileEntry instanceof File && fileEntry.size > 0 ? fileEntry : null;

  if (!title) {
    return NextResponse.json(
      { error: "An assignment title is required." },
      { status: 400 },
    );
  }

  if (!isValidDate(dueDate)) {
    return NextResponse.json(
      { error: "Choose a valid assignment due date." },
      { status: 400 },
    );
  }

  if (!importanceValues.has(importance)) {
    return NextResponse.json(
      { error: "Choose a valid assignment importance." },
      { status: 400 },
    );
  }

  if (!pointsResult.valid) {
    return NextResponse.json(
      { error: "Points must be a number of zero or greater." },
      { status: 400 },
    );
  }

  if (classId) {
    const { data: assignmentClass, error: classError } = await supabase
      .from("classes")
      .select("id")
      .eq("id", classId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (classError || !assignmentClass) {
      return NextResponse.json(
        { error: "Choose one of your classes for this assignment." },
        { status: 400 },
      );
    }
  }

  let fileDetails: AssignmentFileDetails | null = null;

  if (file) {
    if (file.size > MAX_STUDY_FILE_BYTES) {
      return fileTooLargeResponse();
    }

    fileDetails = getAssignmentFileDetails(file);

    if (!fileDetails) {
      return NextResponse.json(
        {
          error: `Unsupported file type. Upload a ${SUPPORTED_ASSIGNMENT_FILE_LABEL} file.`,
        },
        { status: 415 },
      );
    }
  }

  const { data: createdAssignment, error: createError } = await supabase
    .from("assignments")
    .insert({
      user_id: user.id,
      class_id: classId,
      title,
      description,
      due_date: dueDate,
      importance,
      points: pointsResult.value,
      status: "not_started",
    })
    .select("id")
    .single();

  if (createError || !createdAssignment) {
    console.error("Error creating assignment:", createError);
    return NextResponse.json(
      { error: "The assignment could not be saved." },
      { status: 500 },
    );
  }

  let storagePath: string | null = null;
  let extractionWarning: string | null = null;

  if (file && fileDetails) {
    storagePath = [
      user.id,
      createdAssignment.id,
      sanitizeStorageFileName(file.name, fileDetails.extension),
    ].join("/");

    let uploadError: unknown = null;

    try {
      const fileBuffer = await file.arrayBuffer();
      const uploadResult = await supabase.storage
        .from(ASSIGNMENT_FILES_BUCKET)
        .upload(storagePath, fileBuffer, {
          contentType: fileDetails.contentType,
          upsert: false,
        });

      uploadError = uploadResult.error;
    } catch (error) {
      uploadError = error;
    }

    if (uploadError) {
      console.error("Error uploading assignment file:", uploadError);
      await cleanupAssignment(supabase, createdAssignment.id);

      return NextResponse.json(
        {
          error:
            "The file could not be uploaded, so the assignment was not created.",
        },
        { status: 500 },
      );
    }

    let extractedText: string | null = null;

    try {
      const extracted = await extractTextFromFile(file);
      extractedText = extracted.text;
    } catch (error) {
      if (error instanceof FileTextExtractionError) {
        extractionWarning =
          "The file was attached, but readable text could not be extracted.";
        console.warn("Assignment text extraction warning:", error.message);
      } else {
        extractionWarning =
          "The file was attached, but readable text could not be extracted.";
        console.error("Unexpected assignment extraction error:", error);
      }
    }

    const { error: metadataError } = await supabase
      .from("assignments")
      .update({
        original_file_name: file.name,
        file_type: fileDetails.contentType,
        file_size_bytes: file.size,
      storage_path: storagePath,
      extracted_text: extractedText,
      context_status: extractedText ? "ready" : "failed",
      context_version: 1,
      })
      .eq("id", createdAssignment.id)
      .eq("user_id", user.id);

    if (metadataError) {
      console.error("Error saving assignment file metadata:", metadataError);
      await cleanupUploadedAssignment(
        supabase,
        createdAssignment.id,
        storagePath,
      );

      return NextResponse.json(
        {
          error:
            "The file metadata could not be saved, so the assignment was not created.",
        },
        { status: 500 },
      );
    }
  }

  const { data: assignment, error: loadError } = await supabase
    .from("assignments")
    .select(assignmentSelect)
    .eq("id", createdAssignment.id)
    .eq("user_id", user.id)
    .single();

  if (loadError || !assignment) {
    console.error("Error loading created assignment:", loadError);

    if (storagePath) {
      await cleanupUploadedAssignment(
        supabase,
        createdAssignment.id,
        storagePath,
      );
    } else {
      await cleanupAssignment(supabase, createdAssignment.id);
    }

    return NextResponse.json(
      {
        error:
          "The assignment could not be finalized, so it was not created.",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    assignment,
    warning: extractionWarning,
  });
}

function getString(formData: FormData, field: string) {
  const value = formData.get(field);
  return typeof value === "string" ? value : "";
}

function getNullableString(formData: FormData, field: string) {
  const value = getString(formData, field).trim();
  return value || null;
}

function parsePoints(value: FormDataEntryValue | null): {
  valid: boolean;
  value: number | null;
} {
  if (value === null || value === "") {
    return { valid: true, value: null };
  }

  if (typeof value !== "string") {
    return { valid: false, value: null };
  }

  const normalizedValue = value.trim();

  if (!normalizedValue) {
    return { valid: true, value: null };
  }

  const points = Number(normalizedValue);
  return {
    valid: Number.isFinite(points) && points >= 0,
    value: Number.isFinite(points) && points >= 0 ? points : null,
  };
}

function isValidDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

function getAssignmentFileDetails(
  file: File,
): AssignmentFileDetails | null {
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
  const acceptedContentTypes = getAcceptedContentTypes(typedExtension);

  if (
    suppliedContentType &&
    suppliedContentType !== "application/octet-stream" &&
    !acceptedContentTypes.has(suppliedContentType)
  ) {
    return null;
  }

  return {
    extension: typedExtension,
    contentType: expectedContentType,
  };
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

async function cleanupAssignment(
  supabase: Awaited<ReturnType<typeof createClient>>,
  assignmentId: string,
) {
  const { error } = await supabase
    .from("assignments")
    .delete()
    .eq("id", assignmentId);

  if (error) {
    console.error("Could not clean up assignment row:", error);
  }
}

async function cleanupUploadedAssignment(
  supabase: Awaited<ReturnType<typeof createClient>>,
  assignmentId: string,
  storagePath: string,
) {
  const { error: storageError } = await supabase.storage
    .from(ASSIGNMENT_FILES_BUCKET)
    .remove([storagePath]);

  if (storageError) {
    console.error("Could not clean up assignment file:", storageError);
  }

  await cleanupAssignment(supabase, assignmentId);
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
