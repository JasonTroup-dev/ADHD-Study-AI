import {
  extractTextFromFile,
  FileTextExtractionError,
  prepareTutorSourceText,
} from "@/lib/files/extractTextFromFile";
import {
  formatFileSize,
  MAX_STUDY_FILE_BYTES,
  MAX_TUTOR_ATTACHMENT_CHARS,
  MAX_TUTOR_FILES,
} from "@/lib/files/uploadConstraints";

export const runtime = "nodejs";

const MAX_MULTIPART_OVERHEAD_BYTES = 128 * 1024;

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get("content-type")?.toLowerCase() ?? "";

    if (!contentType.includes("multipart/form-data")) {
      return Response.json(
        { error: "Upload tutor files using multipart/form-data." },
        { status: 415 },
      );
    }

    const contentLength = Number(req.headers.get("content-length") ?? 0);

    if (
      Number.isFinite(contentLength)
      && contentLength > MAX_STUDY_FILE_BYTES + MAX_MULTIPART_OVERHEAD_BYTES
    ) {
      return filesTooLargeResponse();
    }

    let formData: FormData;

    try {
      formData = await req.formData();
    } catch {
      return Response.json(
        { error: "Upload tutor files using valid multipart/form-data." },
        { status: 400 },
      );
    }

    const files = formData
      .getAll("files")
      .filter((entry): entry is File => entry instanceof File);

    if (files.length === 0) {
      return Response.json(
        { error: 'Attach at least one study document in the "files" field.' },
        { status: 400 },
      );
    }

    if (files.length > MAX_TUTOR_FILES) {
      return Response.json(
        { error: `Attach no more than ${MAX_TUTOR_FILES} files at a time.` },
        { status: 400 },
      );
    }

    const totalBytes = files.reduce((sum, file) => sum + file.size, 0);

    if (totalBytes > MAX_STUDY_FILE_BYTES) {
      return filesTooLargeResponse();
    }

    const perFileCharacterBudget = Math.floor(
      MAX_TUTOR_ATTACHMENT_CHARS / files.length,
    );
    const attachments = [];

    for (const file of files) {
      const extracted = await extractTextFromFile(file);

      attachments.push({
        name: extracted.originalName,
        content: prepareTutorSourceText(
          extracted.text,
          perFileCharacterBudget,
        ),
      });
    }

    return Response.json({ attachments });
  } catch (error) {
    if (error instanceof FileTextExtractionError) {
      return Response.json(
        { error: error.message },
        { status: getExtractionErrorStatus(error) },
      );
    }

    console.error("AI tutor file upload error:", error);

    return Response.json(
      { error: "Could not read the attached files." },
      { status: 500 },
    );
  }
}

function filesTooLargeResponse() {
  return Response.json(
    {
      error: `Files are too large. Attach up to ${formatFileSize(
        MAX_STUDY_FILE_BYTES,
      )} total.`,
    },
    { status: 413 },
  );
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
