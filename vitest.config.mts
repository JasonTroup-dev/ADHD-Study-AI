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
    coverage: {
      provider: "v8",
      include: ["app/api/**/*.ts", "lib/**/*.ts"],
      exclude: [
        "**/*.test.{ts,mjs}",
        "lib/supabase/client.ts",
        "lib/supabase/server.ts",
      ],
      reporter: ["text", "json-summary", "html", "lcov"],
      reportsDirectory: "coverage",
      reportOnFailure: true,
      thresholds: {
        lines: 10,
        functions: 10,
        branches: 10,
        statements: 10,
        "app/api/**/*.ts": {
          lines: 10,
          functions: 10,
          branches: 8,
          statements: 10,
        },
        "lib/**/*.ts": {
          lines: 15,
          functions: 15,
          branches: 10,
          statements: 15,
        },
      },
    },
  },
});
