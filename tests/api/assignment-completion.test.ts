import { beforeEach, describe, expect, it, vi } from "vitest";

const { createClient } = vi.hoisted(() => ({ createClient: vi.fn() }));

vi.mock("@/lib/supabase/server", () => ({ createClient }));

import { PATCH as completeAssignment } from "@/app/api/assignments/[id]/route";

const user = { id: "00000000-0000-4000-8000-000000000001" };

describe("assignment completion API", () => {
  beforeEach(() => {
    createClient.mockReset();
    vi.restoreAllMocks();
  });

  it("rejects unauthenticated requests", async () => {
    createClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
    });

    const response = await completeAssignment(completionRequest(), {
      params: Promise.resolve({ id: "assignment-1" }),
    });

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "You must be logged in to update an assignment.",
    });
  });

  it("completes the assignment and its planner tasks", async () => {
    const assignmentLookup = selectQuery({
      id: "assignment-1",
      status: "in_progress",
    });
    const taskUpdate = updateQuery();
    const assignmentUpdate = updateQuery();
    let assignmentCalls = 0;

    createClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }),
      },
      from: vi.fn((table: string) => {
        if (table === "study_plan_tasks") return taskUpdate;
        assignmentCalls += 1;
        return assignmentCalls === 1 ? assignmentLookup : assignmentUpdate;
      }),
    });

    const response = await completeAssignment(completionRequest(), {
      params: Promise.resolve({ id: "assignment-1" }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      assignment: { id: "assignment-1", status: "completed" },
    });
    expect(taskUpdate.update).toHaveBeenCalledWith({
      status: "completed",
      completed_at: expect.any(String),
    });
    expect(taskUpdate.eq).toHaveBeenNthCalledWith(
      1,
      "assignment_id",
      "assignment-1",
    );
    expect(taskUpdate.eq).toHaveBeenNthCalledWith(2, "user_id", user.id);
    expect(taskUpdate.neq).toHaveBeenCalledWith("status", "completed");
    expect(assignmentUpdate.update).toHaveBeenCalledWith({
      status: "completed",
    });
    expect(assignmentUpdate.eq).toHaveBeenNthCalledWith(
      1,
      "id",
      "assignment-1",
    );
    expect(assignmentUpdate.eq).toHaveBeenNthCalledWith(2, "user_id", user.id);
  });

  it("does not reveal another user's assignment", async () => {
    const assignmentLookup = selectQuery(null);
    createClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }),
      },
      from: vi.fn().mockReturnValue(assignmentLookup),
    });

    const response = await completeAssignment(completionRequest(), {
      params: Promise.resolve({ id: "someone-elses-assignment" }),
    });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: "Assignment not found.",
    });
    expect(assignmentLookup.eq).toHaveBeenNthCalledWith(
      1,
      "id",
      "someone-elses-assignment",
    );
    expect(assignmentLookup.eq).toHaveBeenNthCalledWith(2, "user_id", user.id);
  });
});

function completionRequest() {
  return new Request("http://localhost/api/assignments/assignment-1", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "completed" }),
  });
}

function selectQuery(data: unknown) {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue({ data, error: null }),
  };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  return query;
}

function updateQuery() {
  const query = {
    update: vi.fn(),
    eq: vi.fn(),
    neq: vi.fn(),
    error: null,
  };
  query.update.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.neq.mockReturnValue(query);
  return query;
}
