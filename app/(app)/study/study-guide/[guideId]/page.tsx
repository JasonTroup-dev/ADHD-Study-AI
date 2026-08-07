import StudyGuideDetail from "@/components/StudyGuide/StudyGuideDetail";
import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

type StudyGuideDetailPageProps = {
  params: Promise<{ guideId: string }>;
};

export async function generateMetadata({
  params,
}: StudyGuideDetailPageProps): Promise<Metadata> {
  const { guideId } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("study_guides")
    .select("title")
    .eq("id", guideId)
    .maybeSingle();

  return {
    title: data?.title ? `${data.title} | ADHD Study AI` : "Study Guide | ADHD Study AI",
  };
}

export default async function StudyGuideDetailPage({
  params,
}: StudyGuideDetailPageProps) {
  const { guideId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) notFound();

  const { data: guide } = await supabase
    .from("study_guides")
    .select("id, title, content, original_file_name, created_at")
    .eq("id", guideId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!guide) notFound();

  return (
    <StudyGuideDetail
      guide={{
        id: guide.id,
        title: guide.title,
        content: guide.content,
        originalFileName: guide.original_file_name,
        createdAt: guide.created_at,
      }}
    />
  );
}
