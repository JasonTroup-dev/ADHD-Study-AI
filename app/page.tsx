import Image from "next/image";
import Link from "next/link";
import {
  ArrowDown,
  BookOpenText,
  Brain,
  ClipboardCheck,
  FileText,
  Layers3,
  ListTodo,
} from "lucide-react";

import { AuthAwareLink } from "@/components/AuthAwareLink";

const studyTools = [
  { label: "Study guide", icon: BookOpenText },
  { label: "Flashcards", icon: Layers3 },
  { label: "Practice quiz", icon: ClipboardCheck },
  { label: "Study plan", icon: ListTodo },
];

const steps = [
  {
    number: "01",
    title: "Upload material",
    description: "Add your class notes, slides, or readings.",
  },
  {
    number: "02",
    title: "Generate study tools",
    description: "Turn them into useful ways to review and practice.",
  },
  {
    number: "03",
    title: "Start with one next step",
    description: "Know what to do first without planning it all yourself.",
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#f4f7f9] text-slate-900">
      <header className="border-b border-slate-200/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-8">
          <Link
            href="/"
            className="flex shrink-0 items-center gap-2 font-semibold tracking-tight text-slate-900 sm:gap-2.5"
          >
            <span className="flex size-8 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-blue-700 sm:size-9">
              <Brain className="size-[18px]" strokeWidth={1.8} />
            </span>
            <span className="whitespace-nowrap text-sm sm:text-base">
              ADHD Study AI
            </span>
          </Link>

          <nav
            className="flex shrink-0 items-center gap-1 sm:gap-4"
            aria-label="Account"
          >
            <Link
              href="/login"
              className="whitespace-nowrap rounded-xl px-2 py-2 text-sm font-medium text-slate-600 transition-colors hover:text-slate-950 sm:px-4"
            >
              Sign in
            </Link>
            <AuthAwareLink
              authenticatedLabel="Dashboard"
              unauthenticatedLabel="Get started"
              className="inline-flex items-center gap-2 whitespace-nowrap rounded-xl bg-slate-900 px-3 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-700 [&>svg]:hidden sm:px-4 sm:[&>svg]:block"
            />
          </nav>
        </div>
      </header>

      <section className="px-5 pb-16 pt-20 sm:px-8 sm:pb-24 sm:pt-28">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-sm font-medium tracking-wide text-blue-700">
            Built by an ADHD student, for ADHD students
          </p>
          <h1 className="mx-auto mt-6 max-w-4xl text-balance text-5xl font-semibold leading-[1.08] tracking-[-0.045em] text-slate-950 sm:text-6xl lg:text-7xl">
            Studying should feel less overwhelming.
          </h1>
          <p className="mx-auto mt-7 max-w-2xl text-pretty text-lg leading-8 text-slate-600 sm:text-xl">
            ADHD Study AI turns class material into clear study guides,
            flashcards, quizzes, and next steps so students can spend less
            energy figuring out where to start.
          </p>
          <div className="mt-9 flex justify-center">
            <AuthAwareLink
              authenticatedLabel="Go to dashboard"
              unauthenticatedLabel="Start studying"
              className="inline-flex items-center gap-2 rounded-2xl bg-blue-700 px-6 py-3.5 font-medium text-white shadow-sm transition-colors hover:bg-blue-800"
            />
          </div>
        </div>
      </section>

      <section className="px-5 pb-24 sm:px-8 sm:pb-32" aria-label="How it works">
        <div className="mx-auto max-w-5xl rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_24px_70px_-45px_rgba(15,23,42,0.35)] sm:p-8 lg:p-10">
          <div className="grid items-center gap-6 lg:grid-cols-[0.8fr_auto_1.2fr] lg:gap-8">
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6">
              <div className="flex items-center gap-4">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white text-blue-700 shadow-sm ring-1 ring-slate-200">
                  <FileText className="size-5" strokeWidth={1.8} />
                </span>
                <div>
                  <p className="text-sm text-slate-500">Start here</p>
                  <p className="mt-0.5 font-medium text-slate-800">
                    Upload class material
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-center text-slate-300">
              <ArrowDown className="size-5 lg:-rotate-90" strokeWidth={1.5} />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {studyTools.map(({ label, icon: Icon }) => (
                <div
                  key={label}
                  className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4"
                >
                  <Icon
                    className="size-[18px] shrink-0 text-blue-700"
                    strokeWidth={1.7}
                  />
                  <span className="text-sm font-medium text-slate-700">
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200/80 bg-white px-5 py-24 sm:px-8 sm:py-28">
        <div className="mx-auto grid max-w-5xl items-center gap-12 md:grid-cols-[0.7fr_1.3fr] md:gap-16 lg:gap-20">
          <div className="mx-auto w-full max-w-[18rem] md:max-w-[20rem]">
            <div className="rounded-[2rem] border border-slate-200 bg-slate-50 p-2 shadow-[0_20px_55px_-38px_rgba(15,23,42,0.45)]">
              <Image
                src="/Pixel art persona.png"
                alt="Pixel art avatar of Jason waving"
                width={1024}
                height={1024}
                sizes="(min-width: 768px) 320px, 288px"
                className="aspect-square h-auto w-full rounded-[1.55rem] object-cover"
              />
            </div>
            <p className="mt-4 text-center text-sm text-slate-500">
              Jason, creator of ADHD Study AI
            </p>
          </div>

          <div className="max-w-2xl">
            <p className="text-sm font-semibold tracking-wide text-blue-700">
              Why I built this
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-4xl">
              Built by someone who gets the hard part.
            </h2>

            <div className="mt-7 space-y-5 text-lg leading-8 text-slate-600">
              <p>
                Hi, I&apos;m Jason, a software engineering student with ADHD.
              </p>
              <p>
                I built ADHD Study AI because I know what it feels like to have
                the notes, the deadline, and the intention to study, but still
                feel stuck before starting.
              </p>
              <p>
                A lot of study tools assume you already know what to do next.
                This project is built around the part that often gets ignored:
                turning overwhelming class material into one clear next step.
              </p>
            </div>

            <p className="mt-8 border-l-2 border-blue-200 pl-5 font-medium leading-7 text-slate-800">
              The tool I wish I had: calm, structured, and made for brains that
              do not always study in a straight line.
            </p>
          </div>
        </div>
      </section>

      <section className="px-5 py-24 sm:px-8 sm:py-28">
        <div className="mx-auto max-w-5xl">
          <div className="max-w-xl">
            <p className="text-sm font-semibold tracking-wide text-blue-700">
              A clearer way to begin
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-4xl">
              From class material to a next step.
            </h2>
          </div>

          <ol className="mt-12 grid gap-8 border-t border-slate-200 pt-8 md:grid-cols-3 md:gap-12">
            {steps.map((step) => (
              <li key={step.number}>
                <span className="font-mono text-xs font-medium text-blue-700">
                  {step.number}
                </span>
                <h3 className="mt-4 text-lg font-semibold text-slate-900">
                  {step.title}
                </h3>
                <p className="mt-2 max-w-xs leading-7 text-slate-600">
                  {step.description}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <footer className="border-t border-slate-200/80 px-5 py-8 sm:px-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 font-medium text-slate-700">
            <Brain className="size-4" strokeWidth={1.8} />
            ADHD Study AI
          </div>
          <p>Less overwhelm. More clarity.</p>
        </div>
      </footer>
    </main>
  );
}
