"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Clipboard,
  ExternalLink,
  Lightbulb,
  ShieldCheck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const DRAFT_KEY = "adhd-study-ai-bug-report-draft";
const ISSUE_URL = "https://github.com/JasonTroup-dev/ADHD-Study-AI/issues/new";

type BugDraft = {
  area: string;
  description: string;
  includeTechnicalDetails: boolean;
  route: string;
  steps: string;
  title: string;
};

const EMPTY_DRAFT: BugDraft = {
  area: "Dashboard",
  description: "",
  includeTechnicalDetails: true,
  route: "",
  steps: "",
  title: "",
};

export default function ReportBugPage() {
  const [draft, setDraft] = useState<BugDraft>(getInitialDraft);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  }, [draft]);

  const reportBody = buildReportBody(draft);
  const canSubmit = draft.title.trim().length >= 4 && draft.description.trim().length >= 10;

  function updateDraft<Key extends keyof BugDraft>(key: Key, value: BugDraft[Key]) {
    setDraft((current) => ({ ...current, [key]: value }));
    setCopied(false);
  }

  async function copyReport() {
    await navigator.clipboard.writeText(`# ${draft.title.trim()}\n\n${reportBody}`);
    setCopied(true);
  }

  function openGitHubIssue(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;

    const parameters = new URLSearchParams({
      title: `[Bug] ${draft.title.trim()}`,
      body: reportBody,
      labels: "bug",
    });

    window.open(`${ISSUE_URL}?${parameters.toString()}`, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="page-shell">
      <div className="page-container max-w-5xl">
        <header className="max-w-2xl">
          <h1 className="text-4xl font-semibold text-gray-950">Report a problem</h1>
          <p className="py-2 text-xl text-gray-600">
            Tell us what happened and this form will prepare a complete GitHub issue. Your draft stays in this browser tab until you send it.
          </p>
        </header>

        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start">
          <form
            onSubmit={openGitHubIssue}
            className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="bug-area">Area of the app</Label>
                <select
                  id="bug-area"
                  value={draft.area}
                  onChange={(event) => updateDraft("area", event.target.value)}
                  className="h-10 w-full rounded-lg border border-input bg-white px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <option>Dashboard</option>
                  <option>Classes</option>
                  <option>Study tools</option>
                  <option>Planner</option>
                  <option>Calendar</option>
                  <option>Settings</option>
                  <option>Other</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bug-route">Page or route</Label>
                <Input
                  id="bug-route"
                  value={draft.route}
                  onChange={(event) => updateDraft("route", event.target.value)}
                  placeholder="/dashboard"
                  className="h-10 rounded-lg"
                />
              </div>
            </div>

            <div className="mt-5 space-y-2">
              <Label htmlFor="bug-title">Short summary</Label>
              <Input
                id="bug-title"
                value={draft.title}
                onChange={(event) => updateDraft("title", event.target.value)}
                placeholder="Example: Calendar jumps back one month"
                minLength={4}
                maxLength={100}
                required
                className="h-11 rounded-lg"
              />
              <p className="text-xs text-gray-500">Use a sentence someone can understand at a glance.</p>
            </div>

            <div className="mt-5 space-y-2">
              <Label htmlFor="bug-description">What happened?</Label>
              <Textarea
                id="bug-description"
                value={draft.description}
                onChange={(event) => updateDraft("description", event.target.value)}
                placeholder="What did you expect, and what happened instead?"
                minLength={10}
                required
                className="min-h-32 resize-y rounded-lg"
              />
            </div>

            <div className="mt-5 space-y-2">
              <Label htmlFor="bug-steps">Steps to reproduce (optional)</Label>
              <Textarea
                id="bug-steps"
                value={draft.steps}
                onChange={(event) => updateDraft("steps", event.target.value)}
                placeholder={"1. Open...\n2. Choose...\n3. See..."}
                className="min-h-28 resize-y rounded-lg"
              />
            </div>

            <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
              <input
                type="checkbox"
                checked={draft.includeTechnicalDetails}
                onChange={(event) => updateDraft("includeTechnicalDetails", event.target.checked)}
                className="mt-0.5 size-4 rounded border-gray-300 accent-gray-950"
              />
              <span>
                <span className="block text-sm font-medium text-gray-900">Include browser details</span>
                <span className="mt-0.5 block text-xs leading-5 text-gray-500">
                  Adds browser and screen-size information. No account or study data is included.
                </span>
              </span>
            </label>

            <div className="mt-6 flex flex-col-reverse gap-3 border-t border-gray-100 pt-6 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={() => void copyReport()} disabled={!canSubmit}>
                {copied ? <CheckCircle2 aria-hidden="true" /> : <Clipboard aria-hidden="true" />}
                {copied ? "Copied" : "Copy report"}
              </Button>
              <Button type="submit" disabled={!canSubmit}>
                Open GitHub issue
                <ExternalLink aria-hidden="true" />
              </Button>
            </div>
          </form>

          <aside className="space-y-4 lg:sticky lg:top-6">
            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-6 text-blue-950 shadow-sm">
              <Lightbulb className="size-5 text-blue-700" aria-hidden="true" />
              <h2 className="mt-3 font-semibold">A useful report includes</h2>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-blue-900/75">
                <li>What you were trying to do</li>
                <li>What you expected to see</li>
                <li>What appeared instead</li>
              </ul>
            </div>
            <div className="flex items-start gap-3 rounded-2xl border border-gray-200 bg-white p-6 text-sm leading-6 text-gray-600 shadow-sm">
              <ShieldCheck className="mt-0.5 size-5 shrink-0 text-emerald-700" aria-hidden="true" />
              <p>Avoid including passwords, private notes, or personal school information in a public issue.</p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function buildReportBody(draft: BugDraft) {
  const sections = [
    `## Area\n${draft.area}`,
    `## Page\n${draft.route.trim() || "Not provided"}`,
    `## What happened\n${draft.description.trim() || "Not provided"}`,
    `## Steps to reproduce\n${draft.steps.trim() || "Not provided"}`,
  ];

  if (draft.includeTechnicalDetails && typeof window !== "undefined") {
    sections.push(
      `## Technical details\n- Viewport: ${window.innerWidth} × ${window.innerHeight}\n- Browser: ${navigator.userAgent}`,
    );
  }

  return sections.join("\n\n");
}

function getInitialDraft(): BugDraft {
  if (typeof window === "undefined") return EMPTY_DRAFT;

  try {
    const savedDraft = sessionStorage.getItem(DRAFT_KEY);
    if (savedDraft) {
      const parsed = JSON.parse(savedDraft) as Partial<BugDraft>;
      return {
        ...EMPTY_DRAFT,
        ...parsed,
        route: parsed.route || window.location.pathname,
      };
    }
  } catch {
    // Ignore malformed or unavailable session storage and start fresh.
  }

  return { ...EMPTY_DRAFT, route: window.location.pathname };
}
