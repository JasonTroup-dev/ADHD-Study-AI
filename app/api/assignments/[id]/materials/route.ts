import { NextResponse } from "next/server";

import {
  getStudyFileDetails,
  isImageContentType,
  prepareAssignmentMaterials,
  saveAssignmentMaterial,
} from "@/lib/assignments/materials";
import {
  createSafetyIdentifier,
  enforceAIQuota,
} from "@/lib/ai/requestProtection";
import {
  applyAssignmentTaskRefinement,
  previewAssignmentTaskRefinement,
} from "@/lib/assignments/taskRefinement";
import {
  formatFileSize,
  MAX_STUDY_FILE_BYTES,
  MAX_TUTOR_FILES,
  SUPPORTED_ASSIGNMENT_MATERIAL_FILE_LABEL,
} from "@/lib/files/uploadConstraints";
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
    return NextResponse.json(
      { error: "You must be logged in to add study materials." },
      { status: 401 },
    );
  }

  const { data: assignment, error: assignmentError } = await supabase
    .from("assignments")
    .select("id, context_version")
    .eq("id", assignmentId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (assignmentError) {
    return NextResponse.json(
      { error: "The assignment could not be loaded." },
      { status: 500 },
    );
  }

  if (!assignment) {
    return NextResponse.json({ error: "Assignment not found." }, { status: 404 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "The study material upload could not be read." },
      { status: 400 },
    );
  }

  const files = formData
    .getAll("files")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);

  if (files.length === 0) {
    return NextResponse.json(
      { error: "Choose at least one study material." },
      { status: 400 },
    );
  }

  if (files.length > MAX_TUTOR_FILES) {
    return NextResponse.json(
      { error: `Add ${MAX_TUTOR_FILES} study materials or fewer at a time.` },
      { status: 400 },
    );
  }

  const validatedFiles = files.map((file) => ({
    file,
    details: getStudyFileDetails(file),
  }));
  const invalidFile = validatedFiles.find(({ details }) => !details);

  if (invalidFile) {
    const sizeMessage = invalidFile.file.size > MAX_STUDY_FILE_BYTES
      ? `Files must be ${formatFileSize(MAX_STUDY_FILE_BYTES)} or smaller.`
      : `Upload ${SUPPORTED_ASSIGNMENT_MATERIAL_FILE_LABEL} files.`;
    return NextResponse.json(
      { error: `${invalidFile.file.name}: ${sizeMessage}` },
      { status: 415 },
    );
  }

  const filesToPrepare = validatedFiles.flatMap(({ file, details }) =>
    details ? [{ file, details }] : [],
  );
  if (filesToPrepare.some(({ details }) => isImageContentType(details.contentType))) {
    const quotaResponse = await enforceAIQuota(supabase, "chat_files");
    if (quotaResponse) return quotaResponse;
  }

  try {
    const preparedMaterials = await prepareAssignmentMaterials(filesToPrepare, {
      safetyIdentifier: createSafetyIdentifier(user.id),
      signal: request.signal,
    });
    const results = [];
    for (const material of preparedMaterials) {
      results.push(
        await saveAssignmentMaterial(supabase, {
          userId: user.id,
          assignmentId,
          ...material,
        }),
      );
    }

    const warnings = results
      .map(({ warning }) => warning)
      .filter((warning): warning is string => Boolean(warning));
    const updatedTaskCount = results.some(
      ({ material }) => material.hasExtractedText,
    )
      ? await refreshAssignmentTasks({
          supabase,
          userId: user.id,
          assignmentId: assignment.id,
          contextVersion: assignment.context_version,
          warnings,
          signal: request.signal,
        })
      : 0;

    return NextResponse.json({
      materials: results.map(({ material }) => material),
      warnings,
      updatedTaskCount,
    });
  } catch (error) {
    console.error("Assignment study material upload error:", error);
    return NextResponse.json(
      { error: "The study materials could not be uploaded." },
      { status: 500 },
    );
  }
}

