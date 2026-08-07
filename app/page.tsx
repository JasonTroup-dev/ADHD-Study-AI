import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpenText,
  Brain,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Focus,
  Layers3,
  ListTodo,
  Play,
  Quote,
  Sparkles,
  Upload,
  WandSparkles,
  X,
} from "lucide-react";

import { AuthAwareLink } from "@/components/AuthAwareLink";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

const studyTools = [
  { label: "Study guide", icon: BookOpenText },
  { label: "Flashcards", icon: Layers3 },
  { label: "Practice quiz", icon: ClipboardCheck },
  { label: "Study plan", icon: ListTodo },
];

const steps = [
  {
    number: "01",
    title: "Bring what you already have",
    description:
      "Upload your notes, readings, slides, or assignment instructions. Messy is completely fine.",
    icon: Upload,
  },
  {
    number: "02",
    title: "Let the setup happen for you",
    description:
      "Get a focused plan plus study guides, flashcards, and practice questions built from your material.",
    icon: WandSparkles,
  },
  {
    number: "03",
    title: "Follow one doable next step",
    description:
      "Open your plan and begin with the task in front of you. No blank page and no giant checklist.",
    icon: Play,
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#f7f3ea] text-[#19241f]">
      <a
        href="#main-content"
        className="sr-only z-50 rounded-full bg-[#19241f] px-5 py-3 text-sm font-semibold text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to content
      </a>

      <header className="relative z-20 border-b border-[#19241f]/10 bg-[#f7f3ea]/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8 lg:px-10">
          <Link
            href="/"
            className="flex shrink-0 items-center gap-2.5 font-semibold tracking-[-0.02em] text-[#19241f]"
          >
            <span className="flex size-9 items-center justify-center rounded-full bg-[#19241f] text-[#fffaf0]">
              <Brain className="size-[18px]" strokeWidth={1.8} />
            </span>
            <span className="whitespace-nowrap text-[15px] sm:text-base">
              ADHD Study AI
            </span>
          </Link>

          <nav className="hidden items-center gap-8 md:flex" aria-label="Main navigation">
            <a
              href="#how-it-works"
              className="text-sm font-medium text-[#526159] transition-colors hover:text-[#19241f]"
            >
              How it works
            </a>
            <a
              href="#why"
              className="text-sm font-medium text-[#526159] transition-colors hover:text-[#19241f]"
            >
              Why it works
            </a>
          </nav>

          <nav className="flex shrink-0 items-center gap-1 sm:gap-3" aria-label="Account">
            <Link
              href="/login"
              className="hidden whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium text-[#526159] transition-colors hover:text-[#19241f] sm:inline-flex"
            >
              Sign in
            </Link>
            <AuthAwareLink
              authenticatedLabel="Dashboard"
              unauthenticatedLabel="Get started"
              className="inline-flex items-center gap-2 whitespace-nowrap rounded-full bg-[#19241f] px-4 py-2.5 text-sm font-semibold text-white transition-[background-color,transform] hover:-translate-y-0.5 hover:bg-[#2d4037] [&>svg]:hidden sm:px-5 sm:[&>svg]:block"
            />
          </nav>
        </div>
      </header>

      <section
        id="main-content"
        className="relative px-5 pb-16 pt-14 sm:px-8 sm:pb-20 sm:pt-20 lg:px-10 lg:pb-24 lg:pt-24"
      >
        <div
          aria-hidden="true"
          className="absolute -right-24 top-8 size-72 rounded-full border border-[#19241f]/10 sm:size-96"
        />
        <div
          aria-hidden="true"
          className="absolute -right-6 top-28 size-48 rounded-full border border-[#19241f]/10 sm:size-64"
        />

        <div className="relative mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[1.02fr_0.98fr] lg:gap-16 xl:gap-24">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#19241f]/15 bg-[#fffaf0] px-3.5 py-2 text-xs font-semibold uppercase tracking-[0.13em] text-[#3d5147]">
              <Sparkles className="size-3.5 text-[#d76543]" strokeWidth={2} />
              Made for ADHD brains
            </div>

            <h1 className="mt-7 max-w-3xl text-balance text-[3.25rem] font-semibold leading-[0.98] tracking-[-0.055em] text-[#142019] sm:text-6xl lg:text-[4.45rem] xl:text-[5.15rem]">
              Turn “I should study” into{" "}
              <span className="relative mt-2 inline-block text-[#9e3f28]">
                “I know what’s next.”
                <span
                  aria-hidden="true"
                  className="absolute -bottom-1 left-1 h-1.5 w-[96%] rounded-full bg-[#ed9b79]/70"
                />
              </span>
            </h1>

            <p className="mt-7 max-w-xl text-pretty text-lg leading-8 text-[#526159] sm:text-xl">
              Drop in your class material. Get a clear plan, focused study
              tools, and one doable next step—without organizing everything
              yourself first.
            </p>

            <div className="mt-9 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
              <AuthAwareLink
                authenticatedLabel="Go to my dashboard"
                unauthenticatedLabel="Make my study plan"
                className="inline-flex items-center gap-2 rounded-full bg-[#19241f] px-6 py-3.5 text-[15px] font-semibold text-white shadow-[0_10px_24px_-12px_rgba(25,36,31,0.8)] transition-[background-color,transform] hover:-translate-y-0.5 hover:bg-[#2d4037]"
              />
              <Link
                href="/demo"
                className="inline-flex items-center gap-2 rounded-full border border-[#b9c4bc] bg-white/70 px-5 py-3.5 text-[15px] font-semibold text-[#32443a] transition-[background-color,transform] hover:-translate-y-0.5 hover:bg-white"
              >
                <Play className="size-4" aria-hidden="true" />
                Explore sample workspace
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex items-center gap-2 rounded-full px-5 py-3.5 text-[15px] font-semibold text-[#32443a] transition-colors hover:bg-[#19241f]/5"
              >
                See how it works
                <ArrowUpRight className="size-4" />
              </a>
            </div>

            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm text-[#526159]">
              <span className="inline-flex items-center gap-2">
                <CheckCircle2 className="size-4 text-[#4d765f]" />
                Start in minutes
              </span>
              <span className="inline-flex items-center gap-2">
                <CheckCircle2 className="size-4 text-[#4d765f]" />
                Built by an ADHD student
              </span>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[37rem] lg:mx-0">
            <div
              aria-hidden="true"
              className="absolute -left-5 -top-5 size-20 rounded-[1.75rem] bg-[#ed9b79] sm:-left-7 sm:-top-7 sm:size-28"
            />
            <div
              aria-hidden="true"
              className="absolute -bottom-5 -right-4 size-24 rounded-full bg-[#ddc56f] sm:-bottom-8 sm:-right-8 sm:size-36"
            />

            <div className="relative rotate-[0.5deg] rounded-[2rem] border border-white/10 bg-[#1c2b24] p-3 shadow-[0_32px_80px_-34px_rgba(25,36,31,0.75)] sm:rounded-[2.4rem] sm:p-4">
              <div className="overflow-hidden rounded-[1.4rem] bg-[#fdf9f0] sm:rounded-[1.8rem]">
                <div className="flex items-center justify-between border-b border-[#1c2b24]/10 px-5 py-4 sm:px-7 sm:py-5">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.13em] text-[#78847d]">
                      Your study space
                    </p>
                    <p className="mt-1 text-lg font-semibold tracking-[-0.025em] text-[#19241f]">
                      Today’s plan
                    </p>
                  </div>
                  <div className="flex size-10 items-center justify-center rounded-full bg-[#e9dfc7] text-[#19241f]">
                    <Focus className="size-5" strokeWidth={1.8} />
                  </div>
                </div>

                <div className="p-5 sm:p-7">
                  <div className="flex items-end justify-between gap-5">
                    <div>
                      <p className="text-sm font-medium text-[#526159]">
                        A gentle plan for today
                      </p>
                      <p className="mt-1 text-2xl font-semibold tracking-[-0.035em] text-[#19241f]">
                        3 small steps
                      </p>
                    </div>
                    <span className="font-mono text-xs font-medium text-[#78847d]">
                      0 / 3
                    </span>
                  </div>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#e9dfc7]">
                    <div className="h-full w-[12%] rounded-full bg-[#d76543]" />
                  </div>

                  <div className="mt-6 rounded-[1.35rem] border-2 border-[#19241f] bg-[#fffdf8] p-4 shadow-[5px_6px_0_0_#d7c9ab] sm:p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <span className="inline-flex rounded-full bg-[#f3d7c9] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#9e3f28]">
                          Start here
                        </span>
                        <p className="mt-3 text-lg font-semibold tracking-[-0.02em] text-[#19241f] sm:text-xl">
                          Review cell respiration
                        </p>
                        <p className="mt-1 text-sm leading-6 text-[#66736c]">
                          Biology · Chapter 4 notes
                        </p>
                      </div>
                      <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-[#e9dfc7] px-2.5 py-1.5 text-xs font-semibold text-[#526159]">
                        <Clock3 className="size-3.5" />
                        25 min
                      </span>
                    </div>

                    <div className="mt-5 space-y-2.5">
                      {[
                        "Read the 1-page study guide",
                        "Review 8 key flashcards",
                      ].map((item) => (
                        <div
                          key={item}
                          className="flex items-center gap-2.5 text-sm text-[#526159]"
                        >
                          <span className="flex size-5 items-center justify-center rounded-md border border-[#19241f]/20 bg-[#f7f3ea]">
                            <Check className="size-3 text-[#4d765f]" />
                          </span>
                          {item}
                        </div>
                      ))}
                    </div>

                    <div className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#19241f] px-4 py-3 text-sm font-semibold text-white">
                      Begin focus session
                      <ArrowUpRight className="size-4" />
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-[#e5eddf] p-4">
                      <Layers3 className="size-5 text-[#4d765f]" />
                      <p className="mt-4 text-sm font-semibold text-[#26382f]">
                        Flashcards
                      </p>
                      <p className="mt-1 text-xs text-[#66736c]">8 cards ready</p>
                    </div>
                    <div className="rounded-2xl bg-[#f3d7c9] p-4">
                      <ClipboardCheck className="size-5 text-[#9e3f28]" />
                      <p className="mt-4 text-sm font-semibold text-[#4b2a22]">
                        Quick quiz
                      </p>
                      <p className="mt-1 text-xs text-[#876054]">5 questions</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        id="tools"
        className="border-y border-[#19241f]/10 bg-[#fffaf0] px-5 py-7 sm:px-8 lg:px-10"
        aria-label="What you can make"
      >
        <div className="mx-auto flex max-w-7xl flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <p className="max-w-xs text-sm font-semibold leading-6 text-[#3d5147]">
            One upload becomes everything you need to start studying.
          </p>
          <div className="grid flex-1 grid-cols-2 gap-2 sm:grid-cols-4 lg:max-w-3xl">
            {studyTools.map(({ label, icon: Icon }) => (
              <div
                key={label}
                className="flex items-center gap-2.5 rounded-full border border-[#19241f]/10 bg-white px-3.5 py-2.5"
              >
                <Icon className="size-4 shrink-0 text-[#d76543]" strokeWidth={1.9} />
                <span className="text-xs font-semibold text-[#3d5147] sm:text-sm">
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        id="why"
        className="bg-[#19241f] px-5 py-24 text-[#fffaf0] sm:px-8 sm:py-28 lg:px-10 lg:py-32"
      >
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-end lg:gap-20">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#ed9b79]">
                Less friction. More momentum.
              </p>
              <h2 className="mt-5 max-w-xl text-balance text-4xl font-semibold leading-[1.02] tracking-[-0.045em] sm:text-5xl lg:text-6xl">
                The hard part is often everything before the studying.
              </h2>
            </div>
            <p className="max-w-2xl text-lg leading-8 text-[#bdc8c1] sm:text-xl">
              Deciding what matters, turning it into a plan, and choosing where
              to start all spend attention before you learn a thing. ADHD Study
              AI takes on that setup so your energy can go toward the work
              itself.
            </p>
          </div>

          <div className="mt-14 grid items-stretch gap-4 lg:grid-cols-[1fr_auto_1fr] lg:gap-6">
            <div className="overflow-hidden rounded-[1.75rem] border border-white/15 bg-white/5 p-6 sm:p-8">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-[#bdc8c1]">
                  Before you start
                </p>
                <span className="rounded-full border border-white/15 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-[#8fa098]">
                  Mental load
                </span>
              </div>
              <div className="mt-8 flex min-h-64 flex-col justify-center gap-3 sm:px-4">
                {[
                  ["Which chapter matters?", "-rotate-2"],
                  ["Make a study schedule", "rotate-1"],
                  ["Find a quiz somewhere", "-rotate-1"],
                  ["Wait... where do I start?", "rotate-2"],
                ].map(([label, rotation], index) => (
                  <div
                    key={label}
                    className={`flex items-center gap-3 rounded-xl border border-white/10 bg-[#26382f] px-4 py-3.5 text-sm text-[#d7dfda] shadow-lg ${rotation} ${
                      index === 3 ? "border-[#ed9b79]/60 text-white" : ""
                    }`}
                  >
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-white/5">
                      <X className="size-3.5 text-[#ed9b79]" />
                    </span>
                    {label}
                  </div>
                ))}
              </div>
            </div>

            <div className="hidden items-center justify-center text-[#ed9b79] lg:flex">
              <span className="flex size-12 items-center justify-center rounded-full border border-[#ed9b79]/40">
                <ArrowRight className="size-5" />
              </span>
            </div>

            <div className="rounded-[1.75rem] bg-[#f7f3ea] p-6 text-[#19241f] sm:p-8">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-[#526159]">
                  With ADHD Study AI
                </p>
                <span className="rounded-full bg-[#e5eddf] px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[#4d765f]">
                  Ready to go
                </span>
              </div>
              <div className="mt-8 rounded-2xl border-2 border-[#19241f] bg-[#fffdf8] p-5 shadow-[5px_6px_0_0_#d7c9ab] sm:p-6">
                <div className="flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-[#f3d7c9] text-[#9e3f28]">
                    <Focus className="size-5" />
                  </span>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#9e3f28]">
                      Your next step
                    </p>
                    <p className="mt-1 font-semibold">
                      Review the 1-page study guide
                    </p>
                  </div>
                </div>
                <div className="mt-6 grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-[#e5eddf] p-3">
                    <p className="font-mono text-xs font-semibold text-[#4d765f]">
                      15 MIN
                    </p>
                    <p className="mt-1 text-xs text-[#526159]">Focused review</p>
                  </div>
                  <div className="rounded-xl bg-[#f3d7c9] p-3">
                    <p className="font-mono text-xs font-semibold text-[#9e3f28]">
                      8 CARDS
                    </p>
                    <p className="mt-1 text-xs text-[#526159]">Ready after</p>
                  </div>
                </div>
                <div className="mt-5 flex items-center justify-center gap-2 rounded-xl bg-[#19241f] px-4 py-3 text-sm font-semibold text-white">
                  Start this step
                  <ArrowUpRight className="size-4" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        id="how-it-works"
        className="bg-[#f7f3ea] px-5 py-24 sm:px-8 sm:py-28 lg:px-10 lg:py-32"
      >
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#9e3f28]">
              From scattered to started
            </p>
            <h2 className="mt-5 text-balance text-4xl font-semibold leading-[1.05] tracking-[-0.045em] text-[#19241f] sm:text-5xl lg:text-6xl">
              Three steps. No elaborate new system to maintain.
            </h2>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-[#526159]">
              Use the material you already have and let the app turn it into a
              place to begin.
            </p>
          </div>

          <ol className="mt-14 grid gap-5 lg:grid-cols-3">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <li
                  key={step.number}
                  className={`relative overflow-hidden rounded-[1.75rem] border-2 border-[#19241f] p-6 shadow-[6px_7px_0_0_#19241f] sm:p-8 ${
                    index === 0
                      ? "bg-[#f3d7c9]"
                      : index === 1
                        ? "bg-[#ddc56f]"
                        : "bg-[#e5eddf]"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <span className="flex size-12 items-center justify-center rounded-2xl bg-[#fffaf0] text-[#19241f]">
                      <Icon className="size-5" strokeWidth={1.8} />
                    </span>
                    <span className="font-mono text-xs font-bold tracking-[0.12em] text-[#19241f]/55">
                      {step.number}
                    </span>
                  </div>
                  <h3 className="mt-10 max-w-xs text-2xl font-semibold tracking-[-0.035em] text-[#19241f]">
                    {step.title}
                  </h3>
                  <p className="mt-4 max-w-sm leading-7 text-[#415148]">
                    {step.description}
                  </p>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      <section className="border-y border-[#19241f]/10 bg-white px-5 py-24 sm:px-8 sm:py-28 lg:px-10 lg:py-32">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-end lg:gap-20">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#9e3f28]">
                More than a summary
              </p>
              <h2 className="mt-5 text-balance text-4xl font-semibold leading-[1.05] tracking-[-0.045em] text-[#19241f] sm:text-5xl">
                Study tools that lead somewhere.
              </h2>
            </div>
            <p className="max-w-2xl text-lg leading-8 text-[#526159]">
              Each tool is connected to the same material and the same plan, so
              reviewing, practicing, and moving forward feel like one flow.
            </p>
          </div>

          <div className="mt-14 grid gap-5 lg:grid-cols-2">
            <article className="overflow-hidden rounded-[2rem] bg-[#ed9b79] p-6 sm:p-8 lg:row-span-2">
              <div className="flex items-center justify-between">
                <span className="flex size-11 items-center justify-center rounded-xl bg-[#fffaf0] text-[#9e3f28]">
                  <BookOpenText className="size-5" />
                </span>
                <span className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[#6f3021]">
                  Study guide
                </span>
              </div>
              <h3 className="mt-8 max-w-md text-3xl font-semibold tracking-[-0.04em] text-[#402119] sm:text-4xl">
                Make dense material easier to enter.
              </h3>
              <p className="mt-4 max-w-lg leading-7 text-[#633629]">
                Pull out key ideas, useful definitions, and the relationships
                that are easy to miss in a wall of notes.
              </p>

              <div className="mt-10 rotate-1 rounded-[1.4rem] border-2 border-[#19241f] bg-[#fffdf8] p-5 shadow-[6px_7px_0_0_#7f3827] sm:p-6">
                <div className="flex items-center justify-between border-b border-[#19241f]/10 pb-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#9e3f28]">
                      Biology · Chapter 4
                    </p>
                    <p className="mt-1 font-semibold text-[#19241f]">
                      Cellular respiration
                    </p>
                  </div>
                  <span className="rounded-full bg-[#e5eddf] px-3 py-1 text-xs font-semibold text-[#4d765f]">
                    6 min read
                  </span>
                </div>
                <div className="mt-5 space-y-4 text-sm leading-6 text-[#526159]">
                  <p>
                    <span className="font-semibold text-[#19241f]">
                      Big idea:
                    </span>{" "}
                    Cells convert glucose into usable energy through a sequence
                    of connected stages.
                  </p>
                  <div className="rounded-xl bg-[#f7f3ea] p-4">
                    <p className="font-semibold text-[#19241f]">
                      Remember the order
                    </p>
                    <p className="mt-1">Glycolysis → Krebs cycle → ETC</p>
                  </div>
                </div>
              </div>
            </article>

            <article className="rounded-[2rem] bg-[#ddc56f] p-6 sm:p-8">
              <div className="flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
                <div className="max-w-sm">
                  <span className="flex size-11 items-center justify-center rounded-xl bg-[#fffaf0] text-[#6d5b18]">
                    <ClipboardCheck className="size-5" />
                  </span>
                  <h3 className="mt-7 text-2xl font-semibold tracking-[-0.035em] text-[#403817] sm:text-3xl">
                    Practice before it counts.
                  </h3>
                  <p className="mt-3 leading-7 text-[#62582c]">
                    Turn your own material into quick questions that reveal
                    what is sticking.
                  </p>
                </div>
                <div className="w-full max-w-xs rounded-2xl bg-[#fffaf0] p-4 shadow-[4px_5px_0_0_#8f7b2f]">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#8b7626]">
                    Question 3 of 5
                  </p>
                  <p className="mt-3 text-sm font-semibold text-[#19241f]">
                    Where does glycolysis happen?
                  </p>
                  <div className="mt-4 space-y-2 text-xs">
                    <div className="rounded-lg border border-[#19241f]/10 px-3 py-2 text-[#526159]">
                      The nucleus
                    </div>
                    <div className="rounded-lg bg-[#e5eddf] px-3 py-2 font-semibold text-[#31513f]">
                      The cytoplasm
                    </div>
                  </div>
                </div>
              </div>
            </article>

            <article className="rounded-[2rem] bg-[#e5eddf] p-6 sm:p-8">
              <div className="flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
                <div className="max-w-sm">
                  <span className="flex size-11 items-center justify-center rounded-xl bg-[#fffaf0] text-[#4d765f]">
                    <ListTodo className="size-5" />
                  </span>
                  <h3 className="mt-7 text-2xl font-semibold tracking-[-0.035em] text-[#26382f] sm:text-3xl">
                    Keep “next” in sight.
                  </h3>
                  <p className="mt-3 leading-7 text-[#526159]">
                    A short plan keeps the whole workload from competing for
                    your attention at once.
                  </p>
                </div>
                <div className="w-full max-w-xs space-y-2 rounded-2xl bg-[#fffaf0] p-4 shadow-[4px_5px_0_0_#9eb59f]">
                  {["Read guide", "Review cards", "Take quick quiz"].map(
                    (item, index) => (
                      <div
                        key={item}
                        className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs ${
                          index === 0
                            ? "bg-[#19241f] font-semibold text-white"
                            : "text-[#526159]"
                        }`}
                      >
                        <span
                          className={`size-2 rounded-full ${
                            index === 0 ? "bg-[#ed9b79]" : "bg-[#c3d1c0]"
                          }`}
                        />
                        {item}
                      </div>
                    ),
                  )}
                </div>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className="overflow-hidden bg-[#202b31] px-5 py-24 text-white sm:px-8 sm:py-28 lg:px-10 lg:py-32">
        <div className="mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
          <div className="relative mx-auto w-full max-w-lg lg:mx-0">
            <div
              aria-hidden="true"
              className="absolute -left-8 -top-8 size-28 bg-[#ddc56f] sm:-left-12 sm:-top-12 sm:size-40"
            />
            <div
              aria-hidden="true"
              className="absolute -bottom-8 -right-8 size-28 rounded-full bg-[#ed9b79] sm:-bottom-12 sm:-right-12 sm:size-40"
            />
            <div className="relative -rotate-2 border-4 border-[#fffaf0] bg-[#19241f] p-2 shadow-[12px_14px_0_0_#11191c]">
              <Image
                src="/Pixel art persona.png"
                alt="8-bit portrait of Jason, the creator of ADHD Study AI, waving"
                width={1024}
                height={1024}
                sizes="(min-width: 1024px) 500px, (min-width: 640px) 512px, calc(100vw - 40px)"
                className="aspect-square h-auto w-full object-cover"
              />
            </div>
            <span className="absolute -bottom-5 left-5 rotate-2 border-2 border-[#19241f] bg-[#fffaf0] px-4 py-2 font-mono text-xs font-bold uppercase tracking-[0.12em] text-[#19241f] shadow-[4px_5px_0_0_#ed9b79]">
              Hi, I&apos;m Jason
            </span>
          </div>

          <div>
            <Quote className="size-12 text-[#ed9b79]" strokeWidth={1.5} />
            <p className="mt-7 max-w-3xl text-balance text-3xl font-medium leading-[1.22] tracking-[-0.035em] text-[#fffaf0] sm:text-4xl lg:text-5xl">
              I had the notes, the deadline, and every intention to study. I
              still kept getting stuck at the starting line.
            </p>
            <div className="mt-8 max-w-2xl space-y-5 text-lg leading-8 text-[#bdc8c1]">
              <p>
                I&apos;m a software engineering student with ADHD, and I built
                this around the part most study apps skip: getting from
                overwhelmed to actually underway.
              </p>
              <p>
                It is the tool I wanted for myself—calm, structured, and made
                for brains that do not always work in a straight line.
              </p>
            </div>
            <div className="mt-9 flex items-center gap-3">
              <span className="h-px w-10 bg-[#ed9b79]" />
              <p className="text-sm font-semibold text-[#fffaf0]">
                Jason, creator of ADHD Study AI
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#ed9b79] px-5 py-20 sm:px-8 sm:py-24 lg:px-10">
        <div className="mx-auto flex max-w-7xl flex-col gap-10 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-4xl">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#703020]">
              Your next step can be small
            </p>
            <h2 className="mt-5 text-balance text-4xl font-semibold leading-[1.02] tracking-[-0.05em] text-[#402119] sm:text-5xl lg:text-7xl">
              Spend less energy getting ready to study.
            </h2>
          </div>
          <AuthAwareLink
            authenticatedLabel="Open my dashboard"
            unauthenticatedLabel="Make my first plan"
            className="inline-flex shrink-0 items-center gap-2 self-start rounded-full bg-[#19241f] px-6 py-3.5 text-[15px] font-semibold text-white shadow-[0_12px_24px_-12px_rgba(25,36,31,0.85)] transition-[background-color,transform] hover:-translate-y-0.5 hover:bg-[#2d4037] lg:self-auto"
          />
        </div>
      </section>

      <footer className="bg-[#19241f] px-5 py-10 text-[#bdc8c1] sm:px-8 lg:px-10">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href="/"
            className="flex items-center gap-2.5 font-semibold text-[#fffaf0]"
          >
            <span className="flex size-9 items-center justify-center rounded-full bg-[#fffaf0] text-[#19241f]">
              <Brain className="size-[18px]" strokeWidth={1.8} />
            </span>
            ADHD Study AI
          </Link>
          <div className="flex flex-wrap items-center gap-x-7 gap-y-3 text-sm">
            <a
              href="#how-it-works"
              className="transition-colors hover:text-white"
            >
              How it works
            </a>
            <a href="#why" className="transition-colors hover:text-white">
              Why it works
            </a>
            <Link href="/login" className="transition-colors hover:text-white">
              Sign in
            </Link>
            <Link href="/privacy" className="transition-colors hover:text-white">
              Privacy & data
            </Link>
          </div>
          <p className="text-sm">Less overwhelm. More clarity.</p>
        </div>
      </footer>
    </main>
  );
}
