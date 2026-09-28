import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { weeklyPlannerFixture } from "./weeklyPlannerFixtures";
import { previewCatchUp } from "../lib/planner/catchUp";
import {
  defaultPlanningPreferences,
  type PlanningPreferences,
} from "../lib/planner/preferences";
import type { PlannerWorkspace } from "../lib/planner/types";

async function mockPlanner(
  page: Page,
  { empty = false, fail = false, conflict = false } = {},
) {
  const fixture = structuredClone(weeklyPlannerFixture);
  if (empty) fixture.tasks = [];
  let preferences: PlanningPreferences = {
    ...defaultPlanningPreferences,
    dateMinutes: { "2026-10-13": 60 },
  };
  let undoId: string | null = null;
  let failReads = fail;
  let version = 1;
  let savedTasks = structuredClone(fixture.tasks);
  const writes: Record<string, unknown>[] = [];
  const token = `eyJhbGciOiJub25lIn0.${Buffer.from(JSON.stringify({ sub: "planner-user", exp: 4070908800 })).toString("base64url")}.test`;
  await page
    .context()
    .addCookies([
      {
        name: "sb-calendar-auth-token",
        value: `base64-${Buffer.from(JSON.stringify({ access_token: token, refresh_token: "test", expires_at: 4070908800, expires_in: 3600, token_type: "bearer", user: { id: "planner-user" } })).toString("base64url")}`,
        domain: "localhost",
        path: "/",
      },
    ]);
  await page.route("https://calendar.supabase.co/**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith("/user"))
      return route.fulfill({
        json: {
          id: "planner-user",
          aud: "authenticated",
          app_metadata: {},
          user_metadata: {},
        },
      });
    if (url.pathname.endsWith("/study_sessions")) {
      if (route.request().method() === "POST") {
        writes.push(route.request().postDataJSON());
        return route.fulfill({
          json: { id: "session-weekly", session_type: "assignment" },
        });
      }
      return route.fulfill({ json: null });
    }
    if (failReads)
      return route.fulfill({
        status: 400,
        json: { message: "Fixture unavailable" },
      });
    expect(url.searchParams.get("user_id")).toBe("eq.planner-user");
    if (url.pathname.endsWith("/classes"))
      return route.fulfill({ json: fixture.classes });
    if (url.pathname.endsWith("/assignments"))
      return route.fulfill({ json: fixture.assignments });
    if (url.pathname.endsWith("/study_plan_tasks")) {
      if (route.request().method() === "PATCH") {
        const task = fixture.tasks.find(
          (task) => `eq.${task.id}` === url.searchParams.get("id"),
        )!;
        Object.assign(task, route.request().postDataJSON());
        version++;
        return route.fulfill({ json: { id: task.id } });
      }
      return route.fulfill({ json: fixture.tasks });
    }
    return route.fulfill({ status: 404, json: {} });
  });
  await page.route("**/api/planner", async (route) => {
    if (route.request().method() === "GET")
      return route.fulfill({ json: { preferences, lastChangeId: undoId } });
    const body = route.request().postDataJSON();
    writes.push(body);
    const workspace: PlannerWorkspace = {
      version: `v${version}`,
      preferences,
      lastChangeId: undoId,
      sessions: [],
      tasks: fixture.tasks.map((task) => ({
        ...task,
        user_id: "planner-user",
        description: null,
        source: task.source ?? "generic_generated",
        context_version: 0,
        pinned: false,
        user_edited: false,
        checklist: task.checklist ?? [],
      })),
      assignments: fixture.assignments.map((assignment) => ({
        ...assignment,
        context_version: 0,
        importance: "medium",
      })),
    };
    if (body.action === "undo") {
      fixture.tasks = structuredClone(savedTasks);
      undoId = null;
      version++;
      return route.fulfill({ json: { changeId: "undone" } });
    }
    const preview = previewCatchUp(workspace, "2026-10-13", body.preferences);
    if (conflict)
      preview.conflicts.push({
        title: "Protected task",
        reason: "Tasks kept in place exceed your time limit.",
      });
    if (body.action === "preview") return route.fulfill({ json: preview });
    if (body.version !== workspace.version)
      return route.fulfill({
        status: 409,
        json: { error: "Your planner changed. Preview again." },
      });
    expect(preview.conflicts).toEqual([]);
    savedTasks = structuredClone(fixture.tasks);
    for (const change of preview.changes ?? [])
      fixture.tasks.find(
        (task) => task.id === change.before?.id,
      )!.scheduled_date = change.after!.scheduled_date;
    preferences = body.preferences;
    undoId = "00000000-0000-4000-8000-000000000099";
    version++;
    return route.fulfill({
      json: { changeId: undoId, updatedTaskCount: preview.changes?.length },
    });
  });
  await page.route("**/api/study-plan-tasks/*", async (route) => {
    const task = fixture.tasks.find((task) =>
      route.request().url().endsWith(task.id),
    )!;
    task.estimated_minutes = route.request().postDataJSON().estimatedMinutes;
    version++;
    return route.fulfill({
      json: { estimatedMinutes: task.estimated_minutes },
    });
  });
  await page.route("**/api/calendar/tasks", async (route) => {
    const body = route.request().postDataJSON();
    writes.push(body);
    fixture.tasks.push({
      ...weeklyPlannerFixture.tasks[0],
      id: "new-task",
      title: body.title,
      scheduled_date: body.date,
      estimated_minutes: body.estimatedMinutes,
      source: "manual",
    });
    return route.fulfill({ status: 201, json: { id: "new-task" } });
  });
  return {
    fixture,
    writes,
    recover: () => {
      failReads = false;
    },
    stale: () => {
      version++;
    },
  };
}

