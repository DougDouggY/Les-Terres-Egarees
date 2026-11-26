import { test } from "node:test";
import assert from "node:assert/strict";
import * as E from "../src/engine";
import { dialogueCast } from "../src/ui/dialogue-presentation";
const finish = (s: E.Campaign, cooperative = false) => {
  const id = s.chapter1!.pending!.id;
  for (let n = 0; n < 90 && s.chapter1?.pending?.id === id; n++) {
    const page = s.chapter1!.pending!.page;
    if (cooperative) {
      E.advanceChapterLine(s, 1, { id, page });
      assert.equal(s.chapter1?.pending?.id, id);
      assert.equal(s.chapter1?.pending?.page, page);
      E.advanceChapterLine(s, 2, { id, page });
    } else E.advanceChapterLine(s);
  }
  assert.notEqual(s.chapter1?.pending?.id, id);
};
function setup(choice: E.PatrolChoice, swap = false) {
  const s = E.createCampaign(swap ? ["knight", "north"] : ["north", "knight"]);
  E.beginForestChapter(s);
  while (s.chapter1?.pending?.id !== "c1-choice") finish(s);
  E.votePatrol(s, 1, choice);
  E.votePatrol(s, 2, choice);
  E.confirmPatrol(s);
  return s;
}
for (const swap of [false, true])
  for (const choice of ["travelers", "storm"] as const)
    test(`chapitres I/II : ${choice}, factions ${swap ? "inversées" : "normales"}, sauvegardes et progression`, () => {
      let s = setup(choice, swap);
      const seed = s.seed,
        witch = s.units.find((u) => u.id === "story-witch")!,
        guard = s.units.find((u) => u.id === "valdren-1")!;
      const witchBefore = { hp: witch.hp, xp: witch.xp, level: witch.level };
      assert.equal(
        E.chapterLines(s, "c1-travelers").some((l) =>
          /tempêtes? rouges?/i.test(l.text),
        ),
        false,
      );
      finish(s, true);
      if (choice === "travelers") {
        assert.equal(s.chapter1?.pending?.id, "c1-ambush");
        const a = E.maelysAmbush(s);
        assert.equal(a.strikes[0].hit, false);
        assert.equal(a.strikes[1].critical, true);
        assert.equal(a.strikes[1].hpAfter, 0);
        assert.equal(guard.hp > 0, true);
        const page = s.chapter1!.pending!.page;
        E.advanceChapterLine(s, 1, { id: "c1-ambush", page });
        assert.equal(guard.hp > 0, true);
        s = E.decode(E.encode(s));
        E.advanceChapterLine(s, 2, { id: "c1-ambush", page });
        assert.equal(s.units.find((u) => u.id === guard.id)!.hp, 0);
        assert.equal(s.common.queue.includes(guard.id), false);
        assert.equal(s.forestChapter?.ambushResolved, true);
      } else assert.equal(s.chapter1?.pending?.id, "c1-deploy");
      finish(s, true);
      assert.equal(s.forestChapter?.stage, "battle");
      assert.equal(s.seed, seed);
      const w = s.units.find((u) => u.id === "story-witch")!;
      assert.deepEqual({ hp: w.hp, xp: w.xp, level: w.level }, witchBefore);
      const g = s.units.find((u) => u.id === "geraud")!,
        k = E.storyUnit(s, "knight-chief")!;
      const adjacent = E.map.find(
        (c) =>
          c.walk &&
          E.distance(c, g) === 1 &&
          !s.units.some((u) => u.hp > 0 && u.x === c.x && u.y === c.y),
      )!;
      k.x = adjacent.x;
      k.y = adjacent.y;
      s.active = k.owner as 1 | 2;
      s.common = {
        round: 2,
        index: 0,
        queue: [
          k.id,
          ...s.units.filter((u) => u.id !== k.id && u.hp > 0).map((u) => u.id),
        ],
      };
      assert.equal(E.canTalkGeraud(s, k), choice === "storm");
      if (choice === "storm") {
        E.talkGeraud(s, k);
        finish(s, true);
        assert.equal(g.owner, k.owner);
      }
      k.name = "Éloïse-du-Nord";
      k.level = 4;
      k.xp = 37;
      k.hp = Math.max(1, k.maxHp - 3);
      const before = JSON.stringify(s.units.filter((u) => u.owner !== 0));
      for (const u of s.units) if (u.owner === 0) u.hp = 0;
      E.checkEnd(s);
      assert.equal(
        s.chapter1?.pending?.id,
        choice === "storm" ? "c1-after-storm" : "c1-after-travelers",
      );
      assert.equal(
        E.chapterLines(s, s.chapter1!.pending!.id).some(
          (l) => l.speaker === "geraud",
        ),
        false,
      );
      finish(s, true);
      assert.equal(s.chapter1?.pending?.id, "c2-title");
      assert.equal(s.chapter2?.stage, "introduction");
      finish(s, true);
      assert.equal(s.chapter1?.pending?.id, "c2-cave");
      const lines = E.chapterLines(s, "c2-cave");
      assert.ok(lines.some((l) => l.text.includes("environ six mois")));
      const cast = dialogueCast(
        s,
        lines,
        lines.findIndex((l) => l.speaker === "knight-chief"),
      );
      assert.ok(cast.some((p) => p.name === k.name));
      finish(s, true);
      assert.equal(s.chapter2?.visitors.length, 3);
      assert.equal(
        s.units.some((u) => u.id.startsWith("c2-flayer-")),
        false,
      );
      const visitor = E.storyUnit(s, "flayer")!;
      const portrait = visitor.portraitId;
      assert.ok(portrait);
      const text = E.chapterLines(s, "c2-visitors")
        .map((l) => l.text)
        .join("\n");
      assert.ok(text.includes("C’était vous"));
      assert.equal(/soigner|blessé|partage|compatriote/i.test(text), false);
      s = E.decode(E.encode(s));
      assert.equal(E.storyUnit(s, "flayer")!.portraitId, portrait);
      while (s.chapter1?.pending) finish(s, true);
      assert.equal(s.phase, "summary");
      assert.equal(s.chapter2?.stage, "awaiting-battle");
      assert.equal(s.mapId, "forest-compact");
      assert.equal(
        JSON.stringify(s.units.filter((u) => u.owner !== 0)),
        before,
      );
      E.validate(s);
      const saved = E.decode(E.encode(s));
      assert.equal(saved.chapter2?.stage, "awaiting-battle");
      assert.deepEqual(saved.chapter2?.visitors, s.chapter2?.visitors);
    });
