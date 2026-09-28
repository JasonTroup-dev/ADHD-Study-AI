import { describe, expect, it } from "vitest";
import {
  defaultPlanningPreferences,
  planningPreferencesSchema,
} from "@/lib/planner/preferences";
import { previewCatchUp } from "@/lib/planner/catchUp";
import { dayWorkload, planningWeek } from "@/lib/planner/weeklyPlan";
import type { PlannerTask, PlannerWorkspace } from "@/lib/planner/types";

const today = "2026-09-09";
const task = (
  id: string,
  minutes: number | null,
  extra: Partial<PlannerTask> = {},
): PlannerTask => ({
  id,
  user_id: "owner",
  assignment_id: id,
  class_id: null,
  title: id,
  description: null,
  scheduled_date: today,
  priority: "medium",
  status: "todo",
  source: "generic_generated",
  context_version: 0,
  user_edited: false,
  pinned: false,
  checklist: [],
  estimated_minutes: minutes,
  ...extra,
});
const workspace = (tasks: PlannerTask[]): PlannerWorkspace => ({
  version: "v1",
  tasks,
  assignments: tasks.map((task) => ({
    id: task.assignment_id!,
    title: task.title,
    due_date: "2026-09-14",
    status: "not_started",
    context_version: 0,
    class_id: null,
    importance: "medium",
  })),
  sessions: [],
  preferences: defaultPlanningPreferences,
  lastChangeId: null,
});

describe("weekly time planning", () => {
  it("moves work out of a 20 minute day without changing deadlines", () => {
    const state = workspace([task("a", 20), task("b", 25)]);
    const preferences = {
      ...defaultPlanningPreferences,
      dateMinutes: { [today]: 20, "2026-09-10": 45 },
    };
    const preview = previewCatchUp(state, today, preferences);
    expect(preview.conflicts).toEqual([]);
    expect(
      preview.blocks.map((block) => [block.id, block.scheduledDate]),
    ).toEqual([
      ["a", today],
      ["b", "2026-09-10"],
    ]);
    expect(state.tasks[1].scheduled_date).toBe(today);
    expect(state.assignments[1].due_date).toBe("2026-09-14");
  });
  it("accounts for protected work and reports limits it cannot meet", () => {
    const state = workspace([
      task("fixed", 30, { pinned: true }),
      task("move", 10),
    ]);
    const preview = previewCatchUp(state, today, {
      ...defaultPlanningPreferences,
      dateMinutes: { [today]: 20 },
    });
    expect(preview.conflicts[0].reason).toContain("kept in place exceed");
    expect(
      preview.changes?.some((change) => change.before?.id === "fixed"),
    ).toBe(false);
    expect(preview.blocks[0].scheduledDate).not.toBe(today);
  });
  it("never invents estimates for unknown work", () => {
    const state = workspace([task("unknown", null)]);
    state.assignments[0].due_date = today;
    const preview = previewCatchUp(state, today, {
      ...defaultPlanningPreferences,
      dateMinutes: { [today]: 20 },
    });
    expect(preview.conflicts[0].reason).toContain("add a time estimate");
    expect(preview.changes).toEqual([]);
  });
  it("keeps a day off empty and does not count completed minutes", () => {
    const state = workspace([
      task("done", 60, { status: "completed" }),
      task("work", 20),
    ]);
    const fitting = previewCatchUp(state, today, {
      ...defaultPlanningPreferences,
      dateMinutes: { [today]: 20 },
    });
    expect(fitting.conflicts).toEqual([]);
    expect(fitting.blocks[0].scheduledDate).toBe(today);
    const off = previewCatchUp(state, today, {
      ...defaultPlanningPreferences,
      dateMinutes: { [today]: 0 },
    });
    expect(off.blocks[0].scheduledDate).not.toBe(today);
  });
  it("keeps minute totals honest and weeks stable across year and DST boundaries", () => {
    const tasks = [
      task("known", 20),
      task("unknown", null),
      task("done", 60, { status: "completed" }),
    ].map((task) => ({ ...task, classes: null }));
    expect(dayWorkload(tasks)).toEqual({
      minutes: 20,
      remaining: 2,
      completed: 1,
      unknown: 1,
    });
    expect(planningWeek("2027-01-01")).toEqual([
      "2026-12-28",
      "2026-12-29",
      "2026-12-30",
      "2026-12-31",
      "2027-01-01",
      "2027-01-02",
      "2027-01-03",
    ]);
    expect(planningWeek("2026-11-01")[6]).toBe("2026-11-01");
  });
  it("validates time budgets and reads legacy preferences", () => {
    expect(
      planningPreferencesSchema.parse(defaultPlanningPreferences).dateMinutes,
    ).toBeUndefined();
    for (const dateMinutes of [
      { [today]: -1 },
      { [today]: 1441 },
      { [today]: 1.5 },
      { "2026-02-30": 20 },
    ]) {
      expect(
        planningPreferencesSchema.safeParse({
          ...defaultPlanningPreferences,
          dateMinutes,
        }).success,
      ).toBe(false);
    }
  });
});
