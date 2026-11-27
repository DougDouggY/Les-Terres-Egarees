import { readFile, writeFile, mkdir, copyFile } from "node:fs/promises";
import { chromium } from "@playwright/test";
const [materialsPath, objectsPath] = process.argv.slice(2);
if (!materialsPath || !objectsPath)
  throw Error(
    "Usage: node scripts/pack-chapter-5-6.mjs materials.png objects.png",
  );
const root = "public/assets/chapter-5-6";
await mkdir(root + "/objects", { recursive: true });
await copyFile(
  "public/assets/castle-experiment/door-side.png",
  root + "/side-gate.png",
);
const names = [
  "wagon-right",
  "wagon-left",
  "empty-cart",
  "barricade",
  "fortress-gate-closed",
  "fortress-gate-open",
  "timber-door-closed",
  "timber-door-open",
  "empty-cage",
  "chest",
  "barrels",
  "crates",
  "ballista",
  "battering-ram",
  "stable-supplies",
  "weapons",
];
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
try {
  const page = await browser.newPage();
  for (const [key, path] of [
    ["fortress-materials", materialsPath],
    ["objects-atlas", objectsPath],
  ]) {
    const src =
      "data:image/png;base64," + (await readFile(path)).toString("base64");
    const packed = await page.evaluate(
      async ({ src, transparent }) => {
        const image = new Image();
        image.src = src;
        await image.decode();
        const atlas = document.createElement("canvas");
        atlas.width = atlas.height = 1024;
        const c = atlas.getContext("2d");
        c.imageSmoothingQuality = "high";
        for (let y = 0; y < 4; y++)
          for (let x = 0; x < 4; x++) {
            const sw = image.width / 4,
              sh = image.height / 4;
            if (transparent) {
              const scale = Math.min(256 / sw, 256 / sh);
              c.drawImage(
                image,
                x * sw,
                y * sh,
                sw,
                sh,
                x * 256 + (256 - sw * scale) / 2,
                y * 256 + (256 - sh * scale) / 2,
                sw * scale,
                sh * scale,
              );
            } else
              c.drawImage(
                image,
                x * sw + 2,
                y * sh + 2,
                sw - 4,
                sh - 4,
                x * 256,
                y * 256,
                256,
                256,
              );
          }
        const objects = [];
        if (transparent)
          for (let i = 0; i < 16; i++) {
            const o = document.createElement("canvas");
            o.width = o.height = 256;
            o.getContext("2d").drawImage(
              atlas,
              (i % 4) * 256,
              Math.floor(i / 4) * 256,
              256,
              256,
              0,
              0,
              256,
              256,
            );
            objects.push(o.toDataURL().split(",")[1]);
          }
        return { atlas: atlas.toDataURL().split(",")[1], objects };
      },
      { src, transparent: key === "objects-atlas" },
    );
    await writeFile(`${root}/${key}.png`, Buffer.from(packed.atlas, "base64"));
    for (let i = 0; i < packed.objects.length; i++)
      await writeFile(
        `${root}/objects/${names[i]}.png`,
        Buffer.from(packed.objects[i], "base64"),
      );
  }
  await writeFile(
    `${root}/resources.json`,
    JSON.stringify(
      {
        version: 1,
        worldCell: 32,
        exportCell: 64,
        atlas: { columns: 4, rows: 4, cell: 256 },
        materials: "fortress-materials.png",
        sideGate: "side-gate.png",
        sharedTextures: {
          regional: "../regional-tiles.png",
          camp: "../future-terrain/camp.png",
        },
        objects: names.map((id, frame) => ({
          id,
          frame,
          file: `objects/${id}.png`,
        })),
      },
      null,
      2,
    ) + "\n",
  );
} finally {
  await browser.close();
}
