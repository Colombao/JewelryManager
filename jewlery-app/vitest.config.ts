import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    include: ["tests/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "json-summary"],
      include: [
        "lib/**/*.ts",
        "app/kit/kitUtils.ts",
        "app/cadastro/productImport.ts",
        "hooks/usePagination.ts",
      ],
      exclude: ["lib/business.ts"],
      thresholds: {
        lines: 25,
        branches: 25,
        functions: 25,
        statements: 25,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
