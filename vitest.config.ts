import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    coverage: {
      provider: "v8",
      // Only instrument files with tests; DB/email/API files require integration tests
      include: ["lib/birthdays.ts", "lib/occasions.ts"],
      thresholds: {
        lines: 85,
        functions: 85,
        branches: 80,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
