import { chromium } from "@playwright/test";
import fs from "node:fs";
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => {
  if (m.text().startsWith("AUDIT ")) console.log(m.text());
});
await page.goto("http://127.0.0.1:5173/");
const result = await page.evaluate(async () => {
  const { spriteCatalog, drawResourceFrame, spriteImage } =
    await import("/src/sprites/resources.ts");
  const { combatSkin } = await import("/src/sprites/combat-skins.ts");
  const { resolveClip, profileKey } = await import("/src/sprites/catalog.ts");
  const { teamPalette } = await import("/src/game/team-colors.ts");
  const { CombatSceneV2 } = await import("/src/ui/combat-v2.ts");
  const { makeComparisonActor, comparatorStrikes } =
    await import("/src/dev/combat-comparator.ts");
  const palettes = [],
    sequences = [],
    can = document.createElement("canvas");
  can.width = 300;
  can.height = 300;
  const ctx = can.getContext("2d");
  for (const p of spriteCatalog.profiles) {
    const skin = combatSkin(p),
      c = resolveClip(skin.profile, "idle");
    await spriteImage(c.source).decode();
    const counts = [];
    for (const color of Object.keys(teamPalette)) {
      ctx.clearRect(0, 0, 300, 300);
      const drawn = drawResourceFrame(
        ctx,
        skin.profile,
        "idle",
        0,
        0,
        0,
        300,
        300,
        true,
        color,
      );
      const pixels = ctx.getImageData(0, 0, 300, 300).data;
      let opaque = 0;
      for (let i = 3; i < pixels.length; i += 4) if (pixels[i] > 32) opaque++;
      counts.push({ color, drawn, opaque });
    }
    palettes.push({ skin: profileKey(p), counts });
    console.log("AUDIT " + palettes.length + " " + profileKey(p));
    const a = makeComparisonActor(p, "a", 1),
      b = makeComparisonActor(
        spriteCatalog.profiles.find(
          (p) => p.classId === "man_at_arms" && p.gender === "male",
        ),
        "b",
        0,
      );
    for (const side of ["hit", "right", "double-agility", "parry"]) {
      if (!resolveClip(skin.profile, "attack") && side !== "right") continue;
      if (
        side === "parry" &&
        (!p.equipment.includes("shield") || !resolveClip(skin.profile, "block"))
      )
        continue;
      const strikes = comparatorStrikes(side, a, b),
        scene = new CombatSceneV2([a, b], strikes);
      await scene.prepare();
      const snapshots = [];
      for (const beat of scene.timeline.beats) {
        scene.resetPresentation();
        scene.draw(ctx, beat.at - 0.1);
        const before = structuredClone(scene.lastFrames);
        scene.draw(ctx, beat.at + 0.1);
        const after = structuredClone(scene.lastFrames);
        const def = after.find(
          (x) => x.actorId === strikes[beat.index].defender,
        );
        snapshots.push({
          at: beat.at,
          before,
          after,
          defenderPose: def?.animation,
        });
      }
      // Both playback speeds sample the same event stream; no extra damage is inferred.
      const counts = [];
      for (const speed of [1, 0.2]) {
        scene.resetPresentation();
        let impacts = 0;
        for (
          let realtime = 0;
          realtime * speed < scene.timeline.duration;
          realtime += 40 / speed
        )
          scene.draw(ctx, realtime * speed, () => impacts++);
        scene.draw(ctx, scene.timeline.duration + 1, () => impacts++);
        counts.push({ speed, impacts });
      }
      sequences.push({
        skin: profileKey(p),
        scenario: side,
        events: strikes.length,
        playback: counts,
        missing: [...scene.missing],
        snapshots,
      });
    }
  }
  return { palettes, sequences };
});
fs.mkdirSync("artifacts/combat-v4", { recursive: true });
fs.writeFileSync(
  "artifacts/combat-v4/global-audit.json",
  JSON.stringify({ ...result, errors }, null, 2),
);
const missing = result.palettes.flatMap((p) =>
  p.counts
    .filter((c) => !c.drawn || c.opaque < 20)
    .map((c) => ({ skin: p.skin, ...c })),
);
const mismatches = result.sequences.flatMap((s) =>
  s.playback
    .filter((p) => p.impacts !== s.events)
    .map((p) => ({ skin: s.skin, scenario: s.scenario, ...p })),
);
console.log(
  JSON.stringify({
    profiles: result.palettes.length,
    palettes: result.palettes.reduce((n, p) => n + p.counts.length, 0),
    sequences: result.sequences.length,
    missing,
    mismatches,
    errors,
  }),
);
await browser.close();
if (missing.length || mismatches.length || errors.length) process.exitCode = 1;
