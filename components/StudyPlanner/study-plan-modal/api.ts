import { uploadFormData } from "@/lib/files/uploadFormData";

import type { AnalyzeResponse, ImportResponse } from "./types";

export async function analyzeSyllabusFile(
  file: File,
  signal: AbortSignal,
  onUploadProgress: (progress: number) => void,
) {
  const formData = new FormData();
  formData.append("file", file);
  const response = await uploadFormData<AnalyzeResponse>(
    "/api/syllabus/analyze",
    formData,
    { signal, onUploadProgress },
  );
  const payload = response.data ?? {};

  if (!response.ok) {
    throw new Error(payload.error ?? "Could not analyze this syllabus.");
  }
  if (!payload.course || !Array.isArray(payload.assignments)) {
    throw new Error("The syllabus analysis response was incomplete.");
  }
  return {
    course: payload.course,
    assignments: payload.assignments,
    classMatch: payload.classMatch ?? null,
    originalFileName: payload.originalFileName,
  };
}

export async function importStudyPlan(body: unknown) {
  const response = await fetch("/api/syllabus/import", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await readImportResponse(response);

  if (!response.ok) {
    throw new Error(payload.error ?? "Could not create this study plan.");
  }
  if (
    typeof payload.assignmentCount !== "number" ||
    typeof payload.studySessionCount !== "number" ||
    typeof payload.classId !== "string" ||
    typeof payload.className !== "string" ||
    typeof payload.classCreated !== "boolean"
  ) {
    throw new Error("The generated study plan response was incomplete.");
  }
  return {
    assignmentCount: payload.assignmentCount,
    studySessionCount: payload.studySessionCount,
    classId: payload.classId,
    className: payload.className,
    classCreated: payload.classCreated,
  };
}

async function readImportResponse(response: Response) {
  try {
    return (await response.json()) as ImportResponse;
  } catch {
    return {};
  }
}
