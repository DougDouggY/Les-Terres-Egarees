import { chromium } from "@playwright/test";
import { writeFile } from "node:fs/promises";
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
try {
  const page = await browser.newPage();
  await page.routeWebSocket(/.*/, () => {});
  await page.goto(
    "http://127.0.0.1:5173/validation/vikings-evolues/index.html",
  );
  const images = await page.evaluate(async () => {
    const { profiles } = await (await fetch("reprises/manifest.json")).json();
    const result = [];
    if (profiles.length !== 15 || profiles.some((p) => p.attackSheet))
      throw new Error(
        "Les captures avant correction existent déjà ; restaurer le manifeste 0b46c1e pour les régénérer.",
      );
    for (const p of profiles) {
      const img = new Image();
      img.src = "reprises/" + p.source;
      await img.decode();
      const f = p.frames[p.clips.guard[0]];
      const mask = document.createElement("canvas");
      mask.width = f.width;
      mask.height = f.height;
      const m = mask.getContext("2d");
      m.beginPath();
      for (const [x, y, w] of f.runs) m.rect(x - f.x, y - f.y, w, 1);
      m.clip();
      m.drawImage(img, f.x, f.y, f.width, f.height, 0, 0, f.width, f.height);
      const c = document.createElement("canvas");
      c.width = c.height = 640;
      const ctx = c.getContext("2d");
      ctx.scale(2, 2);
      ctx.imageSmoothingEnabled = false;
      const scale = 136 / p.referenceHeight;
      ctx.drawImage(
        mask,
        160 + (f.x - f.anchorX) * scale,
        306 + (f.y - f.ground) * scale,
        f.width * scale,
        f.height * scale,
      );
      result.push({ id: p.id, image: c.toDataURL() });
    }
    return result;
  });
  for (const r of images)
    await writeFile(
      "public/validation/vikings-evolues/reprises/avant/" + r.id + "-guard.png",
      Buffer.from(r.image.split(",")[1], "base64"),
    );
  console.log(images.length + " captures de la version précédente");
} finally {
  await browser.close();
}
