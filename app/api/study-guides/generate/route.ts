import { generateStudyGuideFromText } from "@/lib/ai/studyGuides";
import {
  extractTextFromFile,
  FileTextExtractionError,
  prepareStudyGuideSourceText,
} from "@/lib/files/extractTextFromFile";
import {
  formatFileSize,
  MAX_STUDY_FILE_BYTES,
} from "@/lib/files/uploadConstraints";
import { requireUser } from "@/lib/api/requireUser";
import {
  createSafetyIdentifier,
  enforceAIQuota,
} from "@/lib/ai/requestProtection";

export const runtime = "nodejs";

const MAX_MULTIPART_OVERHEAD_BYTES = 64 * 1024;

export async function POST(req: Request) {
  const auth = await requireUser();
  if (auth instanceof Response) return auth;

  try {
    const contentType = req.headers.get("content-type")?.toLowerCase() ?? "";

    if (!contentType.includes("multipart/form-data")) {
      return Response.json(
        { error: "Upload a study document using multipart/form-data." },
        { status: 415 },
      );
    }

    const contentLength = Number(req.headers.get("content-length") ?? 0);

    if (
      Number.isFinite(contentLength) &&
      contentLength > MAX_STUDY_FILE_BYTES + MAX_MULTIPART_OVERHEAD_BYTES
    ) {
      return fileTooLargeResponse();
    }

    const quotaResponse = await enforceAIQuota(auth.supabase, "study_guides");
    if (quotaResponse) return quotaResponse;

    let formData: FormData;

    try {
      formData = await req.formData();
    } catch {
      if (
        Number.isFinite(contentLength) &&
        contentLength > MAX_STUDY_FILE_BYTES
      ) {
        return fileTooLargeResponse();
      }

      return Response.json(
        { error: "Upload a study document using valid multipart/form-data." },
        { status: 400 },
      );
    }

    const file = formData.get("file");

    if (!(file instanceof File)) {
      return Response.json(
        { error: 'Missing file. Attach a study document in the "file" field.' },
        { status: 400 },
      );
    }

    if (file.size > MAX_STUDY_FILE_BYTES) {
      return fileTooLargeResponse();
    }

    const extracted = await extractTextFromFile(file);
    const modelSourceText = prepareStudyGuideSourceText(extracted.text);
    const content = await generateStudyGuideFromText(
      modelSourceText,
      createSafetyIdentifier(auth.user.id),
    );

    return Response.json({
      title: getStudyGuideTitle(content, extracted.originalName),
      content,
      originalFileName: extracted.originalName,
    });
  } catch (error) {
    if (error instanceof FileTextExtractionError) {
      return Response.json(
        { error: error.message },
        { status: getExtractionErrorStatus(error) },
      );
    }

    if (error instanceof Error && error.name === "APIConnectionTimeoutError") {
      return Response.json(
        {
          error:
            "Study guide generation took too long. Try a shorter document or try again.",
        },
        { status: 504 },
      );
    }

    return Response.json(
      { error: "Could not generate a study guide." },
      { status: 500 },
    );
  }
}

function getStudyGuideTitle(content: string, originalFileName: string) {
  const headingMatch = content.match(/^#\s+(.+)$/m);
  const heading = headingMatch?.[1]?.trim();

  if (heading) {
    return heading.replace(/\s+#+\s*$/, "").trim();
  }

  const fileNameWithoutExtension = originalFileName.replace(/\.[^.]+$/, "");

  return fileNameWithoutExtension.trim() || "Study Guide";
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

function getExtractionErrorStatus(error: FileTextExtractionError): number {
  switch (error.code) {
    case "unsupported_file_type":
      return 415;
    case "empty_extracted_text":
    case "unreadable_file":
      return 422;
  }
}
