import type { ClassColor } from "@/lib/classColors";
import { toLocalDateString } from "./getCalendarDays";

export type CalendarItem = {
  id: string;
  title: string;
  date: string;
  isComplete: boolean;
  kind: "task" | "assignment";
  className: string;
  classColor: ClassColor | null;
  classId?: string | null;
  assignmentId?: string | null;
  estimatedMinutes?: number | null;
  dueDate?: string | null;
};

export type CalendarClass = { id: string; name: string; color?: string | null };

export function parseCalendarDate(value: string | null): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T12:00:00`);
  return !Number.isNaN(date.getTime()) && toLocalDateString(date) === value
    ? date
    : null;
}

export function formatCalendarDate(value: string) {
  return parseCalendarDate(value)!.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function filterCalendarItems(
  items: CalendarItem[],
  filters: {
    classId: string;
    kind: string;
    showCompleted: boolean;
  },
) {
  return items
    .filter(
      (item) =>
        (!filters.classId ||
          (item.classId ?? "unassigned") === filters.classId) &&
        (filters.kind === "all" || item.kind === filters.kind) &&
        (filters.showCompleted || !item.isComplete),
    )
    .sort(
      (a, b) =>
        a.date.localeCompare(b.date) ||
        Number(a.isComplete) - Number(b.isComplete) ||
        Number(b.kind === "assignment") - Number(a.kind === "assignment") ||
        a.title.localeCompare(b.title),
    );
}

export function workloadSummary(items: CalendarItem[]) {
  const tasks = items.filter(
    (item) => item.kind === "task" && !item.isComplete,
  );
  const estimated = tasks.filter(
    (item) => item.estimatedMinutes != null && item.estimatedMinutes > 0,
  );
  const minutes = estimated.reduce(
    (total, item) => total + item.estimatedMinutes!,
    0,
  );
  const unknown = tasks.length - estimated.length;
  const sessions = `${tasks.length} ${tasks.length === 1 ? "session" : "sessions"}`;
  return `${sessions}${minutes ? ` · ~${minutes} min` : ""}${unknown ? ` · ${unknown} unestimated` : ""}`;
}

export function itemUrgency(item: CalendarItem, today: string) {
  if (item.isComplete) return "Completed";
  if (item.date < today)
    return item.kind === "assignment" ? "Overdue" : "Missed session";
  if (item.kind === "assignment")
    return item.date === today ? "Due today" : "Due";
  return "Study task";
}
