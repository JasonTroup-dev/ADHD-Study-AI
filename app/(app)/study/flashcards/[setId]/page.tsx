import { createClient } from "@/lib/supabase/server";
import FlashcardViewer from "./FlashcardViewer";

type FlashcardSetPageProps = {
  params: Promise<{
    setId: string;
  }>;
  searchParams: Promise<{
    studySessionId?: string;
  }>;
};

export type FlashcardItem = {
  id: string;
  question: string;
  answer: string;
};

export default async function FlashcardSetPage({
  params,
  searchParams,
}: FlashcardSetPageProps) {
  const { setId } = await params;
  const { studySessionId } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  console.log("SERVER USER ID:", user?.id);
  console.log("SET ID FROM URL:", setId);

  if (!user) {
    return (
      <div className="min-h-full w-full bg-gray-100 p-8">
        <p className="text-red-600">You are not logged in on the server.</p>
      </div>
    );
  }

  const { data: flashcardSet, error: setError } = await supabase
    .from("flashcard_sets")
    .select("id, title, user_id")
    .eq("id", setId)
    .maybeSingle();

  console.log("FLASHCARD SET:", flashcardSet);
  console.log("SET ERROR:", setError);

  if (setError) {
    return (
      <div className="min-h-full w-full bg-gray-100 p-8">
        <p className="text-red-600">{setError.message}</p>
      </div>
    );
  }

  if (!flashcardSet) {
    return (
      <div className="min-h-full w-full bg-gray-100 p-8">
        <p className="text-red-600">Flashcard set not found or blocked by RLS.</p>
      </div>
    );
  }

  const { data: flashcards, error: cardsError } = await supabase
    .from("flashcards")
    .select("id, question, answer")
    .eq("set_id", setId)
    .order("card_order", { ascending: true });

  console.log("FLASHCARDS:", flashcards);
  console.log("CARDS ERROR:", cardsError);

  if (cardsError) {
    return (
      <div className="min-h-full w-full bg-gray-100 p-8">
        <p className="text-red-600">{cardsError.message}</p>
      </div>
    );
  }

  return (
    <FlashcardViewer
      title={flashcardSet.title}
      flashcards={flashcards ?? []}
      studySessionId={studySessionId}
    />
  );
}
