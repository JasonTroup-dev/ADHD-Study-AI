import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import {
  calendarFixtureClasses,
  calendarFixtureItems,
} from "./calendarFixtures";

test("busy days open a complete accessible panel, restore focus, and combine filters", async ({
  page,
}) => {
  await page.goto("/");
  const more = page.getByRole("button", {
    name: "Show 2 more items for Tuesday, October 13, 2026",
  });
  await more.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.locator("article")).toHaveCount(4);
  await expect(dialog).toContainText("3 sessions · ~45 min · 1 unestimated");
  await expect(
    dialog.getByRole("button", { name: "Start studying" }),
  ).toHaveCount(0);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.keyboard.press("Escape");
  await expect(more).toBeFocused();
  await page
    .getByRole("combobox", { name: "Class", exact: true })
    .selectOption(calendarFixtureClasses[1].id);
  await page.getByLabel("Calendar view").selectOption("agenda");
  await expect(
    page.getByRole("heading", { name: "Review working memory flashcards" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "Outline the membrane transport discussion",
    }),
  ).toHaveCount(0);
  await page
    .getByRole("combobox", { name: "Items", exact: true })
    .selectOption("assignment");
  await expect(
    page.getByRole("heading", { name: "Working memory reflection" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Review working memory flashcards" }),
  ).toHaveCount(0);
});

test("restores month and filters after navigation and keeps demo Today consistent", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Next month", exact: true }).click();
  await page.getByLabel("Show completed").uncheck();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "November 2026" }),
  ).toBeVisible();
  await expect(page.getByLabel("Show completed")).not.toBeChecked();
  await page.getByRole("button", { name: "Today", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "October 2026" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "Open Tuesday, October 13, 2026",
      exact: true,
    }),
  ).toHaveAttribute("aria-current", "date");
  await page.getByRole("button", { name: "Review overdue work" }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "Review the earlier lecture",
  );
});

test("mobile defaults to a readable agenda without horizontal overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByLabel("Calendar agenda")).toBeVisible();
  await expect(page.getByLabel("Month calendar")).not.toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "Outline the membrane transport discussion",
    }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("button", { name: "Open day", exact: true })
    .first()
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "tmp/calendar-mobile-panel.png",
    animations: "disabled",
  });
});

async function mockLiveCalendar(page: Page, failInitially = false) {
  const items = structuredClone(calendarFixtureItems);
  const writes: Record<string, unknown>[] = [];
  let failReads = failInitially;
  const token = `eyJhbGciOiJub25lIn0.${Buffer.from(JSON.stringify({ sub: "calendar-user", exp: 4070908800 })).toString("base64url")}.test`;
  await page.context().addCookies([
    {
      name: "sb-calendar-auth-token",
      value: `base64-${Buffer.from(JSON.stringify({ access_token: token, refresh_token: "test", expires_at: 4070908800, expires_in: 3600, token_type: "bearer", user: { id: "calendar-user" } })).toString("base64url")}`,
      domain: "localhost",
      path: "/",
    },
  ]);
  await page.route("https://calendar.supabase.co/**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith("/user"))
      return route.fulfill({
        json: {
          id: "calendar-user",
          aud: "authenticated",
          app_metadata: {},
          user_metadata: {},
        },
      });
    if (url.pathname.endsWith("/study_sessions")) {
      if (route.request().method() === "POST") {
        writes.push(route.request().postDataJSON());
        return route.fulfill({
          json: { id: "session-calendar", session_type: "assignment" },
        });
      }
      return route.fulfill({ json: [] });
    }
    if (failReads)
      return route.fulfill({
        status: 400,
        json: { message: "Fixture unavailable" },
      });
    expect(url.searchParams.get("user_id")).toBe("eq.calendar-user");
    if (url.pathname.endsWith("/classes"))
      return route.fulfill({ json: calendarFixtureClasses });
    const isTask = url.pathname.endsWith("/study_plan_tasks");
    const condition = url.searchParams.get("or") ?? "";
    const start = condition.match(/gte\.(\d{4}-\d{2}-\d{2})/)?.[1] ?? "";
    const end = condition.match(/lte\.(\d{4}-\d{2}-\d{2})/)?.[1] ?? "";
    const data = items
      .filter(
        (item) =>
          item.kind === (isTask ? "task" : "assignment") &&
          ((item.date >= start && item.date <= end) ||
            (!item.isComplete && item.date < "2026-10-13")),
      )
      .map((item) => ({
        id: item.id,
        title: item.title,
        scheduled_date: item.date,
        due_date: item.date,
        status: item.isComplete ? "completed" : "todo",
        class_id: item.classId,
        estimated_minutes: item.estimatedMinutes ?? null,
        assignment_id: item.assignmentId ?? null,
        classes: { name: item.className, color: item.classColor },
        assignments: { due_date: item.dueDate ?? null },
      }));
    return route.fulfill({ json: data });
  });
  await page.route("**/api/calendar/tasks", async (route) => {
    const input = route.request().postDataJSON();
    writes.push(input);
    if (route.request().method() === "PATCH") {
      items.find((item) => item.id === input.id)!.date = input.date;
    } else {
      const course = calendarFixtureClasses.find(
        (course) => course.id === input.classId,
      );
      items.push({
        ...input,
        id: "created-task",
        className: course?.name ?? "No class",
        classColor: "green",
        kind: "task",
        isComplete: false,
      });
    }
    return route.fulfill({ json: { id: input.id ?? "created-task" } });
  });
  return {
    writes,
    recover: () => {
      failReads = false;
    },
  };
}

