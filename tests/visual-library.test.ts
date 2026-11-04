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
test("intégrité : carte, décors, portraits et toutes les images antérieures inchangés", async () => {
  const baseline = JSON.parse(
    await readFile("docs/update-baselines/protected-resources.json", "utf8"),
  );
  for (const [p, hash] of Object.entries(baseline))
    assert.equal(
      createHash("sha256")
        .update(await readFile(p))
        .digest("hex"),
      hash,
      p,
    );
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
