import { defineConfig } from "@playwright/test";
import base from "./playwright.plan.config";
export default defineConfig({
  ...base,
  testMatch: "advanced-refresh.spec.ts",
  timeout: 60000,
  expect: { timeout: 15000 },
  outputDir: "test-results/advanced-refresh",
});
