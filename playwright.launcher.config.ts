import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  testMatch: "launcher-release.spec.ts",
  workers: 1,
  outputDir: "test-results/launcher",
  timeout: 90000,
  expect: { timeout: 30000 },
  use: {
    baseURL: "http://127.0.0.1:4173/Les-Terres-Egarees/",
    launchOptions: {
      executablePath: "/usr/bin/chromium",
      args: ["--no-sandbox", "--disable-dev-shm-usage"],
    },
  },
  webServer: {
    command:
      "npm run build:prototype -- --base=/Les-Terres-Egarees/ && npm run preview -- --base=/Les-Terres-Egarees/ --host 0.0.0.0 --port 4173 --strictPort",
    url: "http://127.0.0.1:4173/Les-Terres-Egarees/",
    reuseExistingServer: false,
    timeout: 120000,
  },
});
