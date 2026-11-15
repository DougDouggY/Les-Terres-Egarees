import { defineConfig } from "@playwright/test";
import base from "./playwright.portraits.config";
export default defineConfig({
  ...base,
  testMatch: "dialogue-presentation.spec.ts",
});
