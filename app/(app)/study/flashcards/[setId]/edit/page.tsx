import FlashcardSetEditor from "@/components/flashcard/FlashcardSetEditor";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

type FlashcardSetEditPageProps = {
  params: Promise<{ setId: string }>;
};

export default async function FlashcardSetEditPage({
  params,
}: FlashcardSetEditPageProps) {
  const { setId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) notFound();

  const { data: flashcardSet, error: setError } = await supabase
    .from("flashcard_sets")
    .select("id, title, description, class_id")
    .eq("id", setId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (setError) {
    throw new Error(`Could not load flashcard set: ${setError.message}`);
  }

  if (!flashcardSet) notFound();

  const { data: flashcards, error: cardsError } = await supabase
    .from("flashcards")
    .select("id, question, answer, card_order")
    .eq("set_id", flashcardSet.id)
    .order("card_order", { ascending: true });

  if (cardsError) {
    throw new Error(`Could not load flashcards: ${cardsError.message}`);
  }

  return (
    <FlashcardSetEditor
      initialSet={{
        id: flashcardSet.id,
        title: flashcardSet.title,
        description: flashcardSet.description ?? "",
        classId: flashcardSet.class_id ?? "",
        cards: (flashcards ?? []).map((card, index) => ({
          ...card,
          card_order: card.card_order ?? index + 1,
        })),
      }}
    />
  );
}
