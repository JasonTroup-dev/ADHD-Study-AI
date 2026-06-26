"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { getCalendarDays } from "@/lib/calendar/getCalendarDays";
import { getClassColor, type ClassColor } from "@/lib/classColors";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase/client";

const WEEK_DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

type CalendarClass = {
  name: string;
  color: ClassColor | null;
};

type CalendarTask = {
  id: string;
  title: string;
  scheduled_date: string;
  status: string;
  classes: CalendarClass | CalendarClass[] | null;
};

type CalendarAssignment = {
  id: string;
  title: string;
  due_date: string;
  status: string;
  classes: CalendarClass | CalendarClass[] | null;
};

type CalendarItem = {
  id: string;
  title: string;
  date: string;
  isComplete: boolean;
  kind: "task" | "assignment";
  className: string;
  classColor: ClassColor | null;
};

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isSameDay(first: Date, second: Date) {
  return toDateKey(first) === toDateKey(second);
}

function getRelatedClass(
  relation: CalendarClass | CalendarClass[] | null,
) {
  if (!relation) return null;
  return Array.isArray(relation) ? relation[0] ?? null : relation;
}

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  const [items, setItems] = useState<CalendarItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const today = useMemo(() => new Date(), []);
  const calendarDays = useMemo(
    () => getCalendarDays(currentMonth),
    [currentMonth],
  );
  const visibleStart = toDateKey(calendarDays[0].date);
  const visibleEnd = toDateKey(calendarDays[calendarDays.length - 1].date);
  const monthTitle = currentMonth.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  useEffect(() => {
    let isActive = true;

    async function loadCalendarItems() {
      setIsLoading(true);
      setError(null);

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (!isActive) return;

      if (authError || !user) {
        setItems([]);
        setError("Sign in to view your calendar.");
        setIsLoading(false);
        return;
      }

      const [tasksResult, assignmentsResult] = await Promise.all([
        supabase
          .from("study_plan_tasks")
          .select("id, title, scheduled_date, status, classes(name, color)")
          .eq("user_id", user.id)
          .gte("scheduled_date", visibleStart)
          .lte("scheduled_date", visibleEnd)
          .order("scheduled_date", { ascending: true })
          .order("created_at", { ascending: true }),
        supabase
          .from("assignments")
          .select("id, title, due_date, status, classes(name, color)")
          .eq("user_id", user.id)
          .not("due_date", "is", null)
          .gte("due_date", visibleStart)
          .lte("due_date", visibleEnd)
          .order("due_date", { ascending: true })
          .order("created_at", { ascending: true }),
      ]);

      if (!isActive) return;

      const calendarItems: CalendarItem[] = [];

      if (!tasksResult.error) {
        (tasksResult.data as CalendarTask[] | null)?.forEach((task) => {
          const relatedClass = getRelatedClass(task.classes);
          calendarItems.push({
            id: task.id,
            title: task.title,
            date: task.scheduled_date.slice(0, 10),
            isComplete: task.status === "completed",
            kind: "task",
            className: relatedClass?.name ?? "No class",
            classColor: relatedClass?.color ?? null,
          });
        });
      }

      if (!assignmentsResult.error) {
        (assignmentsResult.data as CalendarAssignment[] | null)?.forEach(
          (assignment) => {
            const relatedClass = getRelatedClass(assignment.classes);
            calendarItems.push({
              id: assignment.id,
              title: assignment.title,
              date: assignment.due_date.slice(0, 10),
              isComplete: assignment.status === "completed",
              kind: "assignment",
              className: relatedClass?.name ?? "No class",
              classColor: relatedClass?.color ?? null,
            });
          },
        );
      }

      setItems(calendarItems);

      if (tasksResult.error && assignmentsResult.error) {
        console.error("Error loading calendar tasks:", tasksResult.error);
        console.error(
          "Error loading calendar assignments:",
          assignmentsResult.error,
        );
        setError("Your calendar could not be loaded. Please try again.");
      } else if (tasksResult.error || assignmentsResult.error) {
        console.error(
          "Part of the calendar could not be loaded:",
          tasksResult.error ?? assignmentsResult.error,
        );
        setError("Some calendar items could not be loaded.");
      }

      setIsLoading(false);
    }

    void loadCalendarItems();

    return () => {
      isActive = false;
    };
  }, [visibleEnd, visibleStart]);

  const itemsByDate = useMemo(() => {
    return items.reduce<Record<string, CalendarItem[]>>((dates, item) => {
      (dates[item.date] ??= []).push(item);
      return dates;
    }, {});
  }, [items]);

  const currentMonthItems = items.filter((item) => {
    const [year, month] = item.date.split("-").map(Number);
    return (
      year === currentMonth.getFullYear() &&
      month === currentMonth.getMonth() + 1
    );
  });

  function changeMonth(offset: number) {
    setCurrentMonth(
      (month) => new Date(month.getFullYear(), month.getMonth() + offset, 1),
    );
  }

  function goToToday() {
    const now = new Date();
    setCurrentMonth(new Date(now.getFullYear(), now.getMonth(), 1));
  }

  return (
    <div className="min-h-full bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-[1600px]">
        <header className="mb-6 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-blue-600">
              <CalendarDays className="h-4 w-4" aria-hidden="true" />
              Study schedule
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
              Calendar
            </h1>
            <p className="mt-2 text-base text-slate-600">
              See study tasks and assignment deadlines in one place.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={goToToday}>
              Today
            </Button>
            <div className="flex items-center rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Previous month"
                onClick={() => changeMonth(-1)}
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <p
                className="min-w-44 px-3 text-center text-base font-semibold text-slate-900"
                aria-live="polite"
              >
                {monthTitle}
              </p>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Next month"
                onClick={() => changeMonth(1)}
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </header>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">
                {monthTitle}
              </h2>
              <p className="mt-0.5 text-sm text-slate-500">
                {isLoading
                  ? "Loading your schedule…"
                  : `${currentMonthItems.length} ${
                      currentMonthItems.length === 1 ? "item" : "items"
                    } this month`}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium text-slate-600">
              <span className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                Study task
              </span>
              <span className="flex items-center gap-2">
                <ClipboardList className="h-3.5 w-3.5 text-violet-500" />
                Assignment due
              </span>
              <span className="flex items-center gap-2">
                <Check className="h-3.5 w-3.5 text-emerald-600" />
                Completed
              </span>
            </div>
          </div>

          {error ? (
            <div
              className="border-b border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-800"
              role="status"
            >
              {error}
            </div>
          ) : null}

          <div className="overflow-x-auto">
            <div className="min-w-[920px]">
              <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/80">
                {WEEK_DAYS.map((day) => (
                  <div
                    key={day}
                    className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500"
                  >
                    <span className="sm:hidden">{day.slice(0, 1)}</span>
                    <span className="hidden sm:inline">{day.slice(0, 3)}</span>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7">
                {calendarDays.map((calendarDay, index) => {
                  const dateKey = toDateKey(calendarDay.date);
                  const dayItems = itemsByDate[dateKey] ?? [];
                  const isToday = isSameDay(calendarDay.date, today);
                  const isLastColumn = index % 7 === 6;
                  const isLastRow = index >= calendarDays.length - 7;

                  return (
                    <div
                      key={dateKey}
                      className={cn(
                        "min-h-32 border-b border-r border-slate-200 p-2.5",
                        !calendarDay.isCurrentMonth && "bg-slate-50/70",
                        isLastColumn && "border-r-0",
                        isLastRow && "border-b-0",
                      )}
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <time
                          dateTime={dateKey}
                          className={cn(
                            "flex h-7 min-w-7 items-center justify-center rounded-full px-1.5 text-sm font-medium",
                            isToday
                              ? "bg-blue-600 text-white shadow-sm"
                              : calendarDay.isCurrentMonth
                                ? "text-slate-800"
                                : "text-slate-400",
                          )}
                        >
                          {calendarDay.day}
                        </time>
                        {dayItems.length > 0 ? (
                          <span className="text-[11px] font-medium text-slate-400">
                            {dayItems.length}
                          </span>
                        ) : null}
                      </div>

                      <div className="max-h-32 space-y-1.5 overflow-y-auto pr-0.5">
                        {isLoading ? (
                          <>
                            <div className="h-7 animate-pulse rounded-md bg-slate-100" />
                            {index % 3 === 0 ? (
                              <div className="h-7 animate-pulse rounded-md bg-slate-100" />
                            ) : null}
                          </>
                        ) : (
                          dayItems.map((item) => (
                            <CalendarItemChip key={`${item.kind}-${item.id}`} item={item} />
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function CalendarItemChip({ item }: { item: CalendarItem }) {
  const color = getClassColor(item.classColor);
  const href = item.kind === "assignment" ? "/planner/assignments" : "/planner";

  return (
    <Link
      href={href}
      title={`${item.title} · ${item.className}${
        item.kind === "assignment" ? " · Assignment due" : ""
      }`}
      className={cn(
        "group flex min-h-7 items-center gap-1.5 rounded-md border px-2 py-1 text-xs transition hover:-translate-y-px hover:shadow-sm",
        color.bg,
        color.border,
        color.text,
        item.isComplete && "opacity-55",
      )}
    >
      {item.kind === "assignment" ? (
        <ClipboardList className="h-3 w-3 shrink-0" aria-hidden="true" />
      ) : (
        <span className={cn("h-2 w-2 shrink-0 rounded-full", color.accent)} />
      )}
      <span
        className={cn(
          "min-w-0 flex-1 truncate font-medium",
          item.isComplete && "line-through",
        )}
      >
        {item.title}
      </span>
      {item.isComplete ? (
        <Check className="h-3 w-3 shrink-0 text-emerald-700" aria-hidden="true" />
      ) : null}
    </Link>
  );
}
