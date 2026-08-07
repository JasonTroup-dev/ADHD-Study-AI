"use client";

import AiMarkdown from "@/components/AiMarkdown";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Check,
  CircleAlert,
  Copy,
  Eye,
  EyeOff,
  FileText,
  Layers3,
  Plus,
  Save,
  Sparkles,
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

type SaveFlashcardSetResponse = {
  set?: { id: string };
  error?: string;
};

type GenerateFlashcardsResponse = {
  title?: string;
  description?: string;
  cards?: Array<{ question: string; answer: string }>;
  error?: string;
};

export type FlashcardSetEditorInitialSet = {
  id: string;
  title: string;
  description: string;
  classId: string;
  cards: Array<{
    id: string;
    question: string;
    answer: string;
    card_order: number;
  }>;
};

type FlashcardSetEditorProps = {
  initialSet?: FlashcardSetEditorInitialSet;
};

function createCardId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `draft-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function createBlankCard(order = 1): FlashcardItem {
  return {
    id: createCardId(),
    question: "",
    answer: "",
    card_order: order,
  };
}

function reindexCards(cards: FlashcardItem[]) {
  return cards.map((card, index) => ({ ...card, card_order: index + 1 }));
}

function isCompleteCard(card: FlashcardItem) {
  return card.question.trim() !== "" && card.answer.trim() !== "";
}

function isPartialCard(card: FlashcardItem) {
  const hasQuestion = card.question.trim() !== "";
  const hasAnswer = card.answer.trim() !== "";

  return (hasQuestion || hasAnswer) && !isCompleteCard(card);
}

async function readJsonResponse(response: Response) {
  try {
    return (await response.json()) as SaveFlashcardSetResponse;
  } catch {
    return {};
  }
}

export default function FlashcardSetEditor(props: FlashcardSetEditorProps) {
  return (
    <Suspense fallback={<FlashcardSetEditorLoading />}>
      <FlashcardSetEditorContent {...props} />
    </Suspense>
  );
}

function FlashcardSetEditorLoading() {
  return (
    <main className="min-h-full bg-slate-50 px-5 py-8 lg:px-8">
      <div className="mx-auto max-w-6xl animate-pulse space-y-6">
        <div className="h-10 w-72 rounded-xl bg-slate-200" />
        <div className="h-48 rounded-3xl border border-slate-200 bg-white" />
        <div className="h-80 rounded-3xl border border-slate-200 bg-white" />
      </div>
    </main>
  );
}

function FlashcardSetEditorContent({ initialSet }: FlashcardSetEditorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isEditing = Boolean(initialSet);
  const studySessionId = searchParams.get("studySessionId");
  const classFromUrl = searchParams.get("classId") ?? "";
  const returnHref = isEditing
    ? `/study/flashcards/${initialSet?.id}`
    : "/study/flashcards";

  const [setTitle, setSetTitle] = useState(initialSet?.title ?? "");
  const [setDescription, setSetDescription] = useState(
    initialSet?.description ?? "",
  );
  const [selectedClassId, setSelectedClassId] = useState(
    initialSet?.classId ?? classFromUrl,
  );
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [flashcards, setFlashcards] = useState<FlashcardItem[]>(
    initialSet?.cards.length
      ? initialSet.cards
      : [{ id: "draft-card-1", question: "", answer: "", card_order: 1 }],
  );
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);
  const [showPreviews, setShowPreviews] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(
    () => !isEditing && searchParams.get("mode") === "ai",
  );
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [flashcardCountInput, setFlashcardCountInput] = useState(
    String(DEFAULT_GENERATED_FLASHCARD_COUNT),
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const generationControllerRef = useRef<AbortController | null>(null);

  const completeCardCount = flashcards.filter(isCompleteCard).length;
  const partialCardCount = flashcards.filter(isPartialCard).length;
  const emptyCardCount = flashcards.length - completeCardCount - partialCardCount;
  const hasTitle = setTitle.trim() !== "";
  const isDeckReady =
    hasTitle && completeCardCount > 0 && partialCardCount === 0;
  const canSave = Boolean(userId) && isDeckReady && !isSaving;
  const requestedFlashcardCount = normalizeGeneratedFlashcardCount(
    flashcardCountInput,
  );
  const saveHint = getSaveHint({
    isLoading,
    userId,
    hasTitle,
    completeCardCount,
    partialCardCount,
  });

  useEffect(() => {
    return () => generationControllerRef.current?.abort();
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadEditor() {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (!isMounted) return;

      if (userError || !user) {
        setMessage({ type: "error", text: "Sign in to save this set." });
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

    void loadEditor();

    return () => {
      isMounted = false;
    };
  }, []);

  function clearMessage() {
    setMessage(null);
  }

  function addCard(afterIndex = flashcards.length - 1) {
    const nextCard = createBlankCard(afterIndex + 2);

    setFlashcards((currentCards) => {
      const nextCards = [...currentCards];
      nextCards.splice(afterIndex + 1, 0, nextCard);
      return reindexCards(nextCards);
    });
    clearMessage();

    window.setTimeout(() => {
      document.getElementById(`question-${nextCard.id}`)?.focus();
    }, 0);
  }

  function duplicateCard(index: number) {
    const card = flashcards[index];
    const duplicate = { ...card, id: createCardId() };

    setFlashcards((currentCards) => {
      const nextCards = [...currentCards];
      nextCards.splice(index + 1, 0, duplicate);
      return reindexCards(nextCards);
    });
    clearMessage();
  }

  function removeCard(id: string) {
    if (flashcards.length === 1) return;
    setFlashcards((cards) =>
      reindexCards(cards.filter((card) => card.id !== id)),
    );
    clearMessage();
  }

  function updateFlashcard(
    id: string,
    field: "question" | "answer",
    value: string,
  ) {
    setFlashcards((cards) =>
      cards.map((card) =>
        card.id === id ? { ...card, [field]: value } : card,
      ),
    );
    clearMessage();
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

    clearMessage();
    setSourceFile(file);
  }

  async function generateFlashcards() {
    clearMessage();

    if (!sourceFile) {
      setMessage({
        type: "error",
        text: "Choose a study document before generating flashcards.",
      });
      return;
    }

    if (requestedFlashcardCount === null) {
      setMessage({
        type: "error",
        text: `Choose between ${MIN_GENERATED_FLASHCARD_COUNT} and ${MAX_GENERATED_FLASHCARD_COUNT} cards.`,
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
        { signal: controller.signal, onUploadProgress: setUploadProgress },
      );
      const payload = response.data ?? {};

      if (!response.ok || !Array.isArray(payload.cards)) {
        setMessage({
          type: "error",
          text: payload.error ?? "Could not generate flashcards.",
        });
        return;
      }

      setSetTitle(payload.title ?? "AI generated flashcards");
      setSetDescription(payload.description ?? "");
      setFlashcards(
        payload.cards.map((card, index) => ({
          id: createCardId(),
          question: card.question,
          answer: card.answer,
          card_order: index + 1,
        })),
      );
      setMessage({
        type: "success",
        text: "Your draft is ready. Give each card a quick review before saving.",
      });
      setIsAiModalOpen(false);
      setSourceFile(null);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        setMessage({
          type: "error",
          text: "Generation stopped. You can try again when you are ready.",
        });
        return;
      }

      console.error("Error generating flashcards:", error);
      setMessage({ type: "error", text: "Could not generate flashcards." });
    } finally {
      if (generationControllerRef.current === controller) {
        generationControllerRef.current = null;
      }
      setIsGenerating(false);
    }
  }

  async function saveFlashcardSet() {
    clearMessage();

    if (!userId) {
      setMessage({ type: "error", text: "Sign in to save this set." });
      return;
    }

    if (!hasTitle) {
      setMessage({ type: "error", text: "Give your set a title first." });
      return;
    }

    if (completeCardCount === 0) {
      setMessage({
        type: "error",
        text: "Add at least one card with a front and back.",
      });
      return;
    }

    if (partialCardCount > 0) {
      setMessage({
        type: "error",
        text: "Finish or remove the cards marked ‘Needs a side’.",
      });
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch(
        isEditing
          ? `/api/flashcards/sets/${initialSet?.id}`
          : "/api/flashcards/sets",
        {
          method: isEditing ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: setTitle.trim(),
            description: setDescription.trim() || null,
            classId: selectedClassId || null,
            cards: flashcards
              .filter(isCompleteCard)
              .map((card, index) => ({
                id: card.id,
                question: card.question.trim(),
                answer: card.answer.trim(),
                card_order: index + 1,
              })),
          }),
        },
      );
      const payload = await readJsonResponse(response);

      if (!response.ok || !payload.set) {
        setMessage({
          type: "error",
          text: payload.error ?? "The set could not be saved. Try again.",
        });
        return;
      }

      const destination = studySessionId
        ? `/study/flashcards/${payload.set.id}?studySessionId=${studySessionId}`
        : isEditing
          ? `/study/flashcards/${payload.set.id}`
          : selectedClassId
            ? `/classes/${selectedClassId}`
            : "/study/flashcards";

      router.push(destination);
      router.refresh();
    } catch (error) {
      console.error("Error saving flashcard set:", error);
      setMessage({
        type: "error",
        text: "The set could not be saved. Check your connection and try again.",
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="min-h-full bg-slate-50 text-slate-950">
      <Dialog
        open={isAiModalOpen}
        onOpenChange={(open) => {
          if (!isGenerating) {
            setIsAiModalOpen(open);
            if (!open) setSourceFile(null);
          }
        }}
      >
        <DialogContent className="max-w-2xl gap-0 overflow-hidden p-0">
          <div className="border-b border-slate-200 bg-linear-to-br from-blue-50 via-white to-violet-50 px-6 py-5 pr-14">
            <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm shadow-blue-200">
              <Sparkles className="size-5" aria-hidden="true" />
            </div>
            <DialogTitle className="text-xl text-slate-950">
              Turn notes into flashcards
            </DialogTitle>
            <DialogDescription className="mt-1.5 leading-6 text-slate-600">
              Upload a study document. AI will create an editable first draft—you
              stay in control of every card.
            </DialogDescription>
          </div>

          <div className="space-y-5 p-6">
            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_150px]">
              <div>
                <Label htmlFor="flashcard-source-file">Study document</Label>
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
                  className={cn(
                    "mt-2 flex min-h-24 cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 transition hover:border-blue-400 hover:bg-blue-50/60",
                    isGenerating && "pointer-events-none opacity-60",
                  )}
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm">
                    {sourceFile ? (
                      <FileText className="size-5" aria-hidden="true" />
                    ) : (
                      <Upload className="size-5" aria-hidden="true" />
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-slate-900">
                      {sourceFile ? sourceFile.name : "Choose a file"}
                    </span>
                    <span className="mt-0.5 block text-xs leading-5 text-slate-500">
                      {sourceFile
                        ? formatFileSize(sourceFile.size)
                        : SUPPORTED_STUDY_FILE_LABEL}
                    </span>
                  </span>
                </label>
              </div>

              <div>
                <Label htmlFor="flashcard-count">Cards</Label>
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
                    clearMessage();
                  }}
                  disabled={isGenerating}
                  className="mt-2 h-12 rounded-xl bg-slate-50 text-base shadow-none"
                />
                <p className="mt-2 text-xs leading-5 text-slate-500">
                  {MIN_GENERATED_FLASHCARD_COUNT}–{MAX_GENERATED_FLASHCARD_COUNT}
                  {" "}cards per set
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
                  preparing: "Finding the key ideas",
                  generating: "Writing your flashcards",
                }}
              />
            ) : null}

            <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  if (isGenerating) {
                    generationControllerRef.current?.abort();
                  } else {
                    setSourceFile(null);
                    setIsAiModalOpen(false);
                  }
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
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Sparkles aria-hidden="true" />
                {isGenerating ? "Generating…" : "Generate draft"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-5 py-7 lg:px-8">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="-ml-2 text-slate-600"
          >
            <Link href={returnHref}>
              <ArrowLeft aria-hidden="true" />
              {isEditing ? "Back to set" : "All flashcard sets"}
            </Link>
          </Button>

          <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl">
              <div className="mb-2 flex items-center gap-2">
                <Badge
                  variant="secondary"
                  className="border border-blue-100 bg-blue-50 text-blue-700"
                >
                  <Layers3 aria-hidden="true" />
                  {isEditing ? "Editing set" : "New set"}
                </Badge>
                <span className="text-xs font-medium text-slate-500">
                  {completeCardCount} of {flashcards.length} ready
                </span>
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                {isEditing ? "Make this set sharper" : "Build a set you’ll remember"}
              </h1>
              <p className="mt-2 text-sm leading-6 text-slate-600 sm:text-base">
                Keep each card focused on one idea. Short prompts are easier to
                review and easier to recall.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {!isEditing ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAiModalOpen(true)}
                  className="border-blue-200 bg-blue-50 text-blue-700 shadow-none hover:bg-blue-100 hover:text-blue-800"
                >
                  <Sparkles aria-hidden="true" />
                  Generate with AI
                </Button>
              ) : null}
              <Button
                type="button"
                onClick={saveFlashcardSet}
                disabled={!canSave}
                className="bg-blue-600 px-5 hover:bg-blue-700"
              >
                <Save aria-hidden="true" />
                {isSaving ? "Saving…" : isEditing ? "Save changes" : "Create set"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-6xl items-start gap-6 px-5 py-7 lg:grid-cols-[minmax(0,1fr)_260px] lg:px-8">
        <div className="min-w-0 space-y-6">
          {message ? (
            <div
              className={cn(
                "flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm",
                message.type === "error"
                  ? "border-red-200 bg-red-50 text-red-800"
                  : "border-emerald-200 bg-emerald-50 text-emerald-800",
              )}
              role="status"
            >
              {message.type === "error" ? (
                <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              ) : (
                <Check className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              )}
              <span>{message.text}</span>
            </div>
          ) : null}

          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm shadow-slate-200/50">
            <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
              <div className="flex items-center gap-3">
                <span className="flex size-8 items-center justify-center rounded-full bg-slate-950 text-sm font-semibold text-white">
                  1
                </span>
                <div>
                  <h2 className="font-semibold text-slate-950">Set details</h2>
                  <p className="text-xs text-slate-500">Name it and keep it organized.</p>
                </div>
              </div>
            </div>

            <div className="grid gap-5 p-5 sm:p-6 md:grid-cols-[minmax(0,1.3fr)_minmax(200px,0.7fr)]">
              <div>
                <Label htmlFor="set-title">
                  Title <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="set-title"
                  value={setTitle}
                  onChange={(event) => {
                    setSetTitle(event.target.value);
                    clearMessage();
                  }}
                  placeholder="Biology: cell division"
                  autoFocus={!isEditing}
                  className="mt-2 h-12 rounded-xl bg-slate-50 text-base shadow-none focus-visible:bg-white"
                />
              </div>

              <div>
                <Label htmlFor="class-id">Class</Label>
                <select
                  id="class-id"
                  value={selectedClassId}
                  onChange={(event) => {
                    setSelectedClassId(event.target.value);
                    clearMessage();
                  }}
                  disabled={isLoading}
                  className="mt-2 h-12 w-full rounded-xl border border-input bg-slate-50 px-3 text-sm outline-none transition focus:border-ring focus:bg-white focus:ring-[3px] focus:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <option value="">No class</option>
                  {selectedClassId &&
                  !classes.some((classItem) => classItem.id === selectedClassId) ? (
                    <option value={selectedClassId}>Selected class</option>
                  ) : null}
                  {classes.map((classItem) => (
                    <option key={classItem.id} value={classItem.id}>
                      {classItem.name ?? "Untitled class"}
                      {classItem.class_code ? ` · ${classItem.class_code}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="set-description">
                  Description <span className="font-normal text-slate-400">(optional)</span>
                </Label>
                <Textarea
                  id="set-description"
                  value={setDescription}
                  onChange={(event) => {
                    setSetDescription(event.target.value);
                    clearMessage();
                  }}
                  placeholder="What does this set cover? Add a quick note for future you."
                  className="mt-2 min-h-24 resize-y rounded-xl bg-slate-50 text-base shadow-none focus-visible:bg-white"
                />
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex flex-col gap-3 px-1 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex items-center gap-3">
                <span className="flex size-8 items-center justify-center rounded-full bg-slate-950 text-sm font-semibold text-white">
                  2
                </span>
                <div>
                  <h2 className="font-semibold text-slate-950">Cards</h2>
                  <p className="text-xs text-slate-500">One clear idea per card works best.</p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPreviews((visible) => !visible)}
                  className="text-slate-600"
                >
                  {showPreviews ? (
                    <EyeOff aria-hidden="true" />
                  ) : (
                    <Eye aria-hidden="true" />
                  )}
                  {showPreviews ? "Hide previews" : "Preview formatting"}
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => addCard()}>
                  <Plus aria-hidden="true" />
                  Add card
                </Button>
              </div>
            </div>

            {flashcards.map((card, index) => {
              const isPartial = isPartialCard(card);
              const isComplete = isCompleteCard(card);

              return (
                <article
                  key={card.id}
                  className={cn(
                    "overflow-hidden rounded-3xl border bg-white shadow-sm shadow-slate-200/40 transition",
                    isPartial ? "border-amber-300" : "border-slate-200",
                  )}
                >
                  <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/80 px-4 py-3 sm:px-5">
                    <div className="flex items-center gap-2.5">
                      <span className="flex size-7 items-center justify-center rounded-lg bg-white text-xs font-bold text-slate-700 shadow-sm ring-1 ring-slate-200">
                        {index + 1}
                      </span>
                      <span className="text-sm font-semibold text-slate-800">
                        Card {index + 1}
                      </span>
                      {isComplete ? (
                        <Badge
                          variant="secondary"
                          className="bg-emerald-50 text-emerald-700"
                        >
                          <Check aria-hidden="true" />
                          Ready
                        </Badge>
                      ) : isPartial ? (
                        <Badge
                          variant="secondary"
                          className="bg-amber-50 text-amber-700"
                        >
                          Needs a side
                        </Badge>
                      ) : null}
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        title="Duplicate card"
                        aria-label={`Duplicate card ${index + 1}`}
                        onClick={() => duplicateCard(index)}
                        className="text-slate-500 hover:text-slate-900"
                      >
                        <Copy aria-hidden="true" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        title="Delete card"
                        aria-label={`Delete card ${index + 1}`}
                        disabled={flashcards.length === 1}
                        onClick={() => removeCard(card.id)}
                        className="text-slate-500 hover:bg-red-50 hover:text-red-700"
                      >
                        <Trash2 aria-hidden="true" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 md:divide-x md:divide-slate-100">
                    <CardSideField
                      label="Front"
                      helper="The cue or question"
                      id={`question-${card.id}`}
                      value={card.question}
                      placeholder="What is mitosis?"
                      isInvalid={isPartial && !card.question.trim()}
                      showPreview={showPreviews}
                      onChange={(value) => updateFlashcard(card.id, "question", value)}
                    />
                    <CardSideField
                      label="Back"
                      helper="The answer to recall"
                      id={`answer-${card.id}`}
                      value={card.answer}
                      placeholder="Cell division that creates two identical daughter cells."
                      isInvalid={isPartial && !card.answer.trim()}
                      showPreview={showPreviews}
                      onChange={(value) => updateFlashcard(card.id, "answer", value)}
                    />
                  </div>
                </article>
              );
            })}

            <button
              type="button"
              onClick={() => addCard()}
              className="flex min-h-16 w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-white/50 text-sm font-semibold text-slate-600 transition hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/20"
            >
              <Plus className="size-4" aria-hidden="true" />
              Add another card
            </button>
          </section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-6">
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/50">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-950">Set check</h2>
              <span className="text-xs font-medium text-slate-500">
                {completeCardCount}/{flashcards.length} ready
              </span>
            </div>

            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-blue-600 transition-[width] duration-300"
                style={{
                  width: `${Math.round(
                    ((Number(hasTitle) + completeCardCount) /
                      (flashcards.length + 1)) *
                      100,
                  )}%`,
                }}
              />
            </div>

            <div className="mt-5 space-y-3 text-sm">
              <ChecklistItem complete={hasTitle}>Set has a title</ChecklistItem>
              <ChecklistItem complete={completeCardCount > 0}>
                At least one complete card
              </ChecklistItem>
              <ChecklistItem complete={partialCardCount === 0}>
                Every started card has two sides
              </ChecklistItem>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-2 border-t border-slate-100 pt-4 text-center">
              <Stat value={completeCardCount} label="Ready" />
              <Stat value={partialCardCount} label="Started" />
              <Stat value={emptyCardCount} label="Blank" />
            </div>

            <Button
              type="button"
              onClick={saveFlashcardSet}
              disabled={!canSave}
              className="mt-5 w-full bg-blue-600 hover:bg-blue-700"
            >
              <Save aria-hidden="true" />
              {isSaving ? "Saving…" : isEditing ? "Save changes" : "Create set"}
            </Button>
            <p className="mt-2 text-center text-xs leading-5 text-slate-500">
              {saveHint}
            </p>
          </section>

          <section className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-950">
            <p className="font-semibold">A quick card-writing tip</p>
            <p className="mt-1.5 leading-5 text-blue-800">
              If an answer needs a whole paragraph, split it into two smaller cards.
            </p>
          </section>
        </aside>
      </div>
    </main>
  );
}

