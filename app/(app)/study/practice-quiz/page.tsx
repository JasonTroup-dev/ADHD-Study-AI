import type { Metadata } from "next";
import { redirect } from "next/navigation";

import PracticeQuizLibrary, {
  type PracticeQuizListItem,
} from "@/components/StudyTools/PracticeQuizLibrary";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Practice Quizzes | ADHD Study AI",
  description: "Create, save, and share practice quizzes for your classes.",
};

export default async function PracticeQuizPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: rows } = await supabase
    .from("practice_quiz_sets")
    .select("id, title, created_at, is_shared, classes(name, color), practice_quiz_questions(id)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const quizzes: PracticeQuizListItem[] = (rows ?? []).map((row) => {
    const linkedClass = relationItem(row.classes);
    return {
      id: row.id,
      title: row.title,
      createdAt: row.created_at,
      className: linkedClass?.name ?? null,
      classColor: linkedClass?.color ?? null,
      questionCount: Array.isArray(row.practice_quiz_questions)
        ? row.practice_quiz_questions.length
        : 0,
      isShared: row.is_shared,
    };
  });

  return <PracticeQuizLibrary initialQuizzes={quizzes} />;
}

function relationItem(value: unknown): { name: string; color: string | null } | null {
  const item = Array.isArray(value) ? value[0] : value;
  if (!item || typeof item !== "object" || !("name" in item)) return null;
  return {
    name: typeof item.name === "string" ? item.name : "",
    color: "color" in item && typeof item.color === "string" ? item.color : null,
  };
}
