"use client";

import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import StudyGuideReader from "./StudyGuideReader";
import type { SavedStudyGuide } from "./types";

export default function StudyGuideDetail({ guide }: { guide: SavedStudyGuide }) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  async function copyGuide() {
    try {
      await window.navigator.clipboard.writeText(guide.content);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      window.alert("Could not copy this guide. Try downloading it instead.");
    }
  }

  function downloadGuide() {
    const blob = new Blob([guide.content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${toFileName(guide.title)}.md`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function deleteGuide() {
    const confirmed = window.confirm(`Delete “${guide.title}”?`);
    if (!confirmed) return;

    try {
      const response = await fetch(`/api/study-guides/${guide.id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Delete failed");
      router.push("/study/study-guide");
      router.refresh();
    } catch {
      window.alert("Could not delete this study guide.");
    }
  }

  return (
    <main className="min-h-[calc(100svh-4rem)] bg-slate-100 px-4 py-5 sm:px-6 md:min-h-svh lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-4 flex items-center justify-between gap-4">
          <Button asChild variant="ghost" className="-ml-3 text-slate-600">
            <Link href="/study/study-guide">
              <ArrowLeft aria-hidden="true" />
              All study guides
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/study/study-guide/create">New guide</Link>
          </Button>
        </div>
        <div>
          <StudyGuideReader
            copied={copied}
            guide={guide}
            onCopy={copyGuide}
            onDelete={deleteGuide}
            onDownload={downloadGuide}
          />
        </div>
      </div>
    </main>
  );
}

function toFileName(title: string) {
  return (
    title
      .toLocaleLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "study-guide"
  );
}
