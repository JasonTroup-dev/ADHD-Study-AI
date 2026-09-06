import {
  applyAssignmentTaskRefinement,
  previewAssignmentTaskRefinement,
  TaskRefinementError,
} from "@/lib/assignments/taskRefinement";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id: assignmentId } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return Response.json(
      { error: "You must be signed in to refine a study plan." },
      { status: 401 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "Request body must be valid JSON." },
      { status: 400 },
    );
  }

  if (!isRecord(body) || (body.action !== "preview" && body.action !== "apply")) {
    return Response.json(
      { error: "Choose a valid plan refinement action." },
      { status: 400 },
    );
  }

  try {
    if (body.action === "preview") {
      const preview = await previewAssignmentTaskRefinement({
        supabase,
        userId: user.id,
        assignmentId,
        protectedTaskId:
          typeof body.protectedTaskId === "string"
            ? body.protectedTaskId
            : null,
        signal: request.signal,
      });
      return Response.json(preview);
    }

    if (
      typeof body.contextVersion !== "number"
      || !Array.isArray(body.tasks)
      || body.tasks.length === 0
      || !body.tasks.every(isProposedTask)
    ) {
      return Response.json(
        { error: "The assignment changed. Preview the refined plan again." },
        { status: 409 },
      );
    }

    const updatedTaskCount = await applyAssignmentTaskRefinement({
      supabase,
      userId: user.id,
      assignmentId,
      contextVersion: body.contextVersion,
      tasks: body.tasks,
    });
    return Response.json({ updatedTaskCount });
  } catch (error) {
    if (error instanceof TaskRefinementError) {
      return Response.json({ error: error.message }, { status: error.status });
    }

    console.error("Assignment task refinement error:", error);
    return Response.json(
      { error: "The assignment tasks could not be updated." },
      { status: 500 },
    );
  }
}

function isProposedTask(value: unknown): value is { id: string; proposedTitle: string } {
  return isRecord(value)
    && typeof value.id === "string"
    && typeof value.proposedTitle === "string"
    && value.proposedTitle.trim().length > 0
    && value.proposedTitle.length <= 120;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
