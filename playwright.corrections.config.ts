import { defineConfig } from "@playwright/test";
import base from "./playwright.portraits.config";
export default defineConfig({
  ...base,
  testMatch: [
    "manual-saves.spec.ts",
    "portrait-corrections.spec.ts",
    "portraits.spec.ts",
    "introduction.spec.ts",
    "dialogue-presentation.spec.ts",
  ],
});
