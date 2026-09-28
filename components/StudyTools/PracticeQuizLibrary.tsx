"use client";

import {
  BookOpenCheck,
  MoreVertical,
  Plus,
  Share2,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";

export type PracticeQuizListItem = {
  id: string;
  title: string;
  createdAt: string;
  className: string | null;
  classColor: string | null;
  questionCount: number;
  isShared: boolean;
};

export default function PracticeQuizLibrary({
  initialQuizzes,
}: {
  initialQuizzes: PracticeQuizListItem[];
}) {
  const router = useRouter();
  const [quizzes, setQuizzes] = useState(initialQuizzes);
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  async function deleteQuiz(quiz: PracticeQuizListItem) {
    setOpenMenu(null);
    if (!window.confirm(`Delete “${quiz.title}”? This cannot be undone.`)) return;

    const response = await fetch(`/api/practice-quiz/sets/${quiz.id}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      window.alert("Could not delete this quiz.");
      return;
    }
    setQuizzes((current) => current.filter((item) => item.id !== quiz.id));
    router.refresh();
  }

  return (
    <div className="min-h-full flex-1 bg-slate-100 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-7xl">
        <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-600">
              Study tools
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
              Practice quizzes
            </h1>
            <p className="mt-3 text-base text-slate-600">
              Your saved quizzes, organized by class and ready whenever you are.
            </p>
          </div>
          <Button asChild size="lg">
            <Link href="/study/practice-quiz/create">
              <Plus aria-hidden="true" />
              New quiz
            </Link>
          </Button>
        </header>

        {quizzes.length === 0 ? (
          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm mt-8 px-6 py-14 text-center">
            <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
              <BookOpenCheck className="size-7" aria-hidden="true" />
            </span>
            <h2 className="mt-5 text-xl font-semibold text-slate-950">Create your first quiz</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
              Add notes or a document. The quiz will be saved here automatically.
            </p>
            <Button asChild className="mt-6">
              <Link href="/study/practice-quiz/create">Create a quiz</Link>
            </Button>
          </section>
        ) : (
          <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {quizzes.map((quiz) => (
              <article key={quiz.id} className="rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:border-slate-300 hover:shadow-md relative min-h-56 p-6">
                <Link
                  href={`/study/practice-quiz/${quiz.id}`}
                  className="absolute inset-0 rounded-2xl"
                  aria-label={`Open ${quiz.title}`}
                />
                <div className="pointer-events-none relative flex items-start justify-between gap-4">
                  <span
                    className="flex size-12 items-center justify-center rounded-xl text-white"
                    style={{ backgroundColor: quiz.classColor || "#2563eb" }}
                  >
                    <BookOpenCheck className="size-6" aria-hidden="true" />
                  </span>
                  <div className="pointer-events-auto relative z-10">
                    <button
                      type="button"
                      className="rounded-full p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-950"
                      onClick={() => setOpenMenu((current) => current === quiz.id ? null : quiz.id)}
                      aria-label={`Quiz options for ${quiz.title}`}
                    >
                      <MoreVertical className="size-5" aria-hidden="true" />
                    </button>
                    {openMenu === quiz.id ? (
                      <div className="absolute right-0 top-10 z-20 w-40 rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
                        <button
                          type="button"
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-700 hover:bg-red-50"
                          onClick={() => deleteQuiz(quiz)}
                        >
                          <Trash2 className="size-4" aria-hidden="true" />
                          Delete quiz
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="pointer-events-none relative mt-6">
                  <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500">
                    <span className="rounded-full bg-slate-100 px-2.5 py-1">
                      {quiz.questionCount} {quiz.questionCount === 1 ? "question" : "questions"}
                    </span>
                    {quiz.isShared ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-blue-700">
                        <Share2 className="size-3" aria-hidden="true" />
                        Shared
                      </span>
                    ) : null}
                  </div>
                  <h2 className="mt-4 text-xl font-semibold leading-7 text-slate-950">{quiz.title}</h2>
                  <p className="mt-2 text-sm text-slate-500">
                    {quiz.className || "No class"} · {formatDate(quiz.createdAt)}
                  </p>
                </div>

                <div className="pointer-events-auto relative mt-6">
                  <Button asChild variant="outline" className="w-full bg-white">
                    <Link href={`/study/practice-quiz/${quiz.id}`}>Take quiz</Link>
                  </Button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}
