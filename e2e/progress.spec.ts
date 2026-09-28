import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function mockProgress(page: Page, { empty = false, fail = false } = {}) {
  await page.clock.setFixedTime(new Date("2026-09-10T18:00:00-07:00"));
  const token = `eyJhbGciOiJub25lIn0.${Buffer.from(JSON.stringify({ sub: "progress-user", exp: 4070908800 })).toString("base64url")}.test`;
  await page.context().addCookies([{
    name: "sb-calendar-auth-token",
    value: `base64-${Buffer.from(JSON.stringify({ access_token: token, refresh_token: "test", expires_at: 4070908800, expires_in: 3600, token_type: "bearer", user: { id: "progress-user" } })).toString("base64url")}`,
    domain: "localhost", path: "/",
  }]);
  const sessions = empty ? [] : [
    { id: "session-3", title: "Problem Set 2: Problems 7–13 — Projectile motion", actual_minutes: 2429, time_confirmed_at: null, ended_at: "2026-09-08T12:00:00-07:00", session_type: "assignment" },
    { id: "session-2", title: "Problem Set 2: Problems 2–4 — 1D motion", actual_minutes: 2632, time_confirmed_at: null, ended_at: "2026-09-06T12:00:00-07:00", session_type: "assignment" },
    { id: "session-1", title: "Problem Set 2: Problem 1 — Tossed rock speed", actual_minutes: 45, time_confirmed_at: null, ended_at: "2026-09-04T12:00:00-07:00", session_type: "assignment" },
  ];
  const writes: Record<string, unknown>[] = [];
  let failSave = false;
  let failReads = fail;
  await page.route("https://calendar.supabase.co/**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith("/user")) return route.fulfill({ json: { id: "progress-user", aud: "authenticated", app_metadata: {}, user_metadata: {} } });
    if (url.pathname.endsWith("/study_sessions")) {
      if (route.request().method() === "PATCH") {
        expect(url.searchParams.get("user_id")).toBe("eq.progress-user");
        expect(url.searchParams.get("status")).toBe("eq.completed");
        if (failSave) return route.fulfill({ status: 500, json: { message: "Could not save study time" } });
        const patch = route.request().postDataJSON();
        writes.push(patch);
        const row = sessions.find((item) => `eq.${item.id}` === url.searchParams.get("id"))!;
        Object.assign(row, patch);
        return route.fulfill({ json: row });
      }
      if (failReads) return route.fulfill({ status: 500, json: { message: "Unable to load" } });
      return route.fulfill({ json: sessions });
    }
    if (url.pathname.endsWith("/study_plan_tasks")) return route.fulfill({ json: empty ? [] : Array.from({ length: 5 }, (_, i) => ({ id: `task-${i}`, status: i < 2 ? "completed" : "todo", title: "Study task", scheduled_date: "2026-09-05" })) });
    return route.fulfill({ json: {} });
  });
  return { writes, setFailSave: (value: boolean) => { failSave = value; }, setFailReads: (value: boolean) => { failReads = value; } };
}

test("excludes old timers, logs corrections, persists on reload, and removes time", async ({ page }) => {
  const { writes } = await mockProgress(page);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/progress");
  const summary = page.getByRole("region", { name: "Progress summary" });
  await expect(summary).toContainText("0m");
  await expect(summary).not.toContainText("85h");
  await expect(page.getByText("Old timers aren’t study time")).toBeVisible();
  await expect(page.getByRole("listitem", { name: "2026-09-08: 1 completed sessions, 0 logged minutes" })).toBeVisible();
  await page.getByRole("button", { name: "Log time", exact: true }).first().click();
  await page.getByRole("button", { name: "25 min", exact: true }).click();
  await page.getByRole("button", { name: "Save time", exact: true }).click();
  await expect(summary).toContainText("25m");
  expect(writes[0]).toMatchObject({ actual_minutes: 25, time_confirmed_at: expect.any(String) });
  expect(writes[0]).not.toHaveProperty("ended_at");
  expect(writes[0]).not.toHaveProperty("status");
  await page.reload();
  await expect(summary).toContainText("25m");
  await page.getByRole("button", { name: "Logged minutes", exact: true }).click();
  await expect(page.getByRole("listitem", { name: "2026-09-08: 1 completed sessions, 25 logged minutes" })).toBeVisible();
  await page.getByRole("button", { name: "Edit time", exact: true }).click();
  await page.getByRole("button", { name: "Remove time", exact: true }).click();
  await expect(summary).toContainText("0m");
  await expect(page.getByText("Time removed. Your session still counts.")).toBeVisible();
  expect(errors).toEqual([]);
});

test("failed saves keep the editor and totals unchanged; retry succeeds", async ({ page }) => {
  const mock = await mockProgress(page);
  mock.setFailSave(true);
  await page.goto("/progress");
  await page.getByRole("button", { name: "Log time", exact: true }).first().click();
  await page.getByRole("spinbutton", { name: "Study minutes" }).fill("45");
  await page.getByRole("button", { name: "Save time", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Could not save");
  await expect(page.getByRole("region", { name: "Progress summary" })).toContainText("0m");
  mock.setFailSave(false);
  await page.getByRole("button", { name: "Save time", exact: true }).click();
  await expect(page.getByRole("region", { name: "Progress summary" })).toContainText("45m");
});

test("review filter, date range, mobile layout and accessibility", async ({ page }) => {
  await mockProgress(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/progress");
  await page.getByRole("link", { name: "Review times" }).click();
  await expect(page.getByRole("checkbox", { name: "Without logged time" })).toBeChecked();
  await page.getByRole("button", { name: "Log time", exact: true }).first().click();
  await page.getByRole("button", { name: "15 min", exact: true }).click();
  await page.getByRole("button", { name: "Save time", exact: true }).click();
  await expect(page.getByRole("button", { name: "Log time", exact: true })).toHaveCount(2);
  await page.getByRole("combobox", { name: "Progress period" }).selectOption("30");
  await expect(page.getByRole("list", { name: "Completed sessions by day" }).getByRole("listitem")).toHaveCount(30);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze()).violations).toEqual([]);
  await page.screenshot({ path: "tmp/progress-mobile.png", fullPage: true });
});

test("empty activity and load failure have distinct states", async ({ page }) => {
  const mock = await mockProgress(page, { empty: true, fail: true });
  await page.goto("/progress");
  await expect(page.getByRole("alert")).toContainText("could not be loaded");
  await expect(page.getByRole("region", { name: "Progress summary" })).not.toContainText("0m");
  mock.setFailReads(false);
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByText("Your week starts with one small step")).toBeVisible();
  await expect(page.getByText("No completed sessions in this period")).toBeVisible();
});

test("desktop preview", async ({ page }) => {
  await mockProgress(page);
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto("/progress");
  await expect(page.getByText("Old timers aren’t study time")).toBeVisible();
  await page.screenshot({ path: "tmp/progress-desktop.png", fullPage: true });
});
