"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import type { ClassColor } from "@/lib/classColors";
import type { CalendarClass, CalendarItem } from "@/lib/calendar/calendarItems";

// Page through results so a long overdue list cannot silently hide current work.
async function readPages<T>(
  query: (
    start: number,
    end: number,
  ) => PromiseLike<{
    data: T[] | null;
    error: { message: string } | null;
  }>,
) {
  const rows: T[] = [];
  for (let offset = 0; ; offset += 500) {
    const result = await query(offset, offset + 499);
    if (result.error) throw new Error(result.error.message);
    rows.push(...(result.data ?? []));
    if (!result.data || result.data.length < 500) return rows;
  }
}

export function useCalendarItems({
  start,
  end,
  today,
  initialItems,
  initialClasses,
  refresh,
  ready,
}: {
  start: string;
  end: string;
  today: string;
  initialItems?: CalendarItem[];
  initialClasses?: CalendarClass[];
  refresh: number;
  ready: boolean;
}) {
  const [items, setItems] = useState<CalendarItem[]>(initialItems ?? []);
  const [classes, setClasses] = useState<CalendarClass[]>(initialClasses ?? []);
  const [isLoading, setIsLoading] = useState(initialItems === undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialItems !== undefined || !ready) return;
    const controller = new AbortController();
    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();
        if (authError || !user)
          throw new Error("Sign in to view your calendar.");
        const results = await Promise.allSettled([
          readPages((from, to) =>
            supabase
              .from("study_plan_tasks")
              .select(
                "id, title, scheduled_date, status, class_id, assignment_id, estimated_minutes, classes(name, color), assignments(due_date)",
              )
              .eq("user_id", user.id)
              .or(
                `and(scheduled_date.gte.${start},scheduled_date.lte.${end}),and(scheduled_date.lt.${today},status.neq.completed)`,
              )
              .order("scheduled_date")
              .order("id")
              .range(from, to)
              .abortSignal(controller.signal),
          ),
          readPages((from, to) =>
            supabase
              .from("assignments")
              .select(
                "id, title, due_date, status, class_id, classes(name, color)",
              )
              .eq("user_id", user.id)
              .not("due_date", "is", null)
              .or(
                `and(due_date.gte.${start},due_date.lte.${end}),and(due_date.lt.${today},status.neq.completed)`,
              )
              .order("due_date")
              .order("id")
              .range(from, to)
              .abortSignal(controller.signal),
          ),
          readPages((from, to) =>
            supabase
              .from("classes")
              .select("id, name, color")
              .eq("user_id", user.id)
              .order("name")
              .order("id")
              .range(from, to)
              .abortSignal(controller.signal),
          ),
        ]);
        if (controller.signal.aborted) return;
        const [tasks, assignments, classResult] = results;
        const next: CalendarItem[] = [];
        if (tasks.status === "fulfilled")
          for (const task of tasks.value) {
            next.push({
              id: task.id,
              title: task.title,
              date: task.scheduled_date,
              isComplete: task.status === "completed",
              kind: "task",
              classId: task.class_id,
              assignmentId: task.assignment_id,
              estimatedMinutes: task.estimated_minutes,
              dueDate: task.assignments?.due_date,
              className: task.classes?.name ?? "No class",
              classColor: task.classes?.color as ClassColor | null,
            });
          }
        if (assignments.status === "fulfilled")
          for (const assignment of assignments.value) {
            if (assignment.due_date)
              next.push({
                id: assignment.id,
                title: assignment.title,
                date: assignment.due_date,
                isComplete: assignment.status === "completed",
                kind: "assignment",
                classId: assignment.class_id,
                className: assignment.classes?.name ?? "No class",
                classColor: assignment.classes?.color as ClassColor | null,
              });
          }
        setItems(next);
        if (classResult.status === "fulfilled") setClasses(classResult.value);
        if (results.some((result) => result.status === "rejected")) {
          setError(
            "Some calendar data could not be loaded. Your schedule may be incomplete.",
          );
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setItems([]);
          setError(
            error instanceof Error && error.message.startsWith("Sign in")
              ? error.message
              : "Your calendar could not be loaded. Please try again.",
          );
        }
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [start, end, today, initialItems, refresh, ready]);

  return { items, classes, isLoading, error };
}
