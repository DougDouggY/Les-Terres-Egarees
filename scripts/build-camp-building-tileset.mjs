import { readFile, writeFile } from "node:fs/promises";
import { chromium } from "@playwright/test";
const [roofs, walls] = process.argv.slice(2);
if (!roofs || !walls)
  throw Error(
    "Usage: node scripts/build-camp-building-tileset.mjs roofs.png walls.png",
  );
const sources = await Promise.all(
  [roofs, walls, "public/assets/kingdom-camp/streets-tileset.png"].map(
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
  const result = await page.evaluate(async (sources) => {
    const images = await Promise.all(
      sources.map(async (src) => {
        const i = new Image();
        i.src = src;
        await i.decode();
        return i;
      }),
    );
    const canvas = document.createElement("canvas");
    canvas.width = 1152;
    canvas.height = 1024;
    const c = canvas.getContext("2d");
    c.drawImage(images[0], 0, 0, 1152, 768);
    for (let y = 0; y < 4; y++)
      for (let x = 0; x < 4; x++)
        c.drawImage(
          images[1],
          (x * images[1].width) / 4,
          (y * images[1].height) / 4,
          images[1].width / 4,
          images[1].height / 4,
          x * 64,
          768 + y * 64,
          64,
          64,
        );
    for (let i = 0; i < 9; i++)
      c.drawImage(images[2], i * 128, 640, 128, 128, (4 + i) * 64, 768, 64, 64);
    return canvas.toDataURL("image/png").split(",")[1];
  }, sources);
  await writeFile(
    "public/assets/kingdom-camp/buildings-layered.png",
    Buffer.from(result, "base64"),
  );
} finally {
  await browser.close();
}