test("adds a dated task, reschedules it, and starts studying with the right task", async ({
  page,
}) => {
  const { writes } = await mockLiveCalendar(page);
  await page.goto("/live");
  await page.getByRole("button", { name: "Add task", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Task title").fill("Review transport diagrams");
  await dialog.getByLabel("Estimated minutes (optional)").fill("30");
  await dialog.getByLabel("Scheduled date").fill("2026-10-14");
  await dialog.getByRole("button", { name: "Save task" }).click();
  await expect(
    dialog.getByRole("heading", { name: "Review transport diagrams" }),
  ).toBeVisible();
  await expect(dialog).toContainText("~30 min");
  await dialog.getByRole("button", { name: "Reschedule", exact: true }).click();
  await dialog.getByLabel("Scheduled date").fill("2026-11-02");
  await dialog.getByRole("button", { name: "Move task" }).click();
  await expect(
    dialog.getByRole("heading", { name: "Monday, November 2, 2026" }),
  ).toBeVisible();
  await expect(
    dialog.getByRole("heading", { name: "Review transport diagrams" }),
  ).toBeVisible();
  expect(writes[1]).toEqual({
    id: "created-task",
    previousDate: "2026-10-14",
    date: "2026-11-02",
  });
  await dialog.getByRole("button", { name: "Start studying" }).click();
  await expect(page).toHaveURL(/study-session\/session-calendar/);
  expect(writes.at(-1)).toMatchObject({
    planner_task_id: "created-task",
    title: "Review transport diagrams",
  });
});

test("recovers a failed load and keeps an unsuccessful task form editable", async ({
  page,
}) => {
  const mock = await mockLiveCalendar(page, true);
  await page.goto("/live");
  const loadError = page
    .getByRole("alert")
    .filter({ hasText: "could not be loaded" });
  await expect(loadError).toBeVisible();
  mock.recover();
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(loadError).toHaveCount(0);
  await page.getByRole("button", { name: "Add task", exact: true }).click();
  await page.getByRole("dialog").getByLabel("Task title").fill("Keep my draft");
  await page.route("**/api/calendar/tasks", (route) =>
    route.fulfill({ status: 503, json: { error: "Please retry saving." } }),
  );
  await page.getByRole("button", { name: "Save task" }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toHaveText(
    "Please retry saving.",
  );
  await expect(page.getByLabel("Task title")).toHaveValue("Keep my draft");
  await expect(page.getByRole("button", { name: "Save task" })).toBeEnabled();
});

test("opens the existing catch-up preview and refreshes after applying", async ({
  page,
}) => {
  await mockLiveCalendar(page);
  const preferences = {
    maxTasksPerDay: 3,
    weekdayCapacity: [3, 3, 3, 3, 3, 3, 3],
    unavailableDates: [],
  };
  await page.route("**/api/planner", (route) => {
    if (route.request().method() === "GET")
      return route.fulfill({ json: { preferences, lastChangeId: null } });
    const body = route.request().postDataJSON();
    return route.fulfill({
      json:
        body.action === "preview"
          ? {
              version: "v1",
              preferences,
              blocks: [],
              conflicts: [],
              existingCounts: {},
            }
          : { updatedTaskCount: 1, changeId: "plan-change" },
    });
  });
  await page.goto("/live");
  await page.getByRole("button", { name: "Help me catch up" }).click();
  await page.getByRole("button", { name: "Preview catch-up plan" }).click();
  await page.getByRole("button", { name: "Apply this plan" }).click();
  await expect(page.getByRole("dialog")).toContainText("1 tasks rescheduled");
  await expect(
    page.getByRole("button", { name: "Undo last plan change" }),
  ).toBeVisible();
});

test("refreshes a stale reschedule instead of retrying an outdated date", async ({
  page,
}) => {
  await mockLiveCalendar(page);
  await page.goto("/live");
  await page
    .getByRole("button", {
      name: "Open Tuesday, October 13, 2026",
      exact: true,
    })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog
    .locator("article")
    .filter({ hasText: "Outline the membrane transport discussion" })
    .getByRole("button", { name: "Reschedule" })
    .click();
  await dialog.getByLabel("Scheduled date").fill("2026-10-17");
  await expect(dialog).toContainText("after the assignment deadline");
  await page.route("**/api/calendar/tasks", (route) =>
    route.fulfill({
      status: 409,
      json: {
        error: "This task changed. Refresh the calendar before trying again.",
      },
    }),
  );
  await dialog.getByRole("button", { name: "Move task" }).click();
  await expect(
    dialog.getByRole("button", { name: "Move task" }),
  ).toBeDisabled();
  await dialog.getByRole("button", { name: "Refresh calendar" }).click();
  await expect(
    dialog.getByRole("form", { name: "Reschedule task" }),
  ).toHaveCount(0);
  await expect(
    dialog.getByRole("heading", {
      name: "Outline the membrane transport discussion",
    }),
  ).toBeVisible();
});
