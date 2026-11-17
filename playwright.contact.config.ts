import { defineConfig } from "@playwright/test";
import base from "./playwright.plan.config";
export default defineConfig({
  ...base,
  testMatch: "contact-preview.spec.ts",
  timeout: 60000,
});
