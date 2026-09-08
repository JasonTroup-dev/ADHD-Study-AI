import { FileQuestion, Plus } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import type { PracticeQuizSummary } from "@/lib/classes/classWorkspace";

export function ClassPracticeQuizzesSection({
  classId,
  quizzes,
}: {
  classId: string;
  quizzes: PracticeQuizSummary[];
}) {
  return (
    <section id="practice-quizzes">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-950">Practice quizzes</h2>
          <p className="mt-1 text-sm text-slate-600">
            Test your understanding with quizzes made for this class.
          </p>
        </div>
        <Button asChild variant="outline" className="h-9 rounded-lg border-slate-200 bg-white px-3 text-sm font-semibold shadow-none">
          <Link href={`/study/practice-quiz/create?classId=${classId}`}>
            <Plus className="size-4" aria-hidden="true" />
            Create quiz
          </Link>
        </Button>
      </div>

      <div className="space-y-3">
        {quizzes.length > 0 ? quizzes.map((quiz) => (
          <article key={quiz.id} className="workspace-card flex items-center gap-4 p-4">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#e5eddf] text-[#365543]">
              <FileQuestion className="size-5" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="truncate font-semibold text-slate-950">{quiz.title}</h3>
              <p className="mt-1 text-sm text-slate-500">
                {quiz.questionCount} questions · Created {quiz.createdAt.toLowerCase()}
              </p>
            </div>
            <Button asChild variant="outline" className="shrink-0 bg-white">
              <Link href={quiz.href}>Take quiz</Link>
            </Button>
          </article>
        )) : (
          <Link
            href={`/study/practice-quiz/create?classId=${classId}`}
            className="workspace-empty-state flex h-[68px] items-center justify-center gap-3 text-sm font-semibold text-slate-600 transition hover:border-slate-400 hover:bg-[#fffaf0] hover:text-slate-950"
          >
            <Plus className="size-5" aria-hidden="true" />
            Create a practice quiz
          </Link>
        )}
      </div>
    </section>
  );
}
