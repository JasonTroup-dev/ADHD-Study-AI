"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import type { WeeklyAssignment, WeeklyTask } from "@/lib/planner/weeklyPlan";

export type PlannerClass = { id: string; name: string; color: string | null };
export type WeeklyPlannerData = {
  tasks: WeeklyTask[];
  assignments: WeeklyAssignment[];
  classes: PlannerClass[];
};

async function readPages<T>(
  query: (
    start: number,
    end: number,
  ) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
) {
  const rows: T[] = [];
  for (let offset = 0; ; offset += 500) {
    const result = await query(offset, offset + 499);
    if (result.error) throw new Error(result.error.message);
    rows.push(...(result.data ?? []));
    if (!result.data || result.data.length < 500) return rows;
  }
}

export function useWeeklyPlanner(
  initialData: WeeklyPlannerData | undefined,
  refresh: number,
) {
  const [data, setData] = useState<WeeklyPlannerData>(
    initialData ?? { tasks: [], assignments: [], classes: [] },
  );
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (initialData) return;
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();
        if (authError || !user)
          throw new Error("Sign in to view your study plan.");
        const [tasks, assignments, classes] = await Promise.all([
          readPages((from, to) =>
            supabase
              .from("study_plan_tasks")
              .select(
                "id, class_id, assignment_id, title, description, checklist, priority, status, scheduled_date, estimated_minutes, pinned, source, user_edited, classes(name, color)",
              )
              .eq("user_id", user.id)
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
              .order("id")
              .range(from, to)
              .abortSignal(controller.signal),
          ),
          readPages((from, to) =>
            supabase
              .from("classes")
              .select("id, name, color")
              .eq("user_id", user.id)
              .order("id")
              .range(from, to)
              .abortSignal(controller.signal),
          ),
        ]);
        if (!controller.signal.aborted)
          setData({
            tasks: tasks.map((task) => ({
              ...task,
              checklist: Array.isArray(task.checklist)
                ? task.checklist.filter(
                    (item): item is string => typeof item === "string",
                  )
                : [],
            })),
            assignments,
            classes,
          });
      } catch (error) {
        if (!controller.signal.aborted)
          setError(
            error instanceof Error && error.message.startsWith("Sign in")
              ? error.message
              : "Your plan could not be loaded. Try again.",
          );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [initialData, refresh]);
  return { ...data, loading, error };
}
