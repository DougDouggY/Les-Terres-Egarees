/** Export existing reviewed guards at native resolution; preserve all previous action clips. */
import { chromium } from "@playwright/test";
import { readFile, writeFile } from "node:fs/promises";
const root = "src/assets/tactical/",
  prefix = "zzzzzzzzzzzzzzzz-official-advanced";
const manifest = JSON.parse(
  await readFile(
    "public/validation/vikings-evolues/reprises/manifest.json",
    "utf8",
  ),
);
const inputs = manifest.profiles.filter((p) => !p.guardImage);
const previous = JSON.parse(
  await readFile(
    "docs/references/official-advanced-integration.json",
    "utf8",
  ).catch(() => '{"variants":[]}'),
);
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
let originals;
try {
  const page = await browser.newPage();
  await page.routeWebSocket(/.*/, () => {});
  await page.goto("http://127.0.0.1:5173/");
  originals = await page.evaluate(async (inputs) => {
    const E = await import("/src/engine.ts"),
      R = await import("/src/sprites/resources.ts"),
      S = await import("/src/sprites/combat-skins.ts");
    const result = [];
    for (const p of inputs) {
      const [classId, weapon, gender] = p.id.split("-"),
        u = E.makeClassUnit(
          "integration",
          1,
          1,
          classId,
          "Inspection",
          0,
          0,
          gender,
        );
      u.activeWeaponId = weapon;
      E.syncWeapon(u);
      const profile = R.unitSpriteProfile(u);
      if (!profile) throw Error("Profil absent " + p.id);
      const f = p.frames[p.clips.guard[0]],
        img = new Image();
      img.src = "/validation/vikings-evolues/reprises/" + f.source;
      await img.decode();
      const canvas = document.createElement("canvas");
      canvas.width = f.width + 16;
      canvas.height = f.height + 16;
      const ctx = canvas.getContext("2d");
      ctx.beginPath();
      for (const [x, y, w] of f.runs) ctx.rect(x - f.x + 8, y - f.y + 8, w, 1);
      ctx.clip();
      ctx.drawImage(img, f.x, f.y, f.width, f.height, 8, 8, f.width, f.height);
      result.push({
        id: p.id,
        map: profile,
        combat: S.combatSkin(profile).profile,
        image: canvas.toDataURL(),
      });
    }
    return result;
  }, inputs);
} finally {
  await browser.close();
}
const maps = [],
  combats = [],
  layouts = {},
  anchors = {},
  inventory = [];
const oldSource = (p) => p.clips.attack?.source ?? p.clips.idle?.source ?? null;
for (const p of inputs) {
  const old = originals.find((o) => o.id === p.id),
    f = p.frames[p.clips.guard[0]],
    source = `tactical/combat-v4-official-advanced-${p.id}.png`;
  await writeFile(
    "src/assets/" + source,
    Buffer.from(old.image.split(",")[1], "base64"),
  );
  const clip = {
    source,
    columns: 1,
    rows: 1,
    row: 0,
    frames: [0],
    fps: 2,
    loop: true,
    recolor: "blue",
    recolorEdges: true,
    status: "functional",
    note: "Apparence intégrée ; garde ancrée, animations avancées précédentes conservées.",
  };
  const [classId, e, gender] = p.id.split("-"),
    identity = {
      classId,
      equipment: old.map.equipment,
      gender,
      state: "default",
    };
  for (const [original, list] of [
    [old.map, maps],
    [old.combat, combats],
  ])
    list.push({
      ...original,
      ...identity,
      allowMixedSources: true,
      referenceHeights: {
        ...original.referenceHeights,
        [source]: f.referenceHeight,
      },
      clips: { ...original.clips, idle: clip, combat_idle: clip },
      note: "Nouveau skin intégré ; actions avancées antérieures provisoires.",
    });
  const anchorX = f.anchorX - f.x + 8,
    ground = f.ground - f.y + 8,
    weaponTip = { x: f.weaponTip.x - f.x + 8, y: f.weaponTip.y - f.y + 8 };
  layouts[source] = {
    width: f.width + 16,
    height: f.height + 16,
    columns: 1,
    rows: 1,
    frames: [
      {
        row: 0,
        column: 0,
        x: 8,
        y: 8,
        width: f.width,
        height: f.height,
        anchorX,
        ground,
        bodyHeight: f.referenceHeight,
      },
    ],
  };
  anchors[source] = {
    "0:0": {
      feetX: anchorX,
      feetY: ground,
      bodyHeight: f.referenceHeight,
      weaponTip,
      maskRuns: f.runs.map(([x, y, w]) => [x - f.x + 8, y - f.y + 8, w]),
    },
  };
  const before = previous.variants.find((v) => v.id === p.id);
  inventory.push({
    id: p.id,
    source,
    sourceSheet: f.source,
    oldMap: before?.oldMap ?? oldSource(old.map),
    oldCombat: before?.oldCombat ?? oldSource(old.combat),
    policy:
      "Nouvelle garde carte/combat ; déplacements et actions précédents conservés.",
  });
}
await writeFile(
  root + prefix + ".sprite.json",
  JSON.stringify({ override: true, profiles: maps }),
);
await writeFile(
  root + prefix + ".combat.json",
  JSON.stringify({ profiles: combats }),
);
await writeFile(
  root + "official-advanced-layouts.json",
  JSON.stringify({ layouts, anchors }),
);
await writeFile(
  "docs/references/official-advanced-integration.json",
  JSON.stringify({ variants: inventory }, null, 2) + "\n",
);
console.log(
  inventory.length +
    " gardes exportées sans redimensionnement ; actions antérieures conservées",
);
