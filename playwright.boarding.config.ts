import { defineConfig } from "@playwright/test";
import base from "./playwright.plan.config";
export default defineConfig({
  ...base,
  testMatch: "boarding-experiment.spec.ts",
});
