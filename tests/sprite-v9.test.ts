import { test } from "node:test";
import assert from "node:assert/strict";
import * as E from "../src/engine";
import { chapterEnemy } from "../src/game/chapter1-enemies";
test("V9 chapitre : uniquement des squelettes, quatre armes, deux archers", () => {
  const s = E.createCampaign(["north", "knight"]),
    enemies = s.units.filter((u) => u.owner === 0);
  assert.equal(enemies.length, 8);
  assert.ok(
    enemies.every(
      (u) => u.kind === "skeleton" && E.unitClass(u).faction === "enemy",
    ),
  );
  assert.deepEqual(
    new Set(enemies.map((u) => E.activeWeapon(u).category)),
    new Set(["sword", "axe", "lance", "bow"]),
  );
  assert.equal(
    enemies.filter((u) => E.activeWeapon(u).category === "bow").length,
    2,
  );
  for (const type of ["sword", "axe", "lance", "bow"] as const) {
    const u = chapterEnemy("sample", 1, type, 0, 0);
    assert.equal(E.unitClass(u).faction, "enemy");
    assert.equal(E.activeWeapon(u).category, type);
    assert.equal(u.maxHp, 18);
  }
});
test("V9 reprise V8 : remplacement des humains sans déplacer, soigner ou réordonner ; nom de compagnon corrigé", () => {
  const s = E.createCampaign(["north", "knight"]);
  s.chapter1!.started = true;
  s.chapter1RulesVersion = 2;
  const a = s.units.find((u) => u.id === "e1")!,
    b = s.units.find((u) => u.id === "e8")!;
  Object.assign(a, {
    classId: "raider",
    activeWeaponId: "axe_shield",
    carriedWeapons: ["axe_shield"],
    hp: 7,
  });
  Object.assign(b, {
    classId: "hunter",
    activeWeaponId: "bow",
    carriedWeapons: ["bow"],
    hp: 10,
  });
  const ally = s.units.find((u) => u.id === "p2b")!;
  Object.assign(ally, { name: "Alix", gender: "male" });
  const queue = structuredClone(s.common),
    positions = s.units.map((u) => [u.id, u.x, u.y, u.hp]);
  const back = E.decode(E.encode(s));
  assert.deepEqual(back.common, queue);
  assert.deepEqual(
    back.units.map((u) => [u.id, u.x, u.y, u.hp]),
    positions,
  );
  assert.equal(back.units.find((u) => u.id === "e1")!.classId, "sans_axe");
  assert.equal(back.units.find((u) => u.id === "e8")!.classId, "sans_archer");
  assert.equal(back.units.find((u) => u.id === "p2b")!.name, "Armand");
  assert.equal(back.chapter1RulesVersion, 3);
  const again = E.decode(E.encode(back));
  assert.deepEqual(again.units, back.units);
});
