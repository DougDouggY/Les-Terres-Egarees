import { readFile, writeFile } from "node:fs/promises";
import { chromium } from "@playwright/test";
const [villagePath, palisadePath] = process.argv.slice(2);
if (!villagePath || !palisadePath)
  throw Error(
    "Usage: node scripts/build-camp-tileset.mjs village.png palisades.png",
  );
const files = await Promise.all(
  ["public/assets/regional-tiles.png", villagePath, palisadePath].map(
    async (p) =>
      "data:image/png;base64," + (await readFile(p)).toString("base64"),
  ),
);
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
try {
  const page = await browser.newPage();
  const png = await page.evaluate(async (sources) => {
    const images = await Promise.all(
      sources.map(async (src) => {
        const i = new Image();
        i.src = src;
        await i.decode();
        return i;
      }),
    );
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 896;
    const c = canvas.getContext("2d");
    c.drawImage(images[0], 0, 0);
    c.drawImage(images[1], 128, 512, 384, 384);
    // Technical frame extraction and atlas packing only; the generated artwork is not repainted.
    const h = document.createElement("canvas"),
      v = document.createElement("canvas");
    h.width = h.height = v.width = v.height = 128;
    const pw = images[2].naturalWidth,
      ph = images[2].naturalHeight;
    const frame = ph * 0.135;
    // Square source windows preserve wood proportions; each tile shows a few full-sized stakes.
    h.getContext("2d").drawImage(
      images[2],
      0,
      ph * 0.19,
      frame,
      frame,
      0,
      0,
      128,
      128,
    );
    v.getContext("2d").drawImage(
      images[2],
      pw * 0.68,
      0,
      frame,
      frame,
      0,
      0,
      128,
      128,
    );
    const modules = [h, v];
    for (const [west, east, north, south] of [
      [1, 0, 0, 1],
      [0, 1, 0, 1],
      [1, 0, 1, 0],
      [0, 1, 1, 0],
      [1, 0, 0, 0],
      [0, 1, 0, 0],
      [0, 0, 1, 0],
      [0, 0, 0, 1],
    ]) {
      const tile = document.createElement("canvas");
      tile.width = tile.height = 128;
      const t = tile.getContext("2d");
      if (west) t.drawImage(h, 0, 0, 64, 128, 0, 0, 64, 128);
      if (east) t.drawImage(h, 64, 0, 64, 128, 64, 0, 64, 128);
      if (north) t.drawImage(v, 0, 0, 128, 64, 0, 0, 128, 64);
      if (south) t.drawImage(v, 0, 64, 128, 64, 0, 64, 128, 64);
      // Shared middle keeps both log faces connected at a corner/end.
      t.drawImage(v, 54, 48, 20, 32, 54, 48, 20, 32);
      modules.push(tile);
    }
    modules.forEach((tile, i) =>
      c.drawImage(tile, (4 + (i % 4)) * 128, (4 + Math.floor(i / 4)) * 128),
    );
    return canvas.toDataURL("image/png").split(",")[1];
  }, files);
  await writeFile(
    "public/assets/kingdom-camp/tileset.png",
    Buffer.from(png, "base64"),
  );
} finally {
  await browser.close();
}
