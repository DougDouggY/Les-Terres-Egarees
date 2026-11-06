import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import {
  buildSpriteCatalog,
  resolveClip,
  animationStatus,
} from "../src/sprites/catalog";
import { visualClasses } from "../src/sprites/visual-classes";
import {
  normalizeTeamColors,
  defaultTeamColors,
  setPlayableTeamColors,
  setTeamColors,
} from "../src/game/team-colors";
async function library() {
  const files = (await readdir("src/assets/tactical"))
    .filter((f) => f.endsWith(".sprite.json"))
    .sort();
  return buildSpriteCatalog(
    await Promise.all(
      files.map(async (f) =>
        JSON.parse(await readFile("src/assets/tactical/" + f, "utf8")),
      ),
    ),
  );
}
test("intégrité : carte validée, ressources graphiques protégées et rendu régional versionné", async () => {
  const baseline = JSON.parse(
    await readFile("docs/update-baselines/protected-resources.json", "utf8"),
  );
  for (const [p, hash] of Object.entries(baseline)) {
    const raw = await readFile(p);
    // V8 explicitly changes road movement cost only; keep the original visual-map hash.
    const protectedContent =
      p === "src/game/map.ts"
        ? raw.toString().replace("road: [0.75, true", "road: [1, true")
        : raw;
    assert.equal(
      createHash("sha256").update(protectedContent).digest("hex"),
      hash,
      p,
    );
  }
});
test("bibliothèque : descriptions, atlas et sources réels, statuts honnêtes", async () => {
  const data = await library();
  assert.deepEqual(data.errors, []);
  for (const p of data.profiles) {
    assert.ok(visualClasses[p.classId], p.classId);
    for (const id of Object.keys(p.clips)) {
      const clip = resolveClip(p, id);
      assert.ok(clip);
      const path = clip.source.startsWith("tactical/")
        ? "src/assets/" + clip.source
        : "public/" + clip.source;
      const img = await readFile(path);
      assert.equal(img.toString("ascii", 1, 4), "PNG");
      assert.ok(img.readUInt32BE(16) > 0);
      if (clip.frames.length === 1)
        assert.equal(animationStatus(p, id), "provisional");
    }
  }
});
test("rose vif réservé en partie, toutes les palettes possibles dans la galerie", () => {
  assert.equal(defaultTeamColors.enemies, "pink");
  assert.throws(() =>
    setPlayableTeamColors(
      {},
      { player1: "pink", player2: "yellow", enemies: "pink" },
    ),
  );
  const preview = {};
  setTeamColors(preview, {
    player1: "pink",
    player2: "yellow",
    enemies: "blue",
  });
  assert.equal(
    normalizeTeamColors({ player1: "pink", player2: "yellow" }, true).player1,
    "pink",
  );
  assert.equal(
    normalizeTeamColors({ player1: "pink", player2: "yellow" }).player1,
    "blue",
  );
});

test("couverture visuelle complète, neutre ou sexe explicite ; pose statique jamais fonctionnelle", async () => {
  const { profiles } = await library();
  for (const id of Object.keys(visualClasses).filter(
    (id) => !["volva", "hamrammr"].includes(id),
  ))
    assert.ok(
      profiles.some((p) => p.classId === id),
      id,
    );
  const sample = {
    classId: "test",
    gender: "any" as const,
    equipment: "sword",
    state: "default",
    clips: {
      idle: {
        source: "x.png",
        columns: 4,
        rows: 1,
        row: 0,
        frames: [0, 0],
        fps: 2,
        recolor: "magenta" as const,
      },
    },
  };
  assert.equal(animationStatus(sample, "idle"), "provisional");
  for (const p of profiles)
    for (const id of Object.keys(p.clips)) {
      const clip = resolveClip(p, id)!;
      if (clip.cells)
        for (const cell of clip.cells) {
          assert.ok(cell.row >= 0 && cell.row < clip.rows);
          assert.ok(cell.column >= 0 && cell.column < clip.columns);
        }
    }
});

test("planches complémentaires : séquences complètes et seconde main explicite, protagonistes validés conservés", async () => {
  const { strikeAnimation } = await import("../src/sprites/catalog");
  const { profiles } = await library();
  for (const id of [
    "spearman",
    "crossbowman",
    "swordsman",
    "north_warrior",
    "nordic_blade",
    "hunter",
  ]) {
    const p = profiles.find((p) => p.classId === id)!;
    const c = resolveClip(p, "attack")!;
    assert.equal(c.frames.length, 7, id);
    assert.equal(c.impactFrame, 3, id);
    assert.equal(c.loop, false, id);
    for (const animation of ["damage", "evade", "death"])
      assert.equal(resolveClip(p, animation)!.frames.length, 2, id + animation);
  }
  for (const id of ["raider", "man_at_arms"]) {
    const p = profiles.find((p) => p.classId === id && p.gender === "male")!;
    assert.equal(
      resolveClip(p, "attack")!.source,
      "tactical/combat-pair-reference-v2.png",
    );
  }
  const dual = profiles.find((p) => p.classId === "duelist")!;
  assert.equal(strikeAnimation(dual, { weaponIndex: 1 }), "attack_offhand");
  assert.equal(strikeAnimation(dual, { weaponIndex: 0 }), "attack");
  assert.equal(
    strikeAnimation(undefined, { weaponIndex: 1, counter: true }),
    "counter",
  );
  for (const p of profiles)
    for (const id of Object.keys(p.clips)) {
      const c = resolveClip(p, id)!;
      if (c.frameSize)
        assert.ok(c.frameSize.width > 0 && c.frameSize.height > 0);
    }
  assert.ok(
    profiles.some(
      (p) =>
        p.classId === "hamrammr" &&
        p.state === "bear" &&
        p.equipment === "claws",
    ),
  );
});

test("taille anatomique commune : les planches d’attaque et de repos ne redimensionnent plus le corps", async () => {
  const { profileMetrics, resourceScale } =
    await import("../src/sprites/geometry");
  const { profiles } = await library();
  for (const p of profiles) {
    const m = profileMetrics(p);
    const sizes: number[] = [];
    for (const name of Object.keys(p.clips)) {
      const c = resolveClip(p, name)!;
      const reference = m.references.get(c.source);
      if (!reference) continue;
      sizes.push(resourceScale(p, c, 180, 207, "world") * reference);
    }
    assert.ok(sizes.length, p.classId);
    assert.ok(Math.max(...sizes) - Math.min(...sizes) < 0.01, p.classId);
    assert.ok(Math.abs(sizes[0] - 133.2) < 0.01, p.classId);
  }
});
