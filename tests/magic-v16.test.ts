import { test } from "node:test";
import assert from "node:assert/strict";
import * as E from "../src/engine";
import { trainingUnit } from "../src/game/sandbox";
test("hybrid mages attack and heal without switching, including legacy healing equipment", () => {
  for (const cls of ["sorcerer", "volva", "archmage", "necromancer"]) {
    const s = E.createCampaign(["north", "knight"]);
    s.units = [];
    s.merged = true;
    const u = trainingUnit(s, cls, 1, 1, 1),
      t = trainingUnit(s, "raider", 1, 1, 1),
      foe = trainingUnit(s, "skeleton", 1, 1, 0);
    Object.assign(t, { x: 10, y: 11 });
    Object.assign(foe, { x: 11, y: 10 });
    t.hp--;
    u.x = 10;
    u.y = 10;
    const id = u.activeWeaponId;
    assert.ok(E.canHealTarget(s, u, t));
    assert.ok(E.canAttack(u, foe));
    assert.ok(E.healingCells(u, [E.key(10, 10)]).size);
    assert.equal(u.activeWeaponId, id);
    u.activeWeaponId = "healing_focus";
    E.syncWeapon(u);
    assert.equal(E.activeWeapon(u).category, "magic");
    assert.ok(E.canAttack(u, foe));
    assert.ok(E.canHealTarget(s, u, t));
  }
});
test("Squire level-ten promotion exceeds the new class reference while retaining earned growth", () => {
  for (const cls of ["man_at_arms", "spearman"]) {
    const s = E.createCampaign(["north", "knight"]);
    const u = E.makeClassUnit(
      "recruit",
      1,
      1,
      "squire",
      "Géraud",
      1,
      1,
      "male",
      ["man_at_arms", "spearman"],
    );
    for (let i = 0; i < 9; i++) E.gainLevel(s, u);
    u.strength = 18;
    const old = u.strength;
    s.units.push(u);
    E.promote(s, u, cls);
    assert.equal(u.level, 1);
    assert.equal(u.classId, cls);
    assert.ok(u.maxHp > E.classes[cls].stats.hp);
    assert.ok(u.defense > E.classes[cls].stats.defense);
    assert.ok(u.strength >= old);
    assert.equal(u.move, E.classes[cls].stats.move);
  }
});
test("exactly two rear soldiers level two and captain level three", () => {
  const s = E.createCampaign(["north", "knight"]);
  E.beginForestChapter(s);
  const enemies = s.units.filter((u) => u.owner === 0);
  assert.deepEqual(
    enemies
      .filter((u) => u.level === 2)
      .map((u) => u.id)
      .sort(),
    ["valdren-6", "valdren-9"],
  );
  assert.equal(enemies.find((u) => u.id === "valdren-captain")!.level, 3);
  assert.equal(enemies.find((u) => u.id === "geraud")!.level, 1);
});
