import { createClient } from "@/lib/supabase/server";

type ClassSelectFields =
  | "id, name, color"
  | "id, name"
  | "color"
  | "*";

export async function getClassData({
  classId,
  flashcardSetId,
  select = "id, name, color",
}: {
  classId?: string;
  flashcardSetId?: string;
  select?: ClassSelectFields;
}) {
  const supabase = await createClient();

  if (classId) {
    const { data, error } = await supabase
      .from("classes")
      .select(select)
      .eq("id", classId)
      .single();

    if (error) throw error;
    return data;
  }

  if (flashcardSetId) {
    const { data, error } = await supabase
      .from("flashcard_sets")
      .select(`
        class:classes (
          ${select}
        )
      `)
      .eq("id", flashcardSetId)
      .single();

    if (error) throw error;
    return data.class;
  }

  throw new Error("classId or flashcardSetId is required.");
}