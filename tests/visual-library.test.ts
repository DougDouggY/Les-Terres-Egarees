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

test("planches complémentaires : séquences complètes, seconde main et harmonisation nordique", async () => {
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
    const refreshed =
      id === "north_warrior" || (id === "hunter" && p.gender === "female");
    assert.equal(c.frames.length, refreshed ? 8 : 7, id);
    assert.equal(c.impactFrame, 3, id);
    assert.equal(c.loop, false, id);
    for (const animation of ["damage", "evade", "death"])
      assert.equal(
        resolveClip(p, animation)!.frames.length,
        refreshed ? (animation === "death" ? 1 : 3) : 2,
        id + animation,
      );
  }
  for (const id of ["raider", "man_at_arms"]) {
    const p = profiles.find((p) => p.classId === id && p.gender === "male")!;
    assert.equal(
      resolveClip(p, "attack")!.source,
      id === "raider"
        ? "tactical/combat-v4-north-refresh-male-axe.png"
        : "tactical/combat-pair-reference-v2.png",
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

test("harmonisation : sept identités stables sur carte et au combat, poses complètes sans mélange de planches", async () => {
  const { profiles, errors } = await library();
  assert.deepEqual(errors, []);
  const { buildCombatSkin } = await import("../src/sprites/combat-skin-core");
  const layouts = JSON.parse(
    await readFile("src/assets/tactical/atlas-layout.json", "utf8"),
  );
  const replacements = JSON.parse(
    await readFile(
      "src/assets/tactical/zzzzzzzzzzz-north-refresh.combat.json",
      "utf8",
    ),
  );
  assert.equal(replacements.profiles.length, 7);
  const sourceNames = new Set<string>();
  for (const replacement of replacements.profiles) {
    const p = profiles.find(
      (p) =>
        p.classId === replacement.classId &&
        p.gender === replacement.gender &&
        p.equipment === replacement.equipment &&
        p.state === replacement.state,
    )!;
    assert.ok(p);
    const combat = buildCombatSkin(p, replacement)!;
    assert.deepEqual(combat.issues, []);
    const source = resolveClip(p, "idle")!.source;
    sourceNames.add(source);
    assert.equal(
      layouts[source].frames.length,
      p.classId === "north_warrior" && p.gender === "female" ? 23 : 26,
    );
    const reference = p.referenceHeights![source];
    for (const [name, count] of Object.entries({
      idle: 2,
      move: 4,
      attack: 8,
      counter: 8,
      attack_again: 8,
      block: 3,
      evade: 3,
      damage: 3,
      death: 1,
    })) {
      for (const profile of [p, combat.profile]) {
        if (name === "block" && ["axe", "bow"].includes(p.equipment)) {
          assert.equal(resolveClip(profile, name), undefined);
          continue;
        }
        const c = resolveClip(profile, name)!;
        assert.equal(c.source, source, `${p.classId}:${p.gender}:${name}`);
        assert.equal(c.frames.length, count);
        for (let i = 0; i < count; i++) {
          const cell = c.cells![i],
            r = layouts[source].frames.find(
              (r: any) => r.row === cell.row && r.column === cell.column,
            );
          assert.ok(r);
          assert.equal(r.bodyHeight, reference);
          assert.ok(
            r.x >= 0 &&
              r.y >= 0 &&
              r.x + r.width <= layouts[source].width &&
              r.y + r.height <= layouts[source].height,
          );
        }
      }
    }
    assert.deepEqual(
      resolveClip(p, "attack")!.cells,
      resolveClip(p, "counter")!.cells,
    );
    assert.deepEqual(
      resolveClip(p, "attack")!.cells,
      resolveClip(p, "attack_again")!.cells,
    );
    assert.equal(
      resolveClip(p, "critical"),
      undefined,
      "le critique reste un effet partagé",
    );
    assert.equal(resolveClip(p, "attack")!.impactFrame, 3);
    assert.equal(
      new Set(resolveClip(p, "move")!.cells!.map((c) => `${c.row}:${c.column}`))
        .size,
      4,
    );
  }
  assert.equal(sourceNames.size, 7);
});

test("comparaisons de base : nouvelle Guerrière, un seul ancien modèle, trois références et tous les Chevaliers", async () => {
  const E = await import("../src/engine");
  const north = JSON.parse(
    await readFile("docs/references/vikings-a-revoir-inventaire.json", "utf8"),
  );
  const knight = JSON.parse(
    await readFile("docs/references/chevaliers-inventaire.json", "utf8"),
  );
  assert.equal(north.entries.length, 5);
  assert.equal(
    north.entries.filter((p: any) => p.status === "Nouveau").length,
    1,
  );
  assert.equal(
    north.entries.filter((p: any) => p.status.startsWith("Ancien")).length,
    1,
  );
  assert.equal(
    north.entries.filter((p: any) => p.status === "Référence validée").length,
    3,
  );
  const fresh = north.entries.find((p: any) => p.status === "Nouveau");
  assert.equal(fresh.cls, "north_warrior");
  assert.equal(fresh.gender, "female");
  assert.equal(
    fresh.source,
    "tactical/combat-v4-north-refresh-north-warrior-female.png",
  );
  assert.equal(fresh.mapSource, fresh.source);
  assert.ok(
    fresh.reference >
      north.entries.find((p: any) => p.status.startsWith("Ancien")).reference,
  );
  const expected = E.baseClasses("knight")
    .flatMap((c) => [`${c.id}:male`, `${c.id}:female`])
    .sort();
  assert.deepEqual(
    knight.entries.map((p: any) => `${p.cls}:${p.gender}`).sort(),
    expected,
  );
  assert.equal(knight.entries.length, 10);
  for (const report of [north, knight]) {
    assert.equal(report.mapUntouched, true);
    assert.equal(report.savesUntouched, true);
    assert.equal(
      new Set(report.positions.map((p: any) => `${p.x}:${p.y}`)).size,
      report.entries.length,
    );
    for (const p of report.positions) assert.equal(E.cell(p.x, p.y).walk, true);
  }
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
