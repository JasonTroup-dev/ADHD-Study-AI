import { expect, type Page } from "@playwright/test";

export const E2E_PASSWORD = "PlaywrightPass123!";

export function uniqueEmail(prefix: string) {
  return `playwright-${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.test`;
}

export async function signUp(page: Page, prefix: string) {
  const email = uniqueEmail(prefix);

  await page.goto("/signup");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(E2E_PASSWORD);
  await page.getByRole("button", { name: "Create my account" }).click();
  await expect(page.getByRole("status")).toContainText("Account created");

  return { email, password: E2E_PASSWORD };
}

export async function signUpAndOpen(page: Page, path: string, prefix: string) {
  const credentials = await signUp(page, prefix);
  await page.goto(path);
  await expect(page).toHaveURL(new RegExp(`${escapeRegExp(path)}$`));
  return credentials;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
