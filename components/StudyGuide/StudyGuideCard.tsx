"use client";

import { Button } from "@/components/ui/button";
import { BookOpenText, FileText, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { StudyGuideSummary } from "./types";

export default function StudyGuideCard({ guide }: { guide: StudyGuideSummary }) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const href = `/study/study-guide/${guide.id}`;

  async function deleteGuide() {
    const confirmed = window.confirm(`Delete “${guide.title}”?`);
    if (!confirmed) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/study-guides/${guide.id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Delete failed");
      router.refresh();
    } catch {
      setIsDeleting(false);
      window.alert("Could not delete this study guide.");
    }
  }

  return (
    <article className="relative flex min-h-64 flex-col rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-lg">
      <Link href={href} className="absolute inset-0 rounded-2xl" aria-label={`Open ${guide.title}`} />

      <div className="pointer-events-none relative z-10 flex items-start justify-between gap-4">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white">
          <BookOpenText className="size-6" aria-hidden="true" />
        </span>
        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
          Study guide
        </span>
      </div>

      <div className="pointer-events-none relative z-10 mt-5 flex-1">
        <h3 className="line-clamp-2 text-xl font-semibold leading-tight text-gray-900">
          {guide.title}
        </h3>
        <p className="mt-3 line-clamp-2 text-sm leading-6 text-gray-600">
          {guide.preview}
        </p>
      </div>

      <div className="pointer-events-none relative z-10 mt-5 flex flex-wrap gap-x-4 gap-y-2 text-xs text-gray-500">
        <span className="flex min-w-0 items-center gap-1.5">
          <FileText className="size-3.5 shrink-0" aria-hidden="true" />
          <span className="max-w-44 truncate">{guide.originalFileName}</span>
        </span>
        <span>{formatDate(guide.createdAt)}</span>
      </div>

      <div className="relative z-20 mt-5 flex gap-2">
        <Button asChild variant="outline" size="sm" className="flex-1 bg-white">
          <Link href={href}>Open guide</Link>
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          onClick={deleteGuide}
          disabled={isDeleting}
          aria-label={`Delete ${guide.title}`}
          className="bg-white text-red-600 hover:bg-red-50 hover:text-red-700"
        >
          <Trash2 aria-hidden="true" />
        </Button>
      </div>
    </article>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Created recently";

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: date.getFullYear() === new Date().getFullYear() ? undefined : "numeric",
  }).format(date);
}
