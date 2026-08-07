"use client";

import {
  ArrowRight,
  BookOpenCheck,
  Bot,
  Brain,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  Circle,
  Clock3,
  ExternalLink,
  GraduationCap,
  LayoutDashboard,
  LockKeyhole,
  Menu,
  MessageSquareText,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import {
  demoClasses,
  demoHighlights,
  demoTasks,
  demoTutorPrompts,
  type DemoSection,
} from "@/lib/demo/sampleWorkspace";
import { cn } from "@/lib/utils";

const navigation = [
  { id: "today", label: "Today", icon: LayoutDashboard },
  { id: "classes", label: "Classes", icon: GraduationCap },
  { id: "tutor", label: "Sample AI tutor", icon: Bot },
] satisfies ReadonlyArray<{
  id: DemoSection;
  label: string;
  icon: typeof LayoutDashboard;
}>;

const tourSteps = [
  {
    section: "today",
    eyebrow: "1 · See the next move",
    title: "The dashboard turns deadlines into a doable day.",
    detail: "A student lands on one recommended task, not another blank planner.",
  },
  {
    section: "classes",
    eyebrow: "2 · Keep context together",
    title: "Each class has assignments, progress, and materials in one place.",
    detail: "The sample data shows the structure a syllabus upload creates.",
  },
  {
    section: "tutor",
    eyebrow: "3 · Try grounded guidance",
    title: "Use a sample prompt without spending an API token.",
    detail: "Responses are pre-seeded for this public demo; the real app streams from OpenAI.",
  },
] satisfies ReadonlyArray<{
  section: DemoSection;
  eyebrow: string;
  title: string;
  detail: string;
}>;

export function DemoWorkspace() {
  const [activeSection, setActiveSection] = useState<DemoSection>("today");
  const [tourStep, setTourStep] = useState(0);
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false);

  const currentTourStep = tourSteps[tourStep];

  function selectSection(section: DemoSection) {
    setActiveSection(section);
    setMobileNavigationOpen(false);
  }

  function goToTourStep(index: number) {
    const nextStep = tourSteps[index];
    if (!nextStep) return;

    setTourStep(index);
    setActiveSection(nextStep.section);
  }

  return (
    <div className="flex h-svh flex-col overflow-hidden bg-[#f3f5f2] text-slate-950">
      <a
        href="#demo-content"
        className="sr-only z-[100] rounded-lg bg-slate-950 px-4 py-2 text-sm font-medium text-white focus:not-sr-only focus:fixed focus:left-3 focus:top-3"
      >
        Skip to sample workspace
      </a>

      <header className="z-50 shrink-0 border-b border-[#d9dfd8] bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1600px] items-center gap-3 px-4 sm:px-6">
          <button
            type="button"
            aria-label="Open demo navigation"
            onClick={() => setMobileNavigationOpen(true)}
            className="rounded-xl border border-slate-200 p-2 md:hidden"
          >
            <Menu className="size-5" aria-hidden="true" />
          </button>

          <Link
            href="/"
            className="flex min-w-0 items-center gap-2.5 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#19241f] text-white">
              <Brain className="size-5" aria-hidden="true" />
            </span>
            <span className="hidden text-sm font-semibold tracking-[-0.01em] sm:block">
              ADHD Study AI
            </span>
          </Link>

          <div className="ml-1 flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-900 sm:ml-4">
            <LockKeyhole className="size-3.5" aria-hidden="true" />
            Sample workspace · read only
          </div>

          <div className="ml-auto flex items-center gap-2">
            <Link
              href="/"
              className="hidden rounded-full px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:text-slate-950 sm:inline-flex"
            >
              Exit demo
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 rounded-full bg-[#19241f] px-4 py-2 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5"
            >
              Create workspace
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto flex min-h-0 w-full max-w-[1600px] flex-1">
        <aside className="hidden h-full w-64 shrink-0 border-r border-[#d9dfd8] bg-[#edf0eb] p-5 md:flex md:flex-col">
          <WorkspaceNavigation
            activeSection={activeSection}
            onSelect={selectSection}
          />
          <DemoSafetyCard />
        </aside>

        <main
          id="demo-content"
          tabIndex={-1}
          className="flex min-h-0 min-w-0 flex-1 flex-col focus:outline-none"
        >
          <section className="shrink-0 border-b border-[#d9dfd8] bg-[#fffdf8] px-4 py-4 sm:px-6 lg:px-8">
            <div className="mx-auto flex max-w-6xl flex-col gap-4 lg:flex-row lg:items-center">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-800">
                  {currentTourStep.eyebrow}
                </p>
                <h1 className="mt-1 text-xl font-semibold tracking-[-0.025em] text-slate-950 sm:text-2xl">
                  {currentTourStep.title}
                </h1>
                <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
                  {currentTourStep.detail}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                {tourSteps.map((step, index) => (
                  <button
                    key={step.section}
                    type="button"
                    aria-label={`Open walkthrough step ${index + 1}`}
                    aria-current={tourStep === index ? "step" : undefined}
                    onClick={() => goToTourStep(index)}
                    className={cn(
                      "flex size-9 items-center justify-center rounded-full border text-sm font-semibold transition-colors",
                      tourStep === index
                        ? "border-[#19241f] bg-[#19241f] text-white"
                        : "border-slate-300 bg-white text-slate-600 hover:border-slate-500",
                    )}
                  >
                    {index + 1}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => goToTourStep((tourStep + 1) % tourSteps.length)}
                  className="ml-1 inline-flex h-9 items-center gap-1 rounded-full border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 hover:border-slate-500"
                >
                  {tourStep === tourSteps.length - 1 ? "Restart" : "Next"}
                  <ChevronRight className="size-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          </section>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-7 [-ms-overflow-style:none] [scrollbar-width:none] sm:px-6 lg:px-8 lg:py-10 [&::-webkit-scrollbar]:hidden">
            <div className="mx-auto max-w-6xl">
              {activeSection === "today" ? <TodayDemo /> : null}
              {activeSection === "classes" ? <ClassesDemo /> : null}
              {activeSection === "tutor" ? <TutorDemo /> : null}
            </div>
          </div>
        </main>
      </div>

      {mobileNavigationOpen ? (
        <div className="fixed inset-0 z-[60] md:hidden">
          <button
            type="button"
            aria-label="Close demo navigation"
            className="absolute inset-0 bg-slate-950/35"
            onClick={() => setMobileNavigationOpen(false)}
          />
          <aside className="relative flex h-full w-[min(86vw,20rem)] flex-col bg-[#edf0eb] p-5 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <p className="font-semibold">Explore the demo</p>
              <button
                type="button"
                aria-label="Close demo navigation"
                onClick={() => setMobileNavigationOpen(false)}
                className="rounded-lg p-2 hover:bg-slate-200"
              >
                <X className="size-5" aria-hidden="true" />
              </button>
            </div>
            <WorkspaceNavigation
              activeSection={activeSection}
              onSelect={selectSection}
            />
            <DemoSafetyCard />
          </aside>
        </div>
      ) : null}
    </div>
  );
}

function WorkspaceNavigation({
  activeSection,
  onSelect,
}: {
  activeSection: DemoSection;
  onSelect: (section: DemoSection) => void;
}) {
  return (
    <nav aria-label="Sample workspace navigation" className="space-y-2">
      <p className="mb-3 px-3 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
        Sample workspace
      </p>
      {navigation.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          aria-current={activeSection === id ? "page" : undefined}
          onClick={() => onSelect(id)}
          className={cn(
            "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition-colors",
            activeSection === id
              ? "bg-[#19241f] text-white"
              : "text-slate-700 hover:bg-white",
          )}
        >
          <Icon className="size-4.5" aria-hidden="true" />
          {label}
        </button>
      ))}
    </nav>
  );
}

function DemoSafetyCard() {
  return (
    <div className="mt-auto rounded-2xl border border-[#d3dcd3] bg-white p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
        <ShieldCheck className="size-4 text-emerald-700" aria-hidden="true" />
        Safe to explore
      </div>
      <p className="mt-2 text-xs leading-5 text-slate-600">
        Seeded data only. No uploads, database writes, or paid AI requests.
      </p>
    </div>
  );
}

function TodayDemo() {
  const completedTasks = demoTasks.filter((task) => task.completed).length;
  const totalMinutes = demoTasks.reduce((total, task) => total + task.minutes, 0);

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-emerald-800">Tuesday, October 13</p>
          <h2 className="mt-1 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
            Good morning, Jamie.
          </h2>
          <p className="mt-2 text-slate-600">Here is a realistic plan for today.</p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600">
          <Clock3 className="size-4 text-emerald-700" aria-hidden="true" />
          {totalMinutes} focused minutes planned
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(18rem,0.9fr)]">
        <div className="space-y-6">
          <section className="overflow-hidden rounded-3xl bg-[#19241f] p-6 text-white shadow-[0_20px_50px_-30px_rgba(25,36,31,0.8)] sm:p-8">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-200">
                  Recommended now
                </p>
                <h3 className="mt-3 max-w-xl text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">
                  Outline the membrane transport discussion
                </h3>
                <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-slate-300">
                  <span>BIO 210</span>
                  <span aria-hidden="true">·</span>
                  <span>25 minutes</span>
                  <span aria-hidden="true">·</span>
                  <span>Lab report due Friday</span>
                </div>
              </div>
              <span className="inline-flex w-fit rounded-full bg-emerald-300/15 px-3 py-1.5 text-xs font-semibold text-emerald-100">
                High priority
              </span>
            </div>
            <button
              type="button"
              disabled
              title="Actions are disabled in the read-only sample workspace"
              className="mt-7 inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-[#19241f] disabled:cursor-not-allowed disabled:opacity-90"
            >
              <LockKeyhole className="size-4" aria-hidden="true" />
              Start in your own workspace
            </button>
          </section>

          <section className="rounded-3xl border border-[#d9dfd8] bg-white p-5 sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-950">Today&apos;s plan</p>
                <p className="mt-1 text-sm text-slate-500">
                  {completedTasks} of {demoTasks.length} tasks complete
                </p>
              </div>
              <div className="h-2 w-28 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
                <div
                  className="h-full rounded-full bg-emerald-600"
                  style={{ width: `${(completedTasks / demoTasks.length) * 100}%` }}
                />
              </div>
            </div>
            <div className="mt-5 divide-y divide-slate-100">
              {demoTasks.map((task) => (
                <div key={task.id} className="flex items-start gap-3 py-4 first:pt-0 last:pb-0">
                  {task.completed ? (
                    <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" aria-label="Complete" />
                  ) : (
                    <Circle className="mt-0.5 size-5 shrink-0 text-slate-300" aria-label="Not complete" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className={cn("font-medium", task.completed && "text-slate-400 line-through")}>
                      {task.title}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {task.course} · {task.minutes} min · {task.priority}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-3xl border border-[#d9dfd8] bg-[#fffdf8] p-6">
            <div className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
              <Sparkles className="size-4" aria-hidden="true" />
              Why this is first
            </div>
            <p className="mt-3 text-lg font-semibold leading-7">
              It is the highest-impact task with a close deadline, and it fits your available focus block.
            </p>
            <div className="mt-5 space-y-3 border-t border-[#e7e1d6] pt-5">
              {demoHighlights.map((highlight) => (
                <div key={highlight} className="flex gap-2 text-sm leading-6 text-slate-600">
                  <Check className="mt-1 size-4 shrink-0 text-emerald-700" aria-hidden="true" />
                  <span>{highlight}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-[#d9dfd8] bg-white p-6">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Upcoming</h3>
              <CalendarDays className="size-5 text-slate-400" aria-hidden="true" />
            </div>
            <div className="mt-5 space-y-5">
              {demoClasses.slice(0, 2).map((course) => (
                <div key={course.code}>
                  <p className="font-medium text-slate-950">{course.nextAssignment}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {course.code} · {course.dueLabel}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function ClassesDemo() {
  return (
    <div>
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-emerald-800">Fall semester</p>
          <h2 className="mt-1 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
            Class workspaces
          </h2>
          <p className="mt-2 max-w-2xl text-slate-600">
            Seeded from representative syllabi so a recruiter can inspect a complete product state immediately.
          </p>
        </div>
        <span className="hidden rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 sm:inline-flex">
          3 active classes
        </span>
      </div>

      <div className="mt-8 grid gap-5 lg:grid-cols-3">
        {demoClasses.map((course) => (
          <article key={course.code} className="overflow-hidden rounded-3xl border border-[#d9dfd8] bg-white">
            <div className={cn("h-2", course.accent)} />
            <div className="p-6">
              <span className={cn("inline-flex rounded-full px-3 py-1 text-xs font-bold", course.softAccent)}>
                {course.code}
              </span>
              <h3 className="mt-4 text-xl font-semibold tracking-[-0.025em]">{course.name}</h3>
              <p className="mt-1 text-sm text-slate-500">{course.professor}</p>

              <div className="mt-6">
                <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                  <span>Course progress</span>
                  <span>{course.progress}%</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className={cn("h-full rounded-full", course.accent)} style={{ width: `${course.progress}%` }} />
                </div>
              </div>

              <div className="mt-6 rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Next up</p>
                <p className="mt-2 font-medium leading-6">{course.nextAssignment}</p>
                <p className="mt-1 text-sm text-slate-500">{course.dueLabel}</p>
              </div>

              <div className="mt-5 flex items-center justify-between text-sm">
                <span className="inline-flex items-center gap-2 text-slate-500">
                  <BookOpenCheck className="size-4" aria-hidden="true" />
                  Materials connected
                </span>
                <LockKeyhole className="size-4 text-slate-300" aria-label="Read only" />
              </div>
            </div>
          </article>
        ))}
      </div>

      <section className="mt-6 grid gap-5 rounded-3xl border border-[#d9dfd8] bg-[#19241f] p-6 text-white sm:p-8 lg:grid-cols-[1fr_1.2fr]">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-emerald-200">What the importer did</p>
          <h3 className="mt-3 text-2xl font-semibold tracking-[-0.03em]">
            One syllabus became a structured workspace.
          </h3>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {["17 deadlines found", "42 study blocks planned", "8 materials connected"].map((metric) => (
            <div key={metric} className="rounded-2xl bg-white/8 p-4 text-sm font-medium text-slate-100">
              {metric}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function TutorDemo() {
  const [selectedPromptId, setSelectedPromptId] = useState(demoTutorPrompts[0].id);
  const selectedPrompt = demoTutorPrompts.find((prompt) => prompt.id === selectedPromptId) ?? demoTutorPrompts[0];

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-emerald-800">Assignment-aware support</p>
          <h2 className="mt-1 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
            Try the sample AI tutor
          </h2>
          <p className="mt-2 max-w-2xl text-slate-600">
            Pick a prompt to see how the tutor uses assignment context and keeps the next step small.
          </p>
        </div>
        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800">
          <ShieldCheck className="size-4" aria-hidden="true" />
          No API call · $0.00
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(17rem,0.75fr)_minmax(0,1.5fr)]">
        <section className="rounded-3xl border border-[#d9dfd8] bg-[#fffdf8] p-5 sm:p-6">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Grounding context</p>
          <div className="mt-5 space-y-5">
            <div>
              <p className="text-sm text-slate-500">Class</p>
              <p className="mt-1 font-semibold">BIO 210 · Cellular Biology</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Assignment</p>
              <p className="mt-1 font-semibold">Membrane transport lab report</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Connected material</p>
              <p className="mt-1 font-semibold">Lab notes · Results table · Discussion rubric</p>
            </div>
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-emerald-800">
                Evidence loaded
              </p>
              <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-slate-500">0.0 M sucrose</p>
                  <p className="mt-0.5 font-semibold text-emerald-800">+8.4% mass</p>
                </div>
                <div>
                  <p className="text-slate-500">0.6 M sucrose</p>
                  <p className="mt-0.5 font-semibold text-rose-700">-11.2% mass</p>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
            The live tutor is authenticated, quota-protected, and can stream answers from uploaded course files.
          </div>
        </section>

        <section className="overflow-hidden rounded-3xl border border-[#d9dfd8] bg-white shadow-[0_20px_50px_-35px_rgba(15,23,42,0.35)]">
          <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
            <span className="flex size-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800">
              <MessageSquareText className="size-5" aria-hidden="true" />
            </span>
            <div>
              <p className="font-semibold">Guided lab session</p>
              <p className="text-xs text-slate-500">Seeded interaction · nothing is saved</p>
            </div>
          </div>

          <div className="min-h-[22rem] bg-slate-50/70 p-5 sm:p-7">
            <div className="ml-auto flex max-w-[85%] flex-col items-end gap-1.5">
              <span className="pr-1 text-xs font-medium text-slate-500">You</span>
              <div className="rounded-2xl rounded-br-md bg-[#19241f] px-4 py-3 text-right text-sm leading-6 text-white">
                {selectedPrompt.label}
              </div>
            </div>
            <div className="mt-4 flex max-w-[92%] items-start gap-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-800">
                <Bot className="size-4" aria-hidden="true" />
              </span>
              <div className="rounded-2xl rounded-tl-md border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-700 shadow-sm">
                <p>{selectedPrompt.response}</p>
                <div className="mt-4 border-t border-slate-100 pt-3">
                  <p className="text-xs font-semibold text-emerald-800">
                    {selectedPrompt.source}
                  </p>
                  <p className="mt-2 text-sm font-medium text-slate-900">
                    {selectedPrompt.nextStep}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 p-5 sm:p-6">
            <p className="text-xs font-bold uppercase tracking-[0.13em] text-slate-500">Try another sample prompt</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {demoTutorPrompts.map((prompt) => (
                <button
                  key={prompt.id}
                  type="button"
                  aria-pressed={selectedPromptId === prompt.id}
                  onClick={() => setSelectedPromptId(prompt.id)}
                  className={cn(
                    "rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                    selectedPromptId === prompt.id
                      ? "border-[#19241f] bg-[#19241f] text-white"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-400",
                  )}
                >
                  {prompt.label}
                </button>
              ))}
              <button
                type="button"
                aria-label="Reset sample prompt"
                onClick={() => setSelectedPromptId(demoTutorPrompts[0].id)}
                className="flex size-9 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <RotateCcw className="size-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </section>
      </div>

      <div className="mt-6 flex flex-col items-start justify-between gap-4 rounded-3xl bg-[#dce9df] p-6 sm:flex-row sm:items-center">
        <div>
          <p className="font-semibold text-[#19241f]">Want to test uploads and live AI?</p>
          <p className="mt-1 text-sm text-[#526159]">Create a private workspace to use the full authenticated flow.</p>
        </div>
        <Link href="/signup" className="inline-flex items-center gap-2 rounded-full bg-[#19241f] px-5 py-3 text-sm font-semibold text-white">
          Try the full app
          <ExternalLink className="size-4" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
