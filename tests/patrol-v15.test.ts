import { test } from "node:test";
import assert from "node:assert/strict";
import * as E from "../src/engine";
import { generateStatistics } from "../src/game/progression";
test("allied hover fields include movement, attacks and healing without mutation or enemy leakage", () => {
  const s = E.createCampaign(["north", "knight"]);
  E.beginForestChapter(s);
  const witch = s.units.find((u) => u.classId === "sorcerer")!;
  const before = E.encode(s);
  for (const viewer of [1, 2] as const) {
    const f = E.alliedFields(s, viewer, witch);
    assert.ok(f.moves.size > 1);
    assert.ok(f.attacks.size > f.moves.size);
    assert.ok(f.heals.size > f.moves.size);
  }
  assert.equal(E.encode(s), before);
  s.players[0].visible = [];
  assert.equal(E.alliedFields(s, 1, witch).moves.size, 0);
});
test("Squire is a weak recruit class, retaining its real light sword and normal recruitable status", () => {
  const s = E.createCampaign(["north", "knight"]);
  E.beginForestChapter(s);
  const g = s.units.find((u) => u.id === "geraud")!;
  assert.equal(g.statRole, "recruitable");
  assert.equal(g.level, 1);
  assert.ok(g.maxHp <= 17);
  assert.ok(g.strength <= 4);
  assert.ok(g.defense <= 3);
  assert.ok(E.classes.squire.stats.hp < E.classes.man_at_arms.stats.hp);
  assert.equal(E.weaponName(g), "Épée légère");
  const a = generateStatistics(
    E.makeClassUnit("sq", 1, 1, "squire", "Test", 1, 1, "male", [
      "man_at_arms",
      "spearman",
    ]),
    { role: "principal" },
  );
  const b = generateStatistics(
    E.makeClassUnit("sq", 0, 1, "squire", "Test", 1, 1, "male", [
      "man_at_arms",
      "spearman",
    ]),
    { role: "recruitable" },
  );
  assert.equal(a.maxHp, b.maxHp);
  assert.equal(a.strength, b.strength);
});
