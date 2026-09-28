import StudyGuideDetail from "@/components/StudyGuide/StudyGuideDetail";
import { getDemoStudyGuide } from "@/lib/demo/studyGuides";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

type DemoStudyGuideDetailPageProps = {
  params: Promise<{ guideId: string }>;
};

export async function generateMetadata({
  params,
}: DemoStudyGuideDetailPageProps): Promise<Metadata> {
  const { guideId } = await params;
  const guide = getDemoStudyGuide(guideId);

  return {
    title: guide ? `${guide.title} Demo | ADHD Study AI` : "Demo Study Guide | ADHD Study AI",
  };
}

export default async function DemoStudyGuideDetailPage({
  params,
}: DemoStudyGuideDetailPageProps) {
  const { guideId } = await params;
  const guide = getDemoStudyGuide(guideId);

  if (!guide) notFound();

  return (
    <StudyGuideDetail
      guide={guide}
      backHref="/demo/study/study-guide"
      allowCreate={false}
      allowDelete={false}
    />
  );
}
