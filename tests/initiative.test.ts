import { test } from "node:test";
import assert from "node:assert/strict";
import { createSandbox, trainingUnit } from "../src/game/sandbox";
import {
  globalInitiative,
  initiativeOrder,
  stepInitiative,
  insertInitiative,
} from "../src/game/initiative";
import { advance, merge, current, checkEnd } from "../src/game/campaign";
import { encode, decode } from "../src/game/save";
import { map } from "../src/game/map";
import { move } from "../src/game/movement";
function fixture() {
  const s = createSandbox();
  s.merged = false;
  const a = trainingUnit(s, "raider", 1, 1, 1),
    b = trainingUnit(s, "man_at_arms", 1, 1, 2),
    e = trainingUnit(s, "skeleton", 1, 1, 0);
  a.initiative = 8;
  b.initiative = 12;
  e.initiative = 10;
  s.common.queue = initiativeOrder(s.units);
  s.events = ["horde", "storm"];
  return { s, a, b, e };
}
test("ordre global : les deux propriétaires et les ennemis jouent exactement une fois par cycle", () => {
  const { s, b, e, a } = fixture();
  const got = [];
  for (let i = 0; i < 3; i++) {
    got.push(current(s)!.id);
    advance(s);
  }
  assert.deepEqual(got, [b.id, e.id, a.id]);
  assert.equal(s.common.round, 2);
  assert.equal(s.active, 1);
  assert.equal(s.previousInitiative!.round, 1);
});
test("égalité déterministe, arrivées après acteur courant, aucun retour de tours joués", () => {
  const { s, a, b, e } = fixture();
  a.initiative = b.initiative = e.initiative = 5;
  assert.deepEqual(initiativeOrder([e, b, a]), initiativeOrder([a, b, e]));
  s.common.queue = [a.id, b.id, e.id];
  s.common.index = 1;
  const u = trainingUnit(s, "skeleton", 1, 1, 0);
  u.initiative = 99;
  s.common.queue.pop();
  insertInitiative(s, [u.id]);
  assert.deepEqual(s.common.queue, [a.id, b.id, u.id, e.id]);
  assert.equal(s.common.index, 1);
});
test("rencontre : cycle, acteur actif et préfixe joué restent intacts", () => {
  const { s } = fixture();
  stepInitiative(s);
  const before = structuredClone(s.common);
  merge(s);
  assert.equal(s.common.round, before.round);
  assert.equal(s.common.index, before.index);
  assert.deepEqual(
    s.common.queue.slice(0, before.index + 1),
    before.queue.slice(0, before.index + 1),
  );
  assert.equal(s.units.filter((u) => u.id.startsWith("sanctuary-")).length, 2);
});
test("ancienne sauvegarde : acteur conservé, tours dépensés conservés, migration unique", () => {
  const { s, a, b, e } = fixture();
  delete s.initiativeVersion;
  s.sandbox = false;
  s.fronts = [
    { round: 2, index: 1, queue: [a.id, e.id] },
    { round: 2, index: 0, queue: [b.id] },
  ];
  s.active = 1;
  globalInitiative(s);
  assert.equal(current(s)!.id, e.id);
  assert.equal(s.common.queue[0], a.id);
  const stable = JSON.stringify(s.common);
  globalInitiative(s);
  assert.equal(JSON.stringify(s.common), stable);
});
test("sauvegarde globale et déplacement engagé survivent à la reprise", () => {
  const { s, a } = fixture();
  const cells = map.filter((c) => c.walk);
  s.units.forEach((u, i) => Object.assign(u, { x: cells[i].x, y: cells[i].y }));
  s.committedMove = a.id;
  const back = decode(encode(s));
  assert.deepEqual(back.common, s.common);
  assert.equal(back.committedMove, a.id);
  const moved = back.units.find((u) => u.id === a.id)!;
  assert.throws(() => move(back, moved, moved.x, moved.y), /déjà engagé/);
});
test("un héros tombé ne suffit pas ; une expédition entière tombée arrête toute la partie", () => {
  const { s, a, b } = fixture();
  s.sandbox = false;
  a.leader = true;
  b.leader = true;
  const ally = trainingUnit(s, "hunter", 1, 1, 1);
  a.hp = 0;
  checkEnd(s);
  assert.equal(s.phase, "battle");
  ally.hp = 0;
  checkEnd(s);
  assert.equal(s.phase, "defeat");
});

test("un renfort arrivé à la frontière du cycle est trié avant les activations non commencées", () => {
  const { s, b, e, a } = fixture();
  s.common.index = 1;
  const u = trainingUnit(s, "skeleton", 1, 1, 0);
  u.initiative = 99;
  s.common.queue.pop();
  insertInitiative(s, [u.id], false);
  assert.deepEqual(s.common.queue, [b.id, u.id, e.id, a.id]);
  assert.equal(current(s)!.id, u.id);
});
