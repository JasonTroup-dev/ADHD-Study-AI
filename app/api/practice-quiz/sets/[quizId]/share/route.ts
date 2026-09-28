import { requireUser } from "@/lib/api/requireUser";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ quizId: string }> },
) {
  return updateSharing(request, params, true);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ quizId: string }> },
) {
  return updateSharing(request, params, false);
}

async function updateSharing(
  request: Request,
  params: Promise<{ quizId: string }>,
  isShared: boolean,
) {
  const auth = await requireUser();
  if (auth instanceof Response) return auth;

  const { quizId } = await params;
  const { data, error } = await auth.supabase
    .from("practice_quiz_sets")
    .update({ is_shared: isShared, updated_at: new Date().toISOString() })
    .eq("id", quizId)
    .eq("user_id", auth.user.id)
    .select("share_token")
    .maybeSingle();

  if (error) {
    console.error("Practice quiz sharing error:", error);
    return Response.json({ error: "Could not update sharing." }, { status: 500 });
  }
  if (!data) {
    return Response.json({ error: "Quiz not found." }, { status: 404 });
  }

  const shareUrl = new URL(
    `/shared/practice-quiz/${data.share_token}`,
    request.url,
  ).toString();

  return Response.json({ isShared, shareUrl });
}
