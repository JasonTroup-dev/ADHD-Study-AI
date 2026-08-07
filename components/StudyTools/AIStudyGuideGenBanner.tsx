import { ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";

import { Button } from "../ui/button";

export default function AIStudyGuideGenBanner() {
  return (
    <div className="relative flex min-h-60 flex-col justify-between rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-xl">
      <div className="flex">
        <div className="flex h-15 w-15 items-center justify-center rounded-xl bg-linear-to-br from-purple-400 to-blue-600">
          <Sparkles className="h-7 w-7 text-white" aria-hidden="true" />
        </div>

        <div className="ml-4">
          <h2 className="text-3xl font-semibold">AI Study Guide Generator</h2>
          <p className="py-2 text-lg text-gray-600">
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
              className="inline-flex rounded-md border border-gray-200 px-3 py-1 text-sm text-gray-600"
            >
              {feature}
            </span>
          ))}
        </div>

        <Button
          asChild
          variant="default"
          size="lg"
          className="mt-4 bg-linear-to-br from-purple-500 to-blue-500"
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
