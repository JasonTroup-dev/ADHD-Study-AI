import { createClient } from "@/lib/supabase/server";

type RouteProps = {
  params: Promise<{ classId: string }>;
};

export async function DELETE(_request: Request, { params }: RouteProps) {
  const { classId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return Response.json(
      { error: "You must be logged in to delete a class." },
      { status: 401 },
    );
  }

  const { data, error } = await supabase
    .from("classes")
    .delete()
    .eq("id", classId)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("Classes API could not delete a class:", error);
    return Response.json(
      { error: "The class could not be deleted." },
      { status: 500 },
    );
  }

  if (!data) {
    return Response.json({ error: "Class not found." }, { status: 404 });
  }

  return Response.json({ deletedId: data.id });
}
