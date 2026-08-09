"use client";

import FlashcardSetEditor from "@/components/flashcard/FlashcardSetEditor";
import { useDemoWorkspace } from "@/components/demo/DemoWorkspaceProvider";
import { demoFlashcardClasses } from "@/lib/demo/flashcards";

export function DemoFlashcardSetEditor({ setId }: { setId: string }) {
  const demoWorkspace = useDemoWorkspace();
  const flashcardSet = demoWorkspace?.flashcardSets.find((set) => set.id === setId);

  if (!demoWorkspace || !flashcardSet) return null;

  return (
    <FlashcardSetEditor
      initialSet={flashcardSet}
      demo={{
        returnHref: "/demo/study/flashcards",
        classes: demoFlashcardClasses,
        onSave: demoWorkspace.updateFlashcardSet,
      }}
    />
  );
}
