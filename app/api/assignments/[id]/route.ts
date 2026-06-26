import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

const ASSIGNMENT_FILES_BUCKET = "assignment-files";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json(
      { error: "You must be logged in to delete an assignment." },
      { status: 401 },
    );
  }

  const { data: assignment, error: loadError } = await supabase
    .from("assignments")
    .select("id, storage_path")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (loadError) {
    console.error("Error loading assignment for deletion:", loadError);
    return NextResponse.json(
      { error: "The assignment could not be deleted." },
      { status: 500 },
    );
  }

  if (!assignment) {
    return NextResponse.json(
      { error: "Assignment not found." },
      { status: 404 },
    );
  }

  const { data: materialData, error: materialsError } = await supabase
    .from("assignment_materials")
    .select("storage_path")
    .eq("assignment_id", assignment.id)
    .eq("user_id", user.id);

  if (materialsError) {
    console.error("Error loading assignment materials for deletion:", materialsError);
    return NextResponse.json(
      { error: "The assignment study materials could not be removed." },
      { status: 500 },
    );
  }

  const storagePaths = [
    assignment.storage_path,
    ...(materialData ?? []).map((material) => material.storage_path as string),
  ].filter((path): path is string => Boolean(path));

  if (storagePaths.length > 0) {
    const { error: storageError } = await supabase.storage
      .from(ASSIGNMENT_FILES_BUCKET)
      .remove(storagePaths);

    if (storageError) {
      console.error("Error deleting assignment file:", storageError);
      return NextResponse.json(
        {
          error:
            "The attached files could not be removed, so the assignment was not deleted.",
        },
        { status: 500 },
      );
    }
  }

  const { error: deleteError } = await supabase
    .from("assignments")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (deleteError) {
    console.error("Error deleting assignment:", deleteError);
    return NextResponse.json(
      { error: "The assignment could not be deleted." },
      { status: 500 },
    );
  }

  return NextResponse.json({ deletedId: id });
}
