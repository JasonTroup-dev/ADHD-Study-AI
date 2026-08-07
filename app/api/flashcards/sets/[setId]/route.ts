import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

type FlashcardInput = {
  id?: string;
  question?: string;
  answer?: string;
  card_order?: number;
};

type UpdateFlashcardSetBody = {
  title?: string;
  description?: string | null;
  classId?: string | null;
  cards?: FlashcardInput[];
};

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ setId: string }> },
) {
  try {
    const { setId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "You must be logged in to update flashcards." },
        { status: 401 },
      );
    }

    const body = (await request.json()) as UpdateFlashcardSetBody;
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const description =
      typeof body.description === "string" && body.description.trim()
        ? body.description.trim()
        : null;
    const classId =
      typeof body.classId === "string" && body.classId ? body.classId : null;
    const cards = Array.isArray(body.cards) ? body.cards : [];

    if (!title) {
      return NextResponse.json(
        { error: "A title is required." },
        { status: 400 },
      );
    }

    if (
      cards.length === 0 ||
      cards.some(
        (card) =>
          typeof card.question !== "string" ||
          !card.question.trim() ||
          typeof card.answer !== "string" ||
          !card.answer.trim(),
      )
    ) {
      return NextResponse.json(
        { error: "Every flashcard needs a front and back." },
        { status: 400 },
      );
    }

    const { data: ownedSet, error: ownedSetError } = await supabase
      .from("flashcard_sets")
      .select("id")
      .eq("id", setId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (ownedSetError) {
      console.error("Error checking flashcard set ownership:", ownedSetError);
      return NextResponse.json(
        { error: "Could not update this set." },
        { status: 500 },
      );
    }

    if (!ownedSet) {
      return NextResponse.json(
        { error: "Flashcard set not found." },
        { status: 404 },
      );
    }

    if (classId) {
      const { data: ownedClass, error: classError } = await supabase
        .from("classes")
        .select("id")
        .eq("id", classId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (classError || !ownedClass) {
        return NextResponse.json(
          { error: "Choose one of your own classes." },
          { status: 400 },
        );
      }
    }

    const { data: existingCards, error: existingCardsError } = await supabase
      .from("flashcards")
      .select("id")
      .eq("set_id", setId);

    if (existingCardsError) {
      console.error("Error loading existing flashcards:", existingCardsError);
      return NextResponse.json(
        { error: "Could not update this set." },
        { status: 500 },
      );
    }

    const existingCardIds = new Set(
      (existingCards ?? []).map((card) => card.id),
    );
    const normalizedCards = cards.map((card, index) => ({
      id: card.id,
      set_id: setId,
      question: card.question!.trim(),
      answer: card.answer!.trim(),
      card_order: index + 1,
    }));
    const cardsToUpdate = normalizedCards.filter(
      (card): card is typeof card & { id: string } =>
        typeof card.id === "string" && existingCardIds.has(card.id),
    );
    const cardsToInsert = normalizedCards
      .filter(
        (card) =>
          typeof card.id !== "string" || !existingCardIds.has(card.id),
      )
      .map(({ set_id, question, answer, card_order }) => ({
        set_id,
        question,
        answer,
        card_order,
      }));
    const submittedExistingIds = new Set(cardsToUpdate.map((card) => card.id));
    const cardIdsToDelete = [...existingCardIds].filter(
      (id) => !submittedExistingIds.has(id),
    );

    const { error: setUpdateError } = await supabase
      .from("flashcard_sets")
      .update({ title, description, class_id: classId })
      .eq("id", setId)
      .eq("user_id", user.id);

    if (setUpdateError) {
      console.error("Error updating flashcard set:", setUpdateError);
      return NextResponse.json(
        { error: "Could not save the set details." },
        { status: 500 },
      );
    }

    if (cardsToUpdate.length > 0) {
      const { error } = await supabase
        .from("flashcards")
        .upsert(cardsToUpdate, { onConflict: "id" });

      if (error) {
        console.error("Error updating flashcards:", error);
        return NextResponse.json(
          { error: "Set details saved, but the cards could not be updated." },
          { status: 500 },
        );
      }
    }

    if (cardsToInsert.length > 0) {
      const { error } = await supabase.from("flashcards").insert(cardsToInsert);

      if (error) {
        console.error("Error adding flashcards:", error);
        return NextResponse.json(
          { error: "Existing cards saved, but new cards could not be added." },
          { status: 500 },
        );
      }
    }

    if (cardIdsToDelete.length > 0) {
      const { error } = await supabase
        .from("flashcards")
        .delete()
        .eq("set_id", setId)
        .in("id", cardIdsToDelete);

      if (error) {
        console.error("Error removing flashcards:", error);
        return NextResponse.json(
          { error: "Cards saved, but removed cards could not be deleted." },
          { status: 500 },
        );
      }
    }

    return NextResponse.json({ set: { id: setId } });
  } catch (error) {
    console.error("Unexpected flashcard update error:", error);
    return NextResponse.json(
      { error: "Something went wrong while updating the flashcard set." },
      { status: 500 },
    );
  }
}
