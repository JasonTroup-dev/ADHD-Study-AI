import { beforeEach, describe, expect, it, vi } from "vitest";

const { from, getUser, generate } = vi.hoisted(() => ({
  from: vi.fn(), getUser: vi.fn(), generate: vi.fn(),
}));
vi.mock("@/lib/supabase/client", () => ({ supabase: { from, auth: { getUser } } }));
vi.mock("@/lib/ai/assignmentTaskPlan", () => ({ generateAssignmentTaskRefinement: generate }));

import { completeStudySession, createStudySession, resetStudySessionTask } from "@/lib/studySessions";
import { applyAssignmentTaskRefinement, previewAssignmentTaskRefinement } from "@/lib/assignments/taskRefinement";

type Row = Record<string, unknown>;
let tables: Record<string, Row[]>;

// Execute the production filters against rows so a missing task/user filter
// returns (or changes) the wrong conversation, just as it would in the database.
function query(table: string) {
  const filters: Array<(row: Row) => boolean> = [];
  let maximum = Infinity;
  let patch: Row | undefined;
  let inserted: Row | undefined;
  const orders: Array<{ column: string; ascending: boolean }> = [];
  function result(single = false) {
    if (inserted) tables[table].push(inserted);
    let rows = inserted ? [inserted] : tables[table].filter((row) => filters.every((filter) => filter(row)));
    rows = [...rows].sort((a, b) => {
      for (const { column, ascending } of orders) {
        const comparison = String(a[column]).localeCompare(String(b[column]));
        if (comparison) return ascending ? comparison : -comparison;
      }
      return 0;
    }).slice(0, maximum);
    if (patch) rows.forEach((row) => Object.assign(row, patch));
    return { data: single ? rows[0] ?? null : rows, error: null };
  }
  const builder = {
    select: () => builder,
    eq: (column: string, value: unknown) => { filters.push((row) => row[column] === value); return builder; },
    is: (column: string, value: unknown) => { filters.push((row) => row[column] === value); return builder; },
    in: (column: string, values: unknown[]) => { filters.push((row) => values.includes(row[column])); return builder; },
    order: (column: string, options: { ascending: boolean }) => { orders.push({ column, ...options }); return builder; },
    limit: (count: number) => { maximum = count; return builder; },
    update: (value: Row) => { patch = value; return builder; },
    insert: (value: Row) => { inserted = { id: "new-session", messages: [], ...value }; return builder; },
    maybeSingle: async () => result(true),
    single: async () => result(true),
    then: (resolve: (value: ReturnType<typeof result>) => unknown) => Promise.resolve(result()).then(resolve),
  };
  return builder;
}

const taskInput = {
  plannerTaskId: "task-3", assignmentId: "assignment", classId: "class",
  title: "Problem Set 2: Problems 7–13", sessionType: "assignment" as const,
};
const refinementInput = {
  supabase: { from } as unknown as Parameters<typeof previewAssignmentTaskRefinement>[0]["supabase"],
  userId: "user", assignmentId: "assignment",
};
function session(taskId: string | null, overrides: Row = {}): Row {
  return {
    id: `session-${taskId}`, user_id: "user", assignment_id: "assignment", class_id: "class",
    planner_task_id: taskId, status: "active", session_type: "assignment",
    title: "Original task title", started_at: "2026-09-06T10:00:00Z",
    messages: [{ role: "user", content: "I am working on problem 4." }], ...overrides,
  };
}

beforeEach(() => {
  getUser.mockResolvedValue({ data: { user: { id: "user" } }, error: null });
  from.mockImplementation(query);
  tables = {
    assignments: [{ id: "assignment", user_id: "user", title: "Problem Set 2", context_version: 2 }],
    assignment_materials: [{ assignment_id: "assignment", user_id: "user", original_file_name: "problems.pdf", extracted_text: "Problems 1 through 13" }],
    study_plan_tasks: [1, 2, 3].map((n) => ({
      id: `task-${n}`, user_id: "user", assignment_id: "assignment", class_id: "class",
      title: `Study Session ${n}/3`, scheduled_date: `2026-09-0${n}`, status: "todo",
      source: "generic_generated", user_edited: false, pinned: false, checklist: [],
    })),
    study_sessions: [],
  };
  generate.mockImplementation(async ({ tasks }: { tasks: Array<{ id: string }> }) => tasks.map((task) => ({ id: task.id, proposedTitle: `Problem Set 2: ${task.id}` })));
});