test("anciens bilans de chapitre I : reprise sans reconstruire l’équipe", () => {
  const s = setup("storm");
  while (s.chapter1?.pending) finish(s);
  s.forestChapter!.stage = "complete";
  s.phase = "summary";
  const back = E.decode(E.encode(s)),
    before = JSON.stringify(back.units);
  assert.equal(E.beginChapterTwo(back), true);
  assert.equal(E.beginChapterTwo(back), false);
  assert.equal(JSON.stringify(back.units), before);
});

test("attaque scénarisée : résultat indépendant des statistiques, sans XP ni tirage", () => {
  const s = setup("travelers");
  finish(s);
  const g = s.units.find((u) => u.id === s.forestChapter!.ambushGuardId)!,
    w = s.units.find((u) => u.id === "story-witch")!;
  g.hp = g.maxHp = 9999;
  g.defense = g.accuracy = g.agility = 9999;
  w.hp = 1;
  w.strength = w.accuracy = w.agility = 0;
  const before = { seed: s.seed, hp: w.hp, xp: w.xp, level: w.level };
  const first = E.maelysAmbush(s);
  assert.equal(first.strikes[0].hit, false);
  assert.equal(first.strikes[1].critical, true);
  assert.equal(first.strikes[1].damage, 9999);
  assert.deepEqual(E.maelysAmbush(s).strikes, first.strikes);
  assert.equal(g.hp, 9999);
  finish(s, true);
  assert.equal(g.hp, 0);
  assert.deepEqual(
    { seed: s.seed, hp: w.hp, xp: w.xp, level: w.level },
    before,
  );
});

