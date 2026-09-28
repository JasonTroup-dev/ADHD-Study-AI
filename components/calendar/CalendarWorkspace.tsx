"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { CatchUpPlanner } from "@/components/StudyPlanner/CatchUpPlanner";
import {
  getCalendarDays,
  toLocalDateString,
} from "@/lib/calendar/getCalendarDays";
import {
  filterCalendarItems,
  formatCalendarDate,
  itemUrgency,
  parseCalendarDate,
  workloadSummary,
  type CalendarClass,
  type CalendarItem,
} from "@/lib/calendar/calendarItems";
import { getClassColor } from "@/lib/classColors";
import { cn } from "@/lib/utils";
import { CalendarItemCard } from "./CalendarItemCard";
import { CalendarTaskForm } from "./CalendarTaskForm";
import { useCalendarItems } from "./useCalendarItems";

const weekDays = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
type ViewState = {
  month: string;
  selected: string;
  view: "auto" | "month" | "agenda";
  classId: string;
  kind: string;
  showCompleted: boolean;
};

export function CalendarWorkspace({
  initialDate,
  initialItems,
  initialClasses,
  readOnly = false,
}: {
  initialDate?: Date;
  initialItems?: CalendarItem[];
  initialClasses?: CalendarClass[];
  readOnly?: boolean;
}) {
  const [today, setToday] = useState(() =>
    toLocalDateString(initialDate ?? new Date()),
  );
  const [state, setState] = useState<ViewState>(() => ({
    month: `${today.slice(0, 7)}-01`,
    selected: today,
    view: "auto",
    classId: "",
    kind: "all",
    showCompleted: true,
  }));
  const [ready, setReady] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [panel, setPanel] = useState<"day" | "overdue" | null>(null);
  const [form, setForm] = useState<"add" | CalendarItem | null>(null);
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const opener = useRef<HTMLElement | null>(null);
  const storageKey = readOnly ? "calendar-view-demo-v1" : "calendar-view-v1";

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      try {
        const saved = JSON.parse(sessionStorage.getItem(storageKey) ?? "null");
        if (
          saved &&
          parseCalendarDate(saved.month) &&
          parseCalendarDate(saved.selected)
        ) {
          setState({
            month: `${saved.month.slice(0, 7)}-01`,
            selected: saved.selected,
            view: ["month", "agenda"].includes(saved.view)
              ? saved.view
              : "auto",
            classId: typeof saved.classId === "string" ? saved.classId : "",
            kind: ["task", "assignment"].includes(saved.kind)
              ? saved.kind
              : "all",
            showCompleted: saved.showCompleted !== false,
          });
        }
      } catch {
        /* Calendar remains usable when browser storage is unavailable. */
      }
      setReady(true);
    });
    return () => cancelAnimationFrame(frame);
  }, [storageKey]);

  useEffect(() => {
    if (initialDate) return;
    const timer = window.setInterval(
      () => setToday(toLocalDateString(new Date())),
      60_000,
    );
    return () => clearInterval(timer);
  }, [initialDate]);

  function update(next: Partial<ViewState>) {
    const value = { ...state, ...next };
    setState(value);
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(value));
    } catch {
      /* Optional preference. */
    }
  }

  const month = parseCalendarDate(state.month)!;
  const days = getCalendarDays(month);
  const { items, classes, isLoading, error } = useCalendarItems({
    start: toLocalDateString(days[0].date),
    end: toLocalDateString(days[days.length - 1].date),
    today,
    initialItems,
    initialClasses,
    refresh,
    ready,
  });
  const filtered = useMemo(
    () => filterCalendarItems(items, state),
    [items, state],
  );
  const byDate = useMemo(() => {
    const result: Record<string, CalendarItem[]> = {};
    for (const item of filtered) (result[item.date] ??= []).push(item);
    return result;
  }, [filtered]);
  const monthItems = filtered.filter(
    (item) => item.date.slice(0, 7) === state.month.slice(0, 7),
  );
  const overdue = filtered.filter(
    (item) => !item.isComplete && item.date < today,
  );
  const dayItems = byDate[state.selected] ?? [];
  const agendaDates = [
    ...new Set([
      ...monthItems.map((item) => item.date),
      ...(state.selected.slice(0, 7) === state.month.slice(0, 7)
        ? [state.selected]
        : []),
    ]),
  ].sort();
  const panelItems = panel === "overdue" ? overdue : dayItems;

  function openDay(date: string, add = false) {
    opener.current = document.activeElement as HTMLElement;
    update({ selected: date });
    setForm(add ? "add" : null);
    setPanel("day");
    setNotice("");
  }
  function changeMonth(offset: number) {
    const date = toLocalDateString(
      new Date(month.getFullYear(), month.getMonth() + offset, 1),
    );
    update({ month: date, selected: date });
  }
  function saved(date: string) {
    setNotice(form === "add" ? "Task added." : "Task rescheduled.");
    setForm(null);
    setPanel("day");
    update({
      selected: date,
      month: `${date.slice(0, 7)}-01`,
      classId: "",
      kind: "all",
      showCompleted: true,
    });
    setRefresh((value) => value + 1);
  }

  return (
    <div className="min-h-[calc(100svh-4rem)] bg-slate-50 md:min-h-svh">
      <header className="space-y-4 border-b border-slate-200 bg-white px-4 py-5 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Calendar
            </p>
            <h1
              className="text-2xl font-semibold text-slate-950"
              aria-live="polite"
            >
              {month.toLocaleDateString("en-US", {
                month: "long",
                year: "numeric",
              })}
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              {isLoading || !ready
                ? "Loading your schedule…"
                : `${monthItems.length} items · ${workloadSummary(monthItems)}`}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {!readOnly ? (
              <CatchUpPlanner
                onChanged={() => {
                  setRefresh((value) => value + 1);
                  setNotice("Your calendar is up to date.");
                }}
              />
            ) : null}
            <Button
              variant="outline"
              onClick={() =>
                update({ month: `${today.slice(0, 7)}-01`, selected: today })
              }
            >
              Today
            </Button>
            <Button
              variant="outline"
              size="icon"
              aria-label="Previous month"
              onClick={() => changeMonth(-1)}
            >
              <ChevronLeft aria-hidden="true" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              aria-label="Next month"
              onClick={() => changeMonth(1)}
            >
              <ChevronRight aria-hidden="true" />
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-xs font-medium text-slate-600">
            View
            <select
              aria-label="Calendar view"
              className="mt-1 block min-h-10 rounded-lg border bg-white px-3 text-sm text-slate-900"
              value={state.view}
              onChange={(e) =>
                update({ view: e.target.value as ViewState["view"] })
              }
            >
              <option value="auto">Auto (agenda on mobile)</option>
              <option value="month">Month</option>
              <option value="agenda">Agenda</option>
            </select>
          </label>
          <label className="text-xs font-medium text-slate-600">
            Class
            <select
              className="mt-1 block min-h-10 max-w-56 rounded-lg border bg-white px-3 text-sm text-slate-900"
              value={state.classId}
              onChange={(e) => update({ classId: e.target.value })}
            >
              <option value="">All classes</option>
              <option value="unassigned">No class</option>
              {classes.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-medium text-slate-600">
            Items
            <select
              className="mt-1 block min-h-10 rounded-lg border bg-white px-3 text-sm text-slate-900"
              value={state.kind}
              onChange={(e) => update({ kind: e.target.value })}
            >
              <option value="all">Tasks & deadlines</option>
              <option value="task">Study tasks</option>
              <option value="assignment">Deadlines</option>
            </select>
          </label>
          <label className="flex min-h-10 items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={state.showCompleted}
              onChange={(e) => update({ showCompleted: e.target.checked })}
              className="size-4 accent-blue-600"
            />
            Show completed
          </label>
          {!readOnly ? (
            <Button
              disabled={isLoading}
              onClick={() => openDay(state.selected, true)}
              className="sm:ml-auto"
            >
              <Plus aria-hidden="true" />
              Add task
            </Button>
          ) : null}
        </div>
        <p className="text-xs text-slate-500">
          Colors identify classes. “Due” marks deadlines. Time totals include
          unfinished study tasks with saved estimates.
        </p>
      </header>

      {error ? (
        <div
          role="alert"
          className="flex flex-wrap items-center gap-3 border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
        >
          {error}
          <Button
            variant="outline"
            size="sm"
            disabled={isLoading}
            onClick={() => setRefresh((value) => value + 1)}
          >
            Retry
          </Button>
        </div>
      ) : null}
      <div
        role="status"
        className={notice ? "px-4 pt-3 text-sm text-emerald-800" : "sr-only"}
      >
        {notice}
      </div>
      {!isLoading && overdue.length ? (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm text-amber-950">
            {overdue.length} unfinished{" "}
            {overdue.length === 1 ? "item" : "items"} from earlier days. There’s
            room to make a new plan.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              opener.current = document.activeElement as HTMLElement;
              setForm(null);
              setPanel("overdue");
            }}
          >
            Review overdue work
          </Button>
        </div>
      ) : null}

      <div aria-busy={isLoading || !ready}>
        <div
          className={cn(
            "overflow-x-auto p-3 sm:p-5",
            state.view === "agenda" && "hidden",
            state.view === "auto" && "hidden sm:block",
          )}
        >
          <div
            className="min-w-[740px] overflow-hidden rounded-xl border border-slate-200 bg-white"
            aria-label="Month calendar"
          >
            <div className="grid grid-cols-7 border-b bg-slate-50">
              {weekDays.map((day) => (
                <div
                  key={day}
                  className="py-3 text-center text-xs font-semibold text-slate-600"
                >
                  <abbr title={day} className="no-underline">
                    {day.slice(0, 3)}
                  </abbr>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {days.map((day) => {
                const date = toLocalDateString(day.date);
                const entries = byDate[date] ?? [];
                return (
                  <section
                    key={date}
                    aria-label={formatCalendarDate(date)}
                    className={cn(
                      "min-h-28 min-w-0 border-b border-r border-slate-200 p-2",
                      !day.isCurrentMonth && "bg-slate-50",
                      date === state.selected && "bg-blue-50/40",
                    )}
                  >
                    <button
                      onClick={() => openDay(date)}
                      aria-label={`Open ${formatCalendarDate(date)}`}
                      aria-current={date === today ? "date" : undefined}
                      className="mb-1 flex min-h-10 w-full items-center justify-between rounded-lg px-1 text-sm hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-blue-600"
                    >
                      <span
                        className={cn(
                          "flex size-8 items-center justify-center rounded-full",
                          date === today &&
                            "bg-blue-600 font-semibold text-white",
                        )}
                      >
                        {day.day}
                      </span>
                      <span className="text-xs text-slate-500">
                        {entries.length || ""}
                      </span>
                    </button>
                    {isLoading ? (
                      <div className="h-12 animate-pulse rounded-md bg-slate-100 motion-reduce:animate-none" />
                    ) : (
                      <>
                        <p className="mb-2 text-[11px] leading-4 text-slate-500">
                          {entries.some(
                            (item) => item.kind === "task" && !item.isComplete,
                          )
                            ? workloadSummary(entries)
                            : "\u00a0"}
                        </p>
                        <div className="space-y-1">
                          {entries.slice(0, 2).map((item) => {
                            const color = getClassColor(item.classColor);
                            return (
                              <button
                                key={`${item.kind}-${item.id}`}
                                onClick={() => openDay(date)}
                                title={`${item.title} · ${item.className}`}
                                className={cn(
                                  "block w-full rounded-md border px-2 py-1.5 text-left text-xs focus-visible:outline-2 focus-visible:outline-blue-600",
                                  color.bg,
                                  color.border,
                                  color.text,
                                )}
                              >
                                <span
                                  className={cn(
                                    "block truncate font-semibold",
                                    item.isComplete && "line-through",
                                  )}
                                >
                                  {item.title}
                                </span>
                                <span className="block truncate text-[10px]">
                                  {item.className} · {itemUrgency(item, today)}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                        {entries.length > 2 ? (
                          <button
                            className="mt-1 min-h-8 rounded px-1 text-xs font-semibold text-blue-700 hover:underline focus-visible:outline-2"
                            onClick={() => openDay(date)}
                            aria-label={`Show ${entries.length - 2} more items for ${formatCalendarDate(date)}`}
                          >
                            +{entries.length - 2} more
                          </button>
                        ) : null}
                      </>
                    )}
                  </section>
                );
              })}
            </div>
          </div>
        </div>

        <div
          className={cn(
            "mx-auto max-w-4xl space-y-5 p-4 sm:p-6",
            state.view === "month" && "hidden",
            state.view === "auto" && "sm:hidden",
          )}
          aria-label="Calendar agenda"
        >
          {isLoading ? (
            <p role="status" className="py-8 text-center text-slate-600">
              Loading your schedule…
            </p>
          ) : (
            agendaDates.map((date) => (
              <section key={date} className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <button
                      className="rounded text-left text-base font-semibold text-slate-950 hover:underline focus-visible:outline-2"
                      onClick={() => openDay(date)}
                    >
                      {date === today ? "Today · " : ""}
                      {formatCalendarDate(date)}
                    </button>
                    <p className="mt-1 text-xs text-slate-600">
                      {workloadSummary(byDate[date] ?? [])}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openDay(date)}
                  >
                    Open day
                  </Button>
                </div>
                {(byDate[date] ?? []).length ? (
                  (byDate[date] ?? []).map((item) => (
                    <CalendarItemCard
                      key={`${item.kind}-${item.id}`}
                      item={item}
                      today={today}
                      readOnly={readOnly}
                      onReschedule={(task) => {
                        openDay(date);
                        setForm(task);
                      }}
                    />
                  ))
                ) : (
                  <p className="rounded-xl border border-dashed bg-white p-5 text-sm text-slate-600">
                    No items match your filters for this day.
                  </p>
                )}
              </section>
            ))
          )}
        </div>
        {!isLoading && !monthItems.length ? (
          <div className="px-5 pb-8 text-center text-sm text-slate-600">
            <p>
              No items match this month. Choose another month, adjust your
              filters, or add a task.
            </p>
            <Button
              variant="ghost"
              onClick={() =>
                update({ classId: "", kind: "all", showCompleted: true })
              }
            >
              Reset filters
            </Button>
          </div>
        ) : null}
      </div>

      <Dialog
        open={panel !== null}
        onOpenChange={(open) => {
          if (!open && !saving) {
            setPanel(null);
            setForm(null);
          }
        }}
      >
        <DialogContent
          showCloseButton={!saving}
          className="left-auto right-0 top-0 flex h-svh max-h-svh w-full max-w-lg translate-x-0 translate-y-0 flex-col gap-0 rounded-none border-y-0 border-r-0"
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            opener.current?.focus();
          }}
        >
          <div className="shrink-0 border-b p-5 pr-12">
            <DialogTitle className="leading-6">
              {panel === "overdue"
                ? "Unfinished work from earlier days"
                : formatCalendarDate(state.selected)}
            </DialogTitle>
            <DialogDescription className="mt-2">
              {workloadSummary(panelItems)}
              {panel === "overdue"
                ? ". Choose what to pick up next."
                : ". Take one step at a time."}
            </DialogDescription>
          </div>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
            {notice ? (
              <p role="status" className="text-sm text-emerald-800">
                {notice}
              </p>
            ) : null}
            {error ? (
              <div role="alert" className="space-y-2 text-sm text-amber-900">
                <p>{error}</p>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isLoading || saving}
                  onClick={() => setRefresh((value) => value + 1)}
                >
                  Retry
                </Button>
              </div>
            ) : null}
            {readOnly ? (
              <p className="text-sm text-slate-500">
                This sample workspace is read-only.
              </p>
            ) : null}
            {form && !readOnly ? (
              <CalendarTaskForm
                key={
                  typeof form === "string" ? `add-${state.selected}` : form.id
                }
                date={typeof form === "string" ? state.selected : form.date}
                task={typeof form === "string" ? undefined : form}
                classes={classes}
                onSaved={saved}
                onCancel={() => setForm(null)}
                onBusyChange={setSaving}
                onRefresh={() => {
                  setForm(null);
                  setRefresh((value) => value + 1);
                }}
              />
            ) : null}
            {isLoading ? (
              <p role="status">Loading your schedule…</p>
            ) : (
              panelItems.map((item) => (
                <div
                  key={`${item.kind}-${item.id}`}
                  className="space-y-2"
                  inert={saving || undefined}
                >
                  {panel === "overdue" ? (
                    <p className="text-xs text-slate-600">
                      {formatCalendarDate(item.date)}
                    </p>
                  ) : null}
                  <CalendarItemCard
                    item={item}
                    today={today}
                    readOnly={readOnly}
                    onReschedule={(task) => {
                      setForm(task);
                    }}
                  />
                </div>
              ))
            )}
            {!isLoading && !panelItems.length ? (
              <p className="py-6 text-sm text-slate-600">
                No items match your filters. You have room for a next step.
              </p>
            ) : null}
          </div>
          {!readOnly && panel === "day" && !form ? (
            <div className="shrink-0 border-t p-5">
              <Button
                disabled={isLoading}
                className="w-full"
                onClick={() => setForm("add")}
              >
                <Plus aria-hidden="true" />
                Add task for this day
              </Button>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
