import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import {
  Brain,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileText,
  Flame,
  type LucideIcon,
  Plus,
  Play,
  Sparkles,
  Target,
  TrendingUp,
  Upload,
  Zap,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

type PageProps = {
  params: Promise<{
    classId: string;
  }>;
};

type Course = {
  name: string;
  code: string;
  instructor: string;
};

type FlashcardSet = {
  id: string;
  title: string;
  lastStudied: string;
  mastery: number;
  cardCount: number;
  href: string;
};

type Material = {
  id: string;
  title: string;
  meta: string;
};

type Activity = {
  title: string;
  time: string;
  icon: LucideIcon;
  iconClassName: string;
};

type QuickAction = {
  label: string;
  icon: LucideIcon;
  href: string;
};

type ClassRow = {
  name: string | null;
  class_code: string | null;
  prof_name: string | null;
};

type FlashcardSetRow = {
  id: string;
  title: string | null;
  created_at: string | null;
  flashcards?: { mastery_level: number | null }[] | null;
};

type NoteRow = {
  id: string;
  title: string | null;
  source_type: string | null;
  created_at: string | null;
};

const fallbackCourse: Course = {
  name: "Calculus II",
  code: "MATH 2414",
  instructor: "Dr. Sarah Chen",
};

const fallbackFlashcardSets: FlashcardSet[] = [
  {
    id: "integration-techniques",
    title: "Integration Techniques",
    lastStudied: "Yesterday",
    mastery: 82,
    cardCount: 24,
    href: "/study/flashcards",
  },
  {
    id: "derivative-rules",
    title: "Derivative Rules",
    lastStudied: "3 days ago",
    mastery: 95,
    cardCount: 18,
    href: "/study/flashcards",
  },
  {
    id: "limits-continuity",
    title: "Limits and Continuity",
    lastStudied: "1 week ago",
    mastery: 68,
    cardCount: 15,
    href: "/study/flashcards",
  },
];

const fallbackMaterials: Material[] = [
  {
    id: "lecture-notes-week-7",
    title: "Lecture Notes - Week 7",
    meta: "PDF - Uploaded May 10",
  },
];

const recentActivities: Activity[] = [
  {
    title: "Reviewed Integration flashcards",
    time: "2 hours ago",
    icon: Brain,
    iconClassName: "bg-blue-50 text-blue-600",
  },
  {
    title: "AI session on derivatives",
    time: "2 hours ago",
    icon: Sparkles,
    iconClassName: "bg-purple-50 text-purple-600",
  },
  {
    title: "Uploaded lecture notes",
    time: "Yesterday",
    icon: FileText,
    iconClassName: "bg-slate-100 text-slate-600",
  },
  {
    title: "Completed Problem Set 6",
    time: "2 days ago",
    icon: CheckCircle2,
    iconClassName: "bg-emerald-50 text-emerald-600",
  },
];

const quickActions: QuickAction[] = [
  {
    label: "Generate Study Guide",
    icon: Sparkles,
    href: "/study",
  },
  {
    label: "Create Flashcards",
    icon: Brain,
    href: "/study/flashcards/create",
  },
  {
    label: "Start Focus Session",
    icon: Clock3,
    href: "/study/ai-tutor",
  },
  {
    label: "Open Planner",
    icon: CalendarDays,
    href: "/planner",
  },
];

export default async function ClassPage({ params }: PageProps) {
  const { classId } = await params;
  const { course, flashcardSets, materials } =
    await getClassWorkspaceData(classId);

  return (
    <main className="min-h-full w-full bg-[#f7f8fb] text-slate-950">
      <div className="mx-auto w-full max-w-7xl px-6 py-8 lg:px-8">
        <header className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div>
            <nav
              aria-label="Breadcrumb"
              className="mb-3 flex items-center gap-2 text-sm text-slate-500"
            >
              <Link href="/classes" className="transition hover:text-slate-900">
                Classes
              </Link>
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
              <span className="font-medium text-slate-900">{course.name}</span>
            </nav>

            <h1 className="text-3xl font-semibold tracking-normal text-slate-950">
              {course.name}
            </h1>
            <p className="mt-2 text-base text-slate-600">
              {course.code} <span className="mx-2 text-slate-300">-</span>{" "}
              {course.instructor}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              className="h-10 rounded-lg border-slate-200 bg-white px-4 text-sm font-semibold text-slate-950 shadow-none hover:bg-slate-50"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add Material
            </Button>
            <Button
              asChild
              className="h-10 rounded-lg bg-linear-to-r from-purple-600 to-blue-600 px-4 text-sm font-semibold text-white shadow-none hover:from-purple-700 hover:to-blue-700"
            >
              <Link href="/study/ai-tutor">
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                Start AI Session
              </Link>
            </Button>
          </div>
        </header>

        <div className="mt-7 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
          <section className="space-y-7">
            <article className="rounded-xl border border-purple-100 bg-white p-6 shadow-sm shadow-purple-100/30">
              <div className="flex items-start gap-3">
                <Sparkles
                  className="mt-0.5 h-5 w-5 text-purple-600"
                  aria-hidden="true"
                />
                <div>
                  <h2 className="text-xl font-semibold text-slate-950">
                    Continue AI Study Session
                  </h2>
                  <p className="mt-2 text-base text-slate-600">
                    Worked on derivatives and chain rule
                  </p>
                </div>
              </div>

              <div className="mt-12 flex items-center gap-2 text-sm text-slate-600">
                <Clock3 className="h-4 w-4" aria-hidden="true" />
                <span>Last studied 2 hours ago</span>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <Button
                  asChild
                  className="h-10 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white shadow-none hover:bg-slate-800"
                >
                  <Link href="/study/ai-tutor">
                    <Play className="h-4 w-4" aria-hidden="true" />
                    Continue Session
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="h-10 rounded-lg border-slate-200 bg-white px-4 text-sm font-semibold text-slate-950 shadow-none hover:bg-slate-50"
                >
                  <Link href="/study/ai-tutor">
                    <Sparkles className="h-4 w-4" aria-hidden="true" />
                    Start New Topic
                  </Link>
                </Button>
              </div>
            </article>

            <div>
              <div className="mb-4 flex items-center justify-between gap-4">
                <h2 className="text-xl font-semibold text-slate-950">
                  Flashcards
                </h2>
                <Button
                  variant="outline"
                  className="h-9 rounded-lg border-slate-200 bg-white px-3 text-sm font-semibold text-slate-950 shadow-none hover:bg-slate-50"
                >
                  <Zap className="h-4 w-4" aria-hidden="true" />
                  Generate with AI
                </Button>
              </div>

              <div className="space-y-3">
                {flashcardSets.map((set) => (
                  <FlashcardSetCard key={set.id} set={set} />
                ))}

                <Link
                  href={`/study/flashcards/create?classId=${classId}`}
                  className="flex h-[68px] items-center justify-center gap-3 rounded-xl border border-dashed border-slate-300 bg-white text-sm font-semibold text-slate-600 transition hover:border-slate-400 hover:bg-slate-50 hover:text-slate-950"
                >
                  <Plus className="h-5 w-5" aria-hidden="true" />
                  Create Flashcard Set
                </Link>
              </div>
            </div>

            <div>
              <h2 className="mb-4 text-xl font-semibold text-slate-950">
                Notes & Materials
              </h2>

              <button
                type="button"
                className="flex h-36 w-full flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white text-center transition hover:border-slate-400 hover:bg-slate-50"
              >
                <Upload className="h-8 w-8 text-slate-500" aria-hidden="true" />
                <span className="mt-3 text-base font-semibold text-slate-700">
                  Drop files here or click to upload
                </span>
                <span className="mt-2 text-sm text-slate-500">
                  PDF, DOCX, TXT supported
                </span>
              </button>

              <div className="mt-4 space-y-3">
                {materials.map((material) => (
                  <MaterialRow key={material.id} material={material} />
                ))}
              </div>
            </div>
          </section>

          <aside className="space-y-6">
            <Panel
              title="Course Progress"
              icon={TrendingUp}
              className="min-h-[260px]"
            >
              <div className="mt-9">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Overall Progress</span>
                  <span className="font-semibold text-slate-950">68%</span>
                </div>
                <ProgressBar value={68} className="mt-3" />
              </div>

              <div className="mt-5 border-t border-slate-200 pt-4">
                <MetricRow label="Assignments" value="12/18" />
                <MetricRow label="Flashcard Mastery" value="75%" />
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Study Streak</span>
                  <span className="inline-flex items-center gap-1 font-semibold text-slate-950">
                    7 days
                    <Flame className="h-4 w-4 text-orange-500" aria-hidden="true" />
                  </span>
                </div>
              </div>
            </Panel>

            <Panel title="Recent Activity" className="overflow-hidden px-0 pb-0">
              <div className="mt-8 divide-y divide-slate-200">
                {recentActivities.map((activity) => (
                  <ActivityRow key={activity.title} activity={activity} />
                ))}
              </div>
            </Panel>

            <Panel title="Quick Actions" icon={Target}>
              <div className="mt-10 space-y-2">
                {quickActions.map((action) => (
                  <QuickActionLink key={action.label} action={action} />
                ))}
              </div>
            </Panel>
          </aside>
        </div>
      </div>
    </main>
  );
}

async function getClassWorkspaceData(classId: string) {
  try {
    const supabase = await createClient();
    const [courseResult, flashcardResult, notesResult] = await Promise.all([
      supabase
        .from("classes")
        .select("name, class_code, prof_name")
        .eq("id", classId)
        .maybeSingle(),
      supabase
        .from("flashcard_sets")
        .select("id, title, created_at, flashcards(mastery_level)")
        .eq("class_id", classId)
        .order("created_at", { ascending: false })
        .limit(3),
      supabase
        .from("notes")
        .select("id, title, source_type, created_at")
        .eq("class_id", classId)
        .order("created_at", { ascending: false })
        .limit(3),
    ]);

    const courseRow = courseResult.data as ClassRow | null;
    const course = courseRow
      ? {
          name: courseRow.name ?? fallbackCourse.name,
          code: courseRow.class_code ?? fallbackCourse.code,
          instructor: courseRow.prof_name ?? fallbackCourse.instructor,
        }
      : fallbackCourse;

    const dbFlashcardSets = (flashcardResult.data ?? []) as FlashcardSetRow[];
    const flashcardSets =
      dbFlashcardSets.length > 0
        ? dbFlashcardSets.map((set, index) => {
            const cards = Array.isArray(set.flashcards) ? set.flashcards : [];
            const mastery = cards.length
              ? Math.round(
                  cards.reduce(
                    (sum, card) => sum + (card.mastery_level ?? 0),
                    0
                  ) / cards.length
                )
              : fallbackFlashcardSets[index]?.mastery ?? 0;

            return {
              id: set.id,
              title: set.title ?? "Untitled Flashcard Set",
              lastStudied: formatRelativeDate(set.created_at),
              mastery,
              cardCount: cards.length,
              href: `/study/flashcards/${set.id}`,
            };
          })
        : fallbackFlashcardSets;

    const dbNotes = (notesResult.data ?? []) as NoteRow[];
    const materials =
      dbNotes.length > 0
        ? dbNotes.map((note) => ({
            id: note.id,
            title: note.title ?? "Untitled Material",
            meta: `${(note.source_type ?? "File").toUpperCase()} - Uploaded ${formatShortDate(
              note.created_at
            )}`,
          }))
        : fallbackMaterials;

    return { course, flashcardSets, materials };
  } catch {
    return {
      course: fallbackCourse,
      flashcardSets: fallbackFlashcardSets,
      materials: fallbackMaterials,
    };
  }
}

function FlashcardSetCard({ set }: { set: FlashcardSet }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="truncate text-lg font-semibold text-slate-950">
            {set.title}
          </h3>
          <p className="mt-3 text-sm text-slate-600">
            Last studied {set.lastStudied}
            <span className="mx-3 text-slate-300">-</span>
            {set.mastery}% mastery
          </p>
        </div>
        <span className="shrink-0 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-950">
          {set.cardCount} cards
        </span>
      </div>

      <div className="mt-3 flex items-center gap-6">
        <ProgressBar value={set.mastery} className="flex-1" />
        <div className="flex shrink-0 items-center gap-2">
          <Button
            asChild
            variant="outline"
            className="h-8 rounded-lg border-slate-200 bg-white px-4 text-sm font-semibold text-slate-950 shadow-none hover:bg-slate-50"
          >
            <Link href={set.href}>Edit</Link>
          </Button>
          <Button
            asChild
            className="h-8 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white shadow-none hover:bg-slate-800"
          >
            <Link href={set.href}>Study</Link>
          </Button>
        </div>
      </div>
    </article>
  );
}

