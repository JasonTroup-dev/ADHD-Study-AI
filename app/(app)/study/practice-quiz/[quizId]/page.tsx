import { ArrowLeft, BookOpen, FileText } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import PracticeQuizPlayer from "@/components/StudyTools/PracticeQuizPlayer";
import PracticeQuizShareButton from "@/components/StudyTools/PracticeQuizShareButton";
import type { PracticeQuizQuestion } from "@/lib/ai/practiceQuiz";
import { getSiteUrl } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";

export default async function SavedPracticeQuizPage({
  params,
}: {
  params: Promise<{ quizId: string }>;
}) {
  const { quizId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: quiz } = await supabase
    .from("practice_quiz_sets")
    .select("id, title, source_name, class_id, is_shared, share_token, classes(name)")
    .eq("id", quizId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!quiz) notFound();

  const { data: rows } = await supabase
    .from("practice_quiz_questions")
    .select("question, choices, correct_choice_index, explanation, topic, difficulty")
    .eq("quiz_set_id", quiz.id)
    .order("question_order");

  const questions = (rows ?? []).map(toPracticeQuizQuestion).filter(Boolean) as PracticeQuizQuestion[];
  if (questions.length === 0) notFound();

  const className = relationName(quiz.classes);
  const shareUrl = new URL(
    `/shared/practice-quiz/${quiz.share_token}`,
    getSiteUrl(),
  ).toString();

  return (
    <div className="min-h-full flex-1 bg-slate-100 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-5xl">
        <Link
          href="/study/practice-quiz"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-950"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to quizzes
        </Link>

        <header className="mt-7 flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
              {quiz.title}
            </h1>
            <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-500">
              <span className="inline-flex items-center gap-1.5">
                <BookOpen className="size-4" aria-hidden="true" />
                {className || "No class"}
              </span>
              {quiz.source_name ? (
                <span className="inline-flex items-center gap-1.5">
                  <FileText className="size-4" aria-hidden="true" />
                  {quiz.source_name}
                </span>
              ) : null}
            </div>
          </div>
          <PracticeQuizShareButton
            quizId={quiz.id}
            initiallyShared={quiz.is_shared}
            initialShareUrl={shareUrl}
          />
        </header>

        <main className="mt-8 max-w-3xl">
          <PracticeQuizPlayer quiz={{ title: quiz.title, questions }} />
        </main>
      </div>
    </div>
  );
}

function toPracticeQuizQuestion(row: {
  question: string;
  choices: unknown;
  correct_choice_index: number;
  explanation: string;
  topic: string;
  difficulty: string;
}): PracticeQuizQuestion | null {
  if (!Array.isArray(row.choices) || !row.choices.every((choice) => typeof choice === "string")) {
    return null;
  }
  if (!(["foundational", "application", "challenge"] as const).includes(row.difficulty as PracticeQuizQuestion["difficulty"])) {
    return null;
  }
  return {
    question: row.question,
    choices: row.choices,
    correctChoiceIndex: row.correct_choice_index,
    explanation: row.explanation,
    topic: row.topic,
    difficulty: row.difficulty as PracticeQuizQuestion["difficulty"],
  };
}

function relationName(value: unknown) {
  if (Array.isArray(value)) return value[0]?.name ?? null;
  if (value && typeof value === "object" && "name" in value) {
    return typeof value.name === "string" ? value.name : null;
  }
  return null;
}
