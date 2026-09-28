"use client";

import FlashcardViewer from "@/app/(app)/study/flashcards/[setId]/FlashcardViewer";
import { useDemoWorkspace } from "@/components/demo/DemoWorkspaceProvider";

export function DemoFlashcardViewer({ setId }: { setId: string }) {
  const demoWorkspace = useDemoWorkspace();
  const flashcardSet = demoWorkspace?.flashcardSets.find((set) => set.id === setId);

  if (!flashcardSet) return null;

  return (
    <FlashcardViewer
      setId={flashcardSet.id}
      title={flashcardSet.title}
      flashcards={flashcardSet.cards}
      setsHref="/demo/study/flashcards"
      editHref={`/demo/study/flashcards/${flashcardSet.id}/edit`}
    />
  );
}
