import { NextResponse } from "next/server";

import {
  getStudyFileDetails,
  saveAssignmentMaterial,
} from "@/lib/assignments/materials";
import {
  formatFileSize,
  MAX_STUDY_FILE_BYTES,
  MAX_TUTOR_FILES,
  SUPPORTED_STUDY_FILE_LABEL,
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
    .select("id")
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
      : `Upload ${SUPPORTED_STUDY_FILE_LABEL} files.`;
    return NextResponse.json(
      { error: `${invalidFile.file.name}: ${sizeMessage}` },
      { status: 415 },
    );
  }

  try {
    const results = [];
    for (const { file, details } of validatedFiles) {
      if (!details) continue;
      results.push(
        await saveAssignmentMaterial(supabase, {
          userId: user.id,
          assignmentId,
          file,
          details,
        }),
      );
    }

    return NextResponse.json({
      materials: results.map(({ material }) => material),
      warnings: results
        .map(({ warning }) => warning)
        .filter((warning): warning is string => Boolean(warning)),
    });
  } catch (error) {
    console.error("Assignment study material upload error:", error);
    return NextResponse.json(
      { error: "The study materials could not be uploaded." },
      { status: 500 },
    );
  }
}
