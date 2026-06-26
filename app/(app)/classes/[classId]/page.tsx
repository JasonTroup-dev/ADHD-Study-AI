import { Button } from "@/components/ui/button";
import ClassMaterialsPanel, {
  type ClassAssignmentOption,
  type ClassMaterial,
} from "@/components/classes/ClassMaterialsPanel";
import { StartStudySessionButton } from "@/components/study-sessions/StartStudySessionButton";
import { createClient } from "@/lib/supabase/server";
import type { StudySessionType } from "@/types/database";
import {
  AlertCircle,
  BookOpen,
  Brain,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  Clock3,
  FileText,
  Flame,
  type LucideIcon,
  Plus,
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

type CourseAssignment = {
  id: string;
  title: string;
  dueDate: string | null;
  status: string;
  importance: string;
  hasAssignmentFile: boolean;
  materialCount: number;
  contextStatus: string;
};

type CourseProgress = {
  overallPercent: number;
  completedAssignments: number;
  totalAssignments: number;
  flashcardMasteryPercent: number;
  flashcardCount: number;
  studyStreakDays: number;
};

type QuickAction = {
  label: string;
  icon: LucideIcon;
  href: string;
};

type WeekItem = {
  id: string;
  title: string;
  date: string;
  kind: "task" | "assignment";
  status: string;
};

type NextUpAction =
  | {
      type: "link";
      label: string;
      href: string;
    }
  | {
      type: "study";
      label: string;
      title: string;
      classId: string;
      assignmentId?: string | null;
      plannerTaskId?: string;
      flashcardSetId?: string | null;
      sessionType: StudySessionType;
    };

type NextUpItem = {
  eyebrow: string;
  title: string;
  description: string;
  meta: string;
  icon: LucideIcon;
  tone: "slate" | "amber" | "emerald" | "blue";
  action: NextUpAction;
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

type AssignmentRow = {
  id: string;
  title: string | null;
  due_date: string | null;
  status: string | null;
  importance: string | null;
  original_file_name: string | null;
  file_type: string | null;
  file_size_bytes: number | null;
  context_status: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type AssignmentMaterialRow = {
  id: string;
  assignment_id: string;
  original_file_name: string | null;
  file_type: string | null;
  file_size_bytes: number | null;
  created_at: string | null;
};

type StudySessionRow = {
  id?: string;
  title?: string | null;
  assignment_id?: string | null;
  class_id?: string | null;
  planned_minutes?: number | null;
  actual_minutes?: number | null;
  session_type?: StudySessionType | null;
  started_at?: string | null;
  ended_at: string | null;
};

type PlannerTaskRow = {
  id: string;
  assignment_id: string | null;
  title: string | null;
  priority: string | null;
  status: string | null;
  scheduled_date: string | null;
};

const fallbackCourse: Course = {
  name: "Calculus II",
  code: "MATH 2414",
  instructor: "Dr. Sarah Chen",
};

export default async function ClassPage({ params }: PageProps) {
  const { classId } = await params;
  const {
    course,
    flashcardSets,
    materials,
    materialCount,
    assignments,
    assignmentSummaries,
    plannerTasks,
    activeSession,
    courseProgress,
    weekItems,
  } = await getClassWorkspaceData(classId);
  const quickActions = getQuickActions(classId);
  const nextUp = getNextUp({
    classId,
    activeSession,
    plannerTasks,
    assignments: assignmentSummaries,
    flashcardSets,
    materialCount,
  });

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
              asChild
              variant="outline"
              className="h-10 rounded-lg border-slate-200 bg-white px-4 text-sm font-semibold text-slate-950 shadow-none hover:bg-slate-50"
            >
              <Link href="#materials">
                <Upload className="h-4 w-4" aria-hidden="true" />
                Upload Material
              </Link>
            </Button>
            <Button
              asChild
              className="h-10 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white shadow-none hover:bg-slate-800"
            >
              <Link href="#materials">
                <Plus className="h-4 w-4" aria-hidden="true" />
                Add Assignment
              </Link>
            </Button>
          </div>
        </header>

        <div className="mt-7 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
          <section className="space-y-7">
            <NextUpCard nextUp={nextUp} />

            <AssignmentsSection
              classId={classId}
              assignments={assignmentSummaries}
            />

            <ClassMaterialsPanel
              classId={classId}
              className={course.name}
              assignments={assignments}
              materials={materials}
            />

            <FlashcardsSection classId={classId} flashcardSets={flashcardSets} />
          </section>

          <aside className="space-y-6">
            <Panel title="Course Snapshot" icon={TrendingUp}>
              <div className="mt-8">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Overall Progress</span>
                  <span className="font-semibold text-slate-950">
                    {courseProgress.overallPercent}%
                  </span>
                </div>
                <ProgressBar
                  value={courseProgress.overallPercent}
                  className="mt-3"
                />
              </div>

              <div className="mt-5 border-t border-slate-200 pt-4">
                <MetricRow
                  label="Assignments"
                  value={`${courseProgress.completedAssignments}/${courseProgress.totalAssignments}`}
                />
                <MetricRow
                  label="Flashcard Mastery"
                  value={
                    courseProgress.flashcardCount > 0
                      ? `${courseProgress.flashcardMasteryPercent}%`
                      : "No cards"
                  }
                />
                <MetricRow
                  label="Course Materials"
                  value={`${materialCount}`}
                />
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Study Streak</span>
                  <span className="inline-flex items-center gap-1 font-semibold text-slate-950">
                    {formatDayCount(courseProgress.studyStreakDays)}
                    <Flame className="h-4 w-4 text-orange-500" aria-hidden="true" />
                  </span>
                </div>
              </div>
            </Panel>

            <ThisWeekPanel items={weekItems} />

            <Panel title="Course Tools" icon={Target}>
              <div className="mt-6 space-y-2">
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

function NextUpCard({ nextUp }: { nextUp: NextUpItem }) {
  const Icon = nextUp.icon;
  const toneClasses = {
    slate: {
      border: "border-slate-200",
      icon: "bg-slate-100 text-slate-700",
      badge: "border-slate-200 bg-slate-50 text-slate-700",
    },
    amber: {
      border: "border-amber-200",
      icon: "bg-amber-100 text-amber-700",
      badge: "border-amber-200 bg-amber-50 text-amber-700",
    },
    emerald: {
      border: "border-emerald-200",
      icon: "bg-emerald-100 text-emerald-700",
      badge: "border-emerald-200 bg-emerald-50 text-emerald-700",
    },
    blue: {
      border: "border-blue-200",
      icon: "bg-blue-100 text-blue-700",
      badge: "border-blue-200 bg-blue-50 text-blue-700",
    },
  }[nextUp.tone];

  return (
    <article
      className={`rounded-xl border bg-white p-6 shadow-sm ${toneClasses.border}`}
    >
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-4">
          <span
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${toneClasses.icon}`}
          >
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <span
              className={`inline-flex rounded-md border px-2.5 py-1 text-xs font-semibold ${toneClasses.badge}`}
            >
              {nextUp.eyebrow}
            </span>
            <h2 className="mt-3 text-xl font-semibold text-slate-950">
              {nextUp.title}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              {nextUp.description}
            </p>
            <div className="mt-5 flex items-center gap-2 text-sm text-slate-600">
              <Clock3 className="h-4 w-4" aria-hidden="true" />
              <span>{nextUp.meta}</span>
            </div>
          </div>
        </div>

        <div className="shrink-0">
          <NextUpButton action={nextUp.action} />
        </div>
      </div>
    </article>
  );
}

function NextUpButton({ action }: { action: NextUpAction }) {
  if (action.type === "link") {
    return (
      <Button
        asChild
        className="h-10 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white shadow-none hover:bg-slate-800"
      >
        <Link href={action.href}>
          <CircleDot className="h-4 w-4" aria-hidden="true" />
          {action.label}
        </Link>
      </Button>
    );
  }

  return (
    <StartStudySessionButton
      plannerTaskId={action.plannerTaskId}
      assignmentId={action.assignmentId}
      classId={action.classId}
      flashcardSetId={action.flashcardSetId}
      title={action.title}
      sessionType={action.sessionType}
      label={action.label}
      loadingLabel="Opening..."
      variant="default"
      className="h-10 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white shadow-none hover:bg-slate-800"
    />
  );
}

function AssignmentsSection({
  classId,
  assignments,
}: {
  classId: string;
  assignments: CourseAssignment[];
}) {
  return (
    <section id="assignments">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-950">Assignments</h2>
          <p className="mt-1 text-sm text-slate-600">
            Turn course work into focused study blocks.
          </p>
        </div>
        <Button
          asChild
          variant="outline"
          className="h-9 rounded-lg border-slate-200 bg-white px-3 text-sm font-semibold text-slate-950 shadow-none hover:bg-slate-50"
        >
          <Link href="#materials">
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add Assignment
          </Link>
        </Button>
      </div>

      {assignments.length > 0 ? (
        <div className="space-y-3">
          {assignments.map((assignment) => (
            <CourseAssignmentCard
              key={assignment.id}
              classId={classId}
              assignment={assignment}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
            <BookOpen className="h-6 w-6" aria-hidden="true" />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-slate-950">
            No assignments yet
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
            Add an assignment or upload instructions so this class can produce
            useful study blocks.
          </p>
        </div>
      )}
    </section>
  );
}

function CourseAssignmentCard({
  classId,
  assignment,
}: {
  classId: string;
  assignment: CourseAssignment;
}) {
  const dueState = getDueState(assignment);
  const isCompleted = assignment.status === "completed";
  const statusBadge = getAssignmentStatusBadge(assignment.status);
  const contextBadge = getContextBadge(assignment);

  return (
    <article
      className={`relative flex flex-col gap-4 overflow-hidden rounded-xl border bg-white p-4 shadow-sm sm:flex-row sm:items-start sm:justify-between ${dueState.cardClass}`}
    >
      <span
        aria-hidden="true"
        className={`absolute inset-y-0 left-0 w-1 ${dueState.accentClass}`}
      />
      <div className="min-w-0 flex-1 pl-2">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-semibold ${dueState.badgeClass}`}
          >
            {dueState.icon}
            {dueState.label}
          </span>
          <span
            className={`rounded-md border px-2 py-0.5 text-xs font-semibold ${statusBadge.className}`}
          >
            {statusBadge.label}
          </span>
          <span
            className={`rounded-md border px-2 py-0.5 text-xs font-semibold capitalize ${getImportanceClass(
              assignment.importance,
            )}`}
          >
            {assignment.importance}
          </span>
        </div>

        <h3
          className={`mt-3 truncate text-lg font-semibold ${
            isCompleted ? "text-slate-500 line-through" : "text-slate-950"
          }`}
        >
          {assignment.title}
        </h3>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-600">
          <span className="inline-flex items-center gap-1.5">
            <FileText className="h-4 w-4" aria-hidden="true" />
            {assignment.hasAssignmentFile ? "Instructions attached" : "No instructions"}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <BookOpen className="h-4 w-4" aria-hidden="true" />
            {formatMaterialCount(assignment.materialCount)}
          </span>
          <span
            className={`inline-flex items-center gap-1.5 ${contextBadge.className}`}
          >
            {contextBadge.icon}
            {contextBadge.label}
          </span>
        </div>
      </div>

      <div className="flex shrink-0 items-center justify-end gap-2 sm:flex-col sm:items-end">
        {!isCompleted ? (
          <StartStudySessionButton
            assignmentId={assignment.id}
            classId={classId}
            title={assignment.title}
            sessionType="assignment"
            label="Start Block"
            variant="outline"
            className="h-8 rounded-lg border-slate-200 bg-white px-3 text-sm font-semibold text-slate-950 shadow-none hover:bg-slate-50"
          />
        ) : (
          <span className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 text-sm font-semibold text-emerald-700">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            Done
          </span>
        )}
      </div>
    </article>
  );
}

function FlashcardsSection({
  classId,
  flashcardSets,
}: {
  classId: string;
  flashcardSets: FlashcardSet[];
}) {
  return (
    <section>
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-950">Flashcards</h2>
          <p className="mt-1 text-sm text-slate-600">
            Review terms and concepts after the urgent work is handled.
          </p>
        </div>
        <Button
          asChild
          variant="outline"
          className="h-9 rounded-lg border-slate-200 bg-white px-3 text-sm font-semibold text-slate-950 shadow-none hover:bg-slate-50"
        >
          <Link href={`/study/flashcards/create?classId=${classId}`}>
            <Zap className="h-4 w-4" aria-hidden="true" />
            Create Set
          </Link>
        </Button>
      </div>

      <div className="space-y-3">
        {flashcardSets.length > 0 ? (
          flashcardSets.map((set) => (
            <FlashcardSetCard key={set.id} classId={classId} set={set} />
          ))
        ) : (
          <Link
            href={`/study/flashcards/create?classId=${classId}`}
            className="flex h-[68px] items-center justify-center gap-3 rounded-xl border border-dashed border-slate-300 bg-white text-sm font-semibold text-slate-600 transition hover:border-slate-400 hover:bg-slate-50 hover:text-slate-950"
          >
            <Plus className="h-5 w-5" aria-hidden="true" />
            Create Flashcard Set
          </Link>
        )}
      </div>
    </section>
  );
}

function FlashcardSetCard({
  classId,
  set,
}: {
  classId: string;
  set: FlashcardSet;
}) {
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
            <Link href={set.href}>Open</Link>
          </Button>
          <StartStudySessionButton
            classId={classId}
            flashcardSetId={set.id}
            title={set.title}
            sessionType="flashcards"
            label="Study"
            variant="default"
            className="h-8 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white shadow-none hover:bg-slate-800"
          />
        </div>
      </div>
    </article>
  );
}

function ThisWeekPanel({ items }: { items: WeekItem[] }) {
  return (
    <Panel title="This Week" icon={CalendarDays}>
      <div className="mt-6 space-y-3">
        {items.length > 0 ? (
          items.slice(0, 6).map((item) => (
            <div
              key={`${item.kind}-${item.id}`}
              className="flex items-start gap-3 rounded-lg border border-slate-200 px-3 py-3"
            >
              <span
                className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                  item.kind === "task"
                    ? "bg-blue-50 text-blue-700"
                    : "bg-amber-50 text-amber-700"
                }`}
              >
                {item.kind === "task" ? (
                  <Clock3 className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <CalendarClock className="h-4 w-4" aria-hidden="true" />
                )}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-950">
                  {item.title}
                </p>
                <p className="mt-1 text-xs text-slate-600">
                  {item.kind === "task" ? "Study block" : "Due"} -{" "}
                  {formatShortDate(item.date)}
                </p>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-lg border border-dashed border-slate-300 px-4 py-6 text-center">
            <p className="text-sm font-semibold text-slate-950">
              No scheduled work this week
            </p>
            <p className="mt-1 text-sm text-slate-600">
              Add an assignment or generate a plan when this class picks up.
            </p>
          </div>
        )}
      </div>
    </Panel>
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

function QuickActionLink({ action }: { action: QuickAction }) {
  const Icon = action.icon;

  return (
    <Link
      href={action.href}
      className="flex min-h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-950 transition hover:bg-slate-50"
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

async function getClassWorkspaceData(classId: string) {
  const todayKey = getDateKey();
  const weekAheadKey = getDateKey(addDays(new Date(), 7));

  try {
    const supabase = await createClient();
    const [
      courseResult,
      flashcardResult,
      notesResult,
      assignmentsResult,
      studySessionsResult,
      activeSessionResult,
      plannerTasksResult,
    ] = await Promise.all([
      supabase
        .from("classes")
        .select("name, class_code, prof_name")
        .eq("id", classId)
        .maybeSingle(),
      supabase
        .from("flashcard_sets")
        .select("id, title, created_at, flashcards(mastery_level)")
        .eq("class_id", classId)
        .order("created_at", { ascending: false }),
      supabase
        .from("notes")
        .select("id, title, source_type, created_at")
        .eq("class_id", classId)
        .order("created_at", { ascending: false })
        .limit(3),
      supabase
        .from("assignments")
        .select(
          "id, title, due_date, status, importance, original_file_name, file_type, file_size_bytes, context_status, created_at, updated_at",
        )
        .eq("class_id", classId)
        .order("due_date", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false }),
      supabase
        .from("study_sessions")
        .select("id, title, assignment_id, class_id, planned_minutes, actual_minutes, session_type, started_at, ended_at")
        .eq("class_id", classId)
        .eq("status", "completed")
        .not("ended_at", "is", null)
        .order("ended_at", { ascending: false }),
      supabase
        .from("study_sessions")
        .select("id, title, assignment_id, class_id, planned_minutes, actual_minutes, session_type, started_at, ended_at")
        .eq("class_id", classId)
        .eq("status", "active")
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("study_plan_tasks")
        .select("id, assignment_id, title, priority, status, scheduled_date")
        .eq("class_id", classId)
        .gte("scheduled_date", todayKey)
        .lte("scheduled_date", weekAheadKey)
        .order("scheduled_date", { ascending: true })
        .order("created_at", { ascending: true }),
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
        ? dbFlashcardSets.slice(0, 3).map((set) => {
            const cards = Array.isArray(set.flashcards) ? set.flashcards : [];
            const mastery = cards.length
              ? Math.round(
                  cards.reduce(
                    (sum, card) => sum + (card.mastery_level ?? 0),
                    0,
                  ) / cards.length,
                )
              : 0;

            return {
              id: set.id,
              title: set.title ?? "Untitled Flashcard Set",
              lastStudied: formatRelativeDate(set.created_at),
              mastery,
              cardCount: cards.length,
              href: `/study/flashcards/${set.id}`,
            };
          })
        : [];

    const dbNotes = (notesResult.data ?? []) as NoteRow[];
    const dbAssignments = (assignmentsResult.data ?? []) as AssignmentRow[];
    const dbStudySessions = (studySessionsResult.data ?? []) as StudySessionRow[];
    const dbPlannerTasks = (plannerTasksResult.data ?? []) as PlannerTaskRow[];
    const activeSession = activeSessionResult.data as StudySessionRow | null;
    const courseProgress = getCourseProgress({
      assignments: dbAssignments,
      flashcardSets: dbFlashcardSets,
      studySessions: dbStudySessions,
    });
    const assignmentIds = dbAssignments.map((assignment) => assignment.id);
    const assignmentTitleById = new Map(
      dbAssignments.map((assignment) => [
        assignment.id,
        assignment.title ?? "Untitled Assignment",
      ]),
    );
    let dbAssignmentMaterials: AssignmentMaterialRow[] = [];

    if (assignmentIds.length > 0) {
      const materialsResult = await supabase
        .from("assignment_materials")
        .select(
          "id, assignment_id, original_file_name, file_type, file_size_bytes, created_at",
        )
        .in("assignment_id", assignmentIds)
        .order("created_at", { ascending: false });

      dbAssignmentMaterials = (materialsResult.data ?? []) as AssignmentMaterialRow[];
    }

    const materialCountByAssignment = getMaterialCountByAssignment(
      dbAssignmentMaterials,
    );

    const assignments: ClassAssignmentOption[] = dbAssignments.map(
      (assignment) => ({
        id: assignment.id,
        title: assignment.title ?? "Untitled Assignment",
        dueDate: assignment.due_date,
        hasAssignmentFile: Boolean(assignment.original_file_name),
      }),
    );

    const assignmentSummaries = getAssignmentSummaries({
      assignments: dbAssignments,
      materialCountByAssignment,
    });

    const assignmentFileMaterials: ClassMaterial[] = dbAssignments
      .filter((assignment) => assignment.original_file_name)
      .map((assignment) => ({
        id: `assignment-file-${assignment.id}`,
        title:
          assignment.original_file_name ??
          `${assignment.title ?? "Assignment"} instructions`,
        meta: `${assignment.title ?? "Assignment"} - Instructions - Updated ${formatShortDate(
          assignment.updated_at ?? assignment.created_at,
        )}`,
        kind: "assignment_file",
      }));

    const supplementalMaterials: ClassMaterial[] = dbAssignmentMaterials.map(
      (material) => ({
        id: material.id,
        title: material.original_file_name ?? "Untitled Material",
        meta: `${assignmentTitleById.get(material.assignment_id) ?? "Assignment"} - Uploaded ${formatShortDate(
          material.created_at,
        )}`,
        kind: "study_material",
      }),
    );

    const noteMaterials: ClassMaterial[] =
      dbNotes.length > 0
        ? dbNotes.map((note) => ({
            id: note.id,
            title: note.title ?? "Untitled Material",
            meta: `${(note.source_type ?? "File").toUpperCase()} - Uploaded ${formatShortDate(
              note.created_at,
            )}`,
            kind: "note",
          }))
        : [];

    const materials = [
      ...assignmentFileMaterials,
      ...supplementalMaterials,
      ...noteMaterials,
    ];

    return {
      course,
      flashcardSets,
      courseProgress,
      assignments,
      assignmentSummaries,
      plannerTasks: dbPlannerTasks,
      activeSession,
      materials,
      materialCount: materials.length,
      weekItems: getWeekItems({
        tasks: dbPlannerTasks,
        assignments: assignmentSummaries,
        todayKey,
        weekAheadKey,
      }),
    };
  } catch {
    return {
      course: fallbackCourse,
      flashcardSets: [],
      courseProgress: getCourseProgress({
        assignments: [],
        flashcardSets: [],
        studySessions: [],
      }),
      assignments: [],
      assignmentSummaries: [],
      plannerTasks: [],
      activeSession: null,
      materials: [],
      materialCount: 0,
      weekItems: [],
    };
  }
}

function getAssignmentSummaries({
  assignments,
  materialCountByAssignment,
}: {
  assignments: AssignmentRow[];
  materialCountByAssignment: Map<string, number>;
}) {
  return assignments
    .map((assignment) => ({
      id: assignment.id,
      title: assignment.title ?? "Untitled Assignment",
      dueDate: assignment.due_date,
      status: assignment.status ?? "not_started",
      importance: assignment.importance ?? "medium",
      hasAssignmentFile: Boolean(assignment.original_file_name),
      materialCount:
        (assignment.original_file_name ? 1 : 0) +
        (materialCountByAssignment.get(assignment.id) ?? 0),
      contextStatus: assignment.context_status ?? "missing",
    }))
    .sort(sortCourseAssignments);
}

function getMaterialCountByAssignment(materials: AssignmentMaterialRow[]) {
  const counts = new Map<string, number>();

  materials.forEach((material) => {
    counts.set(material.assignment_id, (counts.get(material.assignment_id) ?? 0) + 1);
  });

  return counts;
}

function sortCourseAssignments(first: CourseAssignment, second: CourseAssignment) {
  if (first.status === "completed" && second.status !== "completed") return 1;
  if (first.status !== "completed" && second.status === "completed") return -1;

  const firstDate = first.dueDate?.slice(0, 10);
  const secondDate = second.dueDate?.slice(0, 10);

  if (firstDate && secondDate) return firstDate.localeCompare(secondDate);
  if (firstDate) return -1;
  if (secondDate) return 1;

  return first.title.localeCompare(second.title);
}

function getCourseProgress({
  assignments,
  flashcardSets,
  studySessions,
}: {
  assignments: AssignmentRow[];
  flashcardSets: FlashcardSetRow[];
  studySessions: StudySessionRow[];
}): CourseProgress {
  const totalAssignments = assignments.length;
  const completedAssignments = assignments.filter(
    (assignment) => assignment.status === "completed",
  ).length;
  const assignmentPercent =
    totalAssignments > 0
      ? Math.round((completedAssignments / totalAssignments) * 100)
      : null;
  const flashcards = flashcardSets.flatMap((set) =>
    Array.isArray(set.flashcards) ? set.flashcards : [],
  );
  const flashcardCount = flashcards.length;
  const flashcardMasteryPercent =
    flashcardCount > 0
      ? Math.round(
          flashcards.reduce(
            (sum, card) => sum + (card.mastery_level ?? 0),
            0,
          ) / flashcardCount,
        )
      : 0;
  const availableProgress = [
    assignmentPercent,
    flashcardCount > 0 ? flashcardMasteryPercent : null,
  ].filter((value): value is number => value !== null);

  return {
    overallPercent:
      availableProgress.length > 0
        ? Math.round(
            availableProgress.reduce((sum, value) => sum + value, 0) /
              availableProgress.length,
          )
        : 0,
    completedAssignments,
    totalAssignments,
    flashcardMasteryPercent,
    flashcardCount,
    studyStreakDays: getStudyStreakDays(studySessions),
  };
}

function getNextUp({
  classId,
  activeSession,
  plannerTasks,
  assignments,
  flashcardSets,
  materialCount,
}: {
  classId: string;
  activeSession: StudySessionRow | null;
  plannerTasks: PlannerTaskRow[];
  assignments: CourseAssignment[];
  flashcardSets: FlashcardSet[];
  materialCount: number;
}): NextUpItem {
  const todayKey = getDateKey();
  const weekAheadKey = getDateKey(addDays(new Date(), 7));

  if (activeSession?.id) {
    return {
      eyebrow: "Resume",
      title: activeSession.title ?? "Active Study Block",
      description: "Pick up the guided study block already in progress.",
      meta: `Started ${formatRelativeTime(activeSession.started_at ?? null)}`,
      icon: Clock3,
      tone: "emerald",
      action: {
        type: "link",
        label: "Resume Block",
        href: `/study-session/${activeSession.id}`,
      },
    };
  }

  const todaysTask = plannerTasks.find(
    (task) =>
      task.status !== "completed" && task.scheduled_date?.slice(0, 10) === todayKey,
  );

  if (todaysTask) {
    return {
      eyebrow: "Today",
      title: todaysTask.title ?? "Study Block",
      description: "This block is already on your planner for this class.",
      meta: `Scheduled for ${formatShortDate(todayKey)}`,
      icon: Target,
      tone: "blue",
      action: {
        type: "study",
        label: "Start Block",
        title: todaysTask.title ?? "Study Block",
        classId,
        assignmentId: todaysTask.assignment_id,
        plannerTaskId: todaysTask.id,
        sessionType: inferTaskSessionType(todaysTask.title ?? ""),
      },
    };
  }

  const dueSoonAssignment = assignments.find((assignment) => {
    const dueDate = assignment.dueDate?.slice(0, 10);
    return (
      assignment.status !== "completed" &&
      Boolean(dueDate) &&
      dueDate! <= weekAheadKey
    );
  });

  if (dueSoonAssignment) {
    const dueState = getDueState(dueSoonAssignment);
    return {
      eyebrow: dueState.label,
      title: dueSoonAssignment.title,
      description: dueSoonAssignment.hasAssignmentFile
        ? "The assignment instructions are attached, so the guided session can stay grounded."
        : "Add instructions when you can, or start with the assignment details already saved.",
      meta: dueSoonAssignment.materialCount > 0
        ? formatMaterialCount(dueSoonAssignment.materialCount)
        : "No materials attached yet",
      icon: dueState.isUrgent ? AlertCircle : CalendarClock,
      tone: dueState.isUrgent ? "amber" : "slate",
      action: {
        type: "study",
        label: "Work on It",
        title: dueSoonAssignment.title,
        classId,
        assignmentId: dueSoonAssignment.id,
        sessionType: "assignment",
      },
    };
  }

  if (assignments.length === 0 && materialCount === 0) {
    return {
      eyebrow: "Set Up",
      title: "Add the first assignment or course material",
      description:
        "Once this class has real course context, the page can surface the right next study block.",
      meta: "No assignments or materials yet",
      icon: Upload,
      tone: "slate",
      action: {
        type: "link",
        label: "Add Context",
        href: "#materials",
      },
    };
  }

  const reviewSet = flashcardSets[0];

  if (reviewSet) {
    return {
      eyebrow: "Review",
      title: reviewSet.title,
      description:
        "No urgent class work is due soon, so this is a good moment for light retrieval practice.",
      meta: `${reviewSet.mastery}% mastery - ${reviewSet.cardCount} cards`,
      icon: Brain,
      tone: "emerald",
      action: {
        type: "study",
        label: "Review Cards",
        title: reviewSet.title,
        classId,
        flashcardSetId: reviewSet.id,
        sessionType: "flashcards",
      },
    };
  }

  return {
    eyebrow: "Caught Up",
    title: "Plan the next study block",
    description:
      "This class has context, but no immediate study block is scheduled. Open the planner when you want to map out the next step.",
    meta: `${assignments.length} assignment${assignments.length === 1 ? "" : "s"} in this class`,
    icon: CalendarDays,
    tone: "slate",
    action: {
      type: "link",
      label: "Open Planner",
      href: "/planner",
    },
  };
}

function getWeekItems({
  tasks,
  assignments,
  todayKey,
  weekAheadKey,
}: {
  tasks: PlannerTaskRow[];
  assignments: CourseAssignment[];
  todayKey: string;
  weekAheadKey: string;
}) {
  const taskItems: WeekItem[] = tasks
    .filter((task) => task.status !== "completed" && task.scheduled_date)
    .map((task) => ({
      id: task.id,
      title: task.title ?? "Study Block",
      date: task.scheduled_date!.slice(0, 10),
      kind: "task",
      status: task.status ?? "todo",
    }));

  const assignmentItems: WeekItem[] = assignments
    .filter((assignment) => {
      const dueDate = assignment.dueDate?.slice(0, 10);
      return (
        assignment.status !== "completed" &&
        Boolean(dueDate) &&
        dueDate! >= todayKey &&
        dueDate! <= weekAheadKey
      );
    })
    .map((assignment) => ({
      id: assignment.id,
      title: assignment.title,
      date: assignment.dueDate!.slice(0, 10),
      kind: "assignment",
      status: assignment.status,
    }));

  return [...taskItems, ...assignmentItems].sort((first, second) =>
    first.date.localeCompare(second.date),
  );
}

function getQuickActions(classId: string): QuickAction[] {
  return [
    {
      label: "Add Assignment",
      icon: Plus,
      href: "#materials",
    },
    {
      label: "Upload Materials",
      icon: Upload,
      href: "#materials",
    },
    {
      label: "Create Flashcards",
      icon: Brain,
      href: `/study/flashcards/create?classId=${classId}`,
    },
    {
      label: "Open Planner",
      icon: CalendarDays,
      href: "/planner",
    },
    {
      label: "Study Tools",
      icon: Sparkles,
      href: "/study",
    },
  ];
}

function getStudyStreakDays(studySessions: StudySessionRow[]) {
  const studiedDays = new Set(
    studySessions
      .map((session) => getLocalDateKey(session.ended_at))
      .filter((dateKey): dateKey is string => Boolean(dateKey)),
  );

  if (studiedDays.size === 0) return 0;

  const cursor = new Date();
  const todayKey = getLocalDateKey(cursor.toISOString());

  if (!todayKey || !studiedDays.has(todayKey)) {
    cursor.setDate(cursor.getDate() - 1);
  }

  let streakDays = 0;

  while (studiedDays.has(getLocalDateKey(cursor.toISOString()) ?? "")) {
    streakDays += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streakDays;
}

function getDueState(assignment: CourseAssignment) {
  const todayKey = getDateKey();
  const dueDate = assignment.dueDate?.slice(0, 10);

  if (assignment.status === "completed") {
    return {
      label: "Completed",
      icon: <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />,
      cardClass: "border-emerald-200",
      accentClass: "bg-emerald-500",
      badgeClass: "border-emerald-200 bg-emerald-50 text-emerald-700",
      isUrgent: false,
    };
  }

  if (!dueDate) {
    return {
      label: "Unscheduled",
      icon: <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />,
      cardClass: "border-slate-200",
      accentClass: "bg-slate-300",
      badgeClass: "border-slate-200 bg-slate-50 text-slate-700",
      isUrgent: false,
    };
  }

  if (dueDate < todayKey) {
    return {
      label: "Overdue",
      icon: <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />,
      cardClass: "border-red-200 bg-red-50/40",
      accentClass: "bg-red-500",
      badgeClass: "border-red-200 bg-red-50 text-red-700",
      isUrgent: true,
    };
  }

  if (dueDate === todayKey) {
    return {
      label: "Due today",
      icon: <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />,
      cardClass: "border-amber-200 bg-amber-50/40",
      accentClass: "bg-amber-500",
      badgeClass: "border-amber-200 bg-amber-50 text-amber-700",
      isUrgent: true,
    };
  }

  return {
    label: `Due ${formatShortDate(dueDate)}`,
    icon: <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />,
    cardClass: "border-slate-200",
    accentClass: "bg-blue-500",
    badgeClass: "border-blue-200 bg-blue-50 text-blue-700",
    isUrgent: false,
  };
}

function getAssignmentStatusBadge(status: string) {
  if (status === "completed") {
    return {
      label: "Completed",
      className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    };
  }

  if (status === "in_progress") {
    return {
      label: "In progress",
      className: "border-blue-200 bg-blue-50 text-blue-700",
    };
  }

  return {
    label: "Not started",
    className: "border-slate-200 bg-slate-50 text-slate-700",
  };
}

function getContextBadge(assignment: CourseAssignment) {
  if (assignment.contextStatus === "ready") {
    return {
      label: "AI context ready",
      className: "text-emerald-700",
      icon: <CheckCircle2 className="h-4 w-4" aria-hidden="true" />,
    };
  }

  if (assignment.contextStatus === "processing") {
    return {
      label: "Processing context",
      className: "text-blue-700",
      icon: <Clock3 className="h-4 w-4" aria-hidden="true" />,
    };
  }

  if (assignment.contextStatus === "failed") {
    return {
      label: "Needs re-upload",
      className: "text-red-700",
      icon: <AlertCircle className="h-4 w-4" aria-hidden="true" />,
    };
  }

  return {
    label: assignment.hasAssignmentFile ? "Context pending" : "Needs context",
    className: "text-slate-600",
    icon: <FileText className="h-4 w-4" aria-hidden="true" />,
  };
}

function getImportanceClass(importance: string) {
  const styles: Record<string, string> = {
    low: "border-emerald-200 bg-emerald-50 text-emerald-700",
    medium: "border-amber-200 bg-amber-50 text-amber-700",
    high: "border-orange-200 bg-orange-50 text-orange-700",
    critical: "border-red-200 bg-red-50 text-red-700",
  };

  return styles[importance] ?? "border-slate-200 bg-slate-50 text-slate-700";
}

function inferTaskSessionType(title: string): StudySessionType {
  const normalizedTitle = title.toLowerCase();

  if (normalizedTitle.includes("flashcard")) return "flashcards";
  if (normalizedTitle.includes("quiz")) return "practice_quiz";

  return "assignment";
}

function formatMaterialCount(count: number) {
  return `${count} material${count === 1 ? "" : "s"}`;
}

function formatDayCount(days: number) {
  return `${days} ${days === 1 ? "day" : "days"}`;
}

function getDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function getLocalDateKey(value: string | null) {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return getDateKey(date);
}

function formatRelativeTime(value: string | null) {
  if (!value) return "recently";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "recently";

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60_000));

  if (diffMinutes < 1) return "just now";
  if (diffMinutes < 60) return `${diffMinutes} min ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} hr ago`;

  return formatRelativeDate(value).toLowerCase();
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

  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "recently";

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}
