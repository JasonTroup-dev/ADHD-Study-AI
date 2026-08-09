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
  await expect(page.getByRole("link", { name: "Open the live workspace" })).toHaveAttribute(
    "href",
    "/login",
  );
  const navigation = page.getByRole("navigation", { name: "Workspace navigation" });

  await page
    .getByRole("link", { name: "View details for Outline the membrane transport discussion" })
    .click();
  await expect(page).toHaveURL(
    /\/demo\/planner\/tasks\/demo-task-outline\?from=dashboard$/,
    { timeout: 20_000 },
  );
  await expect(
    page.getByRole("heading", { name: "Outline the membrane transport discussion" }),
  ).toBeVisible();
  await expect(page.getByText("What this task involves")).toBeVisible();
  await page.getByRole("link", { name: "Back to dashboard" }).click();
  await expect(page).toHaveURL(/\/demo$/, { timeout: 20_000 });

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
  await expect(navigation.getByRole("link", { name: "AI Tutor" })).toHaveAttribute(
    "href",
    "/demo/study/ai-tutor",
  );
  await expect(navigation.getByRole("link", { name: "Study Guides" })).toHaveAttribute(
    "href",
    "/demo/study/study-guide",
  );
  await expect(navigation.getByRole("link", { name: "Flashcards" })).toHaveAttribute(
    "href",
    "/demo/study/flashcards",
  );

  await navigation.getByRole("link", { name: "AI Tutor" }).click();
  await expect(page).toHaveURL(/\/demo\/study\/ai-tutor$/, { timeout: 20_000 });
  await expect(page.getByText("What are you working on?")).toBeVisible();

  await navigation.getByRole("link", { name: "Study Guides" }).click();
  await expect(page).toHaveURL(/\/demo\/study\/study-guide$/, { timeout: 20_000 });
  await expect(page.getByRole("heading", { name: "Study guides" })).toBeVisible();
  await page.getByRole("link", { name: "Open Cell Membranes and Transport" }).first().click();
  await expect(page).toHaveURL(
    /\/demo\/study\/study-guide\/demo-guide-cell-membranes$/,
    { timeout: 20_000 },
  );
  await expect(
    page.getByRole("heading", { name: "Cell Membranes and Transport" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Core concepts" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Copy" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Delete guide" })).toHaveCount(0);
  await page.getByRole("link", { name: "All study guides" }).click();
  await expect(page).toHaveURL(/\/demo\/study\/study-guide$/, { timeout: 20_000 });

  await navigation.getByRole("link", { name: "Flashcards" }).click();
  await expect(page).toHaveURL(/\/demo\/study\/flashcards$/, { timeout: 20_000 });
  await expect(
    page.getByRole("heading", { name: "Flashcards", exact: true }),
  ).toBeVisible();

  await page.getByRole("link", { name: "Open Cell Membranes and Transport" }).click();
  await expect(page).toHaveURL(
    /\/demo\/study\/flashcards\/demo-flashcards-membranes$/,
    { timeout: 20_000 },
  );
  await expect(
    page.getByRole("heading", { name: "Cell Membranes and Transport" }),
  ).toBeVisible();
  await expect(page.getByText("What is the main function of the phospholipid bilayer?")).toBeVisible();
  await page.getByRole("link", { name: "Edit set" }).click();
  await expect(page).toHaveURL(
    /\/demo\/study\/flashcards\/demo-flashcards-membranes\/edit$/,
    { timeout: 20_000 },
  );
  await expect(page.getByRole("heading", { name: "Make this set sharper" })).toBeVisible();
  await page.getByLabel(/^Title/).fill("Cell Membranes: Demo Edit");
  await page.getByRole("button", { name: "Apply demo changes" }).first().click();
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "Demo changes applied for this session" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Back to set" }).click();
  await expect(page).toHaveURL(/\/demo\/study\/flashcards$/, { timeout: 20_000 });
  await expect(
    page.getByRole("heading", { name: "Cell Membranes: Demo Edit" }),
  ).toBeVisible();

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
