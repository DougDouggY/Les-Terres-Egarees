import { test } from "node:test";
import assert from "node:assert/strict";
import * as E from "../src/engine";
import {
  characterSheet,
  characterPage,
  classDescription,
} from "../src/ui/character-sheet";
test("character inventory is the default with a blank portrait and numeric HP/XP", () => {
  const s = E.createCampaign(["north", "knight"]),
    u = s.units[0];
  const html = characterSheet(u, true);
  assert.ok(html.includes("Inventaire"));
  assert.ok(html.includes("character-portrait-slot"));
  assert.ok(!html.includes("<img"));
  assert.ok(!html.includes("bar xp"));
  assert.ok(!html.includes("bar hp"));
  assert.ok(!html.includes("Portée"));
  assert.ok(!html.includes("ÉQUIPÉ"));
  assert.ok(html.includes("Bandages"));
  assert.ok(characterPage(u, "stats").includes('role="meter"'));
  assert.ok(!/évol|promotion/i.test(classDescription(u)));
  const enemy = E.makeClassUnit("foe", 0, 1, "spearman", "Lancier", 1, 1);
  const other = characterSheet(enemy, false);
  assert.ok(!other.includes("<dt>EXP"));
  assert.ok(!other.includes('data-action="equip-'));
});
test("legacy consumable quantities now hold bandages that restore the real configured HP", () => {
  const s = E.createCampaign(["north", "knight"]),
    u = s.units[0];
  u.maxHp = 40;
  u.hp = 5;
  u.potions = 2;
  E.heal(s, u);
  assert.equal(u.hp, 20);
  assert.equal(u.potions, 1);
  const back = E.decode(E.encode(s)).units.find((t) => t.id === u.id)!;
  assert.equal(back.potions, 1);
  assert.equal(back.hp, 20);
  assert.ok(
    characterPage(back, "inventory", "bandages", true).includes("Rend 15 PV"),
  );
});

test("custom names remain safe in the profile and its tooltip", () => {
  const u = E.createCampaign(["north", "knight"]).units[0];
  u.name = "constructor";
  assert.ok(characterSheet(u).includes("constructor"));
  u.name = "<script>";
  assert.ok(!characterSheet(u).includes("<script>"));
});
