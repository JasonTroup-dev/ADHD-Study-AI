import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

type FlashcardInput = {
  question: string;
  answer: string;
  card_order?: number;
};

export async function POST(req: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "You must be logged in to save flashcards." },
        { status: 401 },
      );
    }

    const body = await req.json();

    const title = body.title;
    const description = body.description ?? null;
    const classId = body.classId ?? null;

    // Your create page sends "cards", not "flashcards"
    const cards = body.cards as FlashcardInput[];

    if (!title || title.trim().length === 0) {
      return NextResponse.json(
        { error: "A title is required." },
        { status: 400 },
      );
    }

    if (!cards || cards.length === 0) {
      return NextResponse.json(
        { error: "At least one flashcard is required." },
        { status: 400 },
      );
    }

    const validCards = cards.filter(
      (card) =>
        card.question?.trim().length > 0 &&
        card.answer?.trim().length > 0,
    );

    if (validCards.length === 0) {
      return NextResponse.json(
        { error: "Each flashcard needs a question and an answer." },
        { status: 400 },
      );
    }

    const { data: createdSet, error: setError } = await supabase
      .from("flashcard_sets")
      .insert({
        user_id: user.id,
        title: title.trim(),
        description,
        class_id: classId,
      })
      .select("id, title")
      .single();

    if (setError || !createdSet) {
      console.error("Error creating flashcard set:", setError);

      return NextResponse.json(
        { error: "Could not create flashcard set." },
        { status: 500 },
      );
    }

    const cardsToInsert = validCards.map((card, index) => ({
      set_id: createdSet.id,
      question: card.question.trim(),
      answer: card.answer.trim(),
      card_order: card.card_order ?? index + 1,
    }));

    const { error: cardsError } = await supabase
      .from("flashcards")
      .insert(cardsToInsert);

    if (cardsError) {
      console.error("Error creating flashcards:", cardsError);

      return NextResponse.json(
        { error: "Set was created, but flashcards could not be saved." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      set: createdSet,
    });
  } catch (error) {
    console.error("Unexpected flashcard save error:", error);

    return NextResponse.json(
      { error: "Something went wrong while saving the flashcard set." },
      { status: 500 },
    );
  }
}