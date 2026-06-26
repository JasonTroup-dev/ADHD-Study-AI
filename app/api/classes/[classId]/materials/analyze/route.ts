import { analyzeClassMaterialFiles } from "@/lib/ai/classMaterials";
import { getStudyFileDetails } from "@/lib/assignments/materials";
import {
  extractTextFromFile,
  FileTextExtractionError,
} from "@/lib/files/extractTextFromFile";
import {
  formatFileSize,
  MAX_STUDY_FILE_BYTES,
  MAX_TUTOR_FILES,
  SUPPORTED_ASSIGNMENT_FILE_EXTENSIONS,
  type SupportedAssignmentFileExtension,
} from "@/lib/files/uploadConstraints";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const MAX_MULTIPART_OVERHEAD_BYTES = 128 * 1024;
const assignmentFileExtensions = new Set<string>(
  SUPPORTED_ASSIGNMENT_FILE_EXTENSIONS,
);

type ClassRow = {
  id: string;
  name: string | null;
  class_code: string | null;
};

type AssignmentRow = {
  id: string;
  title: string | null;
  due_date: string | null;
  original_file_name: string | null;
};

export async function POST(
  request: Request,
  context: { params: Promise<{ classId: string }> },
) {
  const { classId } = await context.params;
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";

  if (!contentType.includes("multipart/form-data")) {
    return Response.json(
      { error: "Upload class files using multipart/form-data." },
      { status: 415 },
    );
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);

  if (
    Number.isFinite(contentLength) &&
    contentLength > MAX_STUDY_FILE_BYTES + MAX_MULTIPART_OVERHEAD_BYTES
  ) {
    return filesTooLargeResponse();
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return Response.json(
      { error: "You must be logged in to analyze class materials." },
      { status: 401 },
    );
  }

  const { data: classRow, error: classError } = await supabase
    .from("classes")
    .select("id, name, class_code")
    .eq("id", classId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (classError) {
    return Response.json(
      { error: "The class could not be loaded." },
      { status: 500 },
    );
  }

  if (!classRow) {
    return Response.json({ error: "Class not found." }, { status: 404 });
  }

  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return Response.json(
      { error: "The uploaded files could not be read." },
      { status: 400 },
    );
  }

  const files = formData
    .getAll("files")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);

  if (files.length === 0) {
    return Response.json(
      { error: "Choose at least one file to analyze." },
      { status: 400 },
    );
  }

  if (files.length > MAX_TUTOR_FILES) {
    return Response.json(
      { error: `Upload ${MAX_TUTOR_FILES} files or fewer at a time.` },
      { status: 400 },
    );
  }

  const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
  if (totalBytes > MAX_STUDY_FILE_BYTES) {
    return filesTooLargeResponse();
  }

  const validatedFiles = files.map((file) => ({
    file,
    details: getStudyFileDetails(file),
  }));
  const invalidFile = validatedFiles.find(({ details }) => !details);

  if (invalidFile) {
    return Response.json(
      {
        error: `${invalidFile.file.name} must be ${formatFileSize(
          MAX_STUDY_FILE_BYTES,
        )} or smaller and use a supported file type.`,
      },
      { status: 415 },
    );
  }

  const { data: assignmentRows, error: assignmentError } = await supabase
    .from("assignments")
    .select("id, title, due_date, original_file_name")
    .eq("class_id", classId)
    .eq("user_id", user.id)
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (assignmentError) {
    return Response.json(
      { error: "Your assignments could not be loaded for matching." },
      { status: 500 },
    );
  }

  try {
    const extractedFiles = [];

    for (let index = 0; index < validatedFiles.length; index += 1) {
      const { file, details } = validatedFiles[index];
      if (!details) continue;

      const extracted = await extractTextFromFile(file);
      extractedFiles.push({
        fileIndex: index,
        originalFileName: extracted.originalName,
        extension: extracted.extension,
        text: extracted.text,
      });
    }

    const assignments = ((assignmentRows ?? []) as AssignmentRow[]).map(
      (assignment) => ({
        id: assignment.id,
        title: assignment.title ?? "Untitled Assignment",
        dueDate: assignment.due_date,
        hasAssignmentFile: Boolean(assignment.original_file_name),
      }),
    );
    const analysis = await analyzeClassMaterialFiles({
      className: (classRow as ClassRow).name ?? "Untitled class",
      classCode: (classRow as ClassRow).class_code,
      assignments,
      files: extractedFiles,
    });
    const extractedByIndex = new Map(
      extractedFiles.map((file) => [file.fileIndex, file]),
    );

    return Response.json({
      suggestions: analysis.map((suggestion) => {
        const file = extractedByIndex.get(suggestion.fileIndex);
        const kind =
          suggestion.kind === "assignment_file" &&
          file &&
          !isSupportedAssignmentFileExtension(file.extension)
            ? "study_material"
            : suggestion.kind;

        return {
          ...suggestion,
          kind,
          originalFileName:
            file?.originalFileName ?? files[suggestion.fileIndex]?.name ?? "File",
          reason:
            kind === suggestion.kind
              ? suggestion.reason
              : `${suggestion.reason} This file type is best saved as study material.`,
        };
      }),
    });
  } catch (error) {
    if (error instanceof FileTextExtractionError) {
      return Response.json(
        { error: getExtractionErrorMessage(error) },
        { status: getExtractionErrorStatus(error) },
      );
    }

    if (error instanceof Error && error.message.includes("OPENAI_API_KEY")) {
      return Response.json(
        { error: "Material analysis AI is not configured yet." },
        { status: 500 },
      );
    }

    if (error instanceof Error && error.name === "APIConnectionTimeoutError") {
      return Response.json(
        {
          error:
            "Material analysis took too long. Try fewer files or try again.",
        },
        { status: 504 },
      );
    }

    console.error("Class material analysis error:", error);
    return Response.json(
      {
        error:
          "Could not analyze these files. Nothing was saved. Try again or add the assignment manually.",
      },
      { status: 500 },
    );
  }
}

function isSupportedAssignmentFileExtension(
  extension: string,
): extension is SupportedAssignmentFileExtension {
  return assignmentFileExtensions.has(extension);
}

function getExtractionErrorMessage(error: FileTextExtractionError) {
  if (error.code === "empty_extracted_text") {
    return "No readable text was found. Try a text-based PDF, DOCX, TXT, MD, CSV, or JSON file.";
  }

  return error.message;
}

function getExtractionErrorStatus(error: FileTextExtractionError): number {
  switch (error.code) {
    case "unsupported_file_type":
      return 415;
    case "empty_extracted_text":
    case "unreadable_file":
      return 422;
  }
}

function filesTooLargeResponse() {
  return Response.json(
    {
      error: `Files are too large. Upload up to ${formatFileSize(
        MAX_STUDY_FILE_BYTES,
      )} total.`,
    },
    { status: 413 },
  );
}
