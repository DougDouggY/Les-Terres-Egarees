import { test } from "node:test";
import assert from "node:assert/strict";
import * as E from "../src/engine";
import { characterHeading, characterSheet } from "../src/ui/character-sheet";
test("generic profiles show their faction while preserving class and personal identities", () => {
  const s = E.createCampaign(["north", "knight"]);
  E.beginForestChapter(s);
  const soldier = s.units.find((u) => u.id === "valdren-1")!,
    captain = s.units.find((u) => u.id === "valdren-captain")!,
    geraud = s.units.find((u) => u.id === "geraud")!;
  assert.equal(characterHeading(soldier), "Valdren");
  assert.equal(characterHeading(captain), "Valdren");
  assert.equal(characterHeading(geraud), "Géraud");
  assert.equal(
    characterHeading(s.units.find((u) => u.id === "story-witch")!),
    "Maëlys",
  );
  const html = characterSheet(soldier);
  assert.ok(html.includes(">Valdren</span></h2>"));
  assert.ok(html.includes("Homme d’armes"));
  const old = { ...soldier };
  delete old.hasPersonalName;
  delete old.factionLabel;
  assert.equal(characterHeading(old), "Valdren");
  const skeleton = E.makeClassUnit(
    "monster",
    0,
    1,
    "skeleton",
    "Porte-lame déchu",
    1,
    1,
  );
  assert.equal(characterHeading(skeleton), "Sans-repos");
  const ally = E.makeClassUnit("ally", 1, 1, "raider", "Pillard", 1, 1);
  ally.hasPersonalName = false;
  ally.factionLabel = "Écorcheurs";
  assert.equal(characterHeading(ally), "Écorcheurs");
  const hero = s.units.find((u) => u.id === "p1a")!;
  hero.name = E.className(hero);
  assert.equal(characterHeading(hero), hero.name);
  const named = E.makeClassUnit("future", 0, 1, "man_at_arms", "Renaud", 1, 1);
  assert.equal(characterHeading(named), "Renaud");
  const restored = E.decode(E.encode(s));
  assert.equal(
    characterHeading(restored.units.find((u) => u.id === soldier.id)!),
    "Valdren",
  );
  assert.equal(soldier.name, "Homme d’armes");
});