for (const choice of ["storm", "travelers"] as const)
  test(`raccourci accueil : fin de bataille ${choice}, puis chapitre II entier`, async () => {
    const { createChapterTwoReview } =
      await import("../src/game/chapter-two-review");
    let s = createChapterTwoReview(choice);
    assert.equal(s.chapter1?.pending?.id, `c1-after-${choice}`);
    assert.equal(s.chapter1?.pending?.page, 0);
    assert.equal(s.chapter2, undefined);
    assert.equal(s.developmentTest, undefined);
    assert.equal(s.forestChapter?.choice, choice);
    assert.ok(s.units.filter((u) => u.owner === 0).every((u) => u.hp === 0));
    assert.equal(s.forestChapter?.geraudRecruited === true, choice === "storm");
    assert.equal(
      s.units.find((u) => u.id === "geraud")!.owner !== 0,
      choice === "storm",
    );
    const roster = JSON.stringify(s.units.filter((u) => u.owner !== 0));
    s = E.decode(E.encode(s));
    const scenes: string[] = [];
    for (let i = 0; s.chapter1?.pending && i < 12; i++) {
      scenes.push(s.chapter1.pending.id);
      finish(s);
    }
    assert.deepEqual(scenes, [
      `c1-after-${choice}`,
      "c2-title",
      "c2-cave",
      "c2-visitors",
      "c2-depart",
    ]);
    assert.equal(s.phase, "summary");
    assert.equal(s.chapter2?.stage, "awaiting-battle");
    assert.equal(JSON.stringify(s.units.filter((u) => u.owner !== 0)), roster);
    assert.equal(E.decode(E.encode(s)).chapter2?.stage, "awaiting-battle");
  });

test("village rapproché : rues connectées, maisons et accessoires sur des cases entières", async () => {
  const C = await import("../src/data/kingdom-camp-map"),
    { gridPath } = await import("../src/game/grid-path");
  const a = C.kingdomCampMap();
  assert.deepEqual(a, C.kingdomCampMap());
  assert.equal(a.cells.length, 32 * 26);
  assert.equal(C.campBuildings.length, 4);
  assert.deepEqual(
    C.campBuildings.map((b) => b.kind),
    ["house", "warehouse", "barracks", "cells"],
  );
  assert.ok(
    C.campBuildings
      .slice(1)
      .every((b) => b.w * b.h > C.campBuildings[0].w * C.campBuildings[0].h),
  );
  assert.equal(
    a.cells.some((c) => c.terrain === "rock" || c.villagePart),
    false,
  );
  const occupied = new Set<number>();
  for (const b of C.campBuildings)
    for (let y = b.y; y < b.y + b.h; y++)
      for (let x = b.x; x < b.x + b.w; x++) {
        const k = y * C.CAMP_W + x;
        assert.ok(!occupied.has(k));
        occupied.add(k);
        assert.equal(a.cells[k].walk, false);
      }
  for (const p of C.campProps)
    for (let dy = 0; dy < p.h; dy++)
      for (let dx = 0; dx < p.w; dx++)
        assert.ok(!occupied.has((p.y + dy) * C.CAMP_W + p.x + dx), p.type);
  assert.ok(
    C.campProps
      .filter((p) => p.type === "bush")
      .every((p) => p.w === 1 && p.h === 1),
  );
  const well = C.campProps.find((p) => p.type === "well")!;
  assert.deepEqual([well.w, well.h], [2, 2]);
  for (let dy = 0; dy < 2; dy++)
    for (let dx = 0; dx < 2; dx++)
      assert.equal(a.cells[(well.y + dy) * C.CAMP_W + well.x + dx].walk, false);
  // No four corners of a regular rectangle: every facade has its own row.
  assert.equal(new Set(C.campBuildings.map((b) => b.entry.y)).size, 4);
  const start = C.campStart.y * C.CAMP_W + C.campStart.x;
  for (const p of C.campLandmarks)
    assert.ok(
      gridPath(C.CAMP_W, C.CAMP_H, start, p.y * C.CAMP_W + p.x, (k) =>
        a.cells[k].walk ? a.cells[k].cost : null,
      ),
      p.name,
    );
});

