"use client";

import { BookOpen, MoreVertical, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { getClassColor } from "@/lib/classColors";
import { supabase } from "@/lib/supabase/client";

type FlashcardSetCardProps = {
  id: string;
  title: string;
  cardCount?: number;
  classColor?: string | null;
  onDelete: (id: string, title: string) => void;
};

export default function FlashcardSetCard({
  id,
  title,
  cardCount,
  classColor,
  onDelete,
}: FlashcardSetCardProps) {
  const color = getClassColor(classColor);
  const [menuOpen, setMenuOpen] = useState(false);
  const [fallbackCardCount, setFallbackCardCount] = useState<number | null>(null);
  const displayedCardCount = cardCount ?? fallbackCardCount ?? 0;
  const reviewHref = `/study/flashcards/${id}`;

  useEffect(() => {
    if (typeof cardCount === "number") {
      return;
    }

    let cancelled = false;

    async function fetchCardCount() {
      const { count, error } = await supabase
        .from("flashcards")
        .select("id", { count: "exact", head: true })
        .eq("set_id", id);

      if (error) {
        console.error(`Error fetching card count for set ${id}:`, error);
        return;
      }

      if (!cancelled) {
        setFallbackCardCount(count ?? 0);
      }
    }

    void fetchCardCount();

    return () => {
      cancelled = true;
    };
  }, [cardCount, id]);

  return (
    <div className="relative flex min-h-60 flex-col justify-between rounded-2xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-lg">
      <Link
        href={reviewHref}
        className="absolute inset-0 z-0 rounded-2xl"
        aria-label={`Open ${title}`}
      />

      <div className="relative z-10 flex items-start justify-between">
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-xl text-lg font-semibold text-white ${color.accent}`}
        >
          <BookOpen />
        </div>

        <div className="relative flex items-center">
          <div className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
            {displayedCardCount}{" "}
            {displayedCardCount === 1 ? "card" : "cards"}
          </div>

          <button
            type="button"
            className="ml-2 rounded-full p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label={`Open menu for ${title}`}
          >
            <MoreVertical className="h-5 w-5" />
          </button>

          {menuOpen ? (
            <div className="absolute right-0 top-8 z-30 w-36 rounded-xl border border-gray-200 bg-white p-1 shadow-lg">
              <Link
                href={`/study/flashcards/${id}/edit`}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                onClick={() => setMenuOpen(false)}
              >
                <Pencil className="h-4 w-4" />
                Edit set
              </Link>

              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                onClick={() => {
                  setMenuOpen(false);
                  onDelete(id, title);
                }}
              >
                <Trash2 className="h-4 w-4" />
                Delete set
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <div className="pointer-events-none relative z-10 mt-6">
        <h3 className="text-xl font-semibold leading-tight text-gray-900">
          {title}
        </h3>
        <p className="mt-2 text-sm text-gray-500">No description yet</p>
      </div>

      <div className="pointer-events-none relative z-10 mt-6">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>Progress</span>
          <span className="font-medium text-gray-900">0%</span>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-200">
          <div className="h-full w-0 rounded-full bg-black" />
        </div>
        <p className="mt-3 text-sm text-gray-500">
          0 mastered · 0 to review
        </p>
      </div>

      <div className="relative z-20 mt-5">
        <Button
          asChild
          size="sm"
          variant="outline"
          className="w-full bg-white text-gray-900 hover:bg-gray-100 hover:text-gray-900"
        >
          <Link href={reviewHref}>Study</Link>
        </Button>
      </div>
    </div>
  );
}
