import { defineConfig } from "vite";
import { execFileSync } from "node:child_process";
let revision = process.env.GITHUB_SHA || "local";
if (revision === "local") {
  try {
    revision = execFileSync("git", ["rev-parse", "HEAD"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {}
}
export default defineConfig({
  define: { "import.meta.env.VITE_APP_REVISION": JSON.stringify(revision) },
  plugins: [
    {
      name: "release-stamp",
      generateBundle() {
        this.emitFile({
          type: "asset",
          fileName: "release.json",
          source: JSON.stringify({
            revision,
            edition: "camp-layered-buildings",
            builtAt: new Date().toISOString(),
          }),
        });
      },
    },
  ],
});
