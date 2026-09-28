import { beforeEach, describe, expect, it, vi } from "vitest";
import { confirmedStudyMinutes, parseStudyMinutes } from "@/lib/studyTime";
import { progressDateRange, studyActivityByDay } from "@/lib/progress";

const { from, getUser } = vi.hoisted(() => ({ from: vi.fn(), getUser: vi.fn() }));
vi.mock("@/lib/supabase/client", () => ({ supabase: { from, auth: { getUser } } }));
import { completeStudySession, updateStudySessionTime, getTodayTotalStudyMinutes } from "@/lib/studySessions";

let rows: Record<string, unknown>[];
beforeEach(() => {
  rows = [{ id: "ours", user_id: "user", status: "active", started_at: "2026-09-04T10:00:00Z", actual_minutes: null, planner_task_id: null }];
  getUser.mockResolvedValue({ data: { user: { id: "user" } }, error: null });
  from.mockImplementation(() => {
    const filters: [string, unknown][] = [];
    let patch: Record<string, unknown> | undefined;
    function result() {
      const row = rows.find((row) => filters.every(([key, value]) => row[key] === value));
      if (row && patch) Object.assign(row, patch);
      return { data: row ?? null, error: row ? null : { message: "Not found" } };
    }
    const builder = {
      select: () => builder,
      eq: (key: string, value: unknown) => { filters.push([key, value]); return builder; },
      update: (value: Record<string, unknown>) => { patch = value; return builder; },
      maybeSingle: async () => result(), single: async () => result(),
    };
    return builder;
  });
});

describe("honest study time", () => {
  it("never turns a days-old open session into study hours", async () => {
    const { session } = await completeStudySession("ours");
    expect(session.status).toBe("completed");
    expect(session.actual_minutes).toBeNull();
    expect(session.time_confirmed_at).toBeNull();
    expect(session.started_at).toBe("2026-09-04T10:00:00Z");
  });
  it("records only the learner's minutes, including an explicit zero", async () => {
    const { session } = await completeStudySession("ours", null, null, "25");
    expect(confirmedStudyMinutes(session)).toBe(25);
    const corrected = await updateStudySessionTime("ours", "0");
    expect(corrected.actual_minutes).toBe(0);
    expect(corrected.time_confirmed_at).toBeTruthy();
    expect(corrected.status).toBe("completed");
  });
  it("allows clearing time without clearing completed work or dates", async () => {
    const { session } = await completeStudySession("ours", null, null, "45");
    const endedAt = session.ended_at;
    const cleared = await updateStudySessionTime("ours", "");
    expect(cleared).toMatchObject({ actual_minutes: null, time_confirmed_at: null, status: "completed", ended_at: endedAt });
  });
  it("does not overwrite a previously completed session on retry", async () => {
    await completeStudySession("ours", null, null, "25");
    expect((await completeStudySession("ours", null, null, "45")).session.actual_minutes).toBe(25);
  });
  it("does not edit another learner's session or an active session", async () => {
    await expect(updateStudySessionTime("ours", "25")).rejects.toThrow("Not found");
    rows[0].status = "completed";
    rows[0].user_id = "someone-else";
    await expect(updateStudySessionTime("ours", "25")).rejects.toThrow("Not found");
    expect(rows[0].actual_minutes).toBeNull();
  });
  it.each(["-1", "1.5", "1441", "NaN", "Infinity", "abc"])("rejects invalid minutes %s before a database write", async (value) => {
    expect(() => parseStudyMinutes(value)).toThrow();
    await expect(completeStudySession("ours", null, null, value)).rejects.toThrow();
    expect(from).not.toHaveBeenCalled();
  });
  it("excludes legacy 85-hour readings and smaller unverified timers everywhere", async () => {
    const sessions = [
      { actual_minutes: 2632, time_confirmed_at: null, ended_at: "2026-09-06T12:00:00" },
      { actual_minutes: 2429, time_confirmed_at: null, ended_at: "2026-09-08T12:00:00" },
      { actual_minutes: 45, time_confirmed_at: null, ended_at: "2026-09-04T12:00:00" },
      { actual_minutes: 25, time_confirmed_at: "2026-09-09T12:00:00Z", ended_at: "2026-09-09T12:00:00" },
    ];
    const range = progressDateRange(7, new Date("2026-09-10T12:00:00"));
    const activity = studyActivityByDay(range.keys, sessions);
    expect(activity.reduce((sum, day) => sum + day.minutes, 0)).toBe(25);
    expect(activity.reduce((sum, day) => sum + day.sessions, 0)).toBe(4);
    expect(activity.filter((day) => day.sessions > 0)).toHaveLength(4);
    expect(await getTodayTotalStudyMinutes(sessions as Parameters<typeof getTodayTotalStudyMinutes>[0])).toBe(25);
  });
  it("uses local calendar boundaries, including DST days", () => {
    const range = progressDateRange(7, new Date(2026, 10, 1, 12));
    expect(range.keys).toHaveLength(7);
    expect(range.keys.at(-1)).toBe("2026-11-01");
    const end = new Date(range.end);
    expect([end.getMonth(), end.getDate(), end.getHours()]).toEqual([10, 2, 0]);
  });
});
