import { NextResponse } from "next/server";

import {
  getStudyFileDetails,
  isImageContentType,
  prepareAssignmentMaterials,
} from "@/lib/assignments/materials";
import {
  createSafetyIdentifier,
  enforceAIQuota,
} from "@/lib/ai/requestProtection";
import {
  formatFileSize,
  MAX_STUDY_FILE_BYTES,
  MAX_TUTOR_FILES,
  SUPPORTED_ASSIGNMENT_MATERIAL_FILE_LABEL,
} from "@/lib/files/uploadConstraints";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const CLASS_FILES_BUCKET = "assignment-files";

export async function POST(
  request: Request,
  context: { params: Promise<{ classId: string }> },
) {
  const { classId } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json(
      { error: "You must be logged in to add class materials." },
      { status: 401 },
    );
  }

  const { data: classRow, error: classError } = await supabase
    .from("classes")
    .select("id")
    .eq("id", classId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (classError) {
    return NextResponse.json(
      { error: "The class could not be loaded." },
      { status: 500 },
    );
  }
  if (!classRow) {
    return NextResponse.json({ error: "Class not found." }, { status: 404 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "The class material upload could not be read." },
      { status: 400 },
    );
  }

  const files = formData
    .getAll("files")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);

  if (files.length === 0) {
    return NextResponse.json(
      { error: "Choose at least one class material." },
      { status: 400 },
    );
  }
  if (files.length > MAX_TUTOR_FILES) {
    return NextResponse.json(
      { error: `Add ${MAX_TUTOR_FILES} class materials or fewer at a time.` },
      { status: 400 },
    );
  }
  if (files.reduce((total, file) => total + file.size, 0) > MAX_STUDY_FILE_BYTES) {
    return NextResponse.json(
      { error: `Files must be ${formatFileSize(MAX_STUDY_FILE_BYTES)} or smaller in total.` },
      { status: 413 },
    );
  }

  const validatedFiles = files.map((file) => ({
    file,
    details: getStudyFileDetails(file),
  }));
  const invalidFile = validatedFiles.find(({ details }) => !details);
  if (invalidFile) {
    return NextResponse.json(
      {
        error: `${invalidFile.file.name}: Upload ${SUPPORTED_ASSIGNMENT_MATERIAL_FILE_LABEL} files.`,
      },
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
    const prepared = await prepareAssignmentMaterials(filesToPrepare, {
      safetyIdentifier: createSafetyIdentifier(user.id),
      signal: request.signal,
    });
    const materials = [];
    const warnings: string[] = [];

    for (const material of prepared) {
      const storagePath = [
        user.id,
        classId,
        "class-materials",
        `${crypto.randomUUID()}-${sanitizeFileName(material.file.name, material.details.extension)}`,
      ].join("/");
      const { error: uploadError } = await supabase.storage
        .from(CLASS_FILES_BUCKET)
        .upload(storagePath, await material.file.arrayBuffer(), {
          contentType: material.details.contentType,
          upsert: false,
        });
      if (uploadError) throw uploadError;

      const { data, error: insertError } = await supabase
        .from("assignment_files")
        .insert({
          user_id: user.id,
          class_id: classId,
          assignment_id: null,
          file_name: material.file.name,
          file_type: material.details.contentType,
          file_size: material.file.size,
          file_url: storagePath,
          extracted_text: material.extractedText,
        })
        .select("id")
        .single();

      if (insertError || !data) {
        await supabase.storage.from(CLASS_FILES_BUCKET).remove([storagePath]);
        throw insertError ?? new Error("The class material could not be saved.");
      }

      materials.push({ id: data.id });
      if (material.warning) warnings.push(material.warning);
    }

    return NextResponse.json({ materials, warnings });
  } catch (error) {
    console.error("Class material upload error:", error);
    return NextResponse.json(
      { error: "The class materials could not be uploaded." },
      { status: 500 },
    );
  }
}

function sanitizeFileName(fileName: string, extension: string) {
  const baseName = fileName
    .replace(/\\/g, "/")
    .split("/")
    .pop()
    ?.replace(/\.[^.]+$/, "")
    .normalize("NFKD")
    .replace(/[^\w.-]+/g, "_")
    .replace(/^[_\-.]+|[_\-.]+$/g, "")
    .slice(0, 140);

  return `${baseName || "class-material"}${extension}`;
}
