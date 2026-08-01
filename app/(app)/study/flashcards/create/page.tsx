"use client";

import AiMarkdown from "@/components/AiMarkdown";
import { Button } from "@/components/ui/button";
import { FileProcessingStatus } from "@/components/ui/file-processing-status";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  formatFileSize,
  MAX_STUDY_FILE_BYTES,
  STUDY_FILE_ACCEPT,
  SUPPORTED_STUDY_FILE_LABEL,
} from "@/lib/files/uploadConstraints";
import { uploadFormData } from "@/lib/files/uploadFormData";
import {
  DEFAULT_GENERATED_FLASHCARD_COUNT,
  MAX_GENERATED_FLASHCARD_COUNT,
  MIN_GENERATED_FLASHCARD_COUNT,
  normalizeGeneratedFlashcardCount,
} from "@/lib/flashcards/generationSettings";
import { supabase } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  CircleAlert,
  FileText,
  Sparkles,
  Plus,
  Save,
  Trash2,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";

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

type GenerateFlashcardsResponse = {
  title?: string;
  cards?: Array<{ question: string; answer: string }>;
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
  return (
    <Suspense fallback={<FlashcardsCreateLoading />}>
      <FlashcardsCreateContent />
    </Suspense>
  );
}

function FlashcardsCreateLoading() {
  return (
    <main className="min-h-full w-full bg-slate-100 px-6 py-8 text-slate-950">
      <div className="mx-auto max-w-5xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm text-slate-600">Loading flashcard creator...</p>
      </div>
    </main>
  );
}

