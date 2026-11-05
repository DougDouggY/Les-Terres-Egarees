import { chromium } from "@playwright/test";
import fs from "node:fs";
const b = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const page = await b.newPage();
await page.goto("http://127.0.0.1:5173");
const pictures = await page.evaluate(async () => {
  const { spriteCatalog } = await import("/src/sprites/resources.ts");
  const { CombatSceneV2 } = await import("/src/ui/combat-v2.ts");
  const { makeComparisonActor, comparatorStrikes } =
    await import("/src/dev/combat-comparator.ts");
  const out = [];
  for (const gender of ["male", "female"]) {
    const p = spriteCatalog.profiles.find(
      (p) =>
        p.classId === "volva" && p.gender === gender && p.equipment === "spell",
    );
    const a = makeComparisonActor(p, "a", 1),
      d = makeComparisonActor(
        spriteCatalog.profiles.find(
          (p) => p.classId === "man_at_arms" && p.gender === "male",
        ),
        "d",
        0,
      );
    const s = new CombatSceneV2([a, d], comparatorStrikes("hit", a, d));
    await s.prepare();
    const c = document.createElement("canvas");
    c.width = 2880;
    c.height = 600;
    const ctx = c.getContext("2d");
    const frame = document.createElement("canvas");
    frame.width = 960;
    frame.height = 600;
    const fctx = frame.getContext("2d");
    for (const [i, dt] of [-240, 0, 100].entries()) {
      ctx.save();
      ctx.translate(i * 960, 0);
      s.resetPresentation();
      fctx.clearRect(0, 0, 960, 600);
      fctx.fillStyle = "#24342f";
      fctx.fillRect(0, 0, 960, 600);
      s.draw(fctx, s.timeline.beats[0].at + dt);
      ctx.drawImage(frame, 0, 0);
      ctx.fillStyle = "#ffedba";
      ctx.font = "18px sans-serif";
      ctx.fillText(gender + " / " + dt + " ms", 25, 25);
      ctx.restore();
    }
    out.push({ gender, data: c.toDataURL() });
  }
  return out;
});
fs.mkdirSync("artifacts/combat-v5", { recursive: true });
for (const p of pictures)
  fs.writeFileSync(
    "artifacts/combat-v5/lightning-" + p.gender + ".png",
    Buffer.from(p.data.split(",")[1], "base64"),
  );
await b.close();
