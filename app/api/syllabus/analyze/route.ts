import { analyzeSyllabusText } from "@/lib/ai/syllabus";
import {
  extractTextFromFile,
  FileTextExtractionError,
} from "@/lib/files/extractTextFromFile";
import {
  formatFileSize,
  MAX_STUDY_FILE_BYTES,
  SUPPORTED_SYLLABUS_FILE_EXTENSIONS,
  SUPPORTED_SYLLABUS_FILE_LABEL,
  type SupportedSyllabusFileExtension,
} from "@/lib/files/uploadConstraints";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const MAX_MULTIPART_OVERHEAD_BYTES = 128 * 1024;

type ClassRow = {
  id: string;
  name: string | null;
  class_code: string | null;
};

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";

  if (!contentType.includes("multipart/form-data")) {
    return Response.json(
      { error: "Upload a syllabus using multipart/form-data." },
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
    return Response.json(
      { error: "You must be logged in to analyze a syllabus." },
      { status: 401 },
    );
  }

  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return Response.json(
      { error: "Upload a valid syllabus file." },
      { status: 400 },
    );
  }

  const { data: classRows, error: classError } = await supabase
    .from("classes")
    .select("id, name, class_code")
    .eq("user_id", user.id);

  if (classError) {
    return Response.json(
      { error: "Could not load your classes before analyzing this syllabus." },
      { status: 500 },
    );
  }

  const fileEntry = formData.get("file");

  if (!(fileEntry instanceof File) || fileEntry.size === 0) {
    return Response.json(
      { error: "Attach a syllabus PDF or DOCX first." },
      { status: 400 },
    );
  }

  if (fileEntry.size > MAX_STUDY_FILE_BYTES) {
    return fileTooLargeResponse();
  }

  if (!isSupportedSyllabusFile(fileEntry)) {
    return Response.json(
      {
        error: `Unsupported file type. Upload a ${SUPPORTED_SYLLABUS_FILE_LABEL} syllabus.`,
      },
      { status: 415 },
    );
  }

  try {
    const extracted = await extractTextFromFile(fileEntry);
    const existingClasses = ((classRows ?? []) as ClassRow[]).map(
      (classRow) => ({
        id: classRow.id,
        name: classRow.name,
        classCode: classRow.class_code,
      }),
    );
    const analysis = await analyzeSyllabusText({
      text: extracted.text,
      originalFileName: extracted.originalName,
      existingClasses,
    });
    const matchedClass = existingClasses.find(
      (classItem) => classItem.id === analysis.matchedClassId,
    );

    return Response.json({
      course: analysis.course,
      classMatch: matchedClass
        ? {
            id: matchedClass.id,
            name: matchedClass.name ?? "Untitled class",
            classCode: matchedClass.classCode,
          }
        : null,
      assignments: analysis.assignments,
      originalFileName: extracted.originalName,
      sourceCharCount: extracted.text.length,
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
        { error: "Syllabus AI is not configured yet." },
        { status: 500 },
      );
    }

    if (error instanceof Error && error.name === "APIConnectionTimeoutError") {
      return Response.json(
        {
          error:
            "Syllabus analysis took too long. Try a shorter file or try again.",
        },
        { status: 504 },
      );
    }

    console.error("Syllabus analysis error:", error);
    return Response.json(
      {
        error:
          "Could not analyze this syllabus. Nothing was saved. Try again or add assignments manually.",
      },
      { status: 500 },
    );
  }
}

function isSupportedSyllabusFile(file: File) {
  const extension = getFileExtension(file.name);

  if (
    !SUPPORTED_SYLLABUS_FILE_EXTENSIONS.includes(
      extension as SupportedSyllabusFileExtension,
    )
  ) {
    return false;
  }

  const typedExtension = extension as SupportedSyllabusFileExtension;
  const suppliedContentType = file.type.toLowerCase();

  return (
    !suppliedContentType ||
    suppliedContentType === "application/octet-stream" ||
    getAcceptedContentTypes(typedExtension).has(suppliedContentType)
  );
}

function getAcceptedContentTypes(extension: SupportedSyllabusFileExtension) {
  switch (extension) {
    case ".pdf":
      return new Set(["application/pdf"]);
    case ".docx":
      return new Set([
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ]);
  }
}

function getFileExtension(fileName: string) {
  const lastDotIndex = fileName.lastIndexOf(".");
  return lastDotIndex === -1 ? "" : fileName.slice(lastDotIndex).toLowerCase();
}

function getExtractionErrorMessage(error: FileTextExtractionError) {
  if (error.code === "empty_extracted_text") {
    return "No readable text was found. Try a text-based PDF or DOCX syllabus.";
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

function fileTooLargeResponse() {
  return Response.json(
    {
      error: `File too large. Upload a file ${formatFileSize(
        MAX_STUDY_FILE_BYTES,
      )} or smaller.`,
    },
    { status: 413 },
  );
}
