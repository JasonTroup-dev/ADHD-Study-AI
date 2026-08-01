"use client";

import { Sparkles, Brain, FileText } from "lucide-react";
import Link from "next/link";

export default function PromptButtons({
  onSummarize,
}: {
  onSummarize: () => void;
}) {
  return (
    <div className="flex">
      <Link
        href="/study/study-guide"
        className="flex py-2 px-4 rounded-full border border-gray-300 items-center hover:bg-gray-200"
      >
        <Sparkles className="h-5 w-5 mr-2 text-gray-500" />
                  Generate Study Guide
      </Link>

      <button
        type="button"
        onClick={onSummarize}
        className="flex py-2 px-4 rounded-full border border-gray-300 mx-4 items-center hover:bg-gray-200"
      >
        <Brain className="h-5 w-5 mr-2 text-gray-500" />
                  Summarize Notes
      </button>

      <Link
        href="/study/flashcards/create?mode=ai" 
        className="flex py-2 px-4 rounded-full border border-gray-300 items-center hover:bg-gray-200"
      >
        <FileText className="h-5 w-5 mr-2 text-gray-500" />
                  Create Flashcards
      </Link>
    </div>
  );
}