function MaterialRow({ material }: { material: Material }) {
  return (
    <article className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
          <FileText className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-slate-950">
            {material.title}
          </h3>
          <p className="mt-1 text-sm text-slate-600">{material.meta}</p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-5 text-sm font-semibold">
        <button type="button" className="text-slate-950 hover:text-blue-600">
          Summarize
        </button>
        <button type="button" className="text-slate-950 hover:text-blue-600">
          Generate Flashcards
        </button>
        <Button
          variant="outline"
          className="h-8 rounded-lg border-slate-200 bg-white px-4 text-sm font-semibold text-slate-950 shadow-none hover:bg-slate-50"
        >
          Open
        </Button>
      </div>
    </article>
  );
}

function Panel({
  title,
  icon: Icon,
  className = "",
  children,
}: {
  title: string;
  icon?: LucideIcon;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      className={`rounded-xl border border-slate-200 bg-white p-6 shadow-sm ${className}`}
    >
      <div className="flex items-center gap-2">
        {Icon ? <Icon className="h-4 w-4 text-slate-950" aria-hidden="true" /> : null}
        <h2 className="text-base font-semibold text-slate-950">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="mb-4 flex items-center justify-between text-sm">
      <span className="text-slate-600">{label}</span>
      <span className="font-semibold text-slate-950">{value}</span>
    </div>
  );
}

