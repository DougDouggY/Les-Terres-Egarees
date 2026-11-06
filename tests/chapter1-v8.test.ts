import { test } from "node:test";
import assert from "node:assert/strict";
import * as E from "../src/engine";
import { chapterEnemy } from "../src/game/chapter1-enemies";
function sceneState() {
  const s = E.createCampaign(["north", "knight"]);
  s.chapter1 = {
    started: true,
    completed: ["arrival-1", "arrival-2", "ruins-1", "ruins-2", "meeting"],
  };
  s.merged = true;
  return s;
}
function activate(s: E.Campaign, u: E.Unit) {
  s.active = u.owner as 1 | 2;
  s.common = {
    round: 1,
    index: 0,
    queue: [u.id, ...s.units.filter((t) => t.id !== u.id).map((t) => t.id)],
  };
}
test("V8 routes : coût .75, cases au-delà de l'ancien rayon et budget réel identique", () => {
  const s = E.createCampaign(["north", "knight"]),
    u = s.units.find((u) => u.owner === 1)!;
  s.units = [u];
  u.move = 3;
  s.players[0].visible = E.map.map((_, i) => i);
  s.players[0].explored = s.players[0].visible;
  let target: E.Cell | undefined,
    cost = 0;
  for (const from of E.map.filter((c) => c.terrain === "road")) {
    Object.assign(u, { x: from.x, y: from.y });
    const field = E.reachable(s, u, true);
    const found = [...field].find(
      ([k, p]) => E.distance(u, E.map[k]) > u.move && p.cost <= 3,
    );
    if (found) {
      target = E.map[found[0]];
      cost = found[1].cost;
      break;
    }
  }
  assert.ok(target);
  assert.equal(cost, 3);
  const plan = E.path(s, u, target.x, target.y, false, true)!;
  assert.equal(E.movementPrefix(s, u, plan).cost, cost);
  E.move(s, u, target.x, target.y);
  assert.equal(u.x, target.x);
  assert.ok(
    E.map.filter((c) => c.terrain === "road").every((c) => c.cost === 0.75),
  );
  assert.ok(
    E.map.filter((c) => c.terrain === "grass").every((c) => c.cost === 1),
  );
});
test("V8 ennemis : huit au départ, quatre armes et un archer sur chaque front, seize avec renforts", () => {
  const s = E.createCampaign(["knight", "north"]),
    enemies = s.units.filter((u) => u.owner === 0);
  assert.equal(enemies.length, 8);
  for (const owner of [1, 2])
    assert.deepEqual(
      new Set(
        enemies
          .filter((u) => u.front === owner)
          .map((u) => E.activeWeapon(u).category),
      ),
      new Set(["sword", "axe", "lance", "bow"]),
    );
  assert.ok(
    enemies.every((u) => u.maxHp === 18 && u.strength <= 5 && u.defense <= 1),
  );
  for (const u of s.units.filter((u) => u.owner !== 0))
    Object.assign(u, { x: 30 + (u.owner === 1 ? 0 : 3), y: 21 });
  const heroes = s.units.filter((u) => u.owner !== 0);
  const threat = new Set<number>();
  for (const u of heroes)
    for (const k of E.attackCells(u, E.reachable(s, u).keys())) threat.add(k);
  E.merge(s);
  const guards = s.units.filter((u) => u.id.startsWith("sanctuary-"));
  assert.equal(guards.length, 2);
  assert.ok(
    guards.every(
      (g) => !threat.has(E.key(g.x, g.y)) && g.strength <= 5 && g.maxHp === 18,
    ),
  );
  for (const g of guards) {
    const target = heroes[0];
    Object.assign(g, { x: target.x + 1, y: target.y });
    assert.equal(E.ai(s, g).target, undefined);
  }
  s.common.round = 3;
  E.advance(s);
  assert.equal(s.units.filter((u) => u.owner === 0).length, 16);
  assert.equal(
    new Set(s.units.filter((u) => u.hp > 0).map((u) => u.id)).size,
    s.units.filter((u) => u.hp > 0).length,
  );
});
test("V8 alerte : convergence vers les ruines sauf si une cible est déjà engagée", () => {
  const s = sceneState(),
    u = chapterEnemy("rally", 1, "sword", 42, 20);
  s.units = [u, ...s.units.filter((u) => u.owner !== 0)];
  s.chapter1!.alerted = true;
  const before = E.distance(u, E.village.entry),
    plan = E.ai(s, u);
  assert.ok(E.distance(plan, E.village.entry) < before);
  assert.equal(plan.target, undefined);
  const target = s.units.find((t) => t.owner === 1)!;
  Object.assign(target, { x: 50, y: 20 });
  u.aiTargetId = target.id;
  const hunt = E.ai(s, u);
  assert.ok(E.distance(hunt, target) < E.distance(u, target));
  assert.equal(u.aiTargetId, target.id);
});
test("V8 coopération : lecture lente, doublons et messages retardés ne sautent aucune réplique", () => {
  const s = sceneState();
  s.chapter1!.completed = s.chapter1!.completed.filter(
    (id) => id !== "meeting",
  );
  E.queueChapterScene(s, "meeting", 1);
  const expected = { id: "meeting" as const, page: 0 };
  const queue = structuredClone(s.common),
    units = structuredClone(s.units);
  E.advanceChapterLine(s, 1, expected);
  E.advanceChapterLine(s, 1, expected);
  assert.equal(s.chapter1!.pending!.page, 0);
  assert.deepEqual(s.chapter1!.pending!.readBy, [1]);
  const back = E.decode(E.encode(s));
  E.advanceChapterLine(back, 2, expected);
  assert.equal(back.chapter1!.pending!.page, 1);
  E.advanceChapterLine(back, 1, expected);
  assert.equal(back.chapter1!.pending!.page, 1);
  assert.deepEqual(back.units, units);
  assert.deepEqual(back.common, queue);
  const privateScene = sceneState();
  E.queueChapterScene(privateScene, "ruins-1", 1);
  // It was already marked seen in this fixture: explicitly queue an unseen private arrival.
  privateScene.chapter1!.completed = [];
  E.queueChapterScene(privateScene, "arrival-1", 1);
  E.advanceChapterLine(privateScene, 2);
  assert.equal(privateScene.chapter1!.pending!.page, 0);
  E.advanceChapterLine(privateScene, 1);
  assert.equal(privateScene.chapter1!.pending!.page, 1);
});
test("V8 seuil : deux chefs vivants, activation propre, entrée sûre, confirmations sauvegardées", () => {
  const s = sceneState(),
    a = s.units.find((u) => u.id === "p1a")!,
    b = s.units.find((u) => u.id === "p2a")!;
  for (const u of s.units) if (u.owner === 0) u.hp = 0;
  Object.assign(a, { x: 31, y: 19 });
  Object.assign(b, { x: 31, y: 18 });
  activate(s, a);
  assert.equal(E.canPrepareEntry(s, b), false);
  E.prepareEntry(s, a);
  assert.deepEqual(E.preparedExpeditions(s), [1]);
  E.checkEnd(s);
  assert.equal(s.scene, null);
  const back = E.decode(E.encode(s));
  assert.deepEqual(E.preparedExpeditions(back), [1]);
  const bb = back.units.find((u) => u.id === b.id)!;
  activate(back, bb);
  E.prepareEntry(back, bb);
  assert.equal(back.scene, "chapter1:alliance");
  assert.equal(back.phase, "battle");
  while (back.chapter1?.pending) E.advanceChapterLine(back);
  assert.equal(back.phase, "summary");
  assert.equal(back.chapter1?.complete, true);
  const stalled = E.decode(E.encode(s));
  stalled.units.find((u) => u.id === a.id)!.hp = 0;
  assert.deepEqual(E.preparedExpeditions(stalled), []);
});
test("V8 chefs : héros créé par défaut, succession choisie, +1 initiative sans altérer les stats ni le tour", () => {
  const s = E.createCampaign(["north", "knight"]),
    chief = s.units.find((u) => u.id === "p1a")!,
    ally = s.units.find((u) => u.id === "p1b")!;
  assert.ok(chief.leader);
  assert.ok(s.units.find((u) => u.id === "p2a")!.leader);
  assert.equal(E.effectiveInitiative(chief), chief.initiative + 1);
  chief.hp = 0;
  assert.deepEqual(E.leadershipVacancies(s), [1]);
  const queue = structuredClone(s.common),
    value = ally.initiative;
  assert.throws(() => E.appointLeader(s, 1, "p2a"));
  E.appointLeader(s, 1, ally.id);
  assert.equal(ally.leader, true);
  assert.equal(chief.leader, false);
  assert.equal(ally.initiative, value);
  assert.equal(E.effectiveInitiative(ally), value + 1);
  assert.deepEqual(s.common, queue);
  assert.equal(
    E.decode(E.encode(s)).units.find((u) => u.id === ally.id)!.leader,
    true,
  );
});
test("V8 alliés : aucune attaque, zone ou événement de dégâts entre les deux équipes", () => {
  const s = sceneState(),
    a = s.units.find((u) => u.id === "p1a")!,
    b = s.units.find((u) => u.id === "p2a")!;
  Object.assign(a, { x: 31, y: 20 });
  Object.assign(b, { x: 32, y: 20 });
  assert.equal(E.canAttack(a, b), false);
  assert.throws(() => E.resolve(s, a, b));
  const hp = b.hp;
  E.applyStrike(s, { attacker: a.id, defender: b.id, hpAfter: 0 } as E.Strike);
  assert.equal(b.hp, hp);
  const mage = E.makeClassUnit("mage", 1, 1, "archmage", "Mage", 30, 20);
  s.units.push(mage);
  const enemy = chapterEnemy("area-foe", 1, "sword", 31, 20);
  a.x = 29;
  s.units.push(enemy);
  const area = E.resolveArea(s, mage, { x: 31, y: 20 });
  assert.ok(area.strikes.length);
  assert.ok(
    area.strikes.every(
      (hit) => s.units.find((u) => u.id === hit.defender)?.owner === 0,
    ),
  );
});
test("V8 présentation : résultat réservé à l'équipe active, mode coop sans changement de perspective", () => {
  const s = sceneState(),
    a = s.units.find((u) => u.owner === 1)!,
    b = s.units.find((u) => u.owner === 2)!;
  s.active = 1;
  assert.equal(E.rewardVisible(s, a, 1, { mode: "coop", owner: 1 }), true);
  assert.equal(E.rewardVisible(s, a, 1, { mode: "coop", owner: 2 }), false);
  assert.equal(E.rewardVisible(s, b, 1, { mode: "local" }), false);
  assert.equal(E.canSwitchExpedition({ mode: "coop", owner: 1 }), false);
  assert.equal(E.controlsOwner(2, { mode: "coop", owner: 1 }), false);
});
test("V8 anciennes sauvegardes : ennemis affaiblis sans ajout ni déplacement ni changement d'initiative", () => {
  const s = sceneState();
  delete s.chapter1RulesVersion;
  const enemy = s.units.find((u) => u.owner === 0)!;
  Object.assign(enemy, { maxHp: 30, hp: 15, strength: 11, defense: 5 });
  const n = s.units.length,
    q = structuredClone(s.common),
    x = enemy.x,
    y = enemy.y;
  const back = E.decode(E.encode(s)),
    foe = back.units.find((u) => u.id === enemy.id)!;
  assert.equal(back.units.length, n);
  assert.equal(foe.hp, 9);
  assert.equal(foe.strength, 5);
  assert.deepEqual({ x: foe.x, y: foe.y }, { x, y });
  assert.deepEqual(back.common, q);
});
test("V8 création : un compagnon par classe de base, parité et majorité féminine viking", () => {
  for (const f of ["north", "knight"] as const) {
    const offered = E.companionRoster.filter((c) => c.faction === f),
      expected = E.baseClasses(f).filter(
        (c) => f !== "knight" || c.id !== "sorcerer",
      );
    assert.equal(offered.length, expected.length);
    assert.deepEqual(
      new Set(offered.map((c) => c.classId)),
      new Set(expected.map((c) => c.id)),
    );
    assert.equal(new Set(offered.map((c) => c.classId)).size, offered.length);
    for (const c of offered)
      assert.ok(
        E.makeClassUnit("preview", 1, 1, c.classId, c.name, 0, 0, c.gender),
      );
  }
  const north = E.companionRoster.filter((c) => c.faction === "north"),
    knight = E.companionRoster.filter((c) => c.faction === "knight");
  assert.equal(north.filter((c) => c.gender === "female").length, 3);
  assert.equal(north.filter((c) => c.gender === "male").length, 2);
  assert.equal(knight.filter((c) => c.gender === "female").length, 1);
  assert.equal(knight.filter((c) => c.gender === "male").length, 3);
  let selected: string[] = [];
  for (const c of north)
    selected = E.toggleCompanion("north", selected, c.id, true);
  assert.deepEqual(
    selected,
    north.slice(-2).map((c) => c.id),
  );
});