test("maisons rapprochées : ouvrir, entrer par la porte et refermer sans toucher aux autres maisons", async () => {
  const C = await import("../src/data/kingdom-camp-map"),
    { gridPath } = await import("../src/game/grid-path");
  const a = C.kingdomCampMap(),
    before = structuredClone(a.cells),
    start = C.campStart.y * C.CAMP_W + C.campStart.x;
  for (const b of C.campBuildings) {
    const door = b.entry.y * C.CAMP_W + b.entry.x,
      inside = (b.y + b.h - 2) * C.CAMP_W + b.entry.x;
    assert.equal(a.cells[door].walk, false);
    C.setCampHouseOpen(a.cells, b.id, true);
    assert.equal(a.cells[door].walk, true);
    assert.equal(a.cells[door].opaque, false);
    const path = gridPath(C.CAMP_W, C.CAMP_H, start, inside, (k) =>
      a.cells[k].walk ? a.cells[k].cost : null,
    );
    assert.ok(path?.steps.includes(door), b.id);
    for (const other of C.campBuildings.filter((x) => x.id !== b.id))
      assert.equal(
        a.cells[other.entry.y * C.CAMP_W + other.entry.x].walk,
        false,
      );
    for (const item of C.campFurniture(b))
      for (let y = item.y; y < item.y + item.h; y++)
        for (let x = item.x; x < item.x + item.w; x++)
          assert.equal(a.cells[y * C.CAMP_W + x].walk, false);
    for (let y = b.y; y < b.y + b.h; y++)
      for (let x = b.x; x < b.x + b.w; x++)
        if (
          !C.isCampInterior(b, x, y) &&
          !(x === b.entry.x && y === b.entry.y)
        ) {
          assert.equal(a.cells[y * C.CAMP_W + x].walk, false);
          assert.equal(a.cells[y * C.CAMP_W + x].terrain, "wall");
        }
    C.setCampHouseOpen(a.cells, b.id, false);
    assert.deepEqual(a.cells, before);
  }
  assert.throws(() => C.setCampHouseOpen(a.cells, "unknown", true));
});

test("aperçu rapproché : ancienne carte restaurée, toits fermés à la réouverture", async () => {
  const C = await import("../src/data/kingdom-camp-map");
  for (const id of ["prologue", "forest-compact"] as const) {
    E.activateMap(id);
    const before = JSON.stringify(E.map),
      w = E.W,
      h = E.H;
    E.activateMap("kingdom-camp");
    assert.equal(E.W, 32);
    assert.equal(E.H, 26);
    C.setCampHouseOpen(E.map, C.campBuildings[0].id, true);
    E.activateMap(id);
    assert.equal(E.W, w);
    assert.equal(E.H, h);
    assert.equal(JSON.stringify(E.map), before);
    E.activateMap("kingdom-camp");
    assert.equal(
      E.map[C.campVillage.entry.y * C.CAMP_W + C.campVillage.entry.x].walk,
      false,
    );
    E.activateMap(id);
  }
});

test("tileset rapproché : vrais fichiers, toits indépendants, seize murs/accessoires et neuf ressources de décor", async () => {
  const { readFile } = await import("node:fs/promises"),
    { villageTileset: T } = await import("../src/data/village-tileset");
  const raw = await readFile("public/" + T.source);
  assert.equal(raw.toString("ascii", 1, 4), "PNG");
  assert.equal(raw.readUInt32BE(16), T.columns * T.cell);
  assert.equal(raw.readUInt32BE(20), T.rows * T.cell);
  assert.equal(T.roofs.length, 4);
  assert.equal(Object.keys(T.props).length, 9);
  assert.equal(Object.keys(T.walls).length, 16);
  for (const h of T.roofs) {
    assert.equal(h.w, 9);
    assert.equal(h.h, 6);
    assert.ok(h.x + h.w <= T.columns && h.y + h.h <= T.rows);
  }
});

test("terrains suivants : deux plans indépendants et chemins traversables", async () => {
  const { futureTerrainMaps } = await import("../src/data/future-terrain-maps");
  const { gridPath } = await import("../src/game/grid-path");
  const first = futureTerrainMaps(),
    second = futureTerrainMaps();
  assert.equal(first.length, 2);
  assert.deepEqual(first, second);
  for (const m of first) {
    assert.equal(m.tiles.length, m.width * m.height);
    assert.equal(m.blocked.length, m.tiles.length);
    assert.ok(m.tiles.every((t) => Number.isInteger(t) && t >= 0 && t <= 16));
    assert.ok(
      gridPath(
        m.width,
        m.height,
        m.start[1] * m.width + m.start[0],
        m.destination[1] * m.width + m.destination[0],
        (k) => (m.blocked[k] ? null : 1),
      ),
      m.id,
    );
  }
  first[0].tiles[0] = 15;
  assert.notEqual(first[0].tiles[0], second[0].tiles[0]);
});
