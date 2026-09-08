import { generatePracticeQuizFromText } from "@/lib/ai/practiceQuiz";
import {
  createSafetyIdentifier,
  enforceAIQuota,
} from "@/lib/ai/requestProtection";
import { requireUser } from "@/lib/api/requireUser";
import {
  extractTextFromFile,
  FileTextExtractionError,
  normalizeExtractedText,
} from "@/lib/files/extractTextFromFile";
import {
  formatFileSize,
  MAX_STUDY_FILE_BYTES,
} from "@/lib/files/uploadConstraints";

export const runtime = "nodejs";

const MAX_MULTIPART_OVERHEAD_BYTES = 2 * 1024 * 1024;
const MAX_PASTED_STUDY_CHARS = 500_000;

export async function POST(request: Request) {
  const auth = await requireUser();
  if (auth instanceof Response) return auth;

  try {
    const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
    if (!contentType.includes("multipart/form-data")) {
      return Response.json(
        { error: "Add study material using the quiz form." },
        { status: 415 },
      );
    }

    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (
      Number.isFinite(contentLength) &&
      contentLength > MAX_STUDY_FILE_BYTES + MAX_MULTIPART_OVERHEAD_BYTES
    ) {
      return materialTooLargeResponse();
    }

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return Response.json(
        { error: "The study material could not be read. Try adding it again." },
        { status: 400 },
      );
    }

    const fileValue = formData.get("file");
    const textValue = formData.get("text");
    const classValue = formData.get("classId");
    const file = fileValue instanceof File && fileValue.size > 0 ? fileValue : null;
    const pastedText = typeof textValue === "string" ? textValue : "";
    const classId = typeof classValue === "string" && classValue ? classValue : null;

    if (!file && !pastedText.trim()) {
      return Response.json(
        { error: "Upload a document or paste your study material." },
        { status: 400 },
      );
    }

    if (file && file.size > MAX_STUDY_FILE_BYTES) {
      return materialTooLargeResponse();
    }

    if (!file && pastedText.length > MAX_PASTED_STUDY_CHARS) {
      return Response.json(
        {
          error:
            "That pasted text is too large for one request. Upload it as a document instead.",
        },
        { status: 413 },
      );
    }

    if (classId) {
      const { data: ownedClass, error: classError } = await auth.supabase
        .from("classes")
        .select("id")
        .eq("id", classId)
        .eq("user_id", auth.user.id)
        .maybeSingle();

      if (classError || !ownedClass) {
        return Response.json(
          { error: "Choose one of your classes, or leave the class blank." },
          { status: 400 },
        );
      }
    }

    const quotaResponse = await enforceAIQuota(
      auth.supabase,
      "practice_quiz",
    );
    if (quotaResponse) return quotaResponse;

    const sourceText = file
      ? (await extractTextFromFile(file)).text
      : normalizeExtractedText(pastedText);
    const quiz = await generatePracticeQuizFromText(
      sourceText,
      undefined,
      createSafetyIdentifier(auth.user.id),
    );

    const { data: savedQuiz, error: saveError } = await auth.supabase
      .from("practice_quiz_sets")
      .insert({
        user_id: auth.user.id,
        class_id: classId,
        title: quiz.title,
        source_name: file?.name ?? "Pasted notes",
      })
      .select("id")
      .single();

    if (saveError || !savedQuiz) {
      console.error("Practice quiz save error:", saveError);
      return Response.json(
        { error: "Your quiz was created but could not be saved. Please try again." },
        { status: 500 },
      );
    }

    const { error: questionsError } = await auth.supabase
      .from("practice_quiz_questions")
      .insert(
        quiz.questions.map((question, questionOrder) => ({
          quiz_set_id: savedQuiz.id,
          question: question.question,
          choices: question.choices,
          correct_choice_index: question.correctChoiceIndex,
          explanation: question.explanation,
          topic: question.topic,
          difficulty: question.difficulty,
          question_order: questionOrder,
        })),
      );

    if (questionsError) {
      console.error("Practice quiz question save error:", questionsError);
      await auth.supabase
        .from("practice_quiz_sets")
        .delete()
        .eq("id", savedQuiz.id);
      return Response.json(
        { error: "Your quiz was created but could not be saved. Please try again." },
        { status: 500 },
      );
    }

    return Response.json({ ...quiz, id: savedQuiz.id });
  } catch (error) {
    if (error instanceof FileTextExtractionError) {
      return Response.json(
        { error: error.message },
        { status: getExtractionErrorStatus(error) },
      );
    }

    if (error instanceof Error && error.name === "APIConnectionTimeoutError") {
      return Response.json(
        { error: "Quiz generation took too long. Please try again." },
        { status: 504 },
      );
    }

    console.error("Practice quiz generation error:", error);
    return Response.json(
      { error: "Could not create the practice quiz. Please try again." },
      { status: 500 },
    );
  }
}

function materialTooLargeResponse() {
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
