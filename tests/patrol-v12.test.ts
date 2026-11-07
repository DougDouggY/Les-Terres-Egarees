import { test } from "node:test";
import assert from "node:assert/strict";
import * as E from "../src/engine";
import {
  PatrolStaging,
  patrolDeployment,
  PATROL_APPROACH_MS,
  PATROL_DEPLOY_MS,
} from "../src/game/patrol-staging";
import { alliance } from "../src/data/prologue";
const finish = (s: E.Campaign) => {
  const id = s.chapter1!.pending!.id;
  while (s.chapter1?.pending?.id === id) E.advanceChapterLine(s);
};
function state() {
  const s = E.createCampaign(["north", "knight"]);
  E.beginForestChapter(s);
  return s;
}
function battle() {
  const s = state();
  finish(s);
  finish(s);
  E.votePatrol(s, 1, "storm");
  E.votePatrol(s, 2, "storm");
  finish(s);
  finish(s);
  return s;
}
test("V12 nomenclature, Maëlys, composition 4/3/2/1 + capitaine et marche compacte sur sentier", () => {
  assert.ok(alliance.some((l) => l.text === "Maëlys. Je m’appelle Maëlys."));
  const s = state(),
    heroes = s.units.filter((u) => u.owner !== 0 && u.hp > 0),
    enemies = s.units.filter((u) => u.owner === 0);
  assert.equal(enemies.length, 11);
  for (const [id, n] of [
    ["man_at_arms", 5],
    ["spearman", 3],
    ["crossbowman", 2],
    ["squire", 1],
  ] as const)
    assert.equal(enemies.filter((u) => u.classId === id).length, n);
  assert.ok(
    enemies.every((u) => u.level === (u.id === "valdren-captain" ? 3 : 1)),
  );
  assert.equal(heroes.find((u) => u.id === "story-witch")!.name, "Maëlys");
  assert.ok(heroes.every((u) => E.cell(u.x, u.y)?.terrain === "road"));
  assert.ok(
    Math.max(...heroes.map((u) => u.x)) - Math.min(...heroes.map((u) => u.x)) <=
      2,
  );
  assert.equal(
    E.chapterLines(s, "c1-warning")[0].text,
    "Sur le chemin de la grotte de Maëlys…",
  );
  E.validate(s);
  assert.equal(E.W, 60);
  assert.equal(E.H, 40);
});
test("V12 approche continue sur cellules valides, aucune mutation par le rendu, fin à deux cases des chefs", () => {
  const s = state(),
    before = JSON.stringify(s),
    stage = new PatrolStaging(s);
  const first = stage.actors("approach", 0),
    middle = stage.actors("approach", 1700),
    end = stage.actors("approach", PATROL_APPROACH_MS);
  assert.equal(first.filter((a) => a.unit.owner === 0).length, 3);
  assert.ok(
    middle.some((a) => a.animation === "move" && a.x !== Math.floor(a.x)),
  );
  assert.ok(
    [...middle, ...end].every(
      (a) =>
        Number.isFinite(a.frame) &&
        E.cell(Math.round(a.x), Math.round(a.y))?.walk,
    ),
  );
  assert.equal(JSON.stringify(s), before);
  finish(s);
  finish(s);
  const c = s.units.find((u) => u.id === "valdren-captain")!,
    leader = s.units.find((u) => u.id === "p1a")!;
  assert.equal(E.distance(c, leader), 2);
  assert.equal(s.scene, "chapter1:c1-choice");
  assert.equal(E.decode(E.encode(s)).units.find((u) => u.id === c.id)!.x, c.x);
});
test("V12 déploiement distinct avant bataille : destinations exactes, pas de tour joué, ancien test conservé", () => {
  const s = state();
  finish(s);
  finish(s);
  E.votePatrol(s, 1, "storm");
  E.votePatrol(s, 2, "storm");
  finish(s);
  assert.equal(s.scene, "chapter1:c1-deploy");
  assert.equal(s.forestChapter!.stage, "deployment");
  const queue = structuredClone(s.common),
    stage = new PatrolStaging(s),
    end = stage.actors("deployment", PATROL_DEPLOY_MS);
  for (const d of patrolDeployment) {
    const a = end.find((a) => a.unit.id === d.id)!;
    assert.deepEqual([a.x, a.y], [d.x, d.y]);
  }
  const back = E.decode(E.encode(s));
  finish(back);
  assert.equal(back.forestChapter!.stage, "battle");
  assert.deepEqual(back.common, queue);
  E.validate(back);
  for (const d of patrolDeployment)
    assert.deepEqual(
      [
        back.units.find((u) => u.id === d.id)!.x,
        back.units.find((u) => u.id === d.id)!.y,
      ],
      [d.x, d.y],
    );
  // A V11 battle is never reconfigured on load or silently expanded to eleven units.
  const old = E.createCampaign(["north", "knight"]);
  E.beginForestChapter(old);
  delete old.forestChapter!.stagingVersion;
  old.forestChapter!.stage = "battle";
  old.units = old.units.filter(
    (u) => !["valdren-6", "valdren-7", "valdren-8", "valdren-9"].includes(u.id),
  );
  delete old.chapter1!.pending;
  old.scene = null;
  const raw = E.encode(old),
    restored = E.decode(raw);
  assert.equal(restored.units.length, old.units.length);
  assert.deepEqual(restored.common, old.common);
});
test("V12 groupes : avant-garde active, défense en zone puis permanente et indépendante", () => {
  const s = battle(),
    a = s.units.find((u) => u.id === "valdren-1")!,
    m = s.units.find((u) => u.id === "valdren-5")!,
    r = s.units.find((u) => u.id === "valdren-6")!;
  assert.ok(E.enemyMayMove(s, a));
  assert.equal(E.enemyMayMove(s, m), false);
  assert.equal(E.enemyMayMove(s, r), false);
  const hero = s.units.find((u) => u.owner === 1)!;
  hero.x = 28;
  hero.y = 29;
  E.activateDetectedGroups(s);
  assert.ok(s.enemyGroups!.middle.active);
  assert.equal(s.enemyGroups!.rear.active, false);
  hero.x = 18;
  hero.y = 24;
  assert.ok(E.enemyMayMove(s, m));
  assert.ok(
    E.enemyMayMove(
      s,
      s.units.find((u) => u.id === "valdren-4")!,
    ),
  );
  const p = E.ai(s, r);
  assert.deepEqual([p.x, p.y], [r.x, r.y]);
  assert.equal(E.decode(E.encode(s)).enemyGroups!.middle.active, true);
});
test("V12 boss : pas de poursuite, peut attaquer à portée, déblocage uniquement après perte réelle de PV, durable après soin et sauvegarde", () => {
  const s = battle(),
    boss = s.units.find((u) => u.id === "valdren-captain")!,
    hero = s.units.find((u) => u.id === "p1a")!;
  let p = E.ai(s, boss);
  assert.deepEqual([p.x, p.y], [boss.x, boss.y]);
  hero.x = boss.x - 1;
  hero.y = boss.y;
  p = E.ai(s, boss);
  assert.equal(p.target, hero.id);
  assert.deepEqual([p.x, p.y], [boss.x, boss.y]);
  const strike = {
    attacker: hero.id,
    defender: boss.id,
    hpAfter: boss.hp,
    damage: 0,
    hit: false,
  } as E.Strike;
  E.applyStrike(s, strike);
  assert.equal(boss.enemyAI!.awakened, false);
  E.applyStrike(s, { ...strike, hit: true, blocked: true });
  assert.equal(boss.enemyAI!.awakened, false);
  E.applyStrike(s, { ...strike, hit: true, damage: 1, hpAfter: boss.hp - 1 });
  assert.equal(boss.enemyAI!.awakened, true);
  boss.hp = boss.maxHp;
  hero.x = 35;
  hero.y = 22;
  assert.ok(E.enemyMayMove(s, boss));
  assert.ok(E.ai(s, boss).x !== boss.x || E.ai(s, boss).y !== boss.y);
  assert.ok(
    E.decode(E.encode(s)).units.find((u) => u.id === boss.id)!.enemyAI!
      .awakened,
  );
});
test("V12 règle future : activation sur dégâts de groupe et exception de mission enregistrée, prologue sans changement de comportement", () => {
  const s = battle(),
    u = s.units.find((u) => u.id === "valdren-5")!;
  E.notifyEnemyDamage(s, u, u.hp);
  assert.equal(s.enemyGroups!.middle.active, false);
  u.hp--;
  E.notifyEnemyDamage(s, u, u.hp + 1);
  assert.equal(s.enemyGroups!.middle.active, true);
  u.enemyAI = { mode: "mission", mission: "hold" };
  const remove = E.registerEnemyMission("hold", (_s, t) => ({
    x: t.x,
    y: t.y,
  }));
  assert.deepEqual(E.ai(s, u), { x: u.x, y: u.y });
  remove();
  const old = E.createCampaign(["north", "knight"]);
  assert.ok(old.units.filter((u) => u.owner === 0).every((u) => !u.enemyAI));
});
test("V12 coop : le déploiement est acquitté une seule fois par lecteur, aucune position finale engagée avant les deux", () => {
  const s = state();
  finish(s);
  finish(s);
  E.votePatrol(s, 1, "travelers");
  E.votePatrol(s, 2, "travelers");
  finish(s);
  const c = s.units.find((u) => u.id === "valdren-captain")!;
  const before = [c.x, c.y];
  E.advanceChapterLine(s, 1, { id: "c1-deploy", page: 0 });
  assert.deepEqual([c.x, c.y], before);
  assert.equal(s.forestChapter!.stage, "deployment");
  E.advanceChapterLine(s, 1, { id: "c1-deploy", page: 0 });
  assert.equal(s.chapter1!.pending!.readBy!.length, 1);
  const back = E.decode(E.encode(s));
  E.advanceChapterLine(back, 2, { id: "c1-deploy", page: 0 });
  assert.equal(back.forestChapter!.stage, "battle");
  assert.equal(back.units.find((u) => u.id === c.id)!.x, 40);
  E.advanceChapterLine(back, 1, { id: "c1-deploy", page: 0 });
  assert.equal(back.forestChapter!.stage, "battle");
});
