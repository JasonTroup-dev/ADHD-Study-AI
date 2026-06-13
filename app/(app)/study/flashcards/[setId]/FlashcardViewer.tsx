"use client";

import { useState } from "react";
import AiMarkdown from "@/components/AiMarkdown";
import { Button } from "@/components/ui/button";
import Link from "next/link";

type FlashcardItem = {
  id: string;
  question: string;
  answer: string;
  card_order: number;
};

type FlashcardViewerProps = {
  title: string;
  flashcards: FlashcardItem[];
};

export default function FlashcardViewer({
  title,
  flashcards,
}: FlashcardViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);

  const currentCard = flashcards[currentIndex];

  const totalCards = flashcards.length;
  const masteredCards = 0;
  const progressPercent =
    totalCards === 0 ? 0 : ((currentIndex + 1) / totalCards) * 100;

  function goPrevious() {
    setCurrentIndex((prev) => Math.max(prev - 1, 0));
    setShowAnswer(false);
  }

  function goNext() {
    setCurrentIndex((prev) => Math.min(prev + 1, totalCards - 1));
    setShowAnswer(false);
  }

  if (!currentCard) {
    return (
      <div className="min-h-full w-full bg-gray-100">
        <div className="mx-auto w-full max-w-screen-xl px-6 py-8 lg:px-8">
          <Link href="/study/flashcards">
            <Button variant="ghost" size="default" className="text-md">
              {"← Back to Sets"}
            </Button>
          </Link>

          <h1 className="text-4xl font-semibold mt-6">{title}</h1>
          <p className="mt-4 text-gray-600">No flashcards found in this set.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full w-full bg-gray-100">
      <div className="mx-auto w-full max-w-screen-xl px-6 py-8 lg:px-8">
        <div>
          <Link href="/study/flashcards">
            <Button variant="ghost" size="default" className="text-md">
              {"← Back to Sets"}
            </Button>
          </Link>
        </div>

        <div>
          <h1 className="text-4xl font-semibold mt-6">{title}</h1>
          <h2 className="text-xl text-gray-600 py-2">
            Study this flashcard set
          </h2>
        </div>

        <div>
          <div className="flex items-center mt-4">
            <p className="font-semibold bg-gray-200 rounded-md px-2">
              {masteredCards} / {totalCards} mastered
            </p>

            <div className="mx-8 h-3 w-3/12 overflow-hidden rounded-full bg-gray-300">
              <div
                className="h-full rounded-full bg-black"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
          </div>
        </div>

        <div>
          <div className="flex justify-between my-6">
            <p>
              Card {currentIndex + 1} of {totalCards}
            </p>
            <p>{masteredCards} mastered</p>
          </div>

          <div className="h-3 w-full overflow-hidden rounded-full bg-gray-300">
            <div
              className="h-full rounded-full bg-black"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
        </div>

        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => setShowAnswer((prev) => !prev)}
            className="flex w-full max-w-4xl h-[35vh] min-h-[480px] max-h-[520px] items-center justify-center rounded-2xl bg-blue-100 px-8 my-8"
          >
            <div className="w-full">
              <div className="flex-1 text-center">
                <header className="text-xl text-blue-600 font-medium">
                  {showAnswer ? "Answer" : "Question"}
                </header>
              </div>

              <div className="flex-1 text-center my-8">
                <AiMarkdown
                  variant="flashcard"
                  className="ai-markdown--flashcard text-3xl font-semibold"
                >
                  {showAnswer ? currentCard.answer : currentCard.question}
                </AiMarkdown>
              </div>

              <div className="flex-1 text-center">
                <p className="text-gray-600">
                  Click to {showAnswer ? "show question" : "reveal answer"}
                </p>
              </div>
            </div>
          </button>
        </div>

        <div className="flex justify-between">
          <Button
            variant="outline"
            size="default"
            className="text-md"
            onClick={goPrevious}
            disabled={currentIndex === 0}
          >
            {"<"} Previous
          </Button>

          <Button
            variant="outline"
            size="default"
            className="text-md"
            onClick={() => setShowAnswer((prev) => !prev)}
          >
            Flip Card
          </Button>

          <Button
            variant="outline"
            size="default"
            className="text-md"
            onClick={goNext}
            disabled={currentIndex === totalCards - 1}
          >
            Next {">"}
          </Button>
        </div>
      </div>
    </div>
  );
}
