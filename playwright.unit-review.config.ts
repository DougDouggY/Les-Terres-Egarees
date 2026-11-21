import { defineConfig } from "@playwright/test";
import base from "./playwright.plan.config";
export default defineConfig({
  ...base,
  timeout: 120000,
  expect: { timeout: 30000 },
  testMatch: "unit-review.spec.ts",
});
