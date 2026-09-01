import { Plus, Sparkles } from "lucide-react";

import StudyGuideCard from "@/components/StudyGuide/StudyGuideCard";
import { Button } from "@/components/ui/button";
import { demoStudyGuides } from "@/lib/demo/studyGuides";

const guidePreviews: Record<string, string> = {
  "demo-guide-cell-membranes":
    "A focused review of membrane structure, diffusion, osmosis, transport proteins, and active transport.",
  "demo-guide-working-memory":
    "Core components of working memory, common experimental evidence, and practical learning applications.",
  "demo-guide-industrialization":
    "Key claims, historical context, and perspective cues for analyzing factory testimony.",
};

export default function DemoStudyGuidesPage() {
  return (
    <main className="min-h-full w-full bg-gray-100 text-slate-950">
      <div className="mx-auto w-full max-w-screen-2xl px-6 py-8 lg:px-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight">Study guides</h1>
            <p className="py-2 text-lg text-gray-600">
              Revisit your saved guides or create one from new material.
            </p>
          </div>
          <Button size="lg" className="self-start px-5 sm:self-auto" disabled>
            <Plus aria-hidden="true" />
            New guide
          </Button>
        </header>

        <section className="workspace-card workspace-card-dark relative mt-6 overflow-hidden px-6 py-6 text-white sm:px-8">
          <div className="pointer-events-none absolute -right-10 -top-20 size-44 rounded-full bg-[#d76543]" />
          <div className="pointer-events-none absolute right-24 top-20 size-20 rounded-full bg-[#ddc56f]" />
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-[#fffaf0] text-[#9e3f28]">
                <Sparkles className="size-6" aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-xl font-semibold">Turn notes into a clear study path</h2>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-[#c4cec8]">
                  Upload class material and get summaries, core concepts, knowledge checks, and next steps.
                </p>
              </div>
            </div>
            <Button variant="secondary" className="shrink-0 self-start sm:self-auto" disabled>
              Generate with AI
            </Button>
          </div>
        </section>

        <section aria-labelledby="demo-guides-title" className="mt-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 id="demo-guides-title" className="text-xl font-semibold">
              Your guides
            </h2>
            <span className="text-sm text-slate-500">{demoStudyGuides.length} guides</span>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {demoStudyGuides.map((guide) => (
              <StudyGuideCard
                key={guide.id}
                guide={{ ...guide, preview: guidePreviews[guide.id] ?? "Open this study guide." }}
                href={`/demo/study/study-guide/${guide.id}`}
                allowDelete={false}
              />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
