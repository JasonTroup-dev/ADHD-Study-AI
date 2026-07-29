"use client";

import { Button } from "@/components/ui/button";
import StudyGuideEmptyState from "./StudyGuideEmptyState";
import StudyGuideLibrary from "./StudyGuideLibrary";
import StudyGuideReader from "./StudyGuideReader";
import StudyMaterialUploadModal from "./StudyMaterialUploadModal";
import {
  createSavedStudyGuide,
  getServerStudyGuidesSnapshot,
  getStudyGuidesSnapshot,
  parseStudyGuides,
  saveStudyGuides,
  subscribeToStudyGuides,
} from "./studyGuideStorage";
import type { GeneratedStudyGuide, SavedStudyGuide } from "./types";
import { BookOpenText, CircleAlert, Plus } from "lucide-react";
import { useCallback, useMemo, useState, useSyncExternalStore } from "react";

export default function StudyGuideWorkspace() {
  const snapshot = useSyncExternalStore(
    subscribeToStudyGuides,
    getStudyGuidesSnapshot,
    getServerStudyGuidesSnapshot,
  );
  const storedGuides = useMemo(() => parseStudyGuides(snapshot), [snapshot]);
  const [unsavedGuide, setUnsavedGuide] = useState<SavedStudyGuide | null>(null);
  const [activeGuideId, setActiveGuideId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [copiedGuideId, setCopiedGuideId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const guides = useMemo(
    () => (unsavedGuide ? [unsavedGuide, ...storedGuides] : storedGuides),
    [storedGuides, unsavedGuide],
  );
  const activeGuide =
    guides.find((guide) => guide.id === activeGuideId) ?? guides[0] ?? null;
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const filteredGuides = normalizedQuery
    ? guides.filter((guide) =>
        `${guide.title} ${guide.originalFileName}`
          .toLocaleLowerCase()
          .includes(normalizedQuery),
      )
    : guides;

  const openUploadModal = useCallback(() => {
    setError(null);
    setIsModalOpen(true);
  }, []);

  const closeUploadModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  const handleCreateStudyGuide = useCallback(
    (generatedGuide: GeneratedStudyGuide) => {
      const savedGuide = createSavedStudyGuide(generatedGuide);
      const didSave = saveStudyGuides([savedGuide, ...storedGuides]);

      if (didSave) {
        setUnsavedGuide(null);
      } else {
        setUnsavedGuide(savedGuide);
        setError(
          "Your guide is ready, but this browser could not save it for later. Download a copy before leaving this page.",
        );
      }

      setActiveGuideId(savedGuide.id);
      setQuery("");
    },
    [storedGuides],
  );

  const handleDeleteGuide = useCallback(() => {
    if (!activeGuide) return;

    const confirmed = window.confirm(`Delete “${activeGuide.title}”?`);
    if (!confirmed) return;

    if (unsavedGuide?.id === activeGuide.id) {
      setUnsavedGuide(null);
    } else {
      saveStudyGuides(storedGuides.filter((guide) => guide.id !== activeGuide.id));
    }

    setActiveGuideId(null);
    setIsFocusMode(false);
  }, [activeGuide, storedGuides, unsavedGuide]);

  const handleCopyGuide = useCallback(async () => {
    if (!activeGuide) return;

    try {
      await window.navigator.clipboard.writeText(activeGuide.content);
      setCopiedGuideId(activeGuide.id);
      window.setTimeout(() => setCopiedGuideId(null), 1800);
    } catch {
      setError("Could not copy this guide. Try downloading it instead.");
    }
  }, [activeGuide]);

  const handleDownloadGuide = useCallback(() => {
    if (!activeGuide) return;

    const blob = new Blob([activeGuide.content], {
      type: "text/markdown;charset=utf-8",
    });
    const objectUrl = URL.createObjectURL(blob);
    const downloadLink = document.createElement("a");

    downloadLink.href = objectUrl;
    downloadLink.download = `${toFileName(activeGuide.title)}.md`;
    downloadLink.click();
    URL.revokeObjectURL(objectUrl);
  }, [activeGuide]);

  if (isFocusMode && activeGuide) {
    return (
      <main className="h-[calc(100svh-4rem)] overflow-hidden bg-slate-100 px-4 py-5 text-slate-950 sm:px-6 md:h-svh lg:px-8">
        <div className="mx-auto flex h-full min-h-0 max-w-5xl flex-col">
          <div className="mb-4 flex shrink-0 items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-2 text-sm font-semibold text-slate-700">
              <BookOpenText className="size-4 text-blue-700" aria-hidden="true" />
              <span className="truncate">Focus reading</span>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => setIsFocusMode(false)} className="rounded-lg bg-white">
              Exit focus
            </Button>
          </div>
          <div className="min-h-0 flex-1">
          <StudyGuideReader
            key={activeGuide.id}
              copied={copiedGuideId === activeGuide.id}
              guide={activeGuide}
              onCopy={handleCopyGuide}
              onDelete={handleDeleteGuide}
              onDownload={handleDownloadGuide}
              onFocus={() => setIsFocusMode(false)}
              focusMode
            />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="h-[calc(100svh-4rem)] overflow-hidden bg-slate-100 text-slate-950 md:h-svh">
      <div className="mx-auto flex h-full min-h-0 w-full max-w-7xl flex-col px-4 py-4 sm:px-6 sm:py-5 lg:px-8">
        <header className="mb-4 flex shrink-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
              Study guides
            </h1>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
              Turn class material into focused, easy-to-follow guides—and keep
              everything together for your next study session.
            </p>
          </div>
          <Button
            type="button"
            size="default"
            onClick={openUploadModal}
            disabled={isLoading}
            className="self-start rounded-xl px-4 sm:self-auto"
          >
            <Plus aria-hidden="true" />
            New guide
          </Button>
        </header>

        {error && !isModalOpen ? (
          <div className="mb-4 flex shrink-0 items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-900" role="alert">
            <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
        ) : null}

        {activeGuide ? (
          <div className="grid min-h-0 flex-1 grid-rows-[10.5rem_minmax(0,1fr)] gap-4 lg:grid-cols-[16rem_minmax(0,1fr)] lg:grid-rows-1">
            <StudyGuideLibrary
              activeGuideId={activeGuide.id}
              guides={filteredGuides}
              totalCount={guides.length}
              query={query}
              onCreateGuide={openUploadModal}
              onQueryChange={setQuery}
              onSelectGuide={setActiveGuideId}
            />
            <StudyGuideReader
              key={activeGuide.id}
              copied={copiedGuideId === activeGuide.id}
              guide={activeGuide}
              onCopy={handleCopyGuide}
              onDelete={handleDeleteGuide}
              onDownload={handleDownloadGuide}
              onFocus={() => setIsFocusMode(true)}
            />
          </div>
        ) : (
          <StudyGuideEmptyState onCreateGuide={openUploadModal} />
        )}
      </div>

      <StudyMaterialUploadModal
        isOpen={isModalOpen}
        isLoading={isLoading}
        error={error}
        onClose={closeUploadModal}
        onCreateStudyGuide={handleCreateStudyGuide}
        onLoadingChange={setIsLoading}
        onError={setError}
      />
    </main>
  );
}

function toFileName(title: string) {
  const normalizedTitle = title
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalizedTitle || "study-guide";
}
