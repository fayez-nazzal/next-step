import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@next-step/domain": resolve(import.meta.dirname, "libs/domain/src/index.ts"),
      "@next-step/application": resolve(import.meta.dirname, "libs/application/src/index.ts"),
      "@next-step/persistence": resolve(import.meta.dirname, "libs/persistence/src/index.ts"),
      "@next-step/tui": resolve(import.meta.dirname, "libs/tui/src/index.ts"),
    },
  },
  test: {
    include: ["libs/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: [
        "libs/domain/src/index.ts",
        "libs/persistence/src/codec.ts",
        "libs/tui/src/banner.ts",
      ],
      exclude: [
        "**/*.test.ts",
        "**/*.d.ts",
        "**/AGENTS.md",
        "apps/**",
        "libs/application/**",
        "libs/persistence/src/index.ts",
      ],
      reporter: ["text", "html", "json-summary"],
      thresholds: { perFile: true, lines: 100, statements: 100, functions: 100, branches: 100 },
    },
  },
});
