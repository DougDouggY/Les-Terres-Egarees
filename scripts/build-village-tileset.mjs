import { readFile, writeFile } from "node:fs/promises";
import { chromium } from "@playwright/test";
const [houses, props] = process.argv.slice(2);
if (!houses || !props)
  throw Error(
    "Usage: node scripts/build-village-tileset.mjs houses.png props.png",
  );
const sources = await Promise.all(
  [houses, props].map(
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
    const c = document.createElement("canvas");
    c.width = 2560;
    c.height = 768;
    const ctx = c.getContext("2d");

    for (let i = 0; i < 4; i++)
      ctx.drawImage(
        images[0],
        ((i % 2) * images[0].width) / 2,
        (Math.floor(i / 2) * images[0].height) / 2,
        images[0].width / 2,
        images[0].height / 2,
        i * 640,
        0,
        640,
        640,
      );
    for (let i = 0; i < 9; i++)
      ctx.drawImage(
        images[1],
        ((i % 3) * images[1].width) / 3,
        (Math.floor(i / 3) * images[1].height) / 3,
        images[1].width / 3,
        images[1].height / 3,
        i * 128,
        640,
        128,
        128,
      );
    return c.toDataURL("image/png").split(",")[1];
  }, sources);
  await writeFile(
    "public/assets/kingdom-camp/streets-tileset.png",
    Buffer.from(png, "base64"),
  );
} finally {
  await browser.close();
}
