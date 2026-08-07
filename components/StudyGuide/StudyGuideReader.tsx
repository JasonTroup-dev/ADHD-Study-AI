import AiMarkdown from "@/components/AiMarkdown";
import { Button } from "@/components/ui/button";
import {
  Check,
  Copy,
  Download,
  FileText,
  MoreHorizontal,
  Trash2,
} from "lucide-react";
import type { SavedStudyGuide } from "./types";

type StudyGuideReaderProps = {
  copied: boolean;
  guide: SavedStudyGuide;
  onCopy: () => void;
  onDelete: () => void;
  onDownload: () => void;
};

export default function StudyGuideReader({
  copied,
  guide,
  onCopy,
  onDelete,
  onDownload,
}: StudyGuideReaderProps) {
  const content = removeDuplicateTitle(guide.content, guide.title);

  return (
    <section aria-labelledby="active-guide-title" className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <header className="shrink-0 border-b border-slate-200 bg-slate-50/70 px-4 py-3 sm:px-6">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500">
              <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-blue-700">
                AI study guide
              </span>
              <span className="flex min-w-0 items-center gap-1.5">
                <FileText className="size-3.5 shrink-0" aria-hidden="true" />
                <span className="max-w-64 truncate">{guide.originalFileName}</span>
              </span>
            </div>
            <h2 id="active-guide-title" className="mt-2 text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">
              {guide.title}
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
              <span>{formatDate(guide.createdAt)}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onCopy} className="rounded-lg bg-white">
              {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
              {copied ? "Copied" : "Copy"}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={onDownload} className="rounded-lg bg-white">
              <Download aria-hidden="true" />
              Download
            </Button>
            <details className="relative">
              <summary className="flex size-8 cursor-pointer list-none items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 [&::-webkit-details-marker]:hidden">
                <MoreHorizontal className="size-4" aria-hidden="true" />
                <span className="sr-only">More guide actions</span>
              </summary>
              <div className="absolute right-0 z-10 mt-2 w-40 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
                <button
                  type="button"
                  onClick={onDelete}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-red-700 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                  Delete guide
                </button>
              </div>
            </details>
          </div>
        </div>
      </header>

      <article className="px-5 py-6 sm:px-8 sm:py-8 lg:px-10 lg:py-10">
        <AiMarkdown variant="study-guide" className="mx-auto max-w-3xl">
          {content || "This guide does not have any content yet."}
        </AiMarkdown>
      </article>
    </section>
  );
}

function removeDuplicateTitle(markdown: string, title: string) {
  const headingMatch = markdown.match(/^#\s+(.+)\r?\n+/);

  if (!headingMatch) return markdown;

  const heading = headingMatch[1].replace(/\s+#+\s*$/, "").trim();

  return heading.toLocaleLowerCase() === title.trim().toLocaleLowerCase()
    ? markdown.slice(headingMatch[0].length)
    : markdown;
}


function formatDate(createdAt: string) {
  const date = new Date(createdAt);

  if (Number.isNaN(date.getTime())) return "Created recently";

  return `Created ${new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date)}`;
}
