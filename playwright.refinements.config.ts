import { defineConfig } from "@playwright/test";
import base from "./playwright.portraits.config";
export default defineConfig({
  ...base,
  testMatch: "portrait-refinements.spec.ts",
  timeout: 120000,
});
