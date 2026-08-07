import type {
  AssignmentSessionContext,
  PlanRefinement,
  RequiredTutorResponse,
  TutorMessage,
} from "./types";

export async function loadAssignmentContext(
  sessionId: string,
  plannerTaskId?: string | null,
) {
  const response = await fetch("/api/study-sessions/assignment-guide", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId, generateGuide: false, plannerTaskId }),
  });
  const payload = await readJson<{
    assignment?: AssignmentSessionContext;
    error?: string;
  }>(response);
  if (!response.ok || !payload.assignment) {
    throw new Error(payload.error ?? "The linked assignment could not be loaded.");
  }
  return payload.assignment;
}

export async function requestTutorResponse(
  sessionId: string,
  messages: TutorMessage[],
  plannerTaskId: string | null | undefined,
  signal: AbortSignal,
): Promise<RequiredTutorResponse> {
  const requestController = new AbortController();
  const abortRequest = () => requestController.abort();
  const timeout = window.setTimeout(abortRequest, 70_000);
  signal.addEventListener("abort", abortRequest, { once: true });

  try {
    const response = await fetch("/api/study-sessions/tutor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
        plannerTaskId: plannerTaskId ?? null,
        messages: messages.slice(-16).map(({ role, content }) => ({ role, content })),
      }),
      signal: requestController.signal,
    });
    const payload = await readJson<{
      message?: string;
      completionStatus?: "in_progress" | "ready";
      completionReason?: string;
      error?: string;
    }>(response);
    if (
      !response.ok ||
      typeof payload.message !== "string" ||
      (payload.completionStatus !== "in_progress" && payload.completionStatus !== "ready") ||
      typeof payload.completionReason !== "string"
    ) {
      throw new Error(payload.error ?? "The study tutor could not respond.");
    }
    return {
      message: payload.message,
      completionStatus: payload.completionStatus,
      completionReason: payload.completionReason,
    };
  } catch (error) {
    if (!signal.aborted && requestController.signal.aborted) {
      throw new Error("The tutor took too long to respond. Please send your message again.");
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
    signal.removeEventListener("abort", abortRequest);
  }
}

export async function uploadAssignmentContextFile(assignmentId: string, file: File) {
  const formData = new FormData();
  formData.append("file", file);
  const response = await fetch(`/api/assignments/${assignmentId}/file`, { method: "POST", body: formData });
  const payload = await readJson<{
    file?: { originalFileName: string; hasExtractedText: boolean; contextVersion: number };
    warning?: string | null;
    error?: string;
  }>(response);
  if (!response.ok || !payload.file) {
    throw new Error(payload.error ?? "The assignment file could not be uploaded.");
  }
  return { file: payload.file, warning: payload.warning ?? null };
}

export async function uploadAssignmentMaterials(assignmentId: string, files: File[]) {
  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));
  const response = await fetch(`/api/assignments/${assignmentId}/materials`, { method: "POST", body: formData });
  const payload = await readJson<{
    materials?: AssignmentSessionContext["materials"];
    warnings?: string[];
    error?: string;
  }>(response);
  if (!response.ok || !payload.materials) {
    throw new Error(payload.error ?? "The study materials could not be uploaded.");
  }
  return { materials: payload.materials, warnings: payload.warnings ?? [] };
}

export async function previewPlanRefinement(
  assignmentId: string,
  protectedTaskId?: string | null,
) {
  const response = await fetch(`/api/assignments/${assignmentId}/plan-refinement`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "preview", protectedTaskId: protectedTaskId ?? null }),
  });
  const payload = await readJson<PlanRefinement & { error?: string }>(response);
  if (!response.ok) {
    throw new Error(payload.error ?? "A refined planner preview could not be created.");
  }
  return payload;
}

export async function applyPlanRefinementRequest(
  assignmentId: string,
  refinement: PlanRefinement,
) {
  const response = await fetch(`/api/assignments/${assignmentId}/plan-refinement`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "apply",
      contextVersion: refinement.contextVersion,
      tasks: refinement.tasks.map(({ id, proposedTitle }) => ({ id, proposedTitle })),
    }),
  });
  const payload = await readJson<{ updatedTaskCount?: number; error?: string }>(response);
  if (!response.ok || typeof payload.updatedTaskCount !== "number") {
    throw new Error(payload.error ?? "The planner could not be updated.");
  }
  return payload.updatedTaskCount;
}

async function readJson<T>(response: Response): Promise<T> {
  try {
    return (await response.json()) as T;
  } catch {
    return {} as T;
  }
}
