import AiMarkdown from "@/components/AiMarkdown";
import { Button } from "@/components/ui/button";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Copy,
  Download,
  Expand,
  FileText,
  MoreHorizontal,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import type { SavedStudyGuide } from "./types";

type StudyGuideReaderProps = {
  copied: boolean;
  guide: SavedStudyGuide;
  onCopy: () => void;
  onDelete: () => void;
  onDownload: () => void;
  onFocus: () => void;
  focusMode?: boolean;
};

export default function StudyGuideReader({
  copied,
  guide,
  onCopy,
  onDelete,
  onDownload,
  onFocus,
  focusMode = false,
}: StudyGuideReaderProps) {
  const wordCount = countWords(guide.content);
  const readingMinutes = Math.max(1, Math.ceil(wordCount / 220));
  const pages = useMemo(
    () => paginateMarkdown(removeDuplicateTitle(guide.content, guide.title)),
    [guide.content, guide.title],
  );
  const [pageIndex, setPageIndex] = useState(0);
  const activePageIndex = Math.min(pageIndex, pages.length - 1);

  return (
    <section aria-labelledby="active-guide-title" className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
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
              <span>{wordCount.toLocaleString()} words</span>
              <span className="flex items-center gap-1.5">
                <Clock3 className="size-3.5" aria-hidden="true" />
                About {readingMinutes} min read
              </span>
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
            <Button type="button" variant="outline" size="sm" onClick={onFocus} className="rounded-lg bg-white">
              <Expand aria-hidden="true" />
              {focusMode ? "Exit focus" : "Focus"}
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

      <article className="min-h-0 flex-1 overflow-hidden px-5 py-5 sm:px-8 lg:px-10">
        <AiMarkdown variant="study-guide" className="mx-auto max-w-3xl">
          {pages[activePageIndex]}
        </AiMarkdown>
      </article>

      {pages.length > 1 ? (
        <footer className="flex shrink-0 items-center justify-between border-t border-slate-100 bg-white px-4 py-2.5 sm:px-6">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setPageIndex((current) => Math.max(0, current - 1))}
            disabled={activePageIndex === 0}
            className="rounded-lg"
          >
            <ChevronLeft aria-hidden="true" />
            Previous
          </Button>
          <span className="text-xs font-medium text-slate-500" role="status" aria-live="polite">
            Page {activePageIndex + 1} of {pages.length}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() =>
              setPageIndex((current) => Math.min(pages.length - 1, current + 1))
            }
            disabled={activePageIndex === pages.length - 1}
            className="rounded-lg"
          >
            Next
            <ChevronRight aria-hidden="true" />
          </Button>
        </footer>
      ) : null}
    </section>
  );
}

function countWords(markdown: string) {
  const plainText = markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[#>*_`~\[\]()-]/g, " ")
    .trim();

  return plainText ? plainText.split(/\s+/).length : 0;
}

function removeDuplicateTitle(markdown: string, title: string) {
  const headingMatch = markdown.match(/^#\s+(.+)\r?\n+/);

  if (!headingMatch) return markdown;

  const heading = headingMatch[1].replace(/\s+#+\s*$/, "").trim();

  return heading.toLocaleLowerCase() === title.trim().toLocaleLowerCase()
    ? markdown.slice(headingMatch[0].length)
    : markdown;
}

const MAX_PAGE_CHARACTERS = 800;
const MAX_PAGE_BLOCKS = 5;

function paginateMarkdown(markdown: string) {
  const blocks = markdown
    .split(/\r?\n\s*\r?\n/)
    .map((block) => block.trim())
    .filter(Boolean)
    .flatMap(splitOversizedBlock);
  const pages: string[] = [];
  let currentBlocks: string[] = [];
  let currentLength = 0;

  for (const block of blocks) {
    const exceedsPage =
      currentBlocks.length > 0 &&
      (currentLength + block.length > MAX_PAGE_CHARACTERS ||
        currentBlocks.length >= MAX_PAGE_BLOCKS);

    if (exceedsPage) {
      pages.push(currentBlocks.join("\n\n"));
      currentBlocks = [];
      currentLength = 0;
    }

    currentBlocks.push(block);
    currentLength += block.length;
  }

  if (currentBlocks.length > 0) {
    pages.push(currentBlocks.join("\n\n"));
  }

  return pages.length > 0 ? pages : ["This guide does not have any content yet."];
}

function splitOversizedBlock(block: string) {
  const maxBlockLength = 620;

  if (block.length <= maxBlockLength || /^#{1,3}\s/.test(block)) {
    return [block];
  }

  const units = block.includes("\n")
    ? block.split(/\r?\n/)
    : block.split(/(?<=[.!?])\s+/);
  const chunks: string[] = [];
  let currentChunk = "";

  for (const unit of units) {
    if (currentChunk && currentChunk.length + unit.length + 1 > maxBlockLength) {
      chunks.push(currentChunk);
      currentChunk = unit;
    } else {
      currentChunk = currentChunk ? `${currentChunk}\n${unit}` : unit;
    }
  }

  if (currentChunk) chunks.push(currentChunk);

  return chunks;
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
