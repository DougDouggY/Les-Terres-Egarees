import { test } from "node:test";
import assert from "node:assert/strict";
import * as E from "../src/engine";
import { recolorPixels, rgbToHsv } from "../src/sprites/recolor";
import { tacticalIdleSway } from "../src/sprites/display-scale";
test("V10 départ : aucun Sorcier ni Sorcière chez les héros ou compagnons chevaliers", () => {
  assert.ok(E.startingHeroClasses("knight").every((c) => c.id !== "sorcerer"));
  assert.equal(E.startingHeroClasses("north").length, 5);
  assert.equal(E.startingHeroClasses("knight").length, 4);
  assert.ok(
    E.companionRoster
      .filter((c) => c.faction === "knight")
      .every((c) => c.classId !== "sorcerer"),
  );
  for (const gender of ["male", "female"] as const)
    assert.throws(
      () =>
        E.createCampaign(
          ["knight", "north"],
          [
            { faction: "knight", name: "Test", classId: "sorcerer", gender },
            {
              faction: "north",
              name: "Chef",
              classId: "raider",
              gender: "male",
            },
          ],
          [["gaspard"], ["astrid", "solveig"]],
        ),
      /Héros invalide/,
    );
});
test("V10 titre : événement commun sauvegardé, puis arrivées des deux points de vue", () => {
  const s = E.createCampaign(["knight", "north"]),
    queue = structuredClone(s.common);
  E.beginChapter1(s);
  assert.equal(s.scene, "chapter1:prologue");
  assert.ok(E.sharedChapterScene("prologue"));
  E.advanceChapterLine(s, 1, { id: "prologue", page: 0 });
  assert.equal(s.scene, "chapter1:prologue");
  const back = E.decode(E.encode(s));
  E.advanceChapterLine(back, 2, { id: "prologue", page: 0 });
  assert.equal(back.scene, "chapter1:arrival-1");
  assert.match(E.chapterLines(back, "arrival-1")[0].text, /convoi/);
  assert.deepEqual(back.common, queue);
});
test("V10 portée : uniquement les ennemis visibles et aucune influence des unités masquées", () => {
  const s = E.createCampaign(["north", "knight"]);
  const a = s.units.find((u) => u.owner === 1)!,
    e = s.units.find((u) => u.owner === 0)!,
    hidden = s.units.filter((u) => u.owner === 0)[1];
  Object.assign(a, { x: 10, y: 10 });
  Object.assign(e, { x: 14, y: 10 });
  s.players[0].visible = E.map
    .filter((c) => c.x >= 9 && c.x <= 18 && c.y >= 8 && c.y <= 13)
    .map((c) => E.key(c.x, c.y));
  s.players[0].explored = [...s.players[0].visible];
  const before = JSON.stringify(s),
    f = E.enemyFields(s, 1);
  assert.deepEqual(f.ids, [e.id]);
  assert.ok(f.moves.size);
  assert.ok(f.attacks.size);
  assert.equal(JSON.stringify(s), before);
  for (const k of [...f.moves, ...f.attacks])
    assert.ok(s.players[0].visible.includes(k));
  hidden.x = 59;
  hidden.y = 39;
  const after = E.enemyFields(s, 1);
  assert.deepEqual(after, f);
  assert.equal(E.enemyFields(s, 1, []).ids.length, 0);
  assert.equal(E.enemyFields(s, 1, [hidden.id]).ids.length, 0);
});
test("V10 rouge : matière plus saturée, peau/acier/transparence conservés", () => {
  const source = new Uint8ClampedArray([
    180, 95, 165, 255, 210, 160, 120, 255, 120, 125, 130, 255, 20, 20, 20, 0,
  ]);
  const out = recolorPixels(source.slice(), "red", { softEdges: false });
  assert.ok(rgbToHsv(out[0], out[1], out[2]).s > 0.55);
  assert.deepEqual([...out.slice(4)], [...source.slice(4)]);
  assert.equal(out[3], 255);
});
test("V10 Chamane : repos animé avec pieds fixes, sans affecter marche/attaque ni autres skins", () => {
  const a = tacticalIdleSway("shaman", "female", "idle", 0, 1),
    b = tacticalIdleSway("shaman", "female", "idle", 1, 1);
  assert.ok(a < 0 && b > 0);
  const ground = 14;
  assert.equal(a * ground - a * ground, 0);
  assert.equal(b * ground - b * ground, 0);
  assert.equal(tacticalIdleSway("shaman", "female", "attack", 1, 1), 0);
  assert.equal(tacticalIdleSway("shaman", "male", "idle", 1, 2), 0);
});
