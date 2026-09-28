import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e",
  testMatch: "calendar.spec.ts",
  workers: 1,
  use: {
    ...devices["Desktop Chrome"],
    baseURL: "http://localhost:3101",
    screenshot: "only-on-failure",
    timezoneId: "America/Los_Angeles",
  },
  webServer: {
    command:
      "node node_modules/next/dist/bin/next dev e2e/calendar-app --webpack --port 3101",
    url: "http://localhost:3101",
    reuseExistingServer: true,
    timeout: 120000,
  },
});
