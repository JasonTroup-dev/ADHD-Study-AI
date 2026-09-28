import { expect, test } from "@playwright/test";

import { E2E_PASSWORD, signUp } from "./helpers/auth";

test("recovers from a failed sign-in without losing the entered account", async ({
  page,
}) => {
  const { email } = await signUp(page, "auth-recovery");

  await page.goto("/settings");
  await page.getByRole("button", { name: "Sign Out" }).click();
  await expect(page).toHaveURL(/\/login$/);

  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill("DefinitelyWrong123!");
  await page.getByRole("button", { name: "Continue to my dashboard" }).click();

  await expect(page.getByRole("alert")).toContainText("Invalid login credentials");
  await expect(page.getByLabel("Email address")).toHaveValue(email);

  await page.getByLabel("Password", { exact: true }).fill(E2E_PASSWORD);
  await page.getByRole("button", { name: "Continue to my dashboard" }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("main")).toBeVisible();
});
