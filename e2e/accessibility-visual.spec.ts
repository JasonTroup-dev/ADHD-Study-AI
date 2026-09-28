import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page, type TestInfo } from "@playwright/test";

import { signUpAndOpen } from "./helpers/auth";

test("login has no automatically detectable WCAG A/AA violations", async ({
  page,
}, testInfo) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Pick up where you left off." })).toBeVisible();

  await expectNoAxeViolations(page, testInfo);
});

test("authenticated tutor has no automatically detectable WCAG A/AA violations", async ({
  page,
}, testInfo) => {
  await signUpAndOpen(page, "/study/ai-tutor", "axe-tutor");
  await expect(page.getByLabel("Message the AI Tutor")).toBeVisible();

  await expectNoAxeViolations(page, testInfo);
});

test("mobile navigation supports keyboard focus and escape", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signUpAndOpen(page, "/dashboard", "mobile-keyboard");

  await page.locator("body").press("Tab");
  await expect(page.getByRole("link", { name: "Skip to main content" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main-content")).toBeFocused();

  const navigationButton = page.getByRole("button", { name: "Open navigation" });
  await navigationButton.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Workspace navigation" })).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(navigationButton).toBeFocused();
});

test("login desktop and mobile layouts match visual baselines", async ({ page }) => {
  await page.goto("/login");
  await hideDevelopmentOverlay(page);
  await expect(page.getByRole("heading", { name: "Pick up where you left off." })).toBeVisible();
  await expect(page).toHaveScreenshot("login-desktop.png", {
    animations: "disabled",
    fullPage: true,
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await hideDevelopmentOverlay(page);
  await expect(page.getByRole("heading", { name: "Pick up where you left off." })).toBeVisible();
  await expect(page).toHaveScreenshot("login-mobile.png", {
    animations: "disabled",
    fullPage: true,
  });
});

async function hideDevelopmentOverlay(page: Page) {
  await page.evaluate(() => {
    const removeOverlay = () => {
      document.querySelectorAll("nextjs-portal").forEach((element) => element.remove());
    };

    removeOverlay();
    new MutationObserver(removeOverlay).observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
  });
}

async function expectNoAxeViolations(page: Page, testInfo: TestInfo) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();

  await testInfo.attach("axe-results", {
    body: JSON.stringify(results, null, 2),
    contentType: "application/json",
  });
  expect(results.violations).toEqual([]);
}
