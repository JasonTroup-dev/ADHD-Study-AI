import { CircleDot, Clock3 } from "lucide-react";
import Link from "next/link";

import { StartStudySessionButton } from "@/components/study-sessions/StartStudySessionButton";
import { Button } from "@/components/ui/button";
import type { NextUpAction, NextUpItem } from "@/lib/classes/classWorkspace";

export function ClassNextUpCard({ nextUp }: { nextUp: NextUpItem }) {
  const Icon = nextUp.icon;
  const toneClasses = {
    slate: { border: "border-slate-200", icon: "bg-slate-100 text-slate-700", badge: "border-slate-200 bg-slate-50 text-slate-700" },
    amber: { border: "border-amber-200", icon: "bg-amber-100 text-amber-700", badge: "border-amber-200 bg-amber-50 text-amber-700" },
    emerald: { border: "border-emerald-200", icon: "bg-emerald-100 text-emerald-700", badge: "border-emerald-200 bg-emerald-50 text-emerald-700" },
    blue: { border: "border-blue-200", icon: "bg-blue-100 text-blue-700", badge: "border-blue-200 bg-blue-50 text-blue-700" },
  }[nextUp.tone];

  return (
    <article className={`rounded-xl border bg-white p-6 shadow-sm ${toneClasses.border}`}>
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-4">
          <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${toneClasses.icon}`}>
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <span className={`inline-flex rounded-md border px-2.5 py-1 text-xs font-semibold ${toneClasses.badge}`}>{nextUp.eyebrow}</span>
            <h2 className="mt-3 text-xl font-semibold text-slate-950">{nextUp.title}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{nextUp.description}</p>
            <div className="mt-5 flex items-center gap-2 text-sm text-slate-600">
              <Clock3 className="h-4 w-4" aria-hidden="true" />
              <span>{nextUp.meta}</span>
            </div>
          </div>
        </div>
        <div className="shrink-0"><NextUpButton action={nextUp.action} /></div>
      </div>
    </article>
  );
}

function NextUpButton({ action }: { action: NextUpAction }) {
  if (action.type === "link") {
    return (
      <Button asChild className="h-10 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white shadow-none hover:bg-slate-800">
        <Link href={action.href}><CircleDot className="h-4 w-4" aria-hidden="true" />{action.label}</Link>
      </Button>
    );
  }
  return (
    <StartStudySessionButton
      plannerTaskId={action.plannerTaskId}
      assignmentId={action.assignmentId}
      classId={action.classId}
      flashcardSetId={action.flashcardSetId}
      title={action.title}
      sessionType={action.sessionType}
      label={action.label}
      loadingLabel="Opening..."
      variant="default"
      className="h-10 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white shadow-none hover:bg-slate-800"
    />
  );
}
