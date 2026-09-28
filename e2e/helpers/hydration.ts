import { expect, type Page } from "@playwright/test";

export async function waitForHydration(page: Page, pathname: string) {
  await expect(page.locator("html")).toHaveAttribute(
    "data-hydrated-path",
    pathname,
    { timeout: 20_000 },
  );
}
