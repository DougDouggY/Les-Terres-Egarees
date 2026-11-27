import { readFile, writeFile, mkdir } from "node:fs/promises";
import { chromium } from "@playwright/test";
const input = process.argv[2];
const burned = process.argv.includes("--burned");
const name = burned ? "compact-buildings-burned" : "compact-buildings";
if (!input)
  throw Error(
    "Usage: node scripts/pack-compact-camp-buildings.mjs buildings.png",
  );
const output = "public/assets/kingdom-camp";
const frames = [
  { id: "main-barracks", rect: [0, 0, 630, 512], w: 3, h: 2 },
  { id: "officers", rect: [635, 0, 365, 512], w: 2, h: 2 },
  { id: "stores", rect: [1000, 0, 536, 512], w: 3, h: 2 },
  { id: "prison", rect: [0, 512, 630, 512], w: 3, h: 2 },
  { id: "second-barracks", rect: [630, 512, 410, 512], w: 2, h: 2 },
  { id: "provisions", rect: [1040, 512, 496, 512], w: 2, h: 2 },
];
if (burned) {
  const rectangles = [
    [0, 0, 670, 418],
    [700, 0, 530, 418],
    [1240, 0, 641, 418],
    [0, 418, 670, 418],
    [700, 418, 530, 418],
    [1240, 418, 641, 418],
  ];
  frames.forEach((f, i) => (f.rect = rectangles[i]));
}
await mkdir(`${output}/${name}`, { recursive: true });
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
try {
  const page = await browser.newPage(),
    src = "data:image/png;base64," + (await readFile(input)).toString("base64");
  const packed = await page.evaluate(
    async ({ src, frames }) => {
      const image = new Image();
      image.src = src;
      await image.decode();
      const atlas = document.createElement("canvas");
      atlas.width = 1152;
      atlas.height = 512;
      const ctx = atlas.getContext("2d");
      ctx.imageSmoothingQuality = "high";
      const sprites = [];
      for (let i = 0; i < frames.length; i++) {
        const frame = frames[i],
          sample = document.createElement("canvas");
        sample.width = frame.rect[2];
        sample.height = frame.rect[3];
        const c = sample.getContext("2d");
        c.drawImage(image, ...frame.rect, 0, 0, sample.width, sample.height);
        const a = c.getImageData(0, 0, sample.width, sample.height).data;
        let left = sample.width,
          top = sample.height,
          right = 0,
          bottom = 0;
        for (let y = 0; y < sample.height; y++)
          for (let x = 0; x < sample.width; x++)
            if (a[(y * sample.width + x) * 4 + 3] > 32) {
              left = Math.min(left, x);
              top = Math.min(top, y);
              right = Math.max(right, x + 1);
              bottom = Math.max(bottom, y + 1);
            }
        const w = right - left,
          h = bottom - top;
        if (w < 20 || h < 20) throw Error("Missing building " + frame.id);
        const scale = Math.min(384 / w, 256 / h);
        ctx.drawImage(
          sample,
          left,
          top,
          w,
          h,
          (i % 3) * 384 + (384 - w * scale) / 2,
          Math.floor(i / 3) * 256 + 256 - h * scale,
          w * scale,
          h * scale,
        );
        const individual = document.createElement("canvas");
        individual.width = frame.w * 128;
        individual.height = frame.h * 128;
        const t = individual.getContext("2d");
        t.imageSmoothingQuality = "high";
        const s = Math.min(individual.width / w, individual.height / h);
        t.drawImage(
          sample,
          left,
          top,
          w,
          h,
          (individual.width - w * s) / 2,
          individual.height - h * s,
          w * s,
          h * s,
        );
        sprites.push(individual.toDataURL().split(",")[1]);
      }
      return { atlas: atlas.toDataURL().split(",")[1], sprites };
    },
    { src, frames },
  );
  await writeFile(`${output}/${name}.png`, Buffer.from(packed.atlas, "base64"));
  for (let i = 0; i < frames.length; i++)
    await writeFile(
      `${output}/${name}/${frames[i].id}.png`,
      Buffer.from(packed.sprites[i], "base64"),
    );
  await writeFile(
    `${output}/${name}/frames.json`,
    JSON.stringify(
      {
        cell: 32,
        nativeCell: 128,
        atlas: `../${name}.png`,
        columns: 3,
        rows: 2,
        frameWidth: 384,
        frameHeight: 256,
        buildings: frames.map(({ id, w, h }, frame) => ({
          id,
          frame,
          w,
          h,
          file: `${id}.png`,
        })),
      },
      null,
      2,
    ) + "\n",
  );
} finally {
  await browser.close();
}
