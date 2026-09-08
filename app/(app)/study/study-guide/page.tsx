import StudyGuideCard from "@/components/StudyGuide/StudyGuideCard";
import StudyGuideLegacyImporter from "@/components/StudyGuide/StudyGuideLegacyImporter";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { BookOpenText, Plus, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Study Guides | ADHD Study AI",
  description: "Create and revisit focused study guides from your class material.",
};

export default async function StudyGuidePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: rows, error } = user
    ? await supabase
        .from("study_guides")
        .select("id, title, content, original_file_name, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
    : { data: [], error: null };

  const guides = (rows ?? []).map((guide) => ({
    id: guide.id,
    title: guide.title,
    originalFileName: guide.original_file_name,
    createdAt: guide.created_at,
    preview: getPreview(guide.content),
  }));

  return (
    <main className="min-h-[calc(100svh-4rem)] w-full bg-gray-100 text-slate-950">
      <StudyGuideLegacyImporter />
      <div className="mx-auto w-full max-w-screen-2xl px-6 py-8 lg:px-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight">Study guides</h1>
            <p className="py-2 text-lg text-gray-600">
              Revisit your saved guides or create one from new material.
            </p>
          </div>
          <Button asChild size="lg" className="self-start px-5 sm:self-auto">
            <Link href="/study/study-guide/create">
              <Plus aria-hidden="true" />
              New guide
            </Link>
          </Button>
        </header>

        <section className="relative mt-6 overflow-hidden rounded-2xl bg-slate-950 px-6 py-6 text-white shadow-sm sm:px-8">
          <div className="pointer-events-none absolute -right-16 -top-24 size-72 rounded-full bg-blue-500/20 blur-3xl" />
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-white/10 text-blue-200">
                <Sparkles className="size-6" aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-xl font-semibold">Turn notes into a clear study path</h2>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-300">
                  Upload class material and get summaries, core concepts, knowledge checks, and next steps.
                </p>
              </div>
            </div>
            <Button asChild variant="secondary" className="shrink-0 self-start sm:self-auto">
              <Link href="/study/study-guide/create">Generate with AI</Link>
            </Button>
          </div>
        </section>

        {error ? (
          <p className="mt-8 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            Could not load your study guides. Please refresh and try again.
          </p>
        ) : guides.length > 0 ? (
          <section aria-labelledby="saved-guides-title" className="mt-8">
            <div className="mb-4 flex items-center justify-between">
              <h2 id="saved-guides-title" className="text-xl font-semibold">
                Your guides
              </h2>
              <span className="text-sm text-slate-500">
                {guides.length} {guides.length === 1 ? "guide" : "guides"}
              </span>
            </div>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              {guides.map((guide) => (
                <StudyGuideCard key={guide.id} guide={guide} />
              ))}
            </div>
          </section>
        ) : (
          <section className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
            <BookOpenText className="mx-auto size-10 text-slate-300" aria-hidden="true" />
            <h2 className="mt-4 text-xl font-semibold">No study guides yet</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
              Create your first guide from notes, a chapter, or a class handout. It will stay here for next time.
            </p>
            <Button asChild className="mt-5">
              <Link href="/study/study-guide/create">Create your first guide</Link>
            </Button>
          </section>
        )}
      </div>
    </main>
  );
}

function getPreview(markdown: string) {
  return (
    markdown
      .replace(/^#\s+.+$/m, "")
      .replace(/[#>*_`~\[\]]/g, "")
      .replace(/\s+/g, " ")
      .trim() || "Open this guide to start reviewing."
  );
}
