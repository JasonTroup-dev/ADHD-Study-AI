import { notFound } from "next/navigation";

import { DemoFlashcardViewer } from "@/components/demo/DemoFlashcardViewer";
import { getDemoFlashcardSet } from "@/lib/demo/flashcards";

type DemoFlashcardSetPageProps = {
  params: Promise<{ setId: string }>;
};

export default async function DemoFlashcardSetPage({
  params,
}: DemoFlashcardSetPageProps) {
  const { setId } = await params;
  if (!getDemoFlashcardSet(setId)) notFound();

  return <DemoFlashcardViewer setId={setId} />;
}
