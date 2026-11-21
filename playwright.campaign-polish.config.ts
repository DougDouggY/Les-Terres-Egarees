import { defineConfig } from "@playwright/test";
import base from "./playwright.plan.config";
export default defineConfig({
  ...base,
  testMatch: "campaign-polish.spec.ts",
  timeout: 120000,
  expect: { timeout: 30000 },
});
