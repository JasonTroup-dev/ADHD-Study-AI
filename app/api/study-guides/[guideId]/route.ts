import { requireUser } from "@/lib/api/requireUser";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ guideId: string }> },
) {
  const auth = await requireUser();
  if (auth instanceof Response) return auth;

  const { guideId } = await params;
  const { data, error } = await auth.supabase
    .from("study_guides")
    .delete()
    .eq("id", guideId)
    .eq("user_id", auth.user.id)
    .select("id");

  if (error) {
    console.error("Could not delete study guide:", error);
    return Response.json({ error: "Could not delete this study guide." }, { status: 500 });
  }

  if (!data || data.length === 0) {
    return Response.json({ error: "Study guide not found." }, { status: 404 });
  }

  return Response.json({ deleted: true });
}
