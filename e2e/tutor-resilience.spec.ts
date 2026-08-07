import { expect, test, type Route } from "@playwright/test";

import { signUpAndOpen } from "./helpers/auth";

test("shows streaming failures, retries the turn, and cancels an in-flight response", async ({
  page,
}) => {
  let attempt = 0;
  let pendingRoute: Route | null = null;

  await page.route("**/api/chat", async (route) => {
    attempt += 1;

    if (attempt === 1) {
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ error: "Tutor temporarily unavailable." }),
      });
      return;
    }

    if (attempt === 2) {
      await route.fulfill({
        status: 200,
        contentType: "text/plain; charset=utf-8",
        body: "Retry succeeded: start by identifying the main concept.",
      });
      return;
    }

    pendingRoute = route;
  });

  await signUpAndOpen(page, "/study/ai-tutor", "tutor-resilience");
  const composer = page.getByLabel("Message the AI Tutor");

  await composer.fill("Help me review cellular respiration.");
  await composer.press("Enter");
  await expect(page.getByText("Something went wrong while getting a response.")).toBeVisible();

  await page.getByRole("button", { name: "Retry response" }).click();
  await expect(page.getByText("Retry succeeded: start by identifying the main concept.")).toBeVisible();
  expect(attempt).toBe(2);

  await composer.fill("Give me another explanation.");
  await composer.press("Enter");
  await expect(page.getByRole("button", { name: "Stop response" })).toBeVisible();
  await expect.poll(() => pendingRoute).not.toBeNull();

  await page.getByRole("button", { name: "Stop response" }).click();
  await expect(page.getByText("Response stopped. You can retry.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Retry response" })).toBeVisible();

  await (pendingRoute as Route | null)?.abort("aborted").catch(() => undefined);
});
