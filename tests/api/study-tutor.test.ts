import { beforeEach, describe, expect, it, vi } from "vitest";

const { createClient, getStudyTutorResponse } = vi.hoisted(() => ({
  createClient: vi.fn(), getStudyTutorResponse: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({ createClient }));
vi.mock("@/lib/ai/studySessionTutor", () => ({ getStudyTutorResponse }));
import { POST } from "@/app/api/study-sessions/tutor/route";

const taskTitle = "Problem Set 2: Problems 2–4";
const tasks = [
  { id: "task-1", title: "Problem Set 2: Problem 1 — Tossed rock", status: "completed" },
  { id: "task-2", title: taskTitle, status: "todo" },
  { id: "task-3", title: "Problem Set 2: Problems 5–13", status: "todo" },
];

function query(data: unknown, error: unknown = null) {
  const result = { data, error };
  const chain = {
    select: vi.fn(), eq: vi.fn(), order: vi.fn(), limit: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue(result),
    then: (resolve: (value: typeof result) => unknown) => Promise.resolve(result).then(resolve),
  };
  for (const method of [chain.select, chain.eq, chain.order, chain.limit]) method.mockReturnValue(chain);
  return chain;
}

function querySequence(data: unknown[]) {
  let callIndex = 0;
  const chain = {
    select: vi.fn(), eq: vi.fn(), is: vi.fn(), order: vi.fn(),
    then: (resolve: (value: { data: unknown; error: null }) => unknown) => {
      const result = {
        data: data[Math.min(callIndex, data.length - 1)],
        error: null,
      };
      callIndex += 1;
      return Promise.resolve(result).then(resolve);
    },
  };
  for (const method of [chain.select, chain.eq, chain.is, chain.order]) method.mockReturnValue(chain);
  return chain;
}

function setup({
  linkedId = null,
  previousError = null,
  taskRows = tasks,
  classMaterialRows = [[]],
}: {
  linkedId?: string | null;
  previousError?: unknown;
  taskRows?: typeof tasks;
  classMaterialRows?: unknown[];
} = {}) {
  const active = query({ id: "session-2", assignment_id: "assignment", planner_task_id: linkedId, title: taskTitle, session_type: "assignment" });
  const assignment = query({ class_id: "class-1", title: "Problem Set 2", description: "Due tomorrow", due_date: null, extracted_text: null, classes: null });
  const materials = query([{ original_file_name: "second.png", extracted_text: "Assignment position: 2 of 13\nDisplayed problem identifier: Problem 2.34\nA particle has velocity 2t^2." }]);
  const classMaterials = querySequence(classMaterialRows);
  const planner = query(taskRows);
  const previous = query([{ title: tasks[0].title, ended_at: "2026-09-05T04:00:00Z", messages: [{ role: "user", content: "I finished problem 1, both parts." }] }], previousError);
  let sessionCalls = 0;
  const from = vi.fn((table: string) => {
    if (table === "study_sessions") return sessionCalls++ % 2 === 0 ? active : previous;
    if (table === "assignments") return assignment;
    if (table === "assignment_materials") return materials;
    if (table === "assignment_files") return classMaterials;
    if (table === "study_plan_tasks") return planner;
    throw new Error(`Unexpected table: ${table}`);
  });
  createClient.mockResolvedValue({ auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "owner" } }, error: null }) }, from });
  return { active, assignment, materials, classMaterials, planner, previous };
}

function request(plannerTaskId?: string, messages: Array<Record<string, unknown>> = []) {
  return new Request("http://localhost/api/study-sessions/tutor", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId: "session-2", plannerTaskId, messages }),
  });
}

