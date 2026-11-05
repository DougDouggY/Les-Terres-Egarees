import { chromium } from "@playwright/test";
import fs from "node:fs";
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
page.on("pageerror", (e) => console.log("PAGEERROR", e.message));
await page.goto(process.env.COMBAT_AUDIT_URL ?? "http://127.0.0.1:5173/");
const output = await page.evaluate(async () => {
  const { spriteCatalog, drawResourceFrame, spriteImage } =
      await import("/src/sprites/resources.ts"),
    { combatSkin } = await import("/src/sprites/combat-skins.ts"),
    { resolveClip, profileKey } = await import("/src/sprites/catalog.ts"),
    { profileMetrics, resourceRect } = await import("/src/sprites/geometry.ts"),
    { default: anchors } =
      await import("/src/assets/tactical/combat-anchors.json"),
    { CombatSceneV2 } = await import("/src/ui/combat-v2.ts"),
    { makeComparisonActor } = await import("/src/dev/combat-comparator.ts"),
    { visualClasses } = await import("/src/sprites/visual-classes.ts");
  const all = [],
    sheets = [],
    abilityRows = [],
    abilitySheets = [];
  const width = 340,
    height = 335,
    columns = [
      "idle",
      "prepare",
      "attack",
      "recover",
      "block",
      "damage",
      "evade",
      "death",
    ];
  for (let offset = 0; offset < spriteCatalog.profiles.length; offset += 6) {
    const sheet = document.createElement("canvas");
    sheet.width = width * 8;
    sheet.height = height * 6;
    const ctx = sheet.getContext("2d");
    ctx.fillStyle = "#1e2924";
    ctx.fillRect(0, 0, sheet.width, sheet.height);
    for (const [row, p] of spriteCatalog.profiles
      .slice(offset, offset + 6)
      .entries()) {
      const skin = combatSkin(p),
        profile = skin.profile,
        m = profileMetrics(profile),
        body = skin.mounted ? 156.8 : p.state === "bear" ? 121.9 : 112;
      const item = {
        id: profileKey(p),
        className: visualClasses[p.classId].name,
        issues: skin.issues,
        animations: [],
        missing: [],
      };
      const sources = [
        ...new Set(
          Object.keys(profile.clips)
            .map((n) => resolveClip(profile, n)?.source)
            .filter(Boolean),
        ),
      ];
      await Promise.all(
        sources.map(async (src) => {
          try {
            await spriteImage(src).decode();
          } catch {}
        }),
      );
      for (const name of Object.keys(profile.clips)) {
        const clip = resolveClip(profile, name);
        let drawn = 0;
        for (let i = 0; i < clip.frames.length; i++) {
          const c = document.createElement("canvas");
          c.width = 450;
          c.height = 450;
          if (
            drawResourceFrame(
              c.getContext("2d"),
              profile,
              name,
              i,
              100,
              100,
              160,
              160,
              true,
              "blue",
              "world",
            )
          )
            drawn++;
        }
        item.animations.push({
          name,
          source: clip.source,
          frames: clip.frames.length,
          drawn,
        });
      }
      for (const [col, label] of columns.entries()) {
        const name = ["prepare", "recover"].includes(label) ? "attack" : label,
          c = resolveClip(profile, name);
        ctx.fillStyle = "#eadbb8";
        ctx.font = "12px sans-serif";
        if (col === 0) ctx.fillText(item.id, 5, row * height + 14);
        ctx.fillText(label, col * width + 5, row * height + 30);
        if (!c) {
          ctx.fillStyle = "#cd886e";
          ctx.fillText("MANQUANT", col * width + 50, row * height + 160);
          item.missing.push(name);
          continue;
        }
        const frame = ["damage", "evade"].includes(label)
          ? Math.floor(c.frames.length / 2)
          : label === "prepare"
            ? Math.max(
                0,
                (c.impactFrame ?? Math.floor(c.frames.length / 2)) - 1,
              )
            : label === "recover"
              ? Math.min(
                  c.frames.length - 1,
                  (c.impactFrame ?? Math.floor(c.frames.length / 2)) + 1,
                )
              : label === "attack"
                ? (c.impactFrame ?? Math.floor(c.frames.length / 2))
                : label === "death"
                  ? c.frames.length - 1
                  : label === "block"
                    ? Math.floor(c.frames.length / 2)
                    : 0;
        const r = resourceRect(c, frame),
          scale = body / (m.references.get(c.source) ?? r.bodyHeight),
          ground = row * height + height - 22;
        const cell = c.cells?.[frame] ?? {
            row: c.row,
            column: c.frames[frame],
          },
          anchor = anchors[c.source]?.[`${cell.row}:${cell.column}`];
        ctx.save();
        ctx.translate(col * width + 160, ground);
        drawResourceFrame(
          ctx,
          profile,
          name,
          frame,
          -80,
          -153.6,
          160,
          160,
          true,
          "blue",
          "world",
          {
            scale,
            anchorX: anchor?.feetX,
            ground: anchor?.feetY,
            maskRuns: anchor?.maskRuns,
          },
        );
        ctx.restore();
      }
      const unit = makeComparisonActor(p, "audit-actor", 1),
        target = makeComparisonActor(
          spriteCatalog.profiles.find(
            (p) => p.classId === "raider" && p.equipment === "axe-shield",
          ),
          "audit-target",
          0,
        );
      const strikes = resolveClip(profile, "attack")
        ? [
            {
              attacker: unit.id,
              defender: target.id,
              hit: true,
              blocked: false,
              damage: 6,
              hpAfter: 94,
            },
          ]
        : [];
      const scene = new CombatSceneV2([unit, target], strikes);
      await scene.prepare();
      const sceneCanvas = document.createElement("canvas");
      sceneCanvas.width = 960;
      sceneCanvas.height = 600;
      item.sequenceFrames = [];
      for (const t of [0, 125, 225, 325, 440, 725, 850, 1025, 1250, 1500, 1770]) {
        scene.draw(sceneCanvas.getContext("2d"), t);
        item.sequenceFrames.push({
          at: t,
          frames: structuredClone(scene.lastFrames),
        });
      }
      for (const name of [
        "move",
        "heal",
        "buff",
        "summon",
        "banner",
        "fortify",
        "transform",
        "reload",
        "attack_offhand",
        "charge",
        "intercept",
      ])
        if (resolveClip(profile, name)) abilityRows.push({ p, name });
      all.push(item);
    }
    sheets.push(sheet.toDataURL("image/png"));
  }
  for (let offset = 0; offset < abilityRows.length; offset += 6) {
    const sheet = document.createElement("canvas");
    sheet.width = width * 8;
    sheet.height = height * 6;
    const ctx = sheet.getContext("2d");
    ctx.fillStyle = "#1e2924";
    ctx.fillRect(0, 0, sheet.width, sheet.height);
    for (const [row, { p, name }] of abilityRows
      .slice(offset, offset + 6)
      .entries()) {
      const skin = combatSkin(p),
        profile = skin.profile,
        c = resolveClip(profile, name),
        m = profileMetrics(profile),
        body = skin.mounted ? 156.8 : p.state === "bear" ? 121.9 : 112;
      ctx.font = "12px sans-serif";
      ctx.fillStyle = "#eadbb8";
      ctx.fillText(profileKey(p) + " / " + name, 5, row * height + 16);
      for (let col = 0; col < Math.min(8, c.frames.length); col++) {
        const frame = col,
          r = resourceRect(c, frame),
          scale = body / (m.references.get(c.source) ?? r.bodyHeight),
          cell = c.cells?.[frame] ?? { row: c.row, column: c.frames[frame] },
          a = anchors[c.source]?.[`${cell.row}:${cell.column}`];
        ctx.save();
        ctx.translate(col * width + 160, row * height + height - 22);
        drawResourceFrame(
          ctx,
          profile,
          name,
          frame,
          -80,
          -153.6,
          160,
          160,
          true,
          "blue",
          "world",
          { scale, anchorX: a?.feetX, ground: a?.feetY, maskRuns: a?.maskRuns },
        );
        ctx.restore();
      }
    }
    abilitySheets.push(sheet.toDataURL("image/png"));
  }
  return { profiles: all, sheets, abilitySheets };
});
fs.mkdirSync("artifacts/combat-v2", { recursive: true });
for (const [i, data] of output.sheets.entries())
  fs.writeFileSync(
    `artifacts/combat-v2/skins-${i + 1}.png`,
    Buffer.from(data.split(",")[1], "base64"),
  );
fs.writeFileSync(
  "artifacts/combat-v2/render-audit.json",
  JSON.stringify(output.profiles, null, 2),
);
for (const [i, data] of output.abilitySheets.entries())
  fs.writeFileSync(
    `artifacts/combat-v2/abilities-${i + 1}.png`,
    Buffer.from(data.split(",")[1], "base64"),
  );
console.log(
  JSON.stringify({
    profiles: output.profiles.length,
    animations: output.profiles.reduce((n, p) => n + p.animations.length, 0),
    frames: output.profiles.reduce(
      (n, p) => n + p.animations.reduce((n, a) => n + a.drawn, 0),
      0,
    ),
  }),
);
await browser.close();
