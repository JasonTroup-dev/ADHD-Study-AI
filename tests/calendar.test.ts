import { describe, expect, it } from "vitest";
import {
  getCalendarDays,
  toLocalDateString,
} from "@/lib/calendar/getCalendarDays";
import {
  filterCalendarItems,
  itemUrgency,
  parseCalendarDate,
  workloadSummary,
  type CalendarItem,
} from "@/lib/calendar/calendarItems";

const task = (overrides: Partial<CalendarItem> = {}): CalendarItem => ({
  id: "1",
  title: "Read",
  date: "2026-10-13",
  isComplete: false,
  kind: "task",
  className: "Biology",
  classId: "bio",
  classColor: "green",
  estimatedMinutes: 25,
  ...overrides,
});

describe("calendar dates", () => {
  it.each([
    new Date(2026, 7, 1),
    new Date(2026, 1, 1),
    new Date(2024, 1, 1),
    new Date(2026, 11, 1),
  ])("fills complete weeks and includes every date in %s", (month) => {
    const days = getCalendarDays(month);
    expect(days.length % 7).toBe(0);
    expect(days[0].date.getDay()).toBe(0);
    expect(days.at(-1)!.date.getDay()).toBe(6);
    expect(days.filter((day) => day.isCurrentMonth)).toHaveLength(
      new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate(),
    );
    expect(new Set(days.map((day) => toLocalDateString(day.date))).size).toBe(
      days.length,
    );
  });
  it("validates saved dates without UTC shifts or silently rolling invalid dates forward", () => {
    expect(parseCalendarDate("2026-02-30")).toBeNull();
    expect(parseCalendarDate("invalid")).toBeNull();
    expect(toLocalDateString(parseCalendarDate("2024-02-29")!)).toBe(
      "2024-02-29",
    );
  });
});

describe("calendar workload and focus", () => {
  it("excludes deadlines and completed work from estimates, and identifies missing estimates", () => {
    expect(
      workloadSummary([
        task(),
        task({ estimatedMinutes: null }),
        task({ kind: "assignment", estimatedMinutes: 90 }),
        task({ isComplete: true, estimatedMinutes: 60 }),
      ]),
    ).toBe("2 sessions · ~25 min · 1 unestimated");
    expect(workloadSummary([task({ estimatedMinutes: null })])).not.toContain(
      "~0",
    );
  });
  it("combines filters by class identity, type, and completion without mutating items", () => {
    const items = [
      task({ id: "other", classId: "another-biology" }),
      task({ id: "done", isComplete: true }),
      task(),
      task({ kind: "assignment", id: "due" }),
    ];
    expect(
      filterCalendarItems(items, {
        classId: "bio",
        kind: "task",
        showCompleted: false,
      }).map((item) => item.id),
    ).toEqual(["1"]);
    expect(items[0].id).toBe("other");
    expect(
      filterCalendarItems(items, {
        classId: "",
        kind: "all",
        showCompleted: true,
      })[0].kind,
    ).toBe("assignment");
  });
  it("distinguishes missed study sessions from deadlines and never marks completed work overdue", () => {
    expect(itemUrgency(task(), "2026-10-14")).toBe("Missed session");
    expect(itemUrgency(task({ kind: "assignment" }), "2026-10-14")).toBe(
      "Overdue",
    );
    expect(itemUrgency(task({ kind: "assignment" }), "2026-10-13")).toBe(
      "Due today",
    );
    expect(itemUrgency(task({ isComplete: true }), "2026-10-14")).toBe(
      "Completed",
    );
  });
});
