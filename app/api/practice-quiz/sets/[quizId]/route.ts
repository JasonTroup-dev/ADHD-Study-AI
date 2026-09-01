import { requireUser } from "@/lib/api/requireUser";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ quizId: string }> },
) {
  const auth = await requireUser();
  if (auth instanceof Response) return auth;

  const { quizId } = await params;
  const { data, error } = await auth.supabase
    .from("practice_quiz_sets")
    .delete()
    .eq("id", quizId)
    .eq("user_id", auth.user.id)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("Practice quiz delete error:", error);
    return Response.json({ error: "Could not delete this quiz." }, { status: 500 });
  }
  if (!data) {
    return Response.json({ error: "Quiz not found." }, { status: 404 });
  }

  return Response.json({ ok: true });
}
