import { BookOpen } from "lucide-react";
import { notFound } from "next/navigation";

import PracticeQuizPlayer from "@/components/StudyTools/PracticeQuizPlayer";
import type { PracticeQuizQuestion } from "@/lib/ai/practiceQuiz";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function SharedPracticeQuizPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  let supabase;
  try {
    supabase = createAdminClient();
  } catch {
    notFound();
  }

  const { data: quiz } = await supabase
    .from("practice_quiz_sets")
    .select("id, title")
    .eq("share_token", token)
    .eq("is_shared", true)
    .maybeSingle();

  if (!quiz) notFound();

  const { data: rows } = await supabase
    .from("practice_quiz_questions")
    .select("question, choices, correct_choice_index, explanation, topic, difficulty")
    .eq("quiz_set_id", quiz.id)
    .order("question_order");

  const questions = (rows ?? []).flatMap((row): PracticeQuizQuestion[] => {
    if (!Array.isArray(row.choices) || !row.choices.every((choice) => typeof choice === "string")) return [];
    if (!(["foundational", "application", "challenge"] as const).includes(row.difficulty as PracticeQuizQuestion["difficulty"])) return [];
    return [{
      question: row.question,
      choices: row.choices,
      correctChoiceIndex: row.correct_choice_index,
      explanation: row.explanation,
      topic: row.topic,
      difficulty: row.difficulty as PracticeQuizQuestion["difficulty"],
    }];
  });

  if (questions.length === 0) notFound();

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <header className="mb-8">
          <div className="flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.16em] text-[#4d765f]">
            <BookOpen className="size-5" aria-hidden="true" />
            Shared practice quiz
          </div>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
            {quiz.title}
          </h1>
          <p className="mt-3 text-slate-600">
            Work through each question and check your answer as you go.
          </p>
        </header>
        <PracticeQuizPlayer
          quiz={{ title: quiz.title, questions }}
          exitHref="/"
          exitLabel="Done"
        />
      </div>
    </main>
  );
}
