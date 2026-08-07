import type {
  AnalysisSuggestion,
  CreateAssignmentResponse,
  MaterialsResponse,
} from "./types";

export async function analyzeClassMaterials(classId: string, files: File[]) {
  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));

  const response = await fetch(`/api/classes/${classId}/materials/analyze`, {
    method: "POST",
    body: formData,
  });
  const payload = await readJson<{
    suggestions?: AnalysisSuggestion[];
    error?: string;
  }>(response);

  if (!response.ok || !payload.suggestions) {
    throw new Error(payload.error ?? "The files could not be analyzed.");
  }

  return payload.suggestions;
}

export async function createAssignment(formData: FormData) {
  const response = await fetch("/api/assignments/create", {
    method: "POST",
    body: formData,
  });
  const payload = await readJson<CreateAssignmentResponse>(response);

  if (!response.ok || !payload.assignment) {
    throw new Error(payload.error ?? "Could not create this assignment.");
  }

  return { ...payload, assignment: payload.assignment };
}

export async function uploadAssignmentFile(
  assignmentId: string,
  file: File,
) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`/api/assignments/${assignmentId}/file`, {
    method: "POST",
    body: formData,
  });
  const payload = await readJson<{
    file?: { originalFileName: string };
    warning?: string | null;
    error?: string;
  }>(response);

  if (!response.ok || !payload.file) {
    throw new Error(
      payload.error ?? "The assignment file could not be uploaded.",
    );
  }

  return payload;
}

export async function uploadStudyMaterials(
  assignmentId: string,
  files: File[],
) {
  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));

  const response = await fetch(`/api/assignments/${assignmentId}/materials`, {
    method: "POST",
    body: formData,
  });
  const payload = await readJson<MaterialsResponse>(response);

  if (!response.ok || !payload.materials) {
    throw new Error(payload.error ?? "The study materials could not be uploaded.");
  }

  return payload;
}

async function readJson<T>(response: Response): Promise<T> {
  try {
    return (await response.json()) as T;
  } catch {
    return {} as T;
  }
}
