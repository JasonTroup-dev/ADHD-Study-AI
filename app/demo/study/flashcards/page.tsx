"use client";

import FlashcardGenerationBanner from "@/components/flashcard/FlashcardGenerationBanner";
import FlashcardSetCard from "@/components/flashcard/FlashcardSetCard";
import { useDemoWorkspace } from "@/components/demo/DemoWorkspaceProvider";
import { Button } from "@/components/ui/button";
import { demoFlashcardSets } from "@/lib/demo/flashcards";

export default function DemoFlashcardsPage() {
  const demoWorkspace = useDemoWorkspace();
  const flashcardSets = demoWorkspace?.flashcardSets ?? demoFlashcardSets;

  return (
    <div className="min-h-full w-full bg-gray-100">
      <div className="mx-auto w-full max-w-screen-2xl px-6 py-8 lg:px-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-4xl font-semibold">Flashcards</h1>
            <h2 className="py-2 text-xl text-gray-600">
              Review and master your study material
            </h2>
          </div>

          <Button variant="default" size="lg" className="mt-8 px-5" disabled>
            + New Set
          </Button>
        </div>

        <div inert aria-disabled="true">
          <FlashcardGenerationBanner onGenerateClick={() => undefined} />
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {flashcardSets.map((set) => {
            const reviewHref = `/demo/study/flashcards/${set.id}`;
            const editHref = `/demo/study/flashcards/${set.id}/edit`;

            return (
              <FlashcardSetCard
                key={set.id}
                id={set.id}
                title={set.title}
                cardCount={set.cards.length}
                classColor={set.classColor}
                reviewHref={reviewHref}
                editHref={editHref}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
