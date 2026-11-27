import { defineConfig } from "@playwright/test";
import base from "./playwright.plan.config";
export default defineConfig({
  ...base,
  testMatch: [
    "story-update.spec.ts",
    "cooperative-story-update.spec.ts",
    "chapter-two-review.spec.ts",
    "camp-preview.spec.ts",
    "future-terrain.spec.ts",
    "chapter-5-6-terrain.spec.ts",
  ],
  timeout: 120000,
  expect: { timeout: 20000 },
  outputDir: "test-results/story-update",
});
