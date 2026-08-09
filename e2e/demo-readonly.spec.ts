import { expect, test } from "@playwright/test";

test("public demo follows the real workspace workflow without authentication or writes", async ({
  page,
}) => {
  const writeRequests: string[] = [];
  page.on("request", (request) => {
    if (["POST", "PUT", "PATCH", "DELETE"].includes(request.method())) {
      writeRequests.push(`${request.method()} ${request.url()}`);
    }
  });

  await page.goto("/demo");
  await expect(page).toHaveURL(/\/demo$/);
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await expect(page.getByRole("status")).toContainText("Sample workspace · read only");
  const navigation = page.getByRole("navigation", { name: "Workspace navigation" });

  await navigation.getByRole("link", { name: "Classes", exact: true }).click();
  await expect(page).toHaveURL(/\/demo\/classes$/, { timeout: 20_000 });
  await expect(page.getByRole("heading", { name: "Classes" })).toBeVisible();
  await expect(page.getByRole("button", { name: "+ Add Class" })).toBeDisabled();

  await page.getByRole("link", { name: /Open Cellular Biology class workspace/ }).click();
  await expect(page).toHaveURL(/\/demo\/classes\/demo-bio-210$/, { timeout: 20_000 });
  await expect(page.getByRole("heading", { name: "Cellular Biology", level: 1 })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Assignments" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Notes & Materials" })).toBeVisible();

  await navigation.getByRole("link", { name: "Study Tools", exact: true }).click();
  await expect(page).toHaveURL(/\/demo\/study$/, { timeout: 20_000 });
  await expect(page.getByRole("heading", { name: "Study Tools" })).toBeVisible();
  await expect(navigation.getByRole("link", { name: "AI Tutor" })).toBeVisible();
  await expect(navigation.getByRole("link", { name: "Study Guides" })).toBeVisible();
  await expect(navigation.getByRole("link", { name: "Flashcards" })).toBeVisible();

  await navigation.getByRole("link", { name: "Planner", exact: true }).click();
  await expect(page).toHaveURL(/\/demo\/planner$/, { timeout: 20_000 });
  await expect(page.getByRole("heading", { name: "Study Planner" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Generate Study Plan" })).toBeDisabled();

  await navigation.getByRole("link", { name: "Calendar", exact: true }).click();
  await expect(page).toHaveURL(/\/demo\/calendar$/, { timeout: 20_000 });
  await expect(page.getByRole("heading", { name: "October 2026" })).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollHeight <= document.documentElement.clientHeight,
      ),
    )
    .toBe(true);

  expect(writeRequests).toEqual([]);
});

test("public demo keeps the shared mobile navigation inside the demo", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/demo");

  await page.getByRole("button", { name: "Open navigation" }).click();
  const navigation = page.getByRole("navigation", { name: "Workspace navigation" });
  await expect(navigation).toBeVisible();

  await navigation.getByRole("link", { name: "Classes", exact: true }).click();
  await expect(page).toHaveURL(/\/demo\/classes$/, { timeout: 20_000 });
  await expect(page.getByRole("heading", { name: "Classes" })).toBeVisible();
  await expect(page).not.toHaveURL(/\/login/);
});