function FlashcardsCreateContent() {
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

	const searchParams = useSearchParams();
  const studySessionId = searchParams.get("studySessionId");
	const [isAiModalOpen, setIsAiModalOpen] = useState(
		() => searchParams.get("mode") === "ai",
	);
	const [sourceFile, setSourceFile] = useState<File | null>(null);
	const [flashcardCountInput, setFlashcardCountInput] = useState(
		String(DEFAULT_GENERATED_FLASHCARD_COUNT),
	);
	const [isGenerating, setIsGenerating] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const generationControllerRef = useRef<AbortController | null>(null);
  const requestedFlashcardCount = normalizeGeneratedFlashcardCount(
    flashcardCountInput,
  );

  useEffect(() => {
    return () => generationControllerRef.current?.abort();
  }, []);

  async function generateFlashcards() {
	setMessage(null);

	if (!sourceFile) {
		setMessage({
		type: "error",
		text: "Upload a study document before generating flashcards.",
		});
		return;
	}

	if (requestedFlashcardCount === null) {
		setMessage({
		type: "error",
		text: `Choose between ${MIN_GENERATED_FLASHCARD_COUNT} and ${MAX_GENERATED_FLASHCARD_COUNT} flashcards.`,
		});
		return;
	}

	setIsGenerating(true);
	setUploadProgress(0);
	const controller = new AbortController();
	generationControllerRef.current = controller;

	try {
		const formData = new FormData();
		formData.append("file", sourceFile);
		formData.append("cardCount", String(requestedFlashcardCount));

		const response = await uploadFormData<GenerateFlashcardsResponse>(
			"/api/flashcards/generate",
			formData,
			{
				signal: controller.signal,
				onUploadProgress: setUploadProgress,
			},
		);

		const payload = response.data ?? {};

		if (!response.ok) {
		setMessage({
			type: "error",
			text: payload.error ?? "Could not generate flashcards.",
		});
		return;
		}

		if (!Array.isArray(payload.cards)) {
			setMessage({
				type: "error",
				text: "The generated flashcard response was incomplete.",
			});
			return;
		}

		setSetTitle(payload.title ?? "AI Generated Flashcards");

		setFlashcards(
		payload.cards.map(
			(
			card: {
				question: string;
				answer: string;
			},
			index: number,
			) => ({
			id: createCardId(),
			question: card.question,
			answer: card.answer,
			card_order: index + 1,
			}),
		),
		);

		setMessage({
		type: "success",
		text: "Flashcards generated. Review them, then save the set.",
		});

		setIsAiModalOpen(false);
		setSourceFile(null);

	} catch (error) {
		if (error instanceof DOMException && error.name === "AbortError") {
			setMessage({
				type: "error",
				text: "Generation stopped. Your file is ready whenever you want to try again.",
			});
			return;
		}

		console.error("Error generating flashcards:", error);
		setMessage({
			type: "error",
			text: "Could not generate flashcards.",
		});
	} finally {
		if (generationControllerRef.current === controller) {
			generationControllerRef.current = null;
		}
		setIsGenerating(false);
	}
	}

	function cancelGeneration() {
		generationControllerRef.current?.abort();
	}

  function updateSourceFile(file: File | null) {
	if (!file) {
		setSourceFile(null);
		return;
	}

	if (file.size > MAX_STUDY_FILE_BYTES) {
		setSourceFile(null);
		setMessage({
		type: "error",
		text: `Upload a file ${formatFileSize(MAX_STUDY_FILE_BYTES)} or smaller.`,
		});
		return;
	}

	setMessage(null);
	setSourceFile(file);
  }

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
        studySessionId
          ? `/study/flashcards/${payload.set.id}?studySessionId=${studySessionId}`
          : selectedClassId
            ? `/classes/${selectedClassId}`
            : "/study/flashcards",
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

		{isAiModalOpen ? (
			<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
				<div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl">
				<div className="flex items-start justify-between gap-4">
					<div>
					<h2 className="text-xl font-semibold text-slate-950">
						Generate flashcards with AI
					</h2>
					<p className="mt-1 text-sm text-slate-600">
						Upload a study document and AI will fill this page with editable
						flashcards.
					</p>
					</div>

					<Button
					type="button"
					variant="ghost"
					disabled={isGenerating}
					onClick={() => {
						setSourceFile(null);
						setIsAiModalOpen(false);
					}}
					>
					Close
					</Button>
				</div>

				<div className="mt-5 grid gap-5 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5 sm:grid-cols-[minmax(0,1fr)_170px]">
				  <div>
					<Label htmlFor="flashcard-source-file" className="text-slate-950">
					Study document
					</Label>
					<div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
					<input
						id="flashcard-source-file"
						type="file"
						accept={STUDY_FILE_ACCEPT}
						disabled={isGenerating}
						onChange={(event) => {
						updateSourceFile(event.target.files?.[0] ?? null);
						event.target.value = "";
						}}
						className="sr-only"
					/>
					<label
						htmlFor="flashcard-source-file"
						className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-950 shadow-none transition hover:bg-slate-100"
					>
						<Upload className="h-4 w-4" aria-hidden="true" />
						Choose file
					</label>
					<div className="flex min-w-0 items-center gap-2 text-sm text-slate-600">
						<FileText className="h-4 w-4 shrink-0" aria-hidden="true" />
						<span className="truncate">
						{sourceFile
							? sourceFile.name
							: SUPPORTED_STUDY_FILE_LABEL}
						</span>
					</div>
					</div>
				  </div>

				  <div>
					<Label htmlFor="flashcard-count" className="text-slate-950">
					Number of flashcards
					</Label>
					<Input
						id="flashcard-count"
						type="number"
						min={MIN_GENERATED_FLASHCARD_COUNT}
						max={MAX_GENERATED_FLASHCARD_COUNT}
						step={1}
						inputMode="numeric"
						value={flashcardCountInput}
						onChange={(event) => {
						setFlashcardCountInput(event.target.value);
						setMessage(null);
						}}
						disabled={isGenerating}
						aria-describedby="flashcard-count-range"
						className="mt-3 h-10 rounded-lg border-slate-200 bg-white text-base shadow-none focus-visible:border-blue-500 focus-visible:ring-blue-500/20"
					/>
					<p
						id="flashcard-count-range"
						className="mt-2 text-xs font-medium text-slate-500"
					>
						{MIN_GENERATED_FLASHCARD_COUNT}-
						{MAX_GENERATED_FLASHCARD_COUNT} cards
					</p>
				  </div>
				</div>

				{isGenerating ? (
					<FileProcessingStatus
						fileName={sourceFile?.name}
						uploadProgress={uploadProgress}
						labels={{
							uploading: "Uploading",
							reading: "Reading your document",
							preparing: "Finding useful questions",
							generating: "Writing your flashcards",
						}}
						className="mt-5"
					/>
				) : null}

				<div className="mt-5 flex justify-end gap-3">
					<Button
					type="button"
					variant="outline"
					onClick={isGenerating ? cancelGeneration : () => {
					setSourceFile(null);
					setIsAiModalOpen(false);
				}}
					>
					{isGenerating ? "Stop generation" : "Cancel"}
					</Button>

					<Button
					type="button"
					onClick={generateFlashcards}
					disabled={
						isGenerating || !sourceFile || requestedFlashcardCount === null
					}
					>
					{isGenerating ? "Generating..." : "Generate flashcards"}
					</Button>
				</div>
				</div>
			</div>
			) : null}

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
              Create Flashcard Set
            </h1>
          </div>
          <div className="flex gap-2 sm:self-end">
			<Button
				type="button"
				variant="outline"
				onClick={() => setIsAiModalOpen(true)}
				className="h-10 cursor-pointer rounded-lg border-slate-200 bg-linear-to-r from-blue-200 to-purple-200 px-4 text-sm font-semibold text-slate-950 shadow-none hover:from-blue-300 hover:to-purple-300"
			>
				<Sparkles className="h-4 w-4" aria-hidden="true" />
				Generate with AI
			</Button>

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
              Set Details
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
                placeholder="e.g., Spanish Vocabulary Chapter 3"
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
                placeholder="Add a description for this set"
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
                      {card.question.trim() ? (
                        <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3">
                          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Rendered preview
                          </p>
                          <AiMarkdown
                            variant="flashcard"
                            className="ai-markdown--flashcard text-base text-slate-900"
                          >
                            {card.question}
                          </AiMarkdown>
                        </div>
                      ) : null}
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
                      {card.answer.trim() ? (
                        <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3">
                          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Rendered preview
                          </p>
                          <AiMarkdown
                            variant="flashcard"
                            className="ai-markdown--flashcard text-base text-slate-900"
                          >
                            {card.answer}
                          </AiMarkdown>
                        </div>
                      ) : null}
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
