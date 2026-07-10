import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    setupFiles: ["./src/vitest.setup.ts"],
    environment: "jsdom",
    include: [
      "src/**/*.test.ts",
      "src/**/*.test.tsx",
      "src/**/*_test.ts",
      "src/**/*_test.tsx",
    ],
    globals: true,
  },
  resolve: {
    alias: {
      "#": new URL("./src/", import.meta.url).pathname,
    },
  },
});
