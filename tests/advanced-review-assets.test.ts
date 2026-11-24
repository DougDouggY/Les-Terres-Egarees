import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import { sampleStaffCast } from "../src/ui/staff-cast";
// Static review player shares this pure timing helper with its canvas renderer.
// @ts-expect-error browser-native module has no TypeScript declarations
import { sampleReview } from "../public/validation/vikings-evolues/reprises/timeline.js";
const root = "public/validation/vikings-evolues/reprises/";
const profiles = JSON.parse(
  await readFile(root + "manifest.json", "utf8"),
).profiles;
test("reprises évoluées : 26 variantes, figures complètes et ressources séparées de la campagne", async () => {
  assert.equal(profiles.length, 26);
  assert.equal(new Set(profiles.map((p: any) => p.id)).size, 26);
  let total = 0;
  for (const p of profiles) {
    assert.ok(!p.id.startsWith("master_hunter"));
    assert.ok(!p.id.includes("bear"));
    assert.ok((await stat(root + p.source)).size > 1000);
    total += p.frames.length;
    for (const f of p.frames) {
      assert.ok(
        f.x > 0 &&
          f.y > 0 &&
          f.x + f.width < f.sourceWidth &&
          f.y + f.height < f.sourceHeight,
        `${p.id} ${f.row}:${f.column}`,
      );
      assert.ok(f.referenceHeight > 100);
      assert.ok(f.runs.length > 20);
      for (const [x, y, w] of f.runs)
        assert.ok(
          x >= f.x &&
            x + w <= f.x + f.width &&
            y >= f.y &&
            y < f.y + f.height &&
            w > 0,
        );
    }
    for (const clip of Object.values(p.clips) as number[][])
      for (const i of clip)
        assert.ok(Number.isInteger(i) && i >= 0 && i < p.frames.length);
    assert.equal(!!p.clips.block, p.kind === "full" && p.id.includes("shield"));
    assert.equal(!!p.clips.bandage, p.id.startsWith("clan_healer-"));
    assert.equal(p.clips.critical, undefined);
    if (p.kind === "full") {
      assert.equal(p.clips.move.length, 4);
      assert.equal(p.clips.evade.length, 3);
    } else assert.equal(p.frames.length, 8);
  }
  assert.equal(total, 568);
});
test("doubles armes : deux impacts, bras alternés, aucune remise en garde entre les coups", () => {
  for (const p of profiles.filter((p: any) => p.id.includes("twin_"))) {
    const clip = p.clips.combo;
    assert.equal(clip.length, 7);
    const offset = p.frames.length - 8;
    assert.deepEqual(
      clip.map((i: number) => i - offset),
      [0, 1, 2, 4, 5, 6, 7],
    );
    const start = sampleReview(p, "combo", 0);
    assert.equal(start.impactCount, 0);
    const first = sampleReview(p, "combo", start.impacts[0]);
    assert.equal(first.impactCount, 1);
    const second = sampleReview(p, "combo", start.impacts[1]);
    assert.equal(second.impactCount, 2);
    assert.equal(
      sampleReview(p, "combo", second.duration + 351).impactCount,
      0,
    );
  }
});
test("hache lourde : huit poses et un seul impact, échelle fixe sans rétrécissement à la levée", () => {
  for (const p of profiles.filter((p: any) =>
    p.id.startsWith("ironbreaker-"),
  )) {
    assert.equal(p.clips.attack.length, 8);
    assert.deepEqual(p.impacts.attack, [4]);
    assert.equal(
      new Set(p.clips.attack.map((i: number) => p.frames[i].referenceHeight))
        .size,
      1,
    );
  }
});
test("bâton : départ à son extrémité, trajet vers la cible et absence d’explosion sur esquive", () => {
  const from = { x: 80, y: 60 },
    to = { x: 200, y: 90 };
  assert.deepEqual(sampleStaffCast(-180, from, to).point, from);
  assert.deepEqual(sampleStaffCast(-90, from, to).point, { x: 140, y: 75 });
  assert.deepEqual(sampleStaffCast(0, from, to).point, to);
  assert.equal(sampleStaffCast(0, from, to, false).impact, false);
  assert.equal(sampleStaffCast(0, from, to, false).flying, true);
  assert.equal(sampleStaffCast(0, from, to).impact, true);
  for (const p of profiles.filter((p: any) => p.kind === "cast-only")) {
    const healing = p.id.includes("healing_focus");
    assert.equal(p.effect, healing ? "heal" : "lightning");
    if (p.id.startsWith("hamrammr-")) {
      assert.equal(p.guardFromSheet, true);
      assert.equal(
        p.guardImage,
        undefined,
        "la garde montre le nouveau skin, pas l’ancienne cape",
      );
    } else assert.ok(p.guardImage);
    assert.ok(p.clips[healing ? "heal" : "cast"]);
  }
});
