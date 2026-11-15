import { test } from "node:test";
import assert from "node:assert/strict";
import * as E from "../src/engine";
import {
  portraits,
  compatiblePortraits,
  predefinedPortraits,
} from "../src/data/portraits";
import {
  ensurePortraits,
  reserveHeroPortraits,
  creationPortraits,
} from "../src/game/portraits";
import { characterSheet } from "../src/ui/character-sheet";
import { readFileSync, existsSync } from "node:fs";
const heroes: [E.HeroConfig, E.HeroConfig] = [
  {
    faction: "knight",
    name: "Arthur",
    gender: "male",
    classId: "man_at_arms",
    portraitId: "C04",
  },
  {
    faction: "north",
    name: "Freya",
    gender: "female",
    classId: "hunter",
    portraitId: "V10",
  },
];
function campaign() {
  return E.createCampaign(["knight", "north"], structuredClone(heroes), [
    ["gaspard"],
    ["astrid", "bryn"],
  ]);
}
test("portraits : 33 ressources extraites, ordre stable et catégories réelles", () => {
  assert.equal(portraits.length, 33);
  assert.deepEqual(
    [
      compatiblePortraits("knight", "male").length,
      compatiblePortraits("knight", "female").length,
      compatiblePortraits("north", "male").length,
      compatiblePortraits("north", "female").length,
    ],
    [7, 5, 6, 6],
  );
  for (const p of portraits)
    assert.ok(existsSync(`public/assets/portraits/${p.id}.png`));
  const extraction = JSON.parse(
    readFileSync("public/assets/portraits/extraction.json", "utf8"),
  );
  assert.deepEqual(
    extraction.map((p: any) => p.id),
    portraits.map((p) => p.id),
  );
  assert.ok(extraction.every((p: any) => p.rect[2] > 0 && p.rect[3] > 0));
});
test("portraits : chevalier masculin et Viking féminine indépendants, fiches et aperçu des recrues", () => {
  const s = campaign();
  assert.equal(s.units.find((u) => u.id === "p1a")!.portraitId, "C04");
  assert.equal(s.units.find((u) => u.id === "p2a")!.portraitId, "V10");
  const presented = Object.entries(s.portraits!.assignments)
    .filter(([id]) => id.startsWith("companion:"))
    .map(([, portrait]) => portrait);
  assert.equal(presented.length, 9);
  assert.equal(new Set(presented).size, 9);
  const preview = creationPortraits(
    heroes,
    [["gaspard"], ["astrid", "bryn"]],
    E.companionRoster,
  );
  for (const u of s.units.filter((u) => u.owner !== 0)) {
    assert.equal(preview[u.id], u.portraitAsset);
    assert.ok(characterSheet(u, true, s).includes(u.portraitAsset!));
  }
  assert.equal(
    new Set(Object.values(s.portraits!.assignments)).size,
    Object.keys(s.portraits!.assignments).length,
  );
});
test("portraits : exclusion des réservés, du mauvais sexe et des choix déjà pris", () => {
  assert.ok(
    !compatiblePortraits("knight", "male", ["C04"]).some((p) => p.id === "C04"),
  );
  for (const id of ["C08", "V01", "R01", "N01"]) {
    const h = structuredClone(heroes);
    h[0].portraitId = id;
    assert.throws(
      () =>
        E.createCampaign(["knight", "north"], h, [
          ["gaspard"],
          ["astrid", "bryn"],
        ]),
      /Portrait/,
    );
  }
  const s = campaign();
  assert.throws(() => reserveHeroPortraits(s, ["C04"]), /déjà choisi/);
});
test("portraits : rencontres, chapitre et rechargement conservent toutes les identités", () => {
  const s = campaign();
  const met = E.makeClassUnit(
    "encounter-north",
    1,
    1,
    "raider",
    "Un Viking rencontré",
    12,
    12,
    "male",
  );
  met.hasPersonalName = true;
  s.units.push(met);
  ensurePortraits(s);
  const id = met.portraitId!;
  assert.ok(id.startsWith("V"));
  assert.notEqual(id, "V10");
  const old = structuredClone(s.portraits);
  E.beginForestChapter(s);
  assert.equal(s.units.find((u) => u.id === met.id)!.portraitId, id);
  for (const [u, p] of Object.entries(old!.assignments))
    assert.equal(s.portraits!.assignments[u], p);
  s.scene = null;
  const restored = E.decode(E.encode(s));
  assert.deepEqual(restored.portraits, s.portraits);
  assert.equal(restored.units.find((u) => u.id === met.id)!.portraitId, id);
  const once = JSON.stringify(restored.portraits);
  ensurePortraits(restored);
  assert.equal(JSON.stringify(restored.portraits), once);
});
test("portraits : Maëlys et Géraud réservés, ennemis roses et Sans-Repos", () => {
  const s = campaign();
  assert.ok(
    s.units.filter((u) => u.owner === 0).every((u) => u.portraitId === "N05"),
  );
  E.beginForestChapter(s);
  assert.equal(s.units.find((u) => u.id === "story-witch")!.portraitId, "R01");
  assert.equal(s.units.find((u) => u.id === "geraud")!.portraitId, "R03");
  assert.ok(
    s.units
      .filter((u) => u.owner === 0 && u.id !== "geraud")
      .every((u) => ["N03", "N04"].includes(u.portraitId!)),
  );
  const g = s.units.find((u) => u.id === "geraud")!;
  g.owner = 1;
  ensurePortraits(s);
  assert.equal(g.portraitId, "R03");
  assert.equal(predefinedPortraits.sister.unitId, null);
  assert.equal(predefinedPortraits.atalia.unitId, null);
  assert.ok(
    !Object.values(s.portraits!.assignments).some(
      (p) => p === "R02" || p === "R04",
    ),
  );
});
test("portraits : anciennes sauvegardes migrées une fois sans toucher au scénario", () => {
  const s = E.createCampaign(["north", "knight"]);
  delete s.portraits;
  for (const u of s.units) {
    delete u.portraitAsset;
    delete u.portraitId;
  }
  const roster = s.units.map((u) => [u.id, u.name, u.hp, u.classId, u.x, u.y]);
  const migrated = E.decode(JSON.stringify(s));
  assert.deepEqual(
    migrated.units.map((u) => [u.id, u.name, u.hp, u.classId, u.x, u.y]),
    roster,
  );
  assert.deepEqual(E.decode(E.encode(migrated)).portraits, migrated.portraits);
});
test("portraits : épuisement explicite sans doublons, réservations des unités disparues conservées", () => {
  const s = campaign();
  for (let i = 0; i < 15; i++) {
    const u = E.makeClassUnit(
      `named-${i}`,
      1,
      1,
      "man_at_arms",
      `Chevalier ${i}`,
      4,
      4,
      "male",
    );
    u.hasPersonalName = true;
    s.units.push(u);
  }
  ensurePortraits(s);
  const assigned = Object.values(s.portraits!.assignments).filter(
    (id): id is string => id !== null,
  );
  assert.equal(assigned.length, new Set(assigned).size);
  assert.ok(s.portraits!.issues.length > 0);
  const empty = s.units.find((u) => s.portraits!.assignments[u.id] === null)!;
  assert.ok(characterSheet(empty, true, s).includes("Portrait indisponible"));
  const before = structuredClone(s.portraits);
  s.units = s.units.filter((u) => u.id !== "p1b");
  ensurePortraits(s);
  assert.deepEqual(s.portraits, before);
});
test("portraits : les associations invalides ou dupliquées sont refusées au chargement", () => {
  const s = campaign();
  s.portraits!.assignments.p1b = "C04";
  assert.throws(() => E.decode(JSON.stringify(s)), /deux fois/);
  const t = campaign();
  t.portraits!.assignments.p1b = "R04";
  assert.throws(() => E.decode(JSON.stringify(t)), /réservé/);
});
