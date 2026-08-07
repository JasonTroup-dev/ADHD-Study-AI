import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Brain, Database, ShieldCheck, Trash2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy & Data | ADHD Study AI",
  description:
    "How ADHD Study AI collects, uses, retains, shares, and deletes student data.",
  alternates: { canonical: "/privacy" },
  openGraph: {
    title: "Privacy & Data | ADHD Study AI",
    description:
      "A plain-language explanation of data handling, AI processing, retention, and deletion.",
    url: "/privacy",
  },
};

const sectionClass =
  "rounded-2xl border border-[#dfe5df] bg-white p-6 shadow-[0_14px_40px_-34px_rgba(25,36,31,0.45)] sm:p-8";

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#f7f5ee] px-5 py-8 text-[#19241f] sm:px-8 sm:py-12">
      <div className="mx-auto max-w-4xl">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#3d5e4c] hover:text-[#19241f]"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to ADHD Study AI
        </Link>

        <header className="py-12 sm:py-16">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#4d765f]">
            Privacy & data retention
          </p>
          <h1 className="mt-4 text-balance text-4xl font-semibold tracking-[-0.04em] sm:text-6xl">
            Your coursework is yours.
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-[#536159]">
            This page explains what ADHD Study AI stores, what is sent to the AI
            provider, how long data is kept, and how to permanently delete it.
          </p>
          <p className="mt-4 text-sm text-[#748078]">Effective August 7, 2026</p>
        </header>

        <div className="grid gap-6">
          <section className={sectionClass} aria-labelledby="collect-heading">
            <div className="flex items-start gap-4">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#e9f1ec] text-[#315640]">
                <Database className="size-5" aria-hidden="true" />
              </span>
              <div>
                <h2 id="collect-heading" className="text-2xl font-semibold">
                  What the app stores
                </h2>
                <ul className="mt-4 list-disc space-y-3 pl-5 leading-7 text-[#536159]">
                  <li>
                    Account information: email address, display name, sign-in
                    records, and study preferences.
                  </li>
                  <li>
                    Study information: classes, assignments, plans, notes,
                    flashcards, guided-session messages, and generated content.
                  </li>
                  <li>
                    Files: private assignment files and study materials, plus
                    text extracted from them so the app can provide grounded
                    study help.
                  </li>
                  <li>
                    Operational information: AI quota counters and content-free
                    request metrics such as workflow, model, latency, token
                    counts, response ID, and estimated cost.
                  </li>
                  <li>
                    Reliability and usage information: page-view analytics and
                    redacted error events. Error monitoring intentionally omits
                    prompts, file contents, email addresses, user IDs, request
                    bodies, error messages, and stack traces.
                  </li>
                </ul>
              </div>
            </div>
          </section>

          <section className={sectionClass} aria-labelledby="ai-heading">
            <div className="flex items-start gap-4">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#eee9f8] text-[#5c4385]">
                <Brain className="size-5" aria-hidden="true" />
              </span>
              <div>
                <h2 id="ai-heading" className="text-2xl font-semibold">
                  What is sent to OpenAI
                </h2>
                <p className="mt-4 leading-7 text-[#536159]">
                  AI features send only the context needed for the feature you
                  choose. Depending on the tool, that can include your prompt,
                  recent tutor messages, file names, extracted text from selected
                  files, and relevant class or assignment details such as a title,
                  description, due date, and study-session goal. Some requests
                  also include a one-way hash of your account ID as a safety
                  identifier. Your password, Supabase credentials, OpenAI API
                  key, and email address are not placed in AI prompts.
                </p>
                <p className="mt-4 leading-7 text-[#536159]">
                  Files are converted to text by the app; the original binary file
                  is not uploaded to OpenAI. All Responses API requests explicitly
                  set <code className="rounded bg-[#f1f3ef] px-1.5 py-0.5">store: false</code>.
                  OpenAI states that API inputs and outputs are not used to train
                  its models by default, but abuse-monitoring logs may retain
                  customer content for up to 30 days unless a shorter approved
                  data-control setting applies. Do not upload information you do
                  not have permission to process.
                </p>
                <p className="mt-4 text-sm text-[#657169]">
                  Learn more in OpenAI&apos;s{" "}
                  <a
                    href="https://platform.openai.com/docs/models/default-usage-policies-by-endpoint"
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold underline underline-offset-4"
                  >
                    API data-controls documentation
                  </a>
                  .
                </p>
              </div>
            </div>
          </section>

          <section className={sectionClass} aria-labelledby="retention-heading">
            <h2 id="retention-heading" className="text-2xl font-semibold">
              Retention and deletion
            </h2>
            <div className="mt-4 space-y-4 leading-7 text-[#536159]">
              <p>
                Account and study data is kept while your account is active so
                your workspace remains available. Stored assignment files and
                study materials remain until you delete the related assignment
                or your account. Temporary AI Tutor attachments are extracted for
                the active browser conversation and are not added to permanent
                file storage unless you explicitly save them through an assignment
                workflow.
              </p>
              <p>
                You can permanently delete your account from Settings. The app
                first removes every object in your private Storage folder, then
                deletes your authentication account; database records connected
                to that account are removed by cascading deletion. This cannot be
                undone. Provider backups, security logs, and records required by
                law may remain for their limited retention periods before being
                overwritten or deleted.
              </p>
            </div>
          </section>

          <section className={sectionClass} aria-labelledby="sharing-heading">
            <h2 id="sharing-heading" className="text-2xl font-semibold">
              Service providers and security
            </h2>
            <p className="mt-4 leading-7 text-[#536159]">
              Supabase provides authentication, database, and private file
              storage. OpenAI processes requested AI features. Vercel hosts the
              application, aggregates redacted runtime errors, and provides
              privacy-focused web analytics. Data is shared with these providers
              only to operate the app. Files are kept in a private bucket with
              account-scoped access policies; browser traffic is protected with
              HTTPS and restrictive security headers.
            </p>
          </section>

          <section
            className="rounded-2xl bg-[#19241f] p-6 text-[#eef3ef] sm:p-8"
            aria-labelledby="control-heading"
          >
            <div className="flex items-start gap-4">
              <ShieldCheck className="mt-1 size-6 shrink-0" aria-hidden="true" />
              <div>
                <h2 id="control-heading" className="text-2xl font-semibold text-white">
                  Your controls
                </h2>
                <p className="mt-3 leading-7 text-[#c8d2cc]">
                  Delete individual assignments to remove their files, or use the
                  permanent account deletion control in Settings to remove the
                  whole account. For a privacy question or a deletion problem,
                  use the in-app Report a problem page and avoid including
                  sensitive coursework in the report.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    href="/settings"
                    className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-[#19241f]"
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                    Account settings
                  </Link>
                  <Link
                    href="/report-bug"
                    className="inline-flex items-center rounded-full border border-[#5b6c62] px-5 py-2.5 text-sm font-semibold text-white"
                  >
                    Report a problem
                  </Link>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
