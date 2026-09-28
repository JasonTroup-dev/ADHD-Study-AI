import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './e2e', testMatch: 'adaptive-planning.spec.ts', workers: 1,
  use: { ...devices['Desktop Chrome'], baseURL: 'http://localhost:3100', screenshot: 'only-on-failure' },
  webServer: { command: 'node node_modules/next/dist/bin/next dev e2e/planning-app --webpack --port 3100', url:'http://localhost:3100', reuseExistingServer: true, timeout:120000 },
});
