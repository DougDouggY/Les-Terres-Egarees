import { test } from "node:test";
import assert from "node:assert/strict";
import * as E from "../src/engine";
import { forestMap } from "../src/data/forest-map";
import {
  PatrolStaging,
  patrolDeployment,
  legacyPatrolDeployment,
  patrolDuration,
} from "../src/game/patrol-staging";
const finish = (s: E.Campaign) => {
  const id = s.chapter1!.pending!.id;
  while (s.chapter1?.pending?.id === id) E.advanceChapterLine(s);
};
function fresh() {
  const s = E.createCampaign(["north", "knight"]);
  E.beginForestChapter(s);
  return s;
}
function choice() {
  const s = fresh();
  while (s.chapter1?.pending?.id !== "c1-choice") finish(s);
  return s;
}
function battle() {
  const s = choice();
  E.votePatrol(s, 1, "storm");
  E.votePatrol(s, 2, "storm");
  E.confirmPatrol(s);
  finish(s);
  finish(s);
  return s;
}
test("V13 découpe exacte 34×20 : relief conservé, deux rangées sur toute la largeur, T au nord, aucun ancien chemin parallèle", () => {
  const old = forestMap(60, 40).cells,
    s = fresh();
  assert.equal(E.W, 34);
  assert.equal(E.H, 20);
  assert.equal(E.map.length, 680);
  for (let x = 0; x < 34; x++)
    for (const y of [9, 10]) {
      assert.equal(E.cell(x, y)!.terrain, "road");
      assert.equal(E.cell(x, y)!.cost, 0.75);
    }
  for (let y = 0; y <= 9; y++)
    for (const x of [9, 10]) assert.equal(E.cell(x, y)!.terrain, "road");
  for (let x = 11; x <= 32; x++) assert.notEqual(E.cell(x, 6)!.terrain, "road");
  for (const c of E.map) {
    const o = old[(c.y + 15) * 60 + c.x + 10];
    if (c.terrain !== "road" && o.terrain !== "road")
      assert.equal(c.terrain, o.terrain);
  }
  assert.equal(E.cell(34, 9), undefined);
  assert.equal(E.cell(0, 20), undefined);
  assert.equal(E.key(33, 19), 679);
  E.validate(s);
  const back = E.decode(E.encode(s));
  assert.equal(E.W, 34);
  assert.equal(back.mapId, "forest-compact");
  assert.equal(back.players[0].visible.length, 680);
  E.activateMap("prologue");
  assert.equal(E.W, 60);
  assert.equal(E.H, 40);
  assert.equal(E.key(59, 39), 2399);
});
test("V13 avertissement puis approche dédiée : aucun tour consommé, arrêt à deux cases puis capitaine", () => {
  const s = fresh();
  finish(s);
  assert.equal(E.chapterLines(s, "c1-warning").length, 2);
  const cap = s.units.find((u) => u.id === "valdren-captain")!,
    initial = [cap.x, cap.y],
    queue = structuredClone(s.common);
  finish(s);
  assert.equal(s.scene, "chapter1:c1-approach");
  assert.deepEqual([cap.x, cap.y], initial);
  const staging = new PatrolStaging(s);
  assert.ok(
    staging.actors("approach", 500).some((a) => a.animation === "move"),
  );
  finish(s);
  assert.equal(s.scene, "chapter1:c1-captain");
  assert.equal(cap.x, 10);
  assert.equal(
    E.distance(
      cap,
      s.units.find((u) => u.id === "p1a")!,
    ),
    2,
  );
  assert.deepEqual(s.common, queue);
  finish(s);
  assert.equal(s.scene, "chapter1:c1-choice");
});
test("V13 accord non automatique : désaccord interdit, deux confirmations coop, changement annule et message périmé ignoré", () => {
  const s = choice();
  assert.throws(() => E.confirmPatrol(s, 1));
  E.votePatrol(s, 1, "storm");
  E.votePatrol(s, 2, "travelers");
  assert.throws(() => E.confirmPatrol(s, 1));
  E.votePatrol(s, 2, "storm");
  assert.equal(s.scene, "chapter1:c1-choice");
  const revision = s.forestChapter!.voteRevision!;
  assert.equal(E.confirmPatrol(s, 1, { choice: "storm", revision }), false);
  assert.equal(s.forestChapter!.confirmedBy!.length, 1);
  E.votePatrol(s, 2, "travelers");
  E.votePatrol(s, 2, "storm");
  assert.deepEqual(s.forestChapter!.confirmedBy, []);
  assert.equal(E.confirmPatrol(s, 2, { choice: "storm", revision }), false);
  assert.equal(s.scene, "chapter1:c1-choice");
  const back = E.decode(E.encode(s));
  assert.equal(E.confirmPatrol(back, 1), false);
  assert.equal(back.scene, "chapter1:c1-choice");
  assert.equal(E.confirmPatrol(back, 2), true);
  assert.equal(back.scene, "chapter1:c1-storm");
});
test("V13 déploiement partiel : toutes les trajectoires dans la grille, Géraud derrière le front, boss en retrait, tempo raccourci", () => {
  const s = battle();
  assert.equal(s.units.filter((u) => u.owner === 0).length, 11);
  assert.ok(patrolDuration(s, "deployment") < 5000);
  E.validate(s);
  for (const g of Object.values(s.enemyGroups!)) {
    assert.ok(
      g.zone.x >= 0 &&
        g.zone.y >= 0 &&
        g.zone.x + g.zone.w <= 34 &&
        g.zone.y + g.zone.h <= 20,
    );
  }
  const stage = new PatrolStaging(s);
  for (let t = 0; t <= 4200; t += 100)
    for (const a of stage.actors("deployment", t)) {
      assert.ok(a.x >= 0 && a.y >= 0 && a.x < 34 && a.y < 20);
      assert.ok(E.cell(Math.floor(a.x), Math.floor(a.y))?.walk);
    }
  const g = s.units.find((u) => u.id === "geraud")!,
    c = s.units.find((u) => u.id === "valdren-captain")!;
  assert.ok(g.x > s.units.find((u) => u.id === "valdren-1")!.x + 3);
  assert.ok(c.x > g.x + 5);
  assert.ok(s.units.some((u) => u.owner === 0 && u.y >= 16));
});
test("V13 boss : déplacement effectif, champ rouge seul et aucun effet de bord au survol ; déblocage durable après vraie blessure", () => {
  const s = battle(),
    c = s.units.find((u) => u.id === "valdren-captain")!,
    h = s.units.find((u) => u.id === "p1a")!;
  const before = E.encode(s),
    fields = E.enemyFields(s, 1, [c.id]);
  assert.equal(fields.moves.size, 0);
  assert.ok(fields.attacks.size > 0);
  assert.equal(E.encode(s), before);
  assert.equal(E.effectiveMove(c), 0);
  assert.equal(E.reachable(s, c).size, 1);
  assert.throws(() => E.move(s, c, c.x + 1, c.y));
  const shot = {
    attacker: h.id,
    defender: c.id,
    hpAfter: c.hp,
    damage: 0,
    hit: false,
  } as E.Strike;
  E.applyStrike(s, shot);
  assert.equal(E.effectiveMove(c), 0);
  E.applyStrike(s, { ...shot, hit: true, damage: 1, hpAfter: c.hp - 1 });
  assert.equal(E.effectiveMove(c), E.classes[c.classId!].stats.move);
  c.hp = c.maxHp;
  assert.ok(E.enemyFields(s, 1, [c.id]).moves.size > 1);
  assert.equal(
    E.decode(E.encode(s)).units.find((u) => u.id === c.id)!.enemyAI!.awakened,
    true,
  );
});
test("V13 anciennes sauvegardes : forêt 60×40 et coordonnées conservées, aucune conversion forcée de la partie en cours", () => {
  const s = fresh();
  s.mapId = "forest";
  E.activateMap("forest");
  s.forestChapter!.stagingVersion = 2;
  for (const [i, u] of s.units.filter((u) => u.owner !== 0).entries()) {
    u.x = 14 + (i % 3);
    u.y = 21 + Math.floor(i / 3);
  }
  for (const d of legacyPatrolDeployment) {
    const u = s.units.find((u) => u.id === d.id)!;
    u.x = d.spawn[0];
    u.y = d.spawn[1];
  }
  E.visibility(s);
  const raw = E.encode(s),
    back = E.decode(raw);
  assert.equal(E.W, 60);
  assert.equal(E.H, 40);
  assert.deepEqual(back.units, s.units);
  assert.deepEqual(back.common, s.common);
  new PatrolStaging(back);
});
