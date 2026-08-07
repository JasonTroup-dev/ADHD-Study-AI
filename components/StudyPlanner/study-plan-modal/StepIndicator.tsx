import { CheckCircle2 } from "lucide-react";

import type { StudyPlannerStep } from "./types";

export function StepIndicator({ step }: { step: StudyPlannerStep }) {
  const isReview = step === "review";
  return (
    <div className="hidden items-center gap-2 text-xs font-medium sm:flex" aria-label="Study plan progress">
      <span className="flex items-center gap-1.5 text-slate-950">
        <span className={`flex size-5 items-center justify-center rounded-full text-[10px] ${isReview ? "bg-emerald-100 text-emerald-700" : "bg-slate-950 text-white"}`}>
          {isReview ? <CheckCircle2 className="size-3.5" aria-hidden="true" /> : "1"}
        </span>
        Syllabus
      </span>
      <span className="h-px w-5 bg-slate-200" aria-hidden="true" />
      <span className={`flex items-center gap-1.5 ${isReview ? "text-slate-950" : "text-slate-400"}`}>
        <span className={`flex size-5 items-center justify-center rounded-full text-[10px] ${isReview ? "bg-slate-950 text-white" : "bg-slate-100"}`}>2</span>
        Review
      </span>
    </div>
  );
}
