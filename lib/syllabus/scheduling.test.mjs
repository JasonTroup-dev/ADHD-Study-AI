import { test } from "vitest";
import assert from "node:assert/strict";

import {
  createBalancedStudyPlan,
  DEFAULT_MAX_STUDY_TASKS_PER_DAY,
} from "./scheduling.ts";
import {
  getSyllabusDateEvidence,
  shouldExcludeUndatedSyllabusItem,
} from "./dateEvidence.ts";

function assignment(
  itemId,
  dueDate,
  difficulty = "easy",
  title = `Assignment ${itemId}`,
) {
  return {
    itemId,
    item: {
      title,
      kind: "assignment",
      dueDate,
      difficulty,
      points: difficulty === "hard" ? 80 : 40,
    },
  };
}

test("does not anchor every future assignment to the day after import", () => {
  const dueDates = [
    "2026-06-27",
    "2026-07-04",
    "2026-07-11",
    "2026-07-18",
    "2026-07-25",
    "2026-08-02",
    "2026-08-09",
    "2026-08-16",
    "2026-08-23",
    "2026-08-30",
    "2026-09-06",
    "2026-09-14",
    "2026-09-21",
    "2026-09-28",
    "2026-10-05",
    "2026-10-12",
    "2026-10-20",
  ];
  const plan = createBalancedStudyPlan(
    dueDates.map((dueDate, index) => assignment(String(index), dueDate)),
    { fromDate: "2026-06-23" },
  );
  const june24Tasks = plan.filter(
    (session) => session.scheduledDate === "2026-06-24",
  );

  assert.ok(june24Tasks.length <= DEFAULT_MAX_STUDY_TASKS_PER_DAY);
  assert.ok(june24Tasks.length < dueDates.length);
  assert.ok(
    plan.every((session) =>
      /^Study Session \d+\/\d+: Assignment \d+$/.test(session.title),
    ),
  );
});

test("schedules work backward inside a task-appropriate preparation window", () => {
  const plan = createBalancedStudyPlan(
    [assignment("climate", "2026-07-25")],
    { fromDate: "2026-06-23" },
  );

  assert.deepEqual(
    plan.map((session) => session.scheduledDate),
    ["2026-07-21", "2026-07-24"],
  );
  assert.equal(plan[0].title, "Study Session 1/2: Assignment climate");
  assert.equal(plan.at(-1).title, "Study Session 2/2: Assignment climate");
});

test("respects existing planner workload when another date is available", () => {
  const plan = createBalancedStudyPlan(
    [assignment("food-web", "2026-06-27")],
    {
      fromDate: "2026-06-23",
      existingTaskCounts: new Map([["2026-06-24", 3]]),
    },
  );

  assert.equal(plan[0].scheduledDate, "2026-06-25");
  assert.equal(plan[1].scheduledDate, "2026-06-26");
});

test("balances assignments that share a deadline without exceeding daily capacity", () => {
  const plan = createBalancedStudyPlan(
    Array.from({ length: 10 }, (_, index) =>
      assignment(String(index), "2026-07-10"),
    ),
    { fromDate: "2026-06-23", maxTasksPerDay: 2 },
  );
  const counts = new Map();

  plan.forEach((session) => {
    counts.set(session.scheduledDate, (counts.get(session.scheduledDate) ?? 0) + 1);
  });

  assert.ok(
    [...counts.values()].every(
      (count) => count <= 2,
    ),
  );
});

test("leaves undated and overdue items without automatically generated tasks", () => {
  const plan = createBalancedStudyPlan(
    [
      assignment("overdue", "2026-06-20"),
      assignment("undated", null),
    ],
    { fromDate: "2026-06-23" },
  );

  assert.deepEqual(plan, []);
});

test("uses exam-specific spaced review milestones", () => {
  const plan = createBalancedStudyPlan(
    [
      {
        itemId: "final",
        item: {
          title: "Comprehensive Final Examination",
          kind: "exam",
          dueDate: "2026-10-30",
          difficulty: "hard",
          points: 200,
        },
      },
    ],
    { fromDate: "2026-06-23" },
  );

  assert.equal(plan.length, 4);
  assert.match(plan[0].title, /^Review key concepts:/);
  assert.match(plan.at(-1).title, /^Final review:/);
  assert.equal(plan.at(-1).scheduledDate, "2026-10-29");
});

test("keeps assignment blocks generic when only the title is known", () => {
  const plan = createBalancedStudyPlan(
    [assignment("project", "2026-07-20", "hard", "Capstone Research Project")],
    { fromDate: "2026-06-23" },
  );

  assert.ok(plan.length > 0);
  assert.deepEqual(
    plan.map((session) => session.title),
    [
      "Study Session 1/5: Capstone Research Project",
      "Study Session 2/5: Capstone Research Project",
      "Study Session 3/5: Capstone Research Project",
      "Study Session 4/5: Capstone Research Project",
      "Study Session 5/5: Capstone Research Project",
    ],
  );
  assert.ok(
    plan.every(
      (session) =>
        !/define scope|gather materials|first draft|outline|sources/i.test(
          session.title,
        ),
    ),
  );
});

test("accepts exact source dates but rejects invented days from vague periods", () => {
  const source = [
    "Food Web Analysis — Due: June 27, 2026",
    "The final will take place during the exam period in late October 2026.",
  ].join("\n");

  assert.equal(
    getSyllabusDateEvidence(source, "2026-06-27"),
    "explicit",
  );
  assert.equal(
    getSyllabusDateEvidence(source, "2026-10-30"),
    "missing",
  );
  assert.equal(
    getSyllabusDateEvidence(source, "2026-12-23"),
    "missing",
  );
});

test("excludes undated grading categories but keeps real undated assignments", () => {
  assert.equal(
    shouldExcludeUndatedSyllabusItem(
      "Class Participation & Discussions",
      null,
    ),
    true,
  );
  assert.equal(
    shouldExcludeUndatedSyllabusItem("Final Research Project", null),
    false,
  );
});