function CardSideField({
  label,
  helper,
  id,
  value,
  placeholder,
  isInvalid,
  showPreview,
  onChange,
}: {
  label: string;
  helper: string;
  id: string;
  value: string;
  placeholder: string;
  isInvalid: boolean;
  showPreview: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div className="p-4 sm:p-5">
      <div className="flex items-baseline justify-between gap-3">
        <Label htmlFor={id} className="text-sm font-semibold text-slate-900">
          {label}
        </Label>
        <span className="text-xs text-slate-400">{helper}</span>
      </div>
      <Textarea
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-invalid={isInvalid}
        className="mt-2 min-h-32 resize-y rounded-xl border-slate-200 bg-slate-50 text-base leading-6 shadow-none focus-visible:bg-white aria-invalid:bg-red-50/50"
      />
      {showPreview && value.trim() ? (
        <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Preview
          </p>
          <AiMarkdown
            variant="flashcard"
            className="ai-markdown--flashcard text-sm leading-6 text-slate-900"
          >
            {value}
          </AiMarkdown>
        </div>
      ) : null}
    </div>
  );
}

function ChecklistItem({
  complete,
  children,
}: {
  complete: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        className={cn(
          "flex size-5 shrink-0 items-center justify-center rounded-full border",
          complete
            ? "border-emerald-500 bg-emerald-500 text-white"
            : "border-slate-300 bg-white text-transparent",
        )}
      >
        <Check className="size-3" aria-hidden="true" />
      </span>
      <span className={complete ? "text-slate-700" : "text-slate-500"}>
        {children}
      </span>
    </div>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <p className="text-lg font-bold text-slate-900">{value}</p>
      <p className="text-[11px] text-slate-500">{label}</p>
    </div>
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
  if (isLoading) return "Loading your classes…";
  if (!userId) return "Sign in to save.";
  if (!hasTitle) return "Add a title to continue.";
  if (completeCardCount === 0) return "Complete your first card.";
  if (partialCardCount > 0) return "Finish each started card.";
  return "Everything looks ready.";
}
