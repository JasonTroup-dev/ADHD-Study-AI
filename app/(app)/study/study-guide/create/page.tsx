import StudyGuideCreatePage from "@/components/StudyGuide/StudyGuideCreatePage";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create Study Guide | ADHD Study AI",
  description: "Generate a focused study guide from your class material.",
};

export default function CreateStudyGuidePage() {
  return <StudyGuideCreatePage />;
}
