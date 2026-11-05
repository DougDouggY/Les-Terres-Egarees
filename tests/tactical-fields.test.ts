import { test } from "node:test";
import assert from "node:assert/strict";
import * as E from "../src/engine";
import { createSandbox, trainingUnit } from "../src/game/sandbox";
function line() {
  const start = E.map.find(
    (c) =>
      c.x > 10 &&
      c.y > 10 &&
      Array.from({ length: 8 }, (_, i) => E.cell(c.x + i, c.y)).every(
        (n) => n?.walk && n.cost === 1,
      ),
  );
  assert.ok(start);
  return start;
}
test("brume : planifier sans révéler un ennemi, puis s’arrêter avant lui", () => {
  const s = createSandbox(),
    u = trainingUnit(s, "man_at_arms"),
    enemy = trainingUnit(s, "raider", 1, 1, 0),
    c = line();
  Object.assign(u, { x: c.x, y: c.y, move: 6 });
  Object.assign(enemy, { x: c.x + 3, y: c.y });
  s.players[0].visible = [E.key(c.x, c.y), E.key(c.x + 1, c.y)];
  s.players[0].explored = [...s.players[0].visible];
  const before = JSON.stringify(s.players);
  const plan = E.path(s, u, c.x + 5, c.y, false, true)!;
  assert.ok(plan);
  assert.equal(plan.cost, 5);
  assert.equal(JSON.stringify(s.players), before);
  assert.ok(E.reachable(s, u, true).has(E.key(c.x + 5, c.y)));
  const actual = E.movementPrefix(s, u, plan);
  assert.equal(actual.interrupted, true);
  assert.equal(actual.destination.x, c.x + 2);
  assert.ok(!actual.steps.includes(E.key(enemy.x, enemy.y)));
});
test("terrain masqué : coût et obstacle inconnus ne fuient pas par le surlignage", () => {
  const s = createSandbox(),
    u = trainingUnit(s, "man_at_arms"),
    c = line(),
    hidden = E.cell(c.x + 2, c.y)!;
  Object.assign(u, { x: c.x, y: c.y, move: 6 });
  s.players[0].visible = [E.key(c.x, c.y)];
  s.players[0].explored = [...s.players[0].visible];
  const old = { walk: hidden.walk, cost: hidden.cost };
  try {
    hidden.walk = false;
    hidden.cost = 99;
    const plan = E.path(s, u, c.x + 4, c.y, false, true)!;
    assert.equal(plan.cost, 4);
    assert.ok(plan.steps.includes(E.key(hidden.x, hidden.y)));
    const actual = E.movementPrefix(s, u, plan);
    assert.equal(actual.destination.x, c.x + 1);
    assert.ok(actual.interrupted);
  } finally {
    Object.assign(hidden, old);
  }
});
test("soin : cible blessée visible obligatoire, équipement de soin sans mutation", () => {
  const s = createSandbox(),
    u = trainingUnit(s, "sorcerer"),
    ally = trainingUnit(s, "man_at_arms"),
    c = line();
  Object.assign(u, { x: c.x, y: c.y });
  Object.assign(ally, { x: c.x + 1, y: c.y });
  s.players[0].visible = [E.key(u.x, u.y), E.key(ally.x, ally.y)];
  assert.equal(E.healingTargets(s, u).length, 0);
  ally.hp--;
  const weapon = u.activeWeaponId;
  assert.ok(E.healingTargets(s, u).includes(ally));
  assert.equal(u.activeWeaponId, weapon);
  ally.x += 5;
  assert.equal(E.healingTargets(s, u).length, 0);
});
test("Chaman : portée verte depuis les déplacements puis portée réelle après mouvement", () => {
  const s = createSandbox(),
    u = trainingUnit(s, "shaman"),
    c = line();
  Object.assign(u, { x: c.x, y: c.y, move: 4 });
  const reach = E.reachable(s, u),
    before = E.healingCells(u, reach.keys()),
    after = E.healingCells(u, [E.key(u.x, u.y)]);
  assert.ok(
    [...before].some((k) => E.distance(u, E.map[k]) > E.rules.healRange),
  );
  assert.ok(
    [...after].every((k) => E.distance(u, E.map[k]) <= E.rules.healRange),
  );
});
test("arbalète : ancien état déchargé récupérable sans action manuelle et portée rouge exacte", () => {
  const s = createSandbox(),
    u = trainingUnit(s, "crossbowman"),
    c = line();
  Object.assign(u, { x: c.x, y: c.y, crossbowLoaded: false });
  const cells = E.attackCells(u);
  assert.ok(cells.size);
  assert.ok(
    [...cells].every(
      (k) =>
        E.distance(u, E.map[k]) >= u.minRange &&
        E.distance(u, E.map[k]) <= u.range,
    ),
  );
  const target = trainingUnit(s, "raider", 1, 1, 0);
  Object.assign(target, { x: c.x + 2, y: c.y, hp: 10000, maxHp: 10000 });
  E.resolve(s, u, target);
  assert.equal(u.crossbowLoaded, true);
});
