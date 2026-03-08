import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    include: [
      "tests/**/*.test.ts",
      "packages/lastfm-scraper/tests/**/*.test.ts",
    ],
    globals: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "lastfm-events-scraper": path.resolve(
        __dirname,
        "packages/lastfm-scraper/src/index.ts"
      ),
    },
  },
});
