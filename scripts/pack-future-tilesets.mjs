import { readFile, writeFile, mkdir } from "node:fs/promises";
import { chromium } from "@playwright/test";
const [camp, castle, wilds] = process.argv.slice(2);
if (!camp || !castle || !wilds)
  throw Error(
    "Usage: node scripts/pack-future-tilesets.mjs camp.png castle.png wilds.png",
  );
await mkdir("public/assets/future-terrain", { recursive: true });
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
try {
  const page = await browser.newPage();
  for (const [name, path] of [
    ["camp", camp],
    ["castle", castle],
    ["wilds", wilds],
  ]) {
    const source =
      "data:image/png;base64," + (await readFile(path)).toString("base64");
    const data = await page.evaluate(async (source) => {
      const image = new Image();
      image.src = source;
      await image.decode();
      const c = document.createElement("canvas");
      c.width = c.height = 1024;
      const ctx = c.getContext("2d");
      ctx.imageSmoothingQuality = "high";
      for (let y = 0; y < 4; y++)
        for (let x = 0; x < 4; x++)
          ctx.drawImage(
            image,
            (x * image.width) / 4 + 2,
            (y * image.height) / 4 + 2,
            image.width / 4 - 4,
            image.height / 4 - 4,
            x * 256,
            y * 256,
            256,
            256,
          );
      return c.toDataURL().split(",")[1];
    }, source);
    await writeFile(
      `public/assets/future-terrain/${name}.png`,
      Buffer.from(data, "base64"),
    );
  }
} finally {
  await browser.close();
}
