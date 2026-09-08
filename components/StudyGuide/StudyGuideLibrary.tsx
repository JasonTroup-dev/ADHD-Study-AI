import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  BookOpenText,
  ChevronLeft,
  ChevronRight,
  FileText,
  Plus,
  Search,
} from "lucide-react";
import type { SavedStudyGuide } from "./types";

type StudyGuideLibraryProps = {
  activeGuideId: string;
  guides: SavedStudyGuide[];
  totalCount?: number;
  query: string;
  onCreateGuide: () => void;
  onQueryChange: (value: string) => void;
  onSelectGuide: (guideId: string) => void;
};

export default function StudyGuideLibrary({
  activeGuideId,
  guides,
  totalCount = guides.length,
  query,
  onCreateGuide,
  onQueryChange,
  onSelectGuide,
}: StudyGuideLibraryProps) {
  const activeIndex = guides.findIndex((guide) => guide.id === activeGuideId);
  const windowStart = Math.min(
    Math.max(activeIndex > -1 ? activeIndex - 2 : 0, 0),
    Math.max(guides.length - 5, 0),
  );
  const visibleGuides = guides.slice(windowStart, windowStart + 5);

  function selectPreviousGuide() {
    if (guides.length === 0) return;

    const previousIndex = activeIndex > 0 ? activeIndex - 1 : guides.length - 1;
    onSelectGuide(guides[previousIndex].id);
  }

  function selectNextGuide() {
    if (guides.length === 0) return;

    const nextIndex = activeIndex > -1 && activeIndex < guides.length - 1
      ? activeIndex + 1
      : 0;
    onSelectGuide(guides[nextIndex].id);
  }

  return (
    <aside className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="shrink-0 border-b border-slate-100 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-950">Your guides</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              {totalCount} saved {totalCount === 1 ? "guide" : "guides"}
            </p>
          </div>
          <Button
            type="button"
            size="icon-sm"
            onClick={onCreateGuide}
            aria-label="Create a new study guide"
            className="rounded-lg"
          >
            <Plus aria-hidden="true" />
          </Button>
        </div>

        {totalCount > 4 ? (
          <div className="relative mt-3 hidden lg:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <Input
              type="search"
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="Find a guide"
              aria-label="Find a study guide"
              className="h-9 rounded-xl border-slate-200 bg-slate-50 pl-9 shadow-none"
            />
          </div>
        ) : null}
      </div>

      <nav aria-label="Saved study guides" className="min-h-0 flex-1 space-y-1 overflow-hidden p-2">
        {visibleGuides.length > 0 ? (
          visibleGuides.map((guide, visibleIndex) => {
            const active = guide.id === activeGuideId;

            return (
              <button
                key={guide.id}
                type="button"
                onClick={() => onSelectGuide(guide.id)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1",
                  active || (activeIndex === -1 && visibleIndex === 0)
                    ? "flex"
                    : "hidden lg:flex",
                  active
                    ? "bg-blue-50 text-blue-950"
                    : "text-slate-700 hover:bg-slate-50",
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg",
                    active ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500",
                  )}
                >
                  <FileText className="size-4" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{guide.title}</span>
                  <span className="mt-1 block truncate text-xs text-slate-500">
                    {formatCreatedAt(guide.createdAt)}
                  </span>
                </span>
              </button>
            );
          })
        ) : (
          <div className="px-4 py-10 text-center">
            <BookOpenText className="mx-auto size-6 text-slate-300" aria-hidden="true" />
            <p className="mt-3 text-sm font-medium text-slate-700">No matching guides</p>
            <p className="mt-1 text-xs text-slate-500">Try a different search.</p>
          </div>
        )}
      </nav>

      {guides.length > 1 ? (
        <div className="flex shrink-0 items-center justify-between border-t border-slate-100 px-3 py-2">
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={selectPreviousGuide}
            aria-label="Previous study guide"
          >
            <ChevronLeft aria-hidden="true" />
          </Button>
          <span className="text-xs font-medium text-slate-500">
            {activeIndex > -1 ? activeIndex + 1 : 1} of {guides.length}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={selectNextGuide}
            aria-label="Next study guide"
          >
            <ChevronRight aria-hidden="true" />
          </Button>
        </div>
      ) : null}
    </aside>
  );
}

function formatCreatedAt(createdAt: string) {
  const date = new Date(createdAt);

  if (Number.isNaN(date.getTime())) return "Recently created";

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: date.getFullYear() === new Date().getFullYear() ? undefined : "numeric",
  }).format(date);
}
