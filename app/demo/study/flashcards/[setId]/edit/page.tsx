import { notFound } from "next/navigation";

import { DemoFlashcardSetEditor } from "@/components/demo/DemoFlashcardSetEditor";
import { getDemoFlashcardSet } from "@/lib/demo/flashcards";

type DemoFlashcardSetEditPageProps = {
  params: Promise<{ setId: string }>;
};

export default async function DemoFlashcardSetEditPage({
  params,
}: DemoFlashcardSetEditPageProps) {
  const { setId } = await params;
  if (!getDemoFlashcardSet(setId)) notFound();

  return <DemoFlashcardSetEditor setId={setId} />;
}