describe("study tutor context loading", () => {
  beforeEach(() => {
    vi.spyOn(console, "info").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    getStudyTutorResponse.mockResolvedValue({ message: "Start item 2 (Problem 2.34).", completionStatus: "in_progress", completionReason: "" });
  });

  it("loads concrete scope, prior work and readable materials for legacy sessions", async () => {
    const queries = setup();
    expect((await POST(request())).status).toBe(200);
    expect(getStudyTutorResponse.mock.calls[0][0]).toMatchObject({
      currentTask: tasks[1], completedTasks: [{ id: "task-1", title: tasks[0].title }],
      completedSessions: [{ title: tasks[0].title, conversationExcerpts: [{ role: "user", content: "I finished problem 1, both parts." }] }],
      assignment: { instructions: null, studySessionGoal: { sessionNumber: 2, totalSessions: 3 },
        problemIndex: [{
          assignmentPosition: 2,
          primaryLabel: "Problem 2",
          textbookProblem: "Problem 2.34",
          secondaryLabel: "textbook Problem 2.34",
          sources: ["second.png"],
        }] },
    });
    for (const chain of Object.values(queries)) expect(chain.eq).toHaveBeenCalledWith("user_id", "owner");
    expect(queries.previous.eq).toHaveBeenCalledWith("assignment_id", "assignment");
    expect(queries.previous.eq).toHaveBeenCalledWith("status", "completed");
    expect(queries.previous.limit).toHaveBeenCalledWith(8);
  });

  it("refreshes class-wide materials on every tutor request", async () => {
    const equationSheet = {
      file_name: "PHY 121 equation sheet.pdf",
      extracted_text: "Constant acceleration: x = x0 + v0 t + 1/2 a t^2.",
    };
    const queries = setup({ classMaterialRows: [[], [equationSheet]] });

    expect((await POST(request(undefined, [{ role: "user", content: "Which formula should I use?" }]))).status).toBe(200);
    expect(getStudyTutorResponse.mock.calls.at(-1)?.[0].assignment.materials).not.toContainEqual(
      expect.objectContaining({ name: equationSheet.file_name }),
    );

    expect((await POST(request(undefined, [{ role: "user", content: "Use the equation sheet I just added." }]))).status).toBe(200);
    expect(getStudyTutorResponse.mock.calls.at(-1)?.[0].assignment.materials).toEqual([
      {
        name: equationSheet.file_name,
        content: equationSheet.extracted_text,
        scope: "class",
      },
      expect.objectContaining({ name: "second.png", scope: "assignment" }),
    ]);
    expect(queries.classMaterials.eq).toHaveBeenCalledWith("class_id", "class-1");
    expect(queries.classMaterials.eq).toHaveBeenCalledWith("user_id", "owner");
    expect(queries.classMaterials.is).toHaveBeenCalledWith("assignment_id", null);
  });

  it("uses the saved task link over a conflicting client task id", async () => {
    setup({ linkedId: "task-2" });
    expect((await POST(request("task-1"))).status).toBe(200);
    expect(getStudyTutorResponse.mock.calls[0][0].currentTask.id).toBe("task-2");
  });

  it("does not accept a task outside the user's assignment", async () => {
    setup();
    expect((await POST(request("foreign-task"))).status).toBe(200);
    expect(getStudyTutorResponse.mock.calls[0][0].currentTask).toBeNull();
    expect(getStudyTutorResponse.mock.calls[0][0].assignment.studySessionGoal).toBeNull();
  });

  it("does not guess between duplicate legacy task titles", async () => {
    setup({ taskRows: [...tasks, { ...tasks[1], id: "duplicate" }] });
    await POST(request());
    expect(getStudyTutorResponse.mock.calls[0][0].currentTask).toBeNull();
  });

  it("reports failed history loads rather than tutoring without prior progress", async () => {
    setup({ previousError: { message: "unavailable" } });
    expect((await POST(request())).status).toBe(500);
    expect(getStudyTutorResponse).not.toHaveBeenCalled();
  });

  it("accepts the retained 40-message conversation and rejects oversized input", async () => {
    setup();
    const messages = Array.from({ length: 40 }, (_, i) => ({ role: i % 2 ? "user" : "assistant", content: `Turn ${i}` }));
    expect((await POST(request(undefined, messages))).status).toBe(200);
    expect(getStudyTutorResponse.mock.calls[0][1]).toEqual(messages);
    expect((await POST(request(undefined, [...messages, messages[0]]))).status).toBe(400);
  });

  it("passes a validated image attachment to the study tutor without storing it as material", async () => {
    setup();
    const imageMessage = {
      role: "user",
      content: "Explain this diagram.",
      attachments: [{
        id: "image-1",
        name: "clipboard-image.png",
        kind: "image",
        mediaType: "image/png",
        content: "data:image/png;base64,AQID",
      }],
    };

    expect((await POST(request(undefined, [imageMessage]))).status).toBe(200);
    expect(getStudyTutorResponse.mock.calls[0][1]).toEqual([imageMessage]);
  });
});
