import { portraitBackdropMask } from "../src/ui/portrait-mask";
import { test } from "node:test";
import assert from "node:assert/strict";
import * as E from "../src/engine";
import { compatiblePortraits } from "../src/data/portraits";
import { dialogueCast, dialoguePages } from "../src/ui/dialogue-presentation";
import { unitPortrait } from "../src/game/portraits";
test("visages : catalogue intact, cycle circulaire et exclusion de l’autre joueur", () => {
  for (const faction of ["north", "knight"] as const)
    for (const gender of ["male", "female"] as const) {
      const pool = compatiblePortraits(faction, gender);
      assert.equal(
        E.cycleFace(faction, gender, pool[0].id, -1),
        pool.at(-1)!.id,
      );
      assert.equal(
        E.cycleFace(faction, gender, pool.at(-1)!.id, 1),
        pool[0].id,
      );
      assert.notEqual(
        E.cycleFace(faction, gender, pool[1].id, 1, [pool[2].id]),
        pool[2].id,
      );
    }
  assert.equal(
    compatiblePortraits("north", "male").length +
      compatiblePortraits("north", "female").length,
    12,
  );
  assert.equal(
    compatiblePortraits("knight", "male").length +
      compatiblePortraits("knight", "female").length,
    12,
  );
  assert.equal(
    E.afterFaceLine("knight", "female"),
    E.recruitmentVoice("knight")[0],
  );
  assert.equal(
    E.afterFaceLine("north", "male"),
    "Prêt pour le grand voyage à l'ouest ?",
  );
  assert.equal(
    E.afterFaceLine("north", "female"),
    "Prête pour le grand voyage à l'ouest ?",
  );
});
test("dialogues : pages visuelles sans perte ou réécriture des répliques", () => {
  const text = "Une phrase avec des espaces. ".repeat(20) + "Fin.";
  for (const limit of [80, 160]) {
    const pages = dialoguePages(text, limit);
    assert.equal(pages.join(""), text);
    assert.ok(pages.length > 1);
    assert.ok(pages.every((p) => p.length <= limit + 1));
  }
});
test("dialogues : Athéna et Solveig utilisent leur identité, deux portraits et aucun dévoilement anticipé", () => {
  const s = E.createCampaign(
    ["north", "knight"],
    [
      {
        name: "Athéna",
        faction: "north",
        classId: "raider",
        gender: "female",
        portraitId: "V10",
      },
      {
        name: "Arthur",
        faction: "knight",
        classId: "man_at_arms",
        gender: "male",
        portraitId: "C04",
      },
    ],
    [["solveig", "bryn"], ["gaspard"]],
  );
  const lines = [
    { speaker: "north-chief" as const, text: "A" },
    { speaker: "north-companion" as const, text: "B" },
  ];
  const one = dialogueCast(s, lines, 0);
  assert.equal(one.length, 1);
  assert.equal(one[0].asset, "assets/portraits/V10.png");
  const two = dialogueCast(s, lines, 1);
  assert.equal(two.length, 2);
  assert.equal(two.filter((p) => p.active).length, 1);
  const solveig = s.units.find((u) => u.name === "Solveig")!;
  assert.equal(two.find((p) => p.active)!.asset, solveig.portraitAsset);
  assert.notEqual(two[0].side, two[1].side);
  assert.equal(
    dialogueCast(
      s,
      [
        { speaker: "unknown", text: "?" },
        { speaker: "witch", text: "A" },
      ],
      0,
    ).length,
    0,
  );
});
test("dialogues : portrait générique importé, jamais un chemin de sprite historique", () => {
  const u = E.makeClassUnit("legacy", 1, 1, "man_at_arms", "Allié", 1, 1);
  u.portraitAsset = "assets/tactical/full-body.png";
  assert.equal(unitPortrait(undefined, u), "assets/portraits/N01.png");
  const foe = E.makeClassUnit("foe", 0, 1, "spearman", "Soldat", 1, 1);
  assert.equal(unitPortrait(undefined, foe), "assets/portraits/N03.png");
  const sans = E.makeClassUnit("sans", 0, 1, "skeleton", "Sans-Repos", 1, 1);
  assert.equal(unitPortrait(undefined, sans), "assets/portraits/N05.png");
});

test("portraits : masque d’affichage limité au fond connecté, détails sombres intérieurs conservés", () => {
  const w = 5,
    h = 5,
    p = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const dark =
          x === 0 || y === 0 || x === 4 || y === 4 || (x === 2 && y === 2),
        i = (y * w + x) * 4;
      p.set(dark ? [7, 14, 28, 255] : [180, 110, 70, 255], i);
    }
  const before = p.slice(),
    mask = portraitBackdropMask(p, w, h);
  assert.equal(mask[3], 0);
  assert.equal(mask[(2 * w + 2) * 4 + 3], 255);
  assert.equal(mask[(1 * w + 1) * 4 + 3], 255);
  assert.deepEqual(p, before);
});