test("a lighter day can be previewed, saved, reloaded, and undone", async ({
  page,
}) => {
  const data = await mockPlanner(page);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/planner");
  await expect(
    page.getByText("~45 min remaining · 15 min left open"),
  ).toBeVisible();
  await page.getByLabel("Available study time").selectOption("20");
  await expect(
    page.getByText("~45 min remaining · 25 min over your time"),
  ).toBeVisible();
  await page.getByRole("button", { name: "Preview adjusted plan" }).click();
  const preview = page.getByRole("region", { name: "Adjusted plan preview" });
  await expect(preview).toContainText("Practice drawing free-body diagrams");
  expect(data.fixture.tasks[1].scheduled_date).toBe("2026-10-13");
  await page.screenshot({
    path: "tmp/weekly-planner-adjustment.png",
    fullPage: true,
  });
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await preview.getByRole("button", { name: "Use this plan" }).click();
  await expect(
    page.getByText("~20 min remaining · 0 min left open"),
  ).toBeVisible();
  expect(data.fixture.assignments[1].due_date).toBe("2026-10-19");
  await page.reload();
  await expect(page.getByLabel("Available study time")).toHaveValue("20");
  await expect(
    page.getByRole("button", { name: "Undo last task moves" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Undo last task moves" }).click();
  await expect(
    page.getByText("~45 min remaining · 25 min over your time"),
  ).toBeVisible();
  expect(data.fixture.tasks[1].scheduled_date).toBe("2026-10-13");
  expect(errors).toEqual([]);
});

test("stale previews recover and conflicting plans cannot be applied", async ({
  page,
}) => {
  const data = await mockPlanner(page);
  await page.goto("/planner");
  await page.getByLabel("Available study time").selectOption("20");
  await page.getByRole("button", { name: "Preview adjusted plan" }).click();
  await expect(
    page.getByRole("button", { name: "Use this plan" }),
  ).toBeEnabled();
  data.stale();
  await page.getByRole("button", { name: "Use this plan" }).click();
  await expect(
    page.locator("[role=alert]:not(#__next-route-announcer__)"),
  ).toContainText("Your planner changed");
  await page.getByRole("button", { name: "Preview adjusted plan" }).click();
  await expect(
    page.getByRole("button", { name: "Use this plan" }),
  ).toBeEnabled();
});

test("protected overload blocks save", async ({ page }) => {
  await mockPlanner(page, { conflict: true });
  await page.goto("/planner");
  await page.getByLabel("Available study time").selectOption("20");
  await page.getByRole("button", { name: "Preview adjusted plan" }).click();
  await expect(
    page.getByRole("button", { name: "Use this plan" }),
  ).toBeDisabled();
  await expect(
    page.locator("[role=alert]:not(#__next-route-announcer__)"),
  ).toContainText("Protected task");
});

test("empty state creates a task on the selected date and loads estimates", async ({
  page,
}) => {
  const data = await mockPlanner(page, { empty: true });
  await page.goto("/planner");
  await expect(
    page.getByRole("heading", { name: "Let’s plan your first study session." }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Use an assignment" }),
  ).toHaveAttribute("href", "/planner/assignments");
  await page
    .getByRole("button", { name: "Wednesday, October 14, 2026, Open" })
    .click();
  await page.getByRole("button", { name: "Add a task manually" }).click();
  await expect(page.getByLabel("Scheduled date")).toHaveValue("2026-10-14");
  await page.getByLabel("Task title").fill("Read the first problem");
  await page.getByLabel("Estimated minutes (optional)").fill("15");
  await page.getByRole("button", { name: "Save task", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Read the first problem" }),
  ).toBeVisible();
  expect(data.fixture.tasks[0].estimated_minutes).toBe(15);
  await page.getByRole("button", { name: "Edit time" }).click();
  await page.getByLabel("Estimated minutes", { exact: true }).fill("25");
  await page.getByRole("button", { name: "Save estimate" }).click();
  await expect(page.getByText("About 25 min")).toBeVisible();
  await page
    .getByRole("checkbox", { name: "Mark as complete: Read the first problem" })
    .click();
  await expect(
    page.getByRole("heading", { name: "You’ve finished your planned steps." }),
  ).toBeVisible();
});

test("load failures recover and starting a step uses its task and estimate", async ({
  page,
}) => {
  const data = await mockPlanner(page, { fail: true });
  await page.goto("/planner");
  await expect(
    page.locator("[role=alert]:not(#__next-route-announcer__)"),
  ).toContainText("Your plan could not be loaded");
  data.recover();
  await page.getByRole("button", { name: "Retry loading plan" }).click();
  await page.getByRole("button", { name: "Start this step" }).click();
  await expect(page).toHaveURL(/study-session\/session-weekly/);
  expect(data.writes).toContainEqual(
    expect.objectContaining({
      planner_task_id: weeklyPlannerFixture.tasks[0].id,
      planned_minutes: 20,
    }),
  );
});

test("mobile is readable, keyboard accessible, and demo controls stay read-only", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/planner-preview");
  await expect(
    page.getByRole("button", { name: "Add task", exact: true }),
  ).toBeDisabled();
  await expect(page.getByLabel("Available study time")).toBeDisabled();
  await page.getByRole("button", { name: "Next week", exact: true }).click();
  await page.getByRole("button", { name: "Today", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Work through problems 1 and 2" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <= window.innerWidth &&
        document.documentElement.scrollHeight <= window.innerHeight,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Upcoming & catch up" }).click();
  await expect(
    page.getByRole("heading", { name: "What’s coming up" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Day plan", exact: true }).click();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.screenshot({
    path: "tmp/weekly-planner-mobile.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 1050 });
  await page.screenshot({
    path: "tmp/weekly-planner-desktop.png",
    fullPage: true,
  });
});
