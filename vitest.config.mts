import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["**/*.test.mjs", "tests/**/*.test.ts"],
    exclude: ["e2e/**", "node_modules/**", ".next/**"],
    mockReset: true,
    restoreMocks: true,
  },
});
