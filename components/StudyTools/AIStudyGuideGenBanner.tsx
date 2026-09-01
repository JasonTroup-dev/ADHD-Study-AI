import { ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";

import { Button } from "../ui/button";

export default function AIStudyGuideGenBanner() {
  return (
    <div className="relative isolate flex min-h-64 flex-col justify-between overflow-hidden rounded-[2rem] border border-white/10 bg-[#1c2b24] p-6 text-[#fffaf0] shadow-[0_28px_70px_-42px_rgba(25,36,31,0.85)] sm:p-8">
      <div aria-hidden="true" className="absolute -right-12 -top-14 -z-10 size-40 rotate-12 rounded-[2.5rem] bg-[#d76543]" />
      <div aria-hidden="true" className="absolute right-20 top-20 -z-10 size-20 rounded-full bg-[#ddc56f]" />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-[#fffaf0] text-[#9e3f28]">
          <Sparkles className="h-7 w-7" aria-hidden="true" />
        </div>

        <div className="max-w-3xl sm:ml-2">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#ed9b79]">Featured tool</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">AI Study Guide Generator</h2>
          <p className="py-3 text-base leading-7 text-[#c4cec8] sm:text-lg">
            Transform your notes, chapters, or assignments into structured
            study guides with summaries and key concepts.
          </p>
        </div>
      </div>

      <div>
        <div className="flex flex-wrap gap-2">
          {[
            "Summaries",
            "Key Concepts",
            "Practice Questions",
            "Study Plans",
          ].map((feature) => (
            <span
              key={feature}
              className="inline-flex rounded-full border border-white/15 bg-white/5 px-3 py-1 text-sm text-[#e9dfc7]"
            >
              {feature}
            </span>
          ))}
        </div>

        <Button
          asChild
          variant="secondary"
          size="lg"
          className="mt-5 bg-[#fffaf0] text-[#19241f] hover:bg-[#f3d7c9]"
        >
          <Link href="/study/study-guide/create">
            Generate Study Guide
            <ArrowRight aria-hidden="true" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
