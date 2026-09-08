import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  BookOpenCheck,
  Brain,
  Check,
  FileUp,
  ListChecks,
  Sparkles,
} from "lucide-react";

type StudyGuideEmptyStateProps = {
  onCreateGuide: () => void;
};

const guideSections = [
  "Big-picture summary",
  "Core concepts",
  "Knowledge check",
  "A simple study plan",
];

const steps = [
  {
    icon: FileUp,
    label: "Add your material",
    description: "Upload notes, a chapter, or a handout.",
  },
  {
    icon: Brain,
    label: "We find what matters",
    description: "Key ideas are organized into short sections.",
  },
  {
    icon: BookOpenCheck,
    label: "Study with a clear path",
    description: "Read, review, and come back whenever you need.",
  },
];

export default function StudyGuideEmptyState({
  onCreateGuide,
}: StudyGuideEmptyStateProps) {
  return (
    <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)_auto] gap-4 overflow-hidden">
      <section className="relative min-h-0 overflow-hidden rounded-[2rem] bg-slate-950 text-white shadow-xl shadow-slate-950/10">
        <div
          className="pointer-events-none absolute -right-32 -top-40 size-96 rounded-full bg-blue-500/20 blur-3xl"
          aria-hidden="true"
        />
        <div className="relative grid h-full lg:grid-cols-[1.05fr_0.95fr]">
          <div className="flex min-h-0 flex-col justify-center px-6 py-6 sm:px-9 lg:px-11 lg:py-8">
            <div className="mb-3 flex size-10 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-blue-200">
              <Sparkles className="size-5" aria-hidden="true" />
            </div>
            <p className="text-sm font-semibold tracking-wide text-blue-200">
              Your material, made manageable
            </p>
            <h2 className="mt-2 max-w-2xl text-2xl font-semibold tracking-tight sm:text-3xl lg:text-4xl lg:leading-[1.08]">
              Turn dense notes into a clear path forward.
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300 sm:text-base">
              Get an ADHD-friendly guide with the important ideas, helpful
              explanations, and a realistic plan for what to study next.
            </p>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center">
              <Button
                type="button"
                size="lg"
                onClick={onCreateGuide}
                className="h-11 rounded-xl bg-white px-5 text-slate-950 hover:bg-blue-50"
              >
                Create my first guide
                <ArrowRight aria-hidden="true" />
              </Button>
              <span className="text-sm text-slate-400">
                PDF, DOCX, TXT, MD, CSV, or JSON
              </span>
            </div>
          </div>

          <div className="relative hidden min-h-0 items-center lg:flex lg:py-6 lg:pr-7">
            <div className="w-full rounded-[1.5rem] border border-white/10 bg-white p-5 text-slate-950 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                    <ListChecks className="size-5" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold">Your study guide</p>
                    <p className="text-xs text-slate-500">Ready in a few moments</p>
                  </div>
                </div>
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                  Focused
                </span>
              </div>
              <div className="mt-3 space-y-2">
                {guideSections.map((section, index) => (
                  <div
                    key={section}
                    className="flex items-center gap-3 rounded-xl bg-slate-50 px-3.5 py-2"
                  >
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-white text-xs font-semibold text-slate-500 shadow-sm">
                      {index + 1}
                    </span>
                    <span className="flex-1 text-sm font-medium text-slate-700">
                      {section}
                    </span>
                    <Check className="size-4 text-blue-600" aria-hidden="true" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="how-it-works-title" className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3">
          <h2 id="how-it-works-title" className="text-base font-semibold tracking-tight text-slate-950">
            From upload to study-ready in three steps
          </h2>
        </div>
        <ol className="grid gap-4 md:grid-cols-3">
          {steps.map((step, index) => {
            const Icon = step.icon;

            return (
              <li key={step.label} className="flex gap-3 rounded-2xl bg-slate-50 p-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white text-blue-700 shadow-sm">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-xs font-semibold text-slate-400">0{index + 1}</p>
                  <h3 className="mt-0.5 text-sm font-semibold text-slate-900">{step.label}</h3>
                  <p className="mt-0.5 hidden text-xs leading-5 text-slate-600 sm:block">{step.description}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}
