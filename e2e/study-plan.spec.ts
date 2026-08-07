import path from "node:path";

import { expect, test } from "@playwright/test";

test("signup to syllabus import to study plan to study session", async ({
  page,
}) => {
  const email = `playwright-${Date.now()}@example.test`;
  const dueDate = dateOnlyAfterDays(2);

  await page.route("**/api/syllabus/analyze", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        course: {
          name: "Cellular Biology",
          classCode: "BIO 210",
          instructor: "Dr. Test",
          confidence: 0.98,
        },
        classMatch: null,
        assignments: [
          {
            title: "Cell Structure Lab",
            kind: "assignment",
            dueDate,
            dueDateStatus: "explicit",
            points: 50,
            difficulty: "easy",
            confidence: 0.97,
            notes: "Review organelles and submit the lab write-up.",
          },
        ],
        originalFileName: "BIO210-syllabus.pdf",
        sourceCharCount: 1_200,
      }),
    });
  });

  await page.goto("/signup");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill("PlaywrightPass123!");
  await page.getByRole("button", { name: "Create my account" }).click();
  await expect(page.getByRole("status")).toContainText("Account created");

  await page.goto("/planner");
  await expect(page.getByRole("heading", { name: "Study Planner" })).toBeVisible();
  await page.getByRole("button", { name: "Generate Study Plan" }).click();

  await page.locator("#study-plan-source-file").setInputFiles(
    path.resolve("output/pdf/BIO210_Cellular_Biology_Fall_2026_Syllabus.pdf"),
  );
  await page.getByRole("button", { name: "Analyze syllabus" }).click();

  await expect(
    page.getByRole("heading", { name: "Review your assignments" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Create detected class" }).click();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Create study plan" }).click();

  await expect(page.getByRole("status")).toContainText(
    "Study plan created with 1 assignment",
  );
  const taskLink = page.getByRole("link", {
    name: /View details for Study Session 1\/2: Cell Structure Lab/,
  });
  await expect(taskLink).toBeVisible();
  await taskLink.click();

  await page.getByRole("button", { name: "Start task" }).click();
  await expect(page).toHaveURL(/\/study-session\/[0-9a-f-]+$/);
  await expect(
    page.getByRole("button", { name: "Upload assignment" }),
  ).toBeVisible();
});

function dateOnlyAfterDays(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}
