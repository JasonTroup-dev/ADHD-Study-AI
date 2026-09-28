import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ client: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.client }));
import { POST, PATCH } from "@/app/api/calendar/tasks/route";

const id = "00000000-0000-4000-8000-000000000001";
const classId = "00000000-0000-4000-8000-000000000002";
function query(data: unknown = { id }, error: unknown = null) {
  const builder = {
    select: vi.fn(),
    eq: vi.fn(),
    neq: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    maybeSingle: vi.fn(),
    single: vi.fn(),
  };
  for (const method of ["select", "eq", "neq", "insert", "update"] as const)
    builder[method].mockReturnValue(builder);
  builder.maybeSingle.mockResolvedValue({ data, error });
  builder.single.mockResolvedValue({ data, error });
  return builder;
}
function request(body: unknown, method = "POST") {
  return new Request("http://localhost/api/calendar/tasks", {
    method,
    body: JSON.stringify(body),
  });
}
const newTask = {
  title: " Review notes ",
  date: "2026-10-13",
  classId: null,
  estimatedMinutes: 25,
};
let tasks: ReturnType<typeof query>;
let classes: ReturnType<typeof query>;
let db: {
  from: ReturnType<typeof vi.fn>;
  auth: { getUser: ReturnType<typeof vi.fn> };
};
beforeEach(() => {
  tasks = query();
  classes = query({ id: classId });
  db = {
    from: vi.fn((table) => (table === "classes" ? classes : tasks)),
    auth: {
      getUser: vi
        .fn()
        .mockResolvedValue({ data: { user: { id: "owner" } }, error: null }),
    },
  };
  mocks.client.mockResolvedValue(db);
});

describe("calendar task writes", () => {
  it("requires authentication before creating or moving tasks", async () => {
    db.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    expect((await POST(request(newTask))).status).toBe(401);
    expect(
      (
        await PATCH(
          request(
            { id, date: "2026-10-14", previousDate: "2026-10-13" },
            "PATCH",
          ),
        )
      ).status,
    ).toBe(401);
    expect(db.from).not.toHaveBeenCalled();
  });
  it.each([
    { date: "2026-02-30" },
    { title: "  " },
    { estimatedMinutes: -2 },
    { user_id: "other" },
  ])("rejects invalid or injected fields: %s", async (patch) => {
    expect((await POST(request({ ...newTask, ...patch }))).status).toBe(400);
    expect(tasks.insert).not.toHaveBeenCalled();
  });
  it("checks class ownership before insertion", async () => {
    classes.maybeSingle.mockResolvedValue({ data: null, error: null });
    expect((await POST(request({ ...newTask, classId }))).status).toBe(404);
    expect(classes.eq).toHaveBeenCalledWith("user_id", "owner");
    expect(tasks.insert).not.toHaveBeenCalled();
  });
  it("creates a manual task with the signed-in owner and supplied estimate", async () => {
    expect((await POST(request(newTask))).status).toBe(201);
    expect(tasks.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "owner",
        title: "Review notes",
        estimated_minutes: 25,
        scheduled_date: newTask.date,
        source: "manual",
        user_edited: true,
      }),
    );
  });
  it("protects ownership, completed work, and concurrent date changes when rescheduling", async () => {
    expect(
      (
        await PATCH(
          request(
            { id, date: "2026-10-14", previousDate: "2026-10-13" },
            "PATCH",
          ),
        )
      ).status,
    ).toBe(200);
    expect(tasks.eq).toHaveBeenCalledWith("user_id", "owner");
    expect(tasks.eq).toHaveBeenCalledWith("scheduled_date", "2026-10-13");
    expect(tasks.neq).toHaveBeenCalledWith("status", "completed");
    expect(tasks.update).toHaveBeenCalledWith({
      scheduled_date: "2026-10-14",
      user_edited: true,
    });
  });
  it("reports a conflict instead of claiming a stale or unavailable task moved", async () => {
    tasks.maybeSingle.mockResolvedValue({ data: null, error: null });
    expect(
      (
        await PATCH(
          request(
            { id, date: "2026-10-14", previousDate: "2026-10-13" },
            "PATCH",
          ),
        )
      ).status,
    ).toBe(409);
  });
  it("returns a recoverable save error", async () => {
    tasks.single.mockResolvedValue({
      data: null,
      error: { message: "unavailable" },
    });
    expect((await POST(request(newTask))).status).toBe(500);
  });
});
