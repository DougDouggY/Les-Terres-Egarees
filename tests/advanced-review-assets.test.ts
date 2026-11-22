import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
const root = "public/validation/vikings-evolues/reprises/";
test("reprises évoluées : quinze identités et 376 poses mesurées, sans modifier les variantes conservées", async () => {
  const { profiles } = JSON.parse(
    await readFile(root + "manifest.json", "utf8"),
  );
  assert.equal(profiles.length, 15);
  assert.equal(new Set(profiles.map((p: any) => p.id)).size, 15);
  const preserved = [
    "drengr-twin_swords-female",
    "master_hunter",
    "tracker",
    "volva",
    "hamrammr",
  ];
  let total = 0;
  for (const p of profiles) {
    assert.ok(!preserved.some((id) => p.id.startsWith(id)), p.id);
    assert.ok((await stat(root + p.source)).size > 1000);
    assert.equal(p.frames.length, p.id.startsWith("clan_healer-") ? 28 : 24);
    total += p.frames.length;
    assert.equal(p.referenceHeight, p.frames[0].height);
    assert.ok(p.referenceHeight > 100);
    for (const f of p.frames) {
      assert.ok(
        f.x > 0 &&
          f.y > 0 &&
          f.x + f.width < p.width &&
          f.y + f.height < p.height,
        `${p.id} ${f.row}:${f.column}`,
      );
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
      for (const index of clip)
        assert.ok(
          Number.isInteger(index) && index >= 0 && index < p.frames.length,
        );
    assert.equal(!!p.clips.block, p.id.includes("shield"));
    assert.equal(!!p.clips.offhand, p.id.includes("twin_"));
    assert.equal(!!p.clips.bandage, p.id.startsWith("clan_healer-"));
    assert.equal(p.clips.move.length, 4);
    assert.equal(p.clips.evade.length, 3);
    assert.equal(
      p.clips.critical,
      undefined,
      "le critique reste un effet partagé",
    );
  }
  assert.equal(total, 376);
});
