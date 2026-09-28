import { Plus, Zap } from "lucide-react";
import Link from "next/link";

import { StartStudySessionButton } from "@/components/study-sessions/StartStudySessionButton";
import { Button } from "@/components/ui/button";
import type { FlashcardSet } from "@/lib/classes/classWorkspace";

export function ClassFlashcardsSection({ classId, flashcardSets }: { classId: string; flashcardSets: FlashcardSet[] }) {
  return (
    <section>
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-950">Flashcards</h2>
          <p className="mt-1 text-sm text-slate-600">Review terms and concepts after the urgent work is handled.</p>
        </div>
        <Button asChild variant="outline" className="h-9 rounded-lg border-slate-200 bg-white px-3 text-sm font-semibold text-slate-950 shadow-none hover:bg-slate-50">
          <Link href={`/study/flashcards/create?classId=${classId}`}><Zap className="h-4 w-4" aria-hidden="true" />Create Set</Link>
        </Button>
      </div>
      <div className="space-y-3">
        {flashcardSets.length > 0 ? flashcardSets.map((set) => (
          <FlashcardSetCard key={set.id} classId={classId} set={set} />
        )) : (
          <Link href={`/study/flashcards/create?classId=${classId}`} className="flex h-[68px] items-center justify-center gap-3 rounded-xl border border-dashed border-slate-300 bg-white text-sm font-semibold text-slate-600 transition hover:border-slate-400 hover:bg-slate-50 hover:text-slate-950">
            <Plus className="h-5 w-5" aria-hidden="true" />Create Flashcard Set
          </Link>
        )}
      </div>
    </section>
  );
}

function FlashcardSetCard({ classId, set }: { classId: string; set: FlashcardSet }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="truncate text-lg font-semibold text-slate-950">{set.title}</h3>
          <p className="mt-3 text-sm text-slate-600">Last studied {set.lastStudied}<span className="mx-3 text-slate-300">-</span>{set.mastery}% mastery</p>
        </div>
        <span className="shrink-0 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-950">{set.cardCount} cards</span>
      </div>
      <div className="mt-3 flex items-center gap-6">
        <ProgressBar value={set.mastery} className="flex-1" />
        <div className="flex shrink-0 items-center gap-2">
          <Button asChild variant="outline" className="h-8 rounded-lg border-slate-200 bg-white px-4 text-sm font-semibold text-slate-950 shadow-none hover:bg-slate-50"><Link href={set.href}>Open</Link></Button>
          <StartStudySessionButton classId={classId} flashcardSetId={set.id} title={set.title} sessionType="flashcards" label="Study" variant="default" className="h-8 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white shadow-none hover:bg-slate-800" />
        </div>
      </div>
    </article>
  );
}

export function ProgressBar({ value, className = "" }: { value: number; className?: string }) {
  return (
    <div className={`h-1.5 overflow-hidden rounded-full bg-slate-300 ${className}`} aria-label={`${value}% complete`} role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full rounded-full bg-slate-950" style={{ width: `${Math.min(Math.max(value, 0), 100)}%` }} />
    </div>
  );
}
