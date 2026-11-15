import { defineConfig } from "@playwright/test";
import base from "./playwright.portraits.config";
export default defineConfig({
  ...base,
  testMatch: "updates-v24.spec.ts",
  timeout: 90000,
});
