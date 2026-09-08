import { CalendarClock, CalendarDays, Clock3, Flame, Target, TrendingUp, type LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { ProgressBar } from "./ClassFlashcardsSection";
import { formatShortDate, type CourseProgress, type QuickAction, type WeekItem } from "@/lib/classes/classWorkspace";

export function ClassWorkspaceSidebar({
  courseProgress,
  materialCount,
  weekItems,
  quickActions,
}: {
  courseProgress: CourseProgress;
  materialCount: number;
  weekItems: WeekItem[];
  quickActions: QuickAction[];
}) {
  return (
    <aside className="space-y-6">
      <Panel title="Course Snapshot" icon={TrendingUp}>
        <div className="mt-8">
          <div className="flex items-center justify-between text-sm"><span className="text-slate-600">Overall Progress</span><span className="font-semibold text-slate-950">{courseProgress.overallPercent}%</span></div>
          <ProgressBar value={courseProgress.overallPercent} className="mt-3" />
        </div>
        <div className="mt-5 border-t border-slate-200 pt-4">
          <MetricRow label="Assignments" value={`${courseProgress.completedAssignments}/${courseProgress.totalAssignments}`} />
          <MetricRow label="Flashcard Mastery" value={courseProgress.flashcardCount > 0 ? `${courseProgress.flashcardMasteryPercent}%` : "No cards"} />
          <MetricRow label="Course Materials" value={`${materialCount}`} />
          <div className="flex items-center justify-between text-sm"><span className="text-slate-600">Study Streak</span><span className="inline-flex items-center gap-1 font-semibold text-slate-950">{courseProgress.studyStreakDays} {courseProgress.studyStreakDays === 1 ? "day" : "days"}<Flame className="h-4 w-4 text-orange-500" aria-hidden="true" /></span></div>
        </div>
      </Panel>
      <ThisWeekPanel items={weekItems} />
      <Panel title="Course Tools" icon={Target}>
        <div className="mt-6 space-y-2">
          {quickActions.map((action) => <QuickActionLink key={action.label} action={action} />)}
        </div>
      </Panel>
    </aside>
  );
}

function ThisWeekPanel({ items }: { items: WeekItem[] }) {
  return (
    <Panel title="This Week" icon={CalendarDays}>
      <div className="mt-6 space-y-3">
        {items.length > 0 ? items.slice(0, 6).map((item) => (
          <div key={`${item.kind}-${item.id}`} className="flex items-start gap-3 rounded-lg border border-slate-200 px-3 py-3">
            <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${item.kind === "task" ? "bg-blue-50 text-blue-700" : "bg-amber-50 text-amber-700"}`}>
              {item.kind === "task" ? <Clock3 className="h-4 w-4" aria-hidden="true" /> : <CalendarClock className="h-4 w-4" aria-hidden="true" />}
            </span>
            <div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-950">{item.title}</p><p className="mt-1 text-xs text-slate-600">{item.kind === "task" ? "Study block" : "Due"} - {formatShortDate(item.date)}</p></div>
          </div>
        )) : (
          <div className="rounded-lg border border-dashed border-slate-300 px-4 py-6 text-center"><p className="text-sm font-semibold text-slate-950">No scheduled work this week</p><p className="mt-1 text-sm text-slate-600">Add an assignment or generate a plan when this class picks up.</p></div>
        )}
      </div>
    </Panel>
  );
}

function Panel({ title, icon: Icon, children }: { title: string; icon?: LucideIcon; children: ReactNode }) {
  return <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex items-center gap-2">{Icon ? <Icon className="h-4 w-4 text-slate-950" aria-hidden="true" /> : null}<h2 className="text-base font-semibold text-slate-950">{title}</h2></div>{children}</section>;
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return <div className="mb-4 flex items-center justify-between text-sm"><span className="text-slate-600">{label}</span><span className="font-semibold text-slate-950">{value}</span></div>;
}

function QuickActionLink({ action }: { action: QuickAction }) {
  const Icon = action.icon;
  return <Link href={action.href} className="flex min-h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-950 transition hover:bg-slate-50"><Icon className="h-4 w-4" aria-hidden="true" />{action.label}</Link>;
}
