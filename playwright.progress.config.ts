import { defineConfig } from "@playwright/test";
import config from "./playwright.calendar.config";
export default defineConfig({ ...config, testMatch: "progress.spec.ts" });
