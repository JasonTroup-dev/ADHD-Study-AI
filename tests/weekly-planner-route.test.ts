import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  client: vi.fn(),
  load: vi.fn(),
  commit: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.client }));
vi.mock("@/lib/planner/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/planner/server")>()),
  loadPlannerWorkspace: mocks.load,
  commitPlannerChange: mocks.commit,
}));
import { POST } from "@/app/api/planner/route";
import { PATCH } from "@/app/api/study-plan-tasks/[id]/route";
import { defaultPlanningPreferences } from "@/lib/planner/preferences";
import type { PlannerWorkspace } from "@/lib/planner/types";

const date = "2026-10-13";
const prefs = { ...defaultPlanningPreferences, dateMinutes: { [date]: 20 } };
let state: PlannerWorkspace;
let db: {
  auth: { getUser: ReturnType<typeof vi.fn> };
  from: ReturnType<typeof vi.fn>;
};
const query = {
  update: vi.fn(),
  eq: vi.fn(),
  select: vi.fn(),
  maybeSingle: vi.fn(),
};
const request = (body: unknown) =>
  new Request("http://localhost/api/planner", {
    method: "POST",
    body: JSON.stringify(body),
  });

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-13T19:00:00Z"));
  vi.clearAllMocks();
  state = {
    version: "current",
    tasks: [20, 25].map((minutes, i) => ({
      id: `t${i}`,
      user_id: "owner",
      assignment_id: `a${i}`,
      class_id: null,
      title: `Task ${i}`,
      description: null,
      checklist: [],
      priority: "medium",
      status: "todo",
      scheduled_date: date,
      source: "generic_generated",
      context_version: 0,
      user_edited: false,
      pinned: false,
      estimated_minutes: minutes,
    })),
    assignments: [0, 1].map((i) => ({
      id: `a${i}`,
      title: `Assignment ${i}`,
      due_date: "2026-10-16",
      status: "not_started",
      context_version: 0,
      class_id: null,
      importance: "medium",
    })),
    sessions: [],
    preferences: defaultPlanningPreferences,
    lastChangeId: null,
  };
  db = {
    auth: {
      getUser: vi
        .fn()
        .mockResolvedValue({ data: { user: { id: "owner" } }, error: null }),
    },
    from: vi.fn().mockReturnValue(query),
  };
  for (const method of ["update", "eq", "select"] as const)
    query[method].mockReturnValue(query);
  query.maybeSingle.mockResolvedValue({ data: { id: "task" }, error: null });
  mocks.client.mockResolvedValue(db);
  mocks.load.mockResolvedValue(state);
  mocks.commit.mockResolvedValue("change-id");
});
afterEach(() => vi.useRealTimers());

describe("weekly planning API", () => {
  it("previews without writing and applies the same time constrained changes", async () => {
    const preview = await POST(
      request({ action: "preview", planningDate: date, preferences: prefs }),
    );
    expect(preview.status).toBe(200);
    const body = await preview.json();
    expect(body.changes).toHaveLength(1);
    expect(mocks.commit).not.toHaveBeenCalled();
    expect(
      (
        await POST(
          request({
            action: "apply",
            planningDate: date,
            preferences: prefs,
            version: body.version,
          }),
        )
      ).status,
    ).toBe(200);
    expect(mocks.commit).toHaveBeenCalledWith(
      db,
      expect.objectContaining({ preferences: prefs, changes: body.changes }),
    );
  });
  it("rejects stale previews and protected overload without writing", async () => {
    expect(
      (
        await POST(
          request({
            action: "apply",
            planningDate: date,
            preferences: prefs,
            version: "old",
          }),
        )
      ).status,
    ).toBe(409);
    state.tasks[1].pinned = true;
    expect(
      (
        await POST(
          request({
            action: "apply",
            planningDate: date,
            preferences: prefs,
            version: "current",
          }),
        )
      ).status,
    ).toBe(409);
    expect(mocks.commit).not.toHaveBeenCalled();
  });
  it("requires authentication and validates minute limits", async () => {
    expect(
      (
        await POST(
          request({
            action: "preview",
            planningDate: date,
            preferences: { ...prefs, dateMinutes: { [date]: -1 } },
          }),
        )
      ).status,
    ).toBe(400);
    db.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    expect(
      (
        await POST(
          request({
            action: "preview",
            planningDate: date,
            preferences: prefs,
          }),
        )
      ).status,
    ).toBe(401);
    expect(mocks.commit).not.toHaveBeenCalled();
  });
  it("updates only the owner’s estimate and preserves the task pin endpoint", async () => {
    expect(
      (
        await PATCH(request({ estimatedMinutes: 25 }), {
          params: Promise.resolve({ id: "task" }),
        })
      ).status,
    ).toBe(200);
    expect(query.update).toHaveBeenCalledWith({ estimated_minutes: 25 });
    expect(query.eq).toHaveBeenCalledWith("user_id", "owner");
    expect(
      (
        await PATCH(request({ pinned: true }), {
          params: Promise.resolve({ id: "task" }),
        })
      ).status,
    ).toBe(200);
    expect(query.update).toHaveBeenCalledWith({ pinned: true });
    expect(
      (
        await PATCH(request({ estimatedMinutes: 0 }), {
          params: Promise.resolve({ id: "task" }),
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await PATCH(request({ estimatedMinutes: 25, user_id: "other" }), {
          params: Promise.resolve({ id: "task" }),
        })
      ).status,
    ).toBe(400);
  });
});