export async function PATCH(
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
    return NextResponse.json(
      { error: "You must be logged in to analyze assignment images." },
      { status: 401 },
    );
  }

  const { data: assignment, error: assignmentError } = await supabase
    .from("assignments")
    .select("id, context_version")
    .eq("id", assignmentId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (assignmentError) {
    return NextResponse.json(
      { error: "The assignment could not be loaded." },
      { status: 500 },
    );
  }
  if (!assignment) {
    return NextResponse.json({ error: "Assignment not found." }, { status: 404 });
  }

  let requestedMaterialIds: string[] | null = null;
  let updateTasks = true;
  if (request.headers.get("content-type")?.includes("application/json")) {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "The image analysis request must be valid JSON." },
        { status: 400 },
      );
    }

    if (!isRecord(body)
      || !Array.isArray(body.materialIds)
      || body.materialIds.length === 0
      || body.materialIds.length > MAX_TUTOR_FILES
      || !body.materialIds.every((id) => typeof id === "string" && id.length > 0)
    ) {
      return NextResponse.json(
        { error: `Choose between 1 and ${MAX_TUTOR_FILES} assignment images to reanalyze.` },
        { status: 400 },
      );
    }

    requestedMaterialIds = [...new Set(body.materialIds)];
    updateTasks = body.updateTasks !== false;
  }

  let materialsQuery = supabase
    .from("assignment_materials")
    .select("id, original_file_name, file_type, storage_path")
    .eq("assignment_id", assignment.id)
    .eq("user_id", user.id)
    .in("file_type", ["image/png", "image/jpeg", "image/webp", "image/gif"]);
  materialsQuery = requestedMaterialIds
    ? materialsQuery.in("id", requestedMaterialIds)
    : materialsQuery.is("extracted_text", null);
  const { data: unreadMaterials, error: materialsError } = await materialsQuery
    .order("created_at", { ascending: true })
    .limit(MAX_TUTOR_FILES);

  if (materialsError) {
    console.error("Unread assignment materials load error:", materialsError);
    return NextResponse.json(
      { error: "The attached images could not be loaded." },
      { status: 500 },
    );
  }
  if (!unreadMaterials?.length) {
    return NextResponse.json({
      materials: [],
      warnings: [],
      updatedTaskCount: 0,
      remainingUnreadCount: 0,
    });
  }

  const quotaResponse = await enforceAIQuota(supabase, "chat_files");
  if (quotaResponse) return quotaResponse;

  try {
    const warnings: string[] = [];
    const downloadableMaterials = await Promise.all(
      unreadMaterials.map(async (material) => {
        const { data, error } = await supabase.storage
          .from("assignment-files")
          .download(material.storage_path);
        if (error || !data) {
          warnings.push(`${material.original_file_name} could not be opened for analysis.`);
          return null;
        }

        const file = new File([data], material.original_file_name, {
          type: material.file_type,
        });
        const details = getStudyFileDetails(file);
        if (!details || !isImageContentType(details.contentType)) {
          warnings.push(`${material.original_file_name} is not a supported image.`);
          return null;
        }
        return { material, file, details };
      }),
    );
    const readyToAnalyze = downloadableMaterials.filter(
      (entry): entry is NonNullable<typeof entry> => Boolean(entry),
    );
    const prepared = await prepareAssignmentMaterials(
      readyToAnalyze.map(({ file, details }) => ({ file, details })),
      {
        safetyIdentifier: createSafetyIdentifier(user.id),
        signal: request.signal,
      },
    );
    const updatedMaterials = [];

    for (let index = 0; index < prepared.length; index += 1) {
      const source = readyToAnalyze[index];
      const result = prepared[index];
      if (result.warning) warnings.push(result.warning);
      if (!result.extractedText) continue;

      const { data, error } = await supabase
        .from("assignment_materials")
        .update({ extracted_text: result.extractedText })
        .eq("id", source.material.id)
        .eq("assignment_id", assignment.id)
        .eq("user_id", user.id)
        .select("id, original_file_name, file_type, extracted_text")
        .single();

      if (error || !data) {
        console.error("Assignment image analysis save error:", error);
        warnings.push(`${source.material.original_file_name} was read, but the analysis could not be saved.`);
        continue;
      }

      updatedMaterials.push({
        id: data.id,
        originalFileName: data.original_file_name,
        fileType: data.file_type,
        hasExtractedText: Boolean(data.extracted_text),
      });
    }

    // A forced reanalysis can partially succeed before its final batch fails.
    // Still refine from the successfully refreshed materials and any prior text.
    const shouldRefreshTasks = updateTasks
      && (updatedMaterials.length > 0 || requestedMaterialIds !== null);
    const updatedTaskCount = shouldRefreshTasks
      ? await refreshAssignmentTasks({
          supabase,
          userId: user.id,
          assignmentId: assignment.id,
          contextVersion: assignment.context_version,
          warnings,
          signal: request.signal,
        })
      : 0;
    const { count: remainingUnreadCount } = await supabase
      .from("assignment_materials")
      .select("id", { count: "exact", head: true })
      .eq("assignment_id", assignment.id)
      .eq("user_id", user.id)
      .in("file_type", ["image/png", "image/jpeg", "image/webp", "image/gif"])
      .is("extracted_text", null);

    return NextResponse.json({
      materials: updatedMaterials,
      warnings,
      updatedTaskCount,
      remainingUnreadCount: remainingUnreadCount ?? 0,
    });
  } catch (error) {
    console.error("Assignment image backfill error:", error);
    return NextResponse.json(
      { error: "The attached images could not be analyzed." },
      { status: 500 },
    );
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

async function refreshAssignmentTasks(input: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
  assignmentId: string;
  contextVersion: number;
  warnings: string[];
  signal?: AbortSignal;
}) {
  const nextContextVersion = (input.contextVersion ?? 0) + 1;
  const { error: contextError } = await input.supabase
    .from("assignments")
    .update({ context_version: nextContextVersion })
    .eq("id", input.assignmentId)
    .eq("user_id", input.userId);

  if (contextError) {
    console.error("Assignment material context version error:", contextError);
    input.warnings.push(
      "The materials were saved, but the assignment tasks could not be refreshed.",
    );
    return 0;
  }

  try {
    const refinement = await previewAssignmentTaskRefinement({
      supabase: input.supabase,
      userId: input.userId,
      assignmentId: input.assignmentId,
      automatic: true,
      signal: input.signal,
    });
    if (refinement.tasks.length === 0) return 0;

    return await applyAssignmentTaskRefinement({
      supabase: input.supabase,
      userId: input.userId,
      assignmentId: input.assignmentId,
      automatic: true,
      contextVersion: refinement.contextVersion,
      tasks: refinement.tasks.map(({ id, proposedTitle }) => ({
        id,
        proposedTitle,
      })),
    });
  } catch (error) {
    console.error("Automatic assignment task refinement error:", error);
    input.warnings.push(
      error instanceof Error
        ? error.message
        : "The materials were saved, but the assignment tasks could not be updated.",
    );
    return 0;
  }
}
