import { mkdir, writeFile, readFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { chromium } from "@playwright/test";
const root = "public/assets/chapter-5-6";
const server = spawn(
  process.execPath,
  [
    "node_modules/vite/bin/vite.js",
    "--host",
    "127.0.0.1",
    "--port",
    "5187",
    "--strictPort",
  ],
  { stdio: "ignore" },
);
let browser;
try {
  let ready = false;
  for (let i = 0; i < 80; i++) {
    try {
      const r = await fetch("http://127.0.0.1:5187");
      if (r.ok) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
  if (!ready) throw Error("Preview server unavailable");
  browser = await chromium.launch({
    executablePath: "/usr/bin/chromium",
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  const page = await browser.newPage();
  await page.goto("http://127.0.0.1:5187");
  const layouts = await page.evaluate(async () => {
    const D = await import("/src/data/landscape-drafts.ts");
    return D.campaignTerrainDrafts();
  });
  const manifest = JSON.parse(await readFile(`${root}/resources.json`, "utf8"));
  manifest.maps = [];
  for (const layout of layouts) {
    const dir = `${root}/${layout.id}`;
    await mkdir(dir, { recursive: true });
    const assets = await page.evaluate(async (id) => {
      const D = await import("/src/data/landscape-drafts.ts"),
        R = await import("/src/rendering/landscape-draft-renderer.ts");
      const images = new Map();
      await Promise.all(
        Object.entries(D.LANDSCAPE_ASSETS).map(async ([key, path]) => {
          const i = new Image();
          i.src = "/" + path;
          await i.decode();
          images.set(key, i);
        }),
      );
      const map = D.campaignTerrainDrafts().find((m) => m.id === id),
        closed = R.landscapeLayers(map, images, false);
      const result = {};
      for (const key of ["terrain", "structures", "roofs", "doors", "objects"])
        result[key] = closed[key].toDataURL().split(",")[1];
      result.preview = closed.ground.toDataURL().split(",")[1];
      result["doors-open"] = R.landscapeLayers(map, images, true)
        .doors.toDataURL()
        .split(",")[1];
      return result;
    }, layout.id);
    for (const [name, data] of Object.entries(assets))
      await writeFile(`${dir}/${name}.png`, Buffer.from(data, "base64"));
    const { start, destination, ...graphicLayout } = layout;
    await writeFile(
      `${dir}/layout.json`,
      JSON.stringify(
        {
          draft: true,
          cell: 32,
          exportCell: 64,
          ...graphicLayout,
          connectivityAnchors: { roadEntry: start, roadExit: destination },
        },
        null,
        2,
      ) + "\n",
    );
    manifest.maps.push({
      id: layout.id,
      width: layout.width,
      height: layout.height,
      directory: layout.id,
      layers: [
        "terrain",
        "structures",
        "roofs",
        "doors",
        "doors-open",
        "objects",
      ],
      preview: `${layout.id}/preview.png`,
      layout: `${layout.id}/layout.json`,
    });
    console.log(
      `Exported ${layout.id}: ${layout.width}x${layout.height}, 7 PNG layers/previews`,
    );
  }
  await writeFile(
    `${root}/resources.json`,
    JSON.stringify(manifest, null, 2) + "\n",
  );
} finally {
  await browser?.close();
  server.kill("SIGTERM");
}
