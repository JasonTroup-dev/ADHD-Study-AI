import { describe, expect, it } from "vitest";

import {
  ensureAssignmentTitlePrefix,
  findAssignmentPositionCounters,
  findProblemIdentifierPositions,
  getAssignmentTitleOnlyRefinement,
  replaceProblemIdentifiersWithPositions,
} from "@/lib/ai/assignmentTaskPlan";
import { selectRefinableAssignmentTasks } from "@/lib/assignments/taskRefinement";

describe("assignment task refinement", () => {
  it("only adds the assignment name when existing ordinal task titles are already useful", () => {
    expect(getAssignmentTitleOnlyRefinement("Problem Set 2", [
      {
        id: "first",
        title: "Problems 1–2: Kinematics in one dimension",
        scheduledDate: "2026-08-27",
      },
      {
        id: "second",
        title: "Problems 3–4: Vectors and components",
        scheduledDate: "2026-09-01",
      },
      {
        id: "third",
        title: "Problems 5–13: Vector components, motion, and circular kinematics",
        scheduledDate: "2026-09-05",
      },
    ])).toEqual([
      {
        id: "first",
        proposedTitle: "Problem Set 2: Problems 1–2: Kinematics in one dimension",
      },
      {
        id: "second",
        proposedTitle: "Problem Set 2: Problems 3–4: Vectors and components",
      },
      {
        id: "third",
        proposedTitle: "Problem Set 2: Problems 5–13: Vector components, motion, and circular kinematics",
      },
    ]);
  });

  it("keeps the assignment name at the start of every refined task title", () => {
    expect(ensureAssignmentTitlePrefix(
      "Problem Set 2",
      "Problems 1–2: Kinematics in one dimension",
    )).toBe("Problem Set 2: Problems 1–2: Kinematics in one dimension");

    expect(ensureAssignmentTitlePrefix(
      "Problem Set 2",
      "Problem Set 2: Problems 3–4 — Vectors and components",
    )).toBe("Problem Set 2: Problems 3–4 — Vectors and components");
  });

  it("keeps topic wording while replacing textbook IDs with assignment positions", () => {
    const positions = findProblemIdentifierPositions([
      {
        name: "first.png",
        text: "Displayed problem identifier: 2.21\nAssignment position: 1 of 13",
      },
      {
        name: "fourth.png",
        text: "Problem 3.8 - Enhanced\nTop-right navigation: 4 of 13",
      },
    ]);

    expect(replaceProblemIdentifiersWithPositions(
      "Problems 2.21–3.8 — Kinematics in one dimension",
      positions,
    )).toBe("Problems 1–4 — Kinematics in one dimension");
  });

  it("surfaces assignment counters separately from textbook problem identifiers", () => {
    const counters = findAssignmentPositionCounters([
      {
        name: "problem-2.21.png",
        text: "Displayed problem identifier: 2.21\nAssignment position: 1 of 13",
      },
      {
        name: "problem-2.34.png",
        text: "Problem 2.34 - Enhanced\nTop-right navigation: 2 of 13",
      },
    ]);

    expect(counters).toEqual([
      { sourceName: "problem-2.21.png", current: 1, total: 13 },
      { sourceName: "problem-2.34.png", current: 2, total: 13 },
    ]);
  });

  it("includes overdue unfinished generated tasks when redistributing work", () => {
    const tasks = selectRefinableAssignmentTasks([
      {
        id: "overdue",
        title: "Study Session 1/3",
        scheduled_date: "2026-08-27",
        status: "todo",
        source: "generic_generated",
        user_edited: false,
      },
      {
        id: "future",
        title: "Study Session 3/3",
        scheduled_date: "2026-09-05",
        status: "todo",
        source: "context_generated",
        user_edited: false,
      },
    ]);

    expect(tasks.map((task) => task.id)).toEqual(["overdue", "future"]);
  });

  it("protects completed, manually edited, active, and unrelated tasks", () => {
    const tasks = selectRefinableAssignmentTasks([
      {
        id: "active",
        title: "Active session",
        scheduled_date: "2026-09-02",
        status: "todo",
        source: "generic_generated",
        user_edited: false,
      },
      {
        id: "completed",
        title: "Completed",
        scheduled_date: "2026-08-26",
        status: "done",
        source: "generic_generated",
        user_edited: false,
      },
      {
        id: "edited",
        title: "My custom task",
        scheduled_date: "2026-09-03",
        status: "todo",
        source: "generic_generated",
        user_edited: true,
      },
      {
        id: "unrelated",
        title: "Independent task",
        scheduled_date: "2026-09-04",
        status: "todo",
        source: "manual",
        user_edited: false,
      },
    ], "active");

    expect(tasks).toEqual([]);
  });
});
