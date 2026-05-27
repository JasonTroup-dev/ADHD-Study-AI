"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { ArrowLeft, CircleAlert, Plus, Save, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type FlashcardItem = {
  id: string;
  question: string;
  answer: string;
  card_order: number;
};

type ClassOption = {
  id: string;
  name: string | null;
  class_code: string | null;
};

type Message = {
  type: "error" | "success";
  text: string;
};

type CreateFlashcardSetResponse = {
  set?: {
    id: string;
  };
  error?: string;
};

const firstDraftCard: FlashcardItem = {
  id: "draft-card-1",
  question: "",
  answer: "",
  card_order: 1,
};

function createCardId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `draft-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function reindexCards(cards: FlashcardItem[]) {
  return cards.map((card, index) => ({
    ...card,
    card_order: index + 1,
  }));
}

function isCompleteCard(card: FlashcardItem) {
  return card.question.trim() !== "" && card.answer.trim() !== "";
}

function isPartialCard(card: FlashcardItem) {
  const hasQuestion = card.question.trim() !== "";
  const hasAnswer = card.answer.trim() !== "";

  return (hasQuestion || hasAnswer) && !isCompleteCard(card);
}

async function readCreateResponse(
  response: Response,
): Promise<CreateFlashcardSetResponse> {
  try {
    return (await response.json()) as CreateFlashcardSetResponse;
  } catch {
    return {};
  }
}

export default function FlashcardsCreate() {
  const router = useRouter();
  const [setTitle, setSetTitle] = useState("");
  const [setDescription, setSetDescription] = useState("");
  const [selectedClassId, setSelectedClassId] = useState("");
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [flashcards, setFlashcards] = useState<FlashcardItem[]>([
    firstDraftCard,
  ]);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);

  const completeCards = flashcards.filter(isCompleteCard);
  const partialCardCount = flashcards.filter(isPartialCard).length;
  const isDeckReady =
    setTitle.trim() !== "" &&
    completeCards.length > 0 &&
    partialCardCount === 0;
  const canSave = Boolean(userId) && isDeckReady && !isSaving;
  const saveHint = getSaveHint({
    isLoading,
    userId,
    hasTitle: setTitle.trim() !== "",
    completeCardCount: completeCards.length,
    partialCardCount,
  });

  useEffect(() => {
    let isMounted = true;

    async function loadPage() {
      const initialClassId =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search).get("classId") ?? ""
          : "";

      if (initialClassId) {
        setSelectedClassId(initialClassId);
      }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (!isMounted) return;

      if (userError || !user) {
        setMessage({
          type: "error",
          text: "Sign in to save a flashcard set.",
        });
        setIsLoading(false);
        return;
      }

      setUserId(user.id);

      const { data, error } = await supabase
        .from("classes")
        .select("id, name, class_code")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (!isMounted) return;

      if (error) {
        console.error("Error fetching classes:", error);
      } else {
        setClasses(data ?? []);
      }

      setIsLoading(false);
    }

    loadPage();

    return () => {
      isMounted = false;
    };
  }, []);

  function addCard() {
    setFlashcards((prevCards) =>
      reindexCards([
        ...prevCards,
        {
          id: createCardId(),
          question: "",
          answer: "",
          card_order: prevCards.length + 1,
        },
      ]),
    );
    setMessage(null);
  }

  function removeCard(id: string) {
    if (flashcards.length === 1) return;

    setFlashcards((prevCards) =>
      reindexCards(prevCards.filter((card) => card.id !== id)),
    );
    setMessage(null);
  }

  function updateFlashcard(
    id: string,
    field: "question" | "answer",
    value: string,
  ) {
    setFlashcards((prevCards) =>
      prevCards.map((card) =>
        card.id === id ? { ...card, [field]: value } : card,
      ),
    );
    setMessage(null);
  }

  async function createFlashcardSet() {
    setMessage(null);

    if (!userId) {
      setMessage({ type: "error", text: "Sign in to save a flashcard set." });
      return;
    }

    const trimmedSetTitle = setTitle.trim();
    const trimmedSetDescription = setDescription.trim();
    const validFlashcards = flashcards.filter(isCompleteCard);

    if (!trimmedSetTitle) {
      setMessage({ type: "error", text: "Add a title before saving." });
      return;
    }

    if (validFlashcards.length === 0) {
      setMessage({
        type: "error",
        text: "Add at least one card with a question and answer.",
      });
      return;
    }

    if (partialCardCount > 0) {
      setMessage({
        type: "error",
        text: "Finish or remove cards that only have one side filled in.",
      });
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch("/api/flashcards/sets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: trimmedSetTitle,
          description: trimmedSetDescription || null,
          classId: selectedClassId || null,
          cards: validFlashcards.map((flashcard, index) => ({
            question: flashcard.question.trim(),
            answer: flashcard.answer.trim(),
            card_order: index + 1,
          })),
        }),
      });
      const payload = await readCreateResponse(response);

      if (!response.ok || !payload.set) {
        console.error("Error adding flashcard set:", payload.error);
        setMessage({
          type: "error",
          text:
            payload.error ?? "The set could not be saved. Please try again.",
        });
        setIsSaving(false);
        return;
      }

      setMessage({ type: "success", text: "Flashcard set saved." });
      router.push(
        selectedClassId ? `/classes/${selectedClassId}` : "/study/flashcards",
      );
    } catch (error) {
      console.error("Error adding flashcard set:", error);
      setMessage({
        type: "error",
        text: "The set could not be saved. Please try again.",
      });
      setIsSaving(false);
    }
  }

  return (
    <main className="min-h-full w-full bg-slate-100 text-slate-950">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-8 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Button
              asChild
              variant="ghost"
              className="h-9 rounded-lg px-2 text-sm font-semibold text-slate-600 hover:bg-white hover:text-slate-950"
            >
              <Link href="/study/flashcards">
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Back to sets
              </Link>
            </Button>
            <h1 className="mt-5 text-3xl font-semibold tracking-normal">
              Create flashcard set
            </h1>
          </div>

          <Button
            type="button"
            onClick={createFlashcardSet}
            disabled={!canSave}
            className="h-10 rounded-lg px-4 text-sm font-semibold sm:self-end"
          >
            <Save className="h-4 w-4" aria-hidden="true" />
            {isSaving ? "Saving..." : "Save set"}
          </Button>
        </div>

        {message ? (
          <div
            className={cn(
              "flex items-start gap-2 rounded-lg border px-4 py-3 text-sm",
              message.type === "error"
                ? "border-red-200 bg-red-50 text-red-800"
                : "border-green-200 bg-green-50 text-green-800",
            )}
            role="status"
          >
            <CircleAlert className="mt-0.5 h-4 w-4" aria-hidden="true" />
            <span>{message.text}</span>
          </div>
        ) : null}

        <section className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-4">
            <h2 className="text-base font-semibold text-slate-950">
              Set details
            </h2>
          </div>

          <div className="mt-5 grid gap-5 md:grid-cols-[minmax(0,1.4fr)_minmax(220px,0.8fr)]">
            <div>
              <Label htmlFor="set-title" className="text-slate-950">
                Title
              </Label>
              <Input
                id="set-title"
                value={setTitle}
                onChange={(event) => {
                  setSetTitle(event.target.value);
                  setMessage(null);
                }}
                placeholder="Spanish Vocabulary Chapter 3"
                className="mt-2 h-11 rounded-lg border-slate-200 bg-slate-50 text-base shadow-none focus-visible:border-blue-500 focus-visible:ring-blue-500/20"
              />
            </div>

            <div>
              <Label htmlFor="class-id" className="text-slate-950">
                Class
              </Label>
              <select
                id="class-id"
                value={selectedClassId}
                onChange={(event) => {
                  setSelectedClassId(event.target.value);
                  setMessage(null);
                }}
                disabled={isLoading}
                className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-950 shadow-none outline-none transition focus:border-blue-500 focus:ring-[3px] focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <option value="">No class</option>
                {selectedClassId &&
                !classes.some((classItem) => classItem.id === selectedClassId) ? (
                  <option value={selectedClassId}>Selected class</option>
                ) : null}
                {classes.map((classItem) => (
                  <option key={classItem.id} value={classItem.id}>
                    {classItem.name ?? "Untitled class"}
                    {classItem.class_code ? ` - ${classItem.class_code}` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="set-description" className="text-slate-950">
                Description
              </Label>
              <Textarea
                id="set-description"
                value={setDescription}
                onChange={(event) => {
                  setSetDescription(event.target.value);
                  setMessage(null);
                }}
                placeholder="Core themes, chapter coverage, exam focus, or anything worth remembering about this set."
                className="mt-2 min-h-28 resize-y rounded-lg border-slate-200 bg-slate-50 text-base shadow-none focus-visible:border-blue-500 focus-visible:ring-blue-500/20"
              />
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white">
          <div className="flex flex-col gap-3 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-950">
                Flashcards
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                {completeCards.length} ready of {flashcards.length}
              </p>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={addCard}
              className="h-9 rounded-lg border-slate-200 bg-white px-3 text-sm font-semibold text-slate-950 shadow-none hover:bg-slate-50"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add card
            </Button>
          </div>

          <div className="divide-y divide-slate-200">
            {flashcards.map((card, index) => {
              const isPartial = isPartialCard(card);

              return (
                <article key={card.id} className="p-5">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-sm font-semibold text-slate-700">
                        {index + 1}
                      </span>
                      <h3 className="truncate text-sm font-semibold text-slate-950">
                        Card {index + 1}
                      </h3>
                      {isPartial ? (
                        <span className="rounded-md bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">
                          Needs both sides
                        </span>
                      ) : null}
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      title="Delete card"
                      aria-label={`Delete card ${index + 1}`}
                      disabled={flashcards.length === 1}
                      onClick={() => removeCard(card.id)}
                      className="h-8 w-8 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-700 disabled:opacity-40"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label
                        htmlFor={`question-${card.id}`}
                        className="text-slate-950"
                      >
                        Question
                      </Label>
                      <Textarea
                        id={`question-${card.id}`}
                        value={card.question}
                        onChange={(event) =>
                          updateFlashcard(
                            card.id,
                            "question",
                            event.target.value,
                          )
                        }
                        placeholder="What should you recognize later?"
                        className="mt-2 min-h-32 resize-y rounded-lg border-slate-200 bg-slate-50 text-base shadow-none focus-visible:border-blue-500 focus-visible:ring-blue-500/20"
                      />
                    </div>

                    <div>
                      <Label
                        htmlFor={`answer-${card.id}`}
                        className="text-slate-950"
                      >
                        Answer
                      </Label>
                      <Textarea
                        id={`answer-${card.id}`}
                        value={card.answer}
                        onChange={(event) =>
                          updateFlashcard(
                            card.id,
                            "answer",
                            event.target.value,
                          )
                        }
                        placeholder="Write the answer in your own words."
                        className="mt-2 min-h-32 resize-y rounded-lg border-slate-200 bg-slate-50 text-base shadow-none focus-visible:border-blue-500 focus-visible:ring-blue-500/20"
                      />
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-600">{saveHint}</p>
          <Button
            type="button"
            onClick={createFlashcardSet}
            disabled={!canSave}
            className="h-10 rounded-lg px-4 text-sm font-semibold"
          >
            <Save className="h-4 w-4" aria-hidden="true" />
            {isSaving ? "Saving..." : "Save set"}
          </Button>
        </div>
      </div>
    </main>
  );
}

function getSaveHint({
  isLoading,
  userId,
  hasTitle,
  completeCardCount,
  partialCardCount,
}: {
  isLoading: boolean;
  userId: string | null;
  hasTitle: boolean;
  completeCardCount: number;
  partialCardCount: number;
}) {
  if (isLoading) return "Loading classes...";
  if (!userId) return "Sign in to save.";
  if (!hasTitle) return "Add a title.";
  if (completeCardCount === 0) return "Add at least one completed card.";
  if (partialCardCount > 0) return "Finish each started card.";

  return "Ready to save.";
}
