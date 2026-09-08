import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const ASSIGNMENT_FILES_BUCKET = "assignment-files";
const IMAGE_CONTENT_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);

type PreviewSource = "class" | "assignment" | "assignment-material";
type PreviewFile = { storagePath: string; contentType: string };

export async function GET(
  _request: Request,
  context: { params: Promise<{ source: string; id: string }> },
) {
  const { source, id } = await context.params;
  if (!isPreviewSource(source)) {
    return NextResponse.json({ error: "Preview not found." }, { status: 404 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "You must be logged in." }, { status: 401 });
  }

  const previewFile = await findPreviewFile(supabase, source, id, user.id);
  if (!previewFile || !IMAGE_CONTENT_TYPES.has(previewFile.contentType)) {
    return NextResponse.json({ error: "Preview not found." }, { status: 404 });
  }

  const { data, error } = await supabase.storage
    .from(ASSIGNMENT_FILES_BUCKET)
    .download(previewFile.storagePath);
  if (error || !data) {
    return NextResponse.json({ error: "Preview could not be loaded." }, { status: 404 });
  }

  return new NextResponse(data, {
    headers: {
      "Cache-Control": "private, max-age=300",
      "Content-Type": previewFile.contentType,
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function isPreviewSource(value: string): value is PreviewSource {
  return value === "class"
    || value === "assignment"
    || value === "assignment-material";
}

async function findPreviewFile(
  supabase: Awaited<ReturnType<typeof createClient>>,
  source: PreviewSource,
  id: string,
  userId: string,
): Promise<PreviewFile | null> {
  if (source === "class") {
    const { data } = await supabase
      .from("assignment_files")
      .select("file_url, file_type")
      .eq("id", id)
      .eq("user_id", userId)
      .is("assignment_id", null)
      .maybeSingle();
    return data?.file_url && data.file_type
      ? { storagePath: data.file_url, contentType: data.file_type }
      : null;
  }

  if (source === "assignment") {
    const { data } = await supabase
      .from("assignments")
      .select("storage_path, file_type")
      .eq("id", id)
      .eq("user_id", userId)
      .maybeSingle();
    return data?.storage_path && data.file_type
      ? { storagePath: data.storage_path, contentType: data.file_type }
      : null;
  }

  const { data } = await supabase
    .from("assignment_materials")
    .select("storage_path, file_type")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();
  return data?.storage_path && data.file_type
    ? { storagePath: data.storage_path, contentType: data.file_type }
    : null;
}
