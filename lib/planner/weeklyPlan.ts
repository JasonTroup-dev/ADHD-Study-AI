import type { StudyTask } from "@/components/ui/taskCard";
import { addPlanningDays } from "./preferences";

export type WeeklyTask = StudyTask & {
  estimated_minutes?: number | null;
  description?: string | null;
  checklist?: string[];
  pinned?: boolean;
};
export type WeeklyAssignment = {
  id: string;
  title: string;
  due_date: string | null;
  status: string;
  class_id: string | null;
  classes: { name: string; color: string | null } | null;
};

export function planningWeek(date: string) {
  const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
  const start = addPlanningDays(date, -((weekday + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => addPlanningDays(start, i));
}

export function dayWorkload(tasks: WeeklyTask[]) {
  const remaining = tasks.filter((task) => task.status !== "completed");
  return {
    remaining: remaining.length,
    completed: tasks.length - remaining.length,
    minutes: remaining.reduce(
      (total, task) => total + (task.estimated_minutes ?? 0),
      0,
    ),
    unknown: remaining.filter((task) => task.estimated_minutes == null).length,
  };
}

export function orderWeeklyTasks(
  tasks: WeeklyTask[],
  assignments: WeeklyAssignment[],
) {
  const dueDates = new Map(
    assignments.map((assignment) => [assignment.id, assignment.due_date]),
  );
  const priority: Record<string, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
  };
  return [...tasks].sort(
    (a, b) =>
      Number(a.status === "completed") - Number(b.status === "completed") ||
      (dueDates.get(a.assignment_id ?? "") ?? "9999").localeCompare(
        dueDates.get(b.assignment_id ?? "") ?? "9999",
      ) ||
      (priority[a.priority ?? ""] ?? 4) - (priority[b.priority ?? ""] ?? 4) ||
      a.id.localeCompare(b.id),
  );
}
