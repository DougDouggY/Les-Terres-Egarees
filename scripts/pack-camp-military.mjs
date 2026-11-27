import { readFile, writeFile } from "node:fs/promises";
import { chromium } from "@playwright/test";
const source = process.argv[2];
if (!source)
  throw Error("Usage: node scripts/pack-camp-military.mjs props.png");
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
try {
  const page = await browser.newPage();
  const src =
    "data:image/png;base64," + (await readFile(source)).toString("base64");
  const output = await page.evaluate(async (src) => {
    const i = new Image();
    i.src = src;
    await i.decode();
    const c = document.createElement("canvas");
    c.width = c.height = 1024;
    const t = c.getContext("2d");
    t.imageSmoothingQuality = "high";
    for (let y = 0; y < 4; y++)
      for (let x = 0; x < 4; x++) {
        const sw = i.width / 4,
          sh = i.height / 4,
          scale = Math.min(256 / sw, 256 / sh);
        t.drawImage(
          i,
          x * sw,
          y * sh,
          sw,
          sh,
          x * 256 + (256 - sw * scale) / 2,
          y * 256 + (256 - sh * scale) / 2,
          sw * scale,
          sh * scale,
        );
      }
    return c.toDataURL().split(",")[1];
  }, src);
  await writeFile(
    "public/assets/kingdom-camp/military-life.png",
    Buffer.from(output, "base64"),
  );
} finally {
  await browser.close();
}
