"use client";

import StudyMaterialUploadModal, {
  type GeneratedStudyGuide,
} from "@/components/StudyGuide/StudyMaterialUploadModal";
import { Button } from "@/components/ui/button";
import {
  BookOpenText,
  CircleAlert,
  FileText,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import ReactMarkdown from "react-markdown";

export default function StudyGuidePage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [generatedStudyGuide, setGeneratedStudyGuide] =
    useState<GeneratedStudyGuide | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openUploadModal() {
    setError(null);
    setIsModalOpen(true);
  }

  function handleCreateStudyGuide(newStudyGuide: GeneratedStudyGuide) {
    setGeneratedStudyGuide(newStudyGuide);
    setError(null);
  }

  return (
    <main className="min-h-full w-full bg-slate-100 text-slate-950">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-8 lg:px-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-4xl font-semibold">
              Study Guides
            </h1>
            <p className="mt-2 max-w-xl text-xl leading-6 text-gray-600">
              Generate summaries, key concepts, practice questions, and a simple study plan from any document.
            </p>
          </div>

          <Button
            type="button"
            onClick={openUploadModal}
            disabled={isLoading}
            className="sm:self-end"
          >
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            {generatedStudyGuide
              ? "Generate another guide"
              : "Generate study guide"}
          </Button>
        </header>

        {error && !isModalOpen ? (
          <div
            className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
            role="alert"
          >
            <CircleAlert
              className="mt-0.5 h-4 w-4 shrink-0"
              aria-hidden="true"
            />
            <span>{error}</span>
          </div>
        ) : null}

        {generatedStudyGuide ? (
          <section
            aria-label={generatedStudyGuide.title}
            className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
          >
            <div className="flex flex-col gap-2 border-b border-slate-200 bg-slate-50 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-2 text-sm text-slate-600">
                <FileText className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="truncate">
                  Generated from {generatedStudyGuide.originalFileName}
                </span>
              </div>
              <span className="text-xs font-medium text-slate-500">
                Generated guide
              </span>
            </div>

            <article className="px-6 py-7 sm:px-9 sm:py-9">
              <ReactMarkdown
                components={{
                  h1: ({ children }) => (
                    <h1 className="mb-6 text-3xl font-semibold tracking-tight text-slate-950">
                      {children}
                    </h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className="mb-3 mt-8 border-b border-slate-200 pb-2 text-xl font-semibold text-slate-950 first:mt-0">
                      {children}
                    </h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="mb-2 mt-5 text-base font-semibold text-slate-900">
                      {children}
                    </h3>
                  ),
                  p: ({ children }) => (
                    <p className="mb-4 max-w-3xl leading-7 text-slate-700">
                      {children}
                    </p>
                  ),
                  ul: ({ children }) => (
                    <ul className="mb-5 max-w-3xl list-disc space-y-2 pl-6 text-slate-700">
                      {children}
                    </ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="mb-5 max-w-3xl list-decimal space-y-2 pl-6 text-slate-700">
                      {children}
                    </ol>
                  ),
                  li: ({ children }) => (
                    <li className="leading-7">{children}</li>
                  ),
                  strong: ({ children }) => (
                    <strong className="font-semibold text-slate-950">
                      {children}
                    </strong>
                  ),
                  blockquote: ({ children }) => (
                    <blockquote className="mb-5 border-l-4 border-blue-200 bg-blue-50 px-4 py-3 text-slate-700">
                      {children}
                    </blockquote>
                  ),
                }}
              >
                {generatedStudyGuide.content}
              </ReactMarkdown>
            </article>
          </section>
        ) : (
          <section className="flex min-h-96 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
              <BookOpenText className="h-7 w-7" aria-hidden="true" />
            </div>
            <h2 className="mt-5 text-xl font-semibold">
              Your next study guide starts here
            </h2>
            <p className="mt-2 max-w-md text-sm leading-6 text-slate-600">
              Upload a supported study file and get a focused guide you can
              work through one section at a time.
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={openUploadModal}
              className="mt-6"
            >
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              Choose a study file
            </Button>
          </section>
        )}
      </div>

      <StudyMaterialUploadModal
        isOpen={isModalOpen}
        isLoading={isLoading}
        error={error}
        onClose={() => setIsModalOpen(false)}
        onCreateStudyGuide={handleCreateStudyGuide}
        onLoadingChange={setIsLoading}
        onError={setError}
      />
    </main>
  );
}