describe("task session continuity", () => {
  it("opens task 3 without hijacking or changing task 2's active conversation", async () => {
    const previous = session("task-2");
    tables.study_sessions.push(previous);
    const snapshot = structuredClone(previous);
    const result = await createStudySession(taskInput);
    expect(result.isExisting).toBe(false);
    expect(result.session.planner_task_id).toBe("task-3");
    expect(previous).toEqual(snapshot);
  });

  it("resumes the selected task by ID even after a title change and another newer session", async () => {
    tables.study_sessions.push(session("task-3"), session("task-2", { started_at: "2026-09-06T12:00:00Z" }));
    const result = await createStudySession(taskInput);
    expect(result.isExisting).toBe(true);
    expect(result.session.id).toBe("session-task-3");
    expect(result.session.messages).toEqual(tables.study_sessions[0].messages);
    expect(tables.study_sessions).toHaveLength(2);
  });

  it("does not reuse completed sessions or another user's task session", async () => {
    tables.study_sessions.push(session("task-3", { status: "completed" }), session("task-3", { user_id: "other" }));
    expect((await createStudySession(taskInput)).isExisting).toBe(false);
  });

  it("keeps assignment-level starts separate from task conversations", async () => {
    tables.study_sessions.push(session("task-2"));
    expect((await createStudySession({ ...taskInput, plannerTaskId: null })).isExisting).toBe(false);
  });

  it("completes the persisted task even if browser storage points at a sibling", async () => {
    tables.study_sessions.push(session("task-3"));
    await completeStudySession("session-task-3", "task-2", "assignment");
    expect(tables.study_plan_tasks[2].status).toBe("completed");
    expect(tables.study_plan_tasks[1].status).toBe("todo");
    expect(tables.assignments[0].status).toBeUndefined();
  });

  it("resetting task 3 preserves task 2's saved conversation", async () => {
    const sibling = session("task-2");
    tables.study_sessions.push(session("task-3"), sibling);
    const snapshot = structuredClone(sibling);
    expect((await resetStudySessionTask("task-3")).clearedSessionIds).toEqual(["session-task-3"]);
    expect(sibling).toEqual(snapshot);
  });
});

describe("material upload plan continuity", () => {
  it("fills a new generic plan once, then preserves it on later uploads", async () => {
    const preview = await previewAssignmentTaskRefinement({ ...refinementInput, automatic: true });
    expect(preview.tasks).toHaveLength(3);
    expect(await applyAssignmentTaskRefinement({ ...refinementInput, ...preview, automatic: true })).toBe(3);
    const snapshot = structuredClone(tables.study_plan_tasks);
    expect((await previewAssignmentTaskRefinement({ ...refinementInput, automatic: true })).tasks).toEqual([]);
    expect(tables.study_plan_tasks).toEqual(snapshot);
    expect(generate).toHaveBeenCalledTimes(1);
  });

  it.each(["active", "completed", "cancelled"])("preserves the whole automatic plan with a %s study session", async (status) => {
    tables.study_sessions.push(session("task-2", { status }));
    expect((await previewAssignmentTaskRefinement({ ...refinementInput, automatic: true })).tasks).toEqual([]);
    expect(generate).not.toHaveBeenCalled();
  });

  it("preserves completed tasks and their remaining plan even without a session record", async () => {
    tables.study_plan_tasks[0].status = "completed";
    expect((await previewAssignmentTaskRefinement({ ...refinementInput, automatic: true })).tasks).toEqual([]);
  });

  it("protects legacy conversations whose task identity cannot be recovered safely", async () => {
    tables.study_sessions.push(session(null));
    expect((await previewAssignmentTaskRefinement(refinementInput)).tasks).toEqual([]);
  });

  it("explicit refinements reserve completed and started work for the generator", async () => {
    tables.study_plan_tasks[0].status = "completed";
    tables.study_sessions.push(session("task-2"));
    const preview = await previewAssignmentTaskRefinement(refinementInput);
    expect(preview.tasks.map((task) => task.id)).toEqual(["task-3"]);
    expect(generate.mock.calls[0][0].fixedTasks.map((task: { id: string }) => task.id)).toEqual(["task-1", "task-2"]);
  });

  it("rejects an explicit update if a task started after preview", async () => {
    const preview = await previewAssignmentTaskRefinement(refinementInput);
    tables.study_sessions.push(session("task-2"));
    const snapshot = structuredClone(tables.study_plan_tasks);
    await expect(applyAssignmentTaskRefinement({ ...refinementInput, ...preview })).rejects.toMatchObject({ status: 409 });
    expect(tables.study_plan_tasks).toEqual(snapshot);
  });

  it("skips an automatic update if a task started while titles were generated", async () => {
    const preview = await previewAssignmentTaskRefinement({ ...refinementInput, automatic: true });
    tables.study_sessions.push(session("task-2"));
    const snapshot = structuredClone(tables.study_plan_tasks);
    expect(await applyAssignmentTaskRefinement({ ...refinementInput, ...preview, automatic: true })).toBe(0);
    expect(tables.study_plan_tasks).toEqual(snapshot);
  });
});
