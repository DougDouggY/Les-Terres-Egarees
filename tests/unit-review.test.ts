import { test } from "node:test";
import assert from "node:assert/strict";
import * as E from "../src/engine";
import { createUnitReview } from "../src/game/unit-review";

test("essai : toutes les variantes de base, niveau 1, terrain original et deux bandages", () => {
  for (const faction of ["north", "knight"] as const) {
    E.activateMap("prologue");
    const terrain = JSON.stringify(E.map);
    const s = createUnitReview(faction);
    assert.equal(s.units.length, 22);
    assert.equal(
      s.units.filter((u) => u.owner === 1).length,
      faction === "north" ? 12 : 10,
    );
    assert.equal(
      s.units.reduce((n, u) => n + u.potions, 0),
      2,
    );
    assert.equal(new Set(s.units.map((u) => E.key(u.x, u.y))).size, 22);
    assert.ok(
      s.units.every(
        (u) => u.level === 1 && u.hp === u.maxHp && E.cell(u.x, u.y)?.walk,
      ),
    );
    assert.equal(E.current(s)?.owner, 1);
    assert.equal(s.scene, null);
    assert.equal(s.mapId, "prologue");
    assert.equal(s.sandboxFlat, false);
    assert.equal(JSON.stringify(E.map), terrain);
    for (const u of s.units)
      assert.ok(s.players[0].visible.includes(E.key(u.x, u.y)));
    assert.equal(E.encounter(s), false);
  }
});

test("essai : aucune vague ou scène après plusieurs tours, sauvegarde et fin isolées", () => {
  const s = createUnitReview();
  for (let i = 0; i < 100; i++) E.advance(s);
  assert.equal(s.units.length, 22);
  assert.equal(s.scene, null);
  assert.equal(s.phase, "battle");
  const loaded = E.decode(E.encode(s));
  assert.deepEqual(loaded.unitReview, s.unitReview);
  assert.deepEqual(
    loaded.units.map((u) => [u.id, u.level, u.hp, u.x, u.y]),
    s.units.map((u) => [u.id, u.level, u.hp, u.x, u.y]),
  );
  for (const u of loaded.units.filter((u) => u.owner === 0)) u.hp = 0;
  E.advance(loaded);
  assert.equal(loaded.unitReview?.finished, true);
  assert.equal(loaded.phase, "battle");
  assert.equal(loaded.scene, null);
  assert.equal(E.canFinishBattleForTest(loaded), false);
});

for (const attacker of ["hunter", "crossbowman"])
  for (const defender of ["hunter", "crossbowman"]) {
    test(`riposte à distance légale : ${attacker} → ${defender}`, () => {
      const s = createUnitReview();
      const a = s.units.find((u) => u.classId === attacker)!;
      const b = s.units.find((u) => u.classId === defender && u !== a)!;
      a.owner = 1;
      b.owner = 0;
      a.x = 24;
      a.y = 19;
      b.x = 26;
      b.y = 19;
      a.hp = a.maxHp = 100;
      b.hp = b.maxHp = 100;
      assert.equal(E.canAttack(a, b), true);
      assert.equal(E.forecast(a, b, s).counter, true);
      assert.ok(
        E.resolve(s, a, b).strikes.some((strike) => strike.attacker === b.id),
      );
      b.x = 25;
      assert.equal(E.canAttack(a, b), false);
      assert.equal(E.canAttack(b, a), false);
      b.x = 27;
      assert.equal(E.canAttack(a, b), false);
    });
  }

test("essai : chaque variante peut se déplacer par les règles normales, sans retrouver la brume", () => {
  for (const faction of ["north", "knight"] as const) {
    const s = createUnitReview(faction);
    for (const u of s.units.filter((u) => u.owner === 1)) {
      const destination = [...E.reachable(s, u)].find(
        ([k]) => k !== E.key(u.x, u.y),
      );
      assert.ok(destination, u.id);
      const before = { x: u.x, y: u.y };
      const c = E.map[destination[0]];
      E.move(s, u, c.x, c.y);
      assert.deepEqual({ x: u.x, y: u.y }, { x: c.x, y: c.y });
      assert.equal(s.players[0].visible.length, E.map.length);
      Object.assign(u, before);
    }
  }
});
