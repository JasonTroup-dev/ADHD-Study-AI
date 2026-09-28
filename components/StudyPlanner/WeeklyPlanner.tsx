"use client";

import Link from "next/link";
import styles from "./WeeklyPlanner.module.css";
import { useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Leaf,
  Plus,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { CalendarTaskForm } from "@/components/calendar/CalendarTaskForm";
import { supabase } from "@/lib/supabase/client";
import { toLocalDateString } from "@/lib/calendar/getCalendarDays";
import { addPlanningDays } from "@/lib/planner/preferences";
import {
  dayWorkload,
  orderWeeklyTasks,
  planningWeek,
  type WeeklyTask,
} from "@/lib/planner/weeklyPlan";
import type { StudyPlanImportSummary } from "@/types/syllabus";
import StudyPlannerModal from "./StudyPlannerModal";
import { CatchUpPlanner } from "./CatchUpPlanner";
import { DailyCapacity } from "./DailyCapacity";
import { WeeklyTaskCard } from "./WeeklyTaskCard";
import { useWeeklyPlanner, type WeeklyPlannerData } from "./useWeeklyPlanner";

const accentButton = "bg-violet-600 text-white hover:bg-violet-700";
function formatDay(date: string, options: Intl.DateTimeFormatOptions) {
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-US", options);
}

export function WeeklyPlanner({
  initialData,
  initialDate,
  readOnly = false,
}: {
  initialData?: WeeklyPlannerData;
  initialDate?: Date;
  readOnly?: boolean;
}) {
  const [today] = useState(() => toLocalDateString(initialDate ?? new Date()));
  const [selectedDate, setSelectedDate] = useState(today);
  const [refresh, setRefresh] = useState(0);
  const [panel, setPanel] = useState<"plan" | "upcoming">("plan");
  const [importOpen, setImportOpen] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);
  const [taskBusy, setTaskBusy] = useState(false);
  const [planBusy, setPlanBusy] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [writeError, setWriteError] = useState<string | null>(null);
  const { tasks, assignments, classes, loading, error } = useWeeklyPlanner(
    initialData,
    refresh,
  );
  const week = planningWeek(selectedDate);
  const visibleTasks = orderWeeklyTasks(
    tasks.filter((task) => task.scheduled_date === selectedDate),
    assignments,
  );
  const remainingTasks = visibleTasks.filter(
    (task) => task.status !== "completed",
  );
  const completedTasks = visibleTasks.filter(
    (task) => task.status === "completed",
  );
  const workload = dayWorkload(visibleTasks);
  const unfinishedAssignments = assignments.filter(
    (assignment) => assignment.status !== "completed",
  );
  const deadlines = unfinishedAssignments
    .filter((assignment) => assignment.due_date && assignment.due_date >= today)
    .sort(
      (a, b) =>
        a.due_date!.localeCompare(b.due_date!) ||
        a.title.localeCompare(b.title),
    )
    .slice(0, 5);
  const overdueTasks = tasks.filter(
    (task) => task.status !== "completed" && task.scheduled_date < today,
  );
  const overdueAssignments = unfinishedAssignments.filter(
    (assignment) => assignment.due_date && assignment.due_date < today,
  );
  const undatedAssignments = unfinishedAssignments.filter(
    (assignment) => !assignment.due_date,
  );
  const firstPlan = tasks.length === 0;
  const routePrefix = readOnly ? "/demo" : "";

  function refreshPlan(message?: string) {
    setRefresh((value) => value + 1);
    if (message) setNotice(message);
  }
  function imported(summary: StudyPlanImportSummary) {
    refreshPlan(
      `${summary.classCreated ? `${summary.className} was created. ` : ""}Study plan created with ${summary.assignmentCount} assignments and ${summary.studySessionCount} study blocks.`,
    );
  }
  async function toggleTask(task: WeeklyTask) {
    if (toggling || readOnly || planBusy) return;
    setToggling(true);
    setWriteError(null);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Sign in to update your task.");
      const result = await supabase
        .from("study_plan_tasks")
        .update({ status: task.status === "completed" ? "todo" : "completed" })
        .eq("id", task.id)
        .eq("user_id", user.id)
        .eq("status", task.status)
        .select("id")
        .maybeSingle();
      if (result.error || !result.data)
        throw new Error(
          "The task could not be updated. Refresh your plan and try again.",
        );
      refreshPlan(
        task.status === "completed"
          ? "Task marked incomplete."
          : "One step done. Nice work.",
      );
    } catch (error) {
      setWriteError(
        error instanceof Error
          ? error.message
          : "The task could not be updated.",
      );
    } finally {
      setToggling(false);
    }
  }

  return (
    <div className={`${styles.workspace} w-full bg-[#f7f8fc] text-slate-900`}>
      <div
        className={`${styles.frame} mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8`}
      >
        <header
          className={`${styles.header} flex flex-wrap items-start justify-between gap-4`}
        >
          <div>
            <p
              className={`${styles.eyebrow} mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-violet-700`}
            >
              Study Planner
            </p>
            <h1 className="text-2xl font-medium tracking-tight sm:text-3xl">
              Make this week manageable.
            </h1>
            <p
              className={`${styles.subtitle} mt-2 max-w-xl text-sm leading-6 text-slate-600`}
            >
              Small steps toward your deadlines, with room for life.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href={`${routePrefix}/calendar`}>
                <CalendarDays aria-hidden="true" />
                Calendar
              </Link>
            </Button>
            <Button
              variant="outline"
              onClick={() => setImportOpen(true)}
              disabled={readOnly || planBusy || loading || !!error}
            >
              <Sparkles aria-hidden="true" />
              Import syllabus
            </Button>
          </div>
        </header>

        {notice ? (
          <div
            role="status"
            className={`${styles.notice} flex items-start justify-between gap-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900`}
          >
            <span>{notice}</span>
            <button
              type="button"
              className="shrink-0 rounded font-medium underline"
              onClick={() => setNotice(null)}
            >
              Dismiss
            </button>
          </div>
        ) : null}
        {writeError ? (
          <p
            role="alert"
            className={`${styles.notice} rounded-xl bg-red-50 p-4 text-sm text-red-800`}
          >
            {writeError}
          </p>
        ) : null}

        <section className={styles.week} aria-label="Planning week">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-medium">
              {formatDay(week[0], { month: "short", day: "numeric" })} –{" "}
              {formatDay(week[6], {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </h2>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                aria-label="Previous week"
                disabled={planBusy}
                onClick={() =>
                  setSelectedDate(addPlanningDays(selectedDate, -7))
                }
              >
                <ChevronLeft aria-hidden="true" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={planBusy}
                onClick={() => setSelectedDate(today)}
              >
                Today
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Next week"
                disabled={planBusy}
                onClick={() =>
                  setSelectedDate(addPlanningDays(selectedDate, 7))
                }
              >
                <ChevronRight aria-hidden="true" />
              </Button>
            </div>
          </div>
          <div className={styles.weekDays}>
            {week.map((date) => {
              const dayTasks = tasks.filter(
                (task) => task.scheduled_date === date,
              );
              const load = dayWorkload(dayTasks);
              const label =
                loading || error
                  ? "—"
                  : load.unknown
                    ? `${load.remaining} ${load.remaining === 1 ? "step" : "steps"}`
                    : load.minutes
                      ? `~${load.minutes} min`
                      : load.completed
                        ? "Done"
                        : "Open";
              return (
                <button
                  key={date}
                  type="button"
                  disabled={planBusy}
                  aria-pressed={selectedDate === date}
                  aria-current={date === today ? "date" : undefined}
                  aria-label={`${formatDay(date, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}, ${label}`}
                  onClick={() => setSelectedDate(date)}
                  className={`${styles.day} flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl border px-1 py-3 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600 ${selectedDate === date ? "border-violet-400 bg-violet-50 text-violet-800" : "border-slate-200 bg-white text-slate-600 hover:border-violet-300"}`}
                >
                  <span className="text-xs">
                    {formatDay(date, { weekday: "short" })}
                    {date === today ? (
                      <span className={styles.todayLabel}> · Today</span>
                    ) : null}
                  </span>
                  <span className="text-xl font-medium">
                    {formatDay(date, { day: "numeric" })}
                  </span>
                  <span className={`${styles.dayLoad} text-xs`}>{label}</span>
                </button>
              );
            })}
          </div>
        </section>

        <div className={styles.tabs} role="group" aria-label="Planner panels">
          <Button
            size="sm"
            variant={panel === "plan" ? "default" : "outline"}
            aria-pressed={panel === "plan"}
            onClick={() => setPanel("plan")}
          >
            Day plan
          </Button>
          <Button
            size="sm"
            variant={panel === "upcoming" ? "default" : "outline"}
            aria-pressed={panel === "upcoming"}
            onClick={() => setPanel("upcoming")}
          >
            Upcoming & catch up
          </Button>
        </div>
        {loading ? (
          <div
            role="status"
            className="mt-6 rounded-2xl border border-slate-200 bg-white p-8 text-slate-600"
          >
            Loading your study plan…
          </div>
        ) : error ? (
          <div
            role="alert"
            className="mt-6 rounded-2xl border border-red-200 bg-white p-6"
          >
            <p className="text-red-800">{error}</p>
            <Button
              variant="outline"
              className="mt-3"
              onClick={() => refreshPlan()}
            >
              Retry loading plan
            </Button>
          </div>
        ) : (
          <div className={styles.content} data-panel={panel}>
            <section
              aria-label="Daily study plan"
              className={`${styles.dayPanel} min-w-0 rounded-2xl border border-slate-200 bg-white`}
            >
              <div className="mb-4 flex shrink-0 flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-medium">
                    {selectedDate === today
                      ? "Today’s plan"
                      : formatDay(selectedDate, {
                          weekday: "long",
                          month: "short",
                          day: "numeric",
                        })}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {remainingTasks.length
                      ? `${remainingTasks.length} ${remainingTasks.length === 1 ? "step" : "steps"} to work on`
                      : completedTasks.length
                        ? "Your planned steps are done."
                        : "A little space to plan your next step."}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={readOnly || planBusy}
                  onClick={() => setTaskOpen(true)}
                >
                  <Plus aria-hidden="true" />
                  Add task
                </Button>
              </div>
              <div
                className={styles.dayScroll}
                role="region"
                aria-label="Study steps and available time"
                tabIndex={0}
              >
                {!firstPlan ? (
                  <DailyCapacity
                    key={`${selectedDate}-${refresh}`}
                    date={selectedDate}
                    today={today}
                    workload={workload}
                    readOnly={readOnly}
                    onChanged={refreshPlan}
                    onBusyChange={setPlanBusy}
                  />
                ) : null}
                {remainingTasks.length ? (
                  <div className="mt-5 space-y-3">
                    {remainingTasks.map((task, index) => (
                      <WeeklyTaskCard
                        key={task.id}
                        task={task}
                        assignment={assignments.find(
                          (assignment) => assignment.id === task.assignment_id,
                        )}
                        recommended={index === 0}
                        readOnly={readOnly}
                        busy={planBusy || toggling}
                        onToggle={(task) => void toggleTask(task)}
                        onChanged={() => refreshPlan()}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="px-2 py-9 text-center sm:px-7">
                    <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
                      {completedTasks.length ? (
                        <Check aria-hidden="true" />
                      ) : (
                        <Leaf aria-hidden="true" />
                      )}
                    </div>
                    <h3 className="text-lg font-medium">
                      {firstPlan
                        ? "Let’s plan your first study session."
                        : completedTasks.length
                          ? "You’ve finished your planned steps."
                          : "Nothing scheduled. A little breathing room."}
                    </h3>
                    <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
                      {firstPlan
                        ? "Start with an assignment, bring in your syllabus, or add one small task."
                        : completedTasks.length
                          ? "Take a break, or choose another day to see what’s next."
                          : "Keep this space open, or add a small step toward an upcoming deadline."}
                    </p>
                    {firstPlan && !readOnly ? (
                      <div className="mt-5 flex flex-wrap justify-center gap-2">
                        <Button asChild className={accentButton}>
                          <Link href="/planner/assignments">
                            Use an assignment
                            <ArrowRight aria-hidden="true" />
                          </Link>
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setImportOpen(true)}
                        >
                          Import syllabus
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => setTaskOpen(true)}
                        >
                          Add a task manually
                        </Button>
                      </div>
                    ) : null}
                  </div>
                )}
                {completedTasks.length ? (
                  <details className="mt-5 border-t border-slate-100 pt-4">
                    <summary className="cursor-pointer rounded text-sm font-medium text-slate-600">
                      Completed · {completedTasks.length}
                    </summary>
                    <div className="mt-3 space-y-3">
                      {completedTasks.map((task) => (
                        <WeeklyTaskCard
                          key={task.id}
                          task={task}
                          recommended={false}
                          readOnly={readOnly}
                          busy={planBusy || toggling}
                          onToggle={(task) => void toggleTask(task)}
                          onChanged={() => refreshPlan()}
                        />
                      ))}
                    </div>
                  </details>
                ) : null}
              </div>
            </section>
            <aside
              className={`${styles.contextPanel} space-y-5`}
              aria-label="Planning context"
              tabIndex={0}
            >
              <section className="rounded-2xl border border-slate-200 bg-white p-5">
                <h2 className="text-lg font-medium">What’s coming up</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Your next deadlines across classes
                </p>
                <div className="mt-2 divide-y divide-slate-100">
                  {deadlines.map((assignment) => {
                    const count = tasks.filter(
                      (task) =>
                        task.assignment_id === assignment.id &&
                        task.status !== "completed" &&
                        task.scheduled_date >= today &&
                        task.scheduled_date <= assignment.due_date!,
                    ).length;
                    return (
                      <article key={assignment.id} className="py-4">
                        <p className="text-xs font-medium text-violet-700">
                          {assignment.classes?.name ?? "No class"}
                        </p>
                        <h3 className="mt-1 font-medium leading-6 break-words">
                          {readOnly ? (
                            assignment.title
                          ) : (
                            <Link
                              href={`/planner/assignments/${assignment.id}`}
                              className="rounded hover:underline"
                            >
                              {assignment.title}
                            </Link>
                          )}
                        </h3>
                        <p className="mt-1 text-sm text-slate-600">
                          {assignment.due_date === today
                            ? "Due today"
                            : `Due ${formatDay(assignment.due_date!, { weekday: "short", month: "short", day: "numeric" })}`}
                        </p>
                        <p className="mt-2 text-xs text-slate-500">
                          {count
                            ? `${count} ${count === 1 ? "session" : "sessions"} planned before the deadline`
                            : "No upcoming study sessions planned"}
                        </p>
                        {!readOnly && !count ? (
                          <Link
                            href={`/planner/assignments/${assignment.id}`}
                            className="mt-2 inline-flex min-h-9 items-center gap-1 rounded text-sm font-medium text-violet-700"
                          >
                            Plan small steps
                            <ArrowRight
                              className="size-3.5"
                              aria-hidden="true"
                            />
                          </Link>
                        ) : null}
                      </article>
                    );
                  })}
                </div>
                {!deadlines.length ? (
                  <p className="py-5 text-sm leading-6 text-slate-600">
                    No upcoming deadlines. Add an assignment when you’re ready.
                  </p>
                ) : null}
                {!readOnly ? (
                  <Link
                    href="/planner/assignments"
                    className="inline-flex min-h-9 items-center gap-2 rounded text-sm font-medium text-violet-700"
                  >
                    All assignments
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </Link>
                ) : null}
              </section>
              {overdueTasks.length || overdueAssignments.length ? (
                <section className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5">
                  <h2 className="font-medium">Pick up where you left off</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-700">
                    {overdueTasks.length} unfinished{" "}
                    {overdueTasks.length === 1 ? "session" : "sessions"} from
                    earlier days
                    {overdueAssignments.length
                      ? ` · ${overdueAssignments.length} overdue ${overdueAssignments.length === 1 ? "assignment" : "assignments"}`
                      : ""}
                    .
                  </p>
                  <details className="mt-3 text-sm">
                    <summary className="cursor-pointer rounded text-amber-950">
                      Review unfinished work
                    </summary>
                    <ul className="mt-2 space-y-2">
                      {overdueTasks.map((task) => (
                        <li key={task.id}>
                          <Link
                            href={`${routePrefix}/planner/tasks/${task.id}?from=planner`}
                            className="rounded underline underline-offset-2"
                          >
                            {task.title}
                          </Link>
                        </li>
                      ))}
                      {overdueAssignments.map((assignment) => (
                        <li key={assignment.id}>
                          {readOnly ? (
                            assignment.title
                          ) : (
                            <Link
                              href={`/planner/assignments/${assignment.id}`}
                              className="rounded underline underline-offset-2"
                            >
                              {assignment.title}
                            </Link>
                          )}{" "}
                          · overdue
                        </li>
                      ))}
                    </ul>
                  </details>
                </section>
              ) : null}
              {undatedAssignments.length ? (
                <p className="px-1 text-sm leading-6 text-slate-600">
                  {undatedAssignments.length}{" "}
                  {undatedAssignments.length === 1
                    ? "assignment needs"
                    : "assignments need"}{" "}
                  a deadline before scheduling.
                  {!readOnly ? (
                    <>
                      {" "}
                      <Link
                        href="/planner/assignments"
                        className="rounded text-violet-700 underline"
                      >
                        Review assignments
                      </Link>
                    </>
                  ) : null}
                </p>
              ) : null}
              {!readOnly ? (
                <div className="px-1">
                  <h2 className="text-sm font-medium">Plans can change.</h2>
                  <p className="mt-1 mb-3 text-sm leading-6 text-slate-600">
                    Adjust your study days or make room for unfinished work.
                  </p>
                  <CatchUpPlanner
                    onChanged={() =>
                      refreshPlan("Your weekly plan was updated.")
                    }
                  />
                </div>
              ) : null}
            </aside>
          </div>
        )}
        {!readOnly ? (
          <>
            <StudyPlannerModal
              isOpen={importOpen}
              classes={classes}
              onClose={() => setImportOpen(false)}
              onStudyPlanCreated={imported}
            />
            <Dialog
              open={taskOpen}
              onOpenChange={(open) => {
                if (!taskBusy) setTaskOpen(open);
              }}
            >
              <DialogContent className="max-h-[90svh] overflow-y-auto">
                <DialogTitle>Add a small study step</DialogTitle>
                <DialogDescription>
                  Choose a concrete action and roughly how long it will take.
                </DialogDescription>
                <CalendarTaskForm
                  key={selectedDate}
                  date={selectedDate}
                  classes={classes}
                  onBusyChange={setTaskBusy}
                  onCancel={() => setTaskOpen(false)}
                  onRefresh={() => {
                    setTaskOpen(false);
                    refreshPlan();
                  }}
                  onSaved={(date) => {
                    setTaskOpen(false);
                    setSelectedDate(date);
                    refreshPlan("Your new study task is on the plan.");
                  }}
                />
              </DialogContent>
            </Dialog>
          </>
        ) : null}
      </div>
    </div>
  );
}