function ActivityRow({ activity }: { activity: Activity }) {
  const Icon = activity.icon;

  return (
    <div className="flex items-start gap-4 px-3 py-3">
      <div
        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${activity.iconClassName}`}
      >
        <Icon className="h-4 w-4" aria-hidden="true" />
      </div>
      <div>
        <p className="text-sm font-medium text-slate-950">{activity.title}</p>
        <p className="mt-1 text-xs text-slate-500">{activity.time}</p>
      </div>
    </div>
  );
}

function QuickActionLink({ action }: { action: QuickAction }) {
  const Icon = action.icon;

  return (
    <Link
      href={action.href}
      className="flex h-8 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-50"
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      {action.label}
    </Link>
  );
}

function ProgressBar({
  value,
  className = "",
}: {
  value: number;
  className?: string;
}) {
  return (
    <div
      className={`h-1.5 overflow-hidden rounded-full bg-slate-300 ${className}`}
      aria-label={`${value}% complete`}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full bg-slate-950"
        style={{ width: `${Math.min(Math.max(value, 0), 100)}%` }}
      />
    </div>
  );
}

function formatRelativeDate(value: string | null) {
  if (!value) return "Recently";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.max(0, Math.floor(diffMs / 86_400_000));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 14) return "1 week ago";

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatShortDate(value: string | null) {
  if (!value) return "recently";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "recently";

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}
