import StudyGuideWorkspace from "@/components/StudyGuide/StudyGuideWorkspace";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Study Guides | ADHD Study AI",
  description:
    "Create focused, ADHD-friendly study guides from your class material.",
};

export default function StudyGuidePage() {
  return <StudyGuideWorkspace />;
}
