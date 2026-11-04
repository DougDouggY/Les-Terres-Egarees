import { test } from "node:test";
import assert from "node:assert/strict";
import * as E from "../src/engine";
import {
  createSandbox,
  trainingUnit,
  simulateDuels,
  copyValidatedMap,
  placeTrainingUnit,
  moveTrainingUnit,
} from "../src/game/sandbox";
import { combatPose, combatTiming } from "../src/ui/combat-timeline";
function pair(a = "man_at_arms", b = "raider") {
  const s = createSandbox(12345),
    left = trainingUnit(s, a),
    right = trainingUnit(s, b, 1, 1, 0);
  right.x = left.x + 1;
  return { s, a: left, b: right };
}
test("arène séparée : aucun acteur, événement, inventaire ou état de campagne créé", () => {
  const s = createSandbox();
  assert.equal(s.units.length, 0);
  assert.deepEqual(s.events, []);
  assert.deepEqual(s.world, []);
  const copy = copyValidatedMap();
  copy[0].cost = 123;
  assert.notEqual(E.map[0].cost, 123);
});
test("prévisions : armes, pénalités, défense et triangle partagés", () => {
  const { s, a, b } = pair();
  const p = E.forecast(a, b, s);
  assert.equal(E.effectiveAgility(b), b.agility - 2);
  assert.equal(
    p.hit,
    Math.min(100, a.accuracy + 5 - Math.floor((b.agility - 2) / 2) + 10),
  );
  assert.equal(p.damage, Math.max(1, a.strength + 5 + 1 - b.defense));
  assert.equal(p.parry, 10);
  b.activeWeaponId = "healing_focus";
  assert.equal(E.parryChance(a, b), 0);
});
test("croissances : pas de niveau vide, jamais +2, origine conservée à la promotion", () => {
  const { s, a } = pair();
  for (let n = 1; n < 20; n++) {
    const g = E.gainLevel(s, a);
    assert.ok(Object.values(g).some((v) => v === 1));
    assert.ok(Object.values(g).every((v) => v === 1));
  }
  const before = { ...a };
  E.promote(s, a, "guard_knight");
  assert.equal(a.level, 1);
  assert.equal(a.originClassId, "man_at_arms");
  assert.equal(a.maxHp, before.maxHp + 4);
  assert.equal(a.defense, before.defense + 2);
  assert.equal(a.parryPoints, (before.parryPoints ?? 1) + 1);
});
test("plafonds : sortie sûre sans boucle infinie", () => {
  const { s, a } = pair();
  Object.assign(a, E.rules.caps);
  assert.deepEqual(E.gainLevel(s, a), {});
  assert.equal(a.level, 2);
});
test("variation hors PV compensée et limitée à ±1", () => {
  const { a } = pair();
  for (let seed = 1; seed < 100; seed++) {
    const u = structuredClone(a),
      v = E.individualize(u, seed);
    assert.ok(Math.abs(v[0]) <= 2);
    assert.equal(
      v.slice(1).reduce((a, b) => a + b, 0),
      0,
    );
    assert.ok(v.slice(1).every((v) => Math.abs(v) <= 1));
  }
});
test("double arme : critique remplace chaque séquence, aucune frappe après décès", () => {
  for (let seed = 1; seed <= 150; seed++) {
    const { s, a, b } = pair("berserker", "ironbreaker");
    s.seed = seed;
    a.agility = 25;
    b.agility = 5;
    a.accuracy = b.accuracy = 100;
    a.hp = a.maxHp = b.hp = b.maxHp = 500;
    const result = E.resolve(s, a, b);
    const sequences = new Map<number, E.Strike[]>();
    for (const hit of result.strikes.filter((t) => t.attacker === a.id)) {
      const group = sequences.get(hit.sequence!) ?? [];
      group.push(hit);
      sequences.set(hit.sequence!, group);
    }
    assert.equal(sequences.size, 2);
    for (const group of sequences.values())
      assert.equal(group.length, group[0].critical ? 1 : 2);
    for (const hit of result.strikes) E.applyStrike(s, hit);
    assert.ok(a.hp >= 0 && b.hp >= 0);
  }
});
test("parade : riposte immédiate sans chaîne ni seconde riposte ordinaire", () => {
  let found = false;
  for (let seed = 1; seed < 1000 && !found; seed++) {
    const { s, a, b } = pair();
    s.seed = seed;
    a.accuracy = b.accuracy = 100;
    const r = E.resolve(s, a, b),
      i = r.strikes.findIndex((t) => t.parried && !t.counter);
    if (i >= 0) {
      found = true;
      assert.equal(r.strikes[i + 1]?.parryCounter, true);
      assert.ok(
        r.strikes
          .filter((t) => t.attacker === b.id)
          .every((t) => t.parryCounter),
      );
    }
  }
  assert.ok(found);
});
test("charge : +3 première frappe uniquement, jamais en riposte", () => {
  const { s, a, b } = pair("mounted_spearman", "swordsman");
  a.movedDistance = 3;
  a.agility = 30;
  b.agility = 5;
  a.hp = b.hp = a.maxHp = b.maxHp = 500;
  assert.equal(E.forecast(a, b, s).charge, 3);
  assert.equal(E.forecast(a, b, s, { counter: true }).charge, 0);
  const hits = E.resolve(s, a, b).strikes.filter((t) => t.attacker === a.id);
  assert.equal(hits[0].forecast?.charge, 3);
  assert.ok(hits.slice(1).every((t) => t.forecast?.charge === 0));
});
test("ours : PV proportionnels, aucun soin, griffes et retour", () => {
  const { s, a, b } = pair("hamrammr", "man_at_arms");
  const old = { ...a };
  E.transformBear(s, a);
  assert.equal(a.maxHp, Math.ceil(old.maxHp * 1.4));
  assert.equal(a.move, 7);
  assert.equal(E.activeWeapon(a).category, "sword");
  assert.equal(E.canHealTarget(s, a, b), false);
  a.hp = Math.ceil(a.maxHp / 2);
  const expected = Math.ceil((a.hp / a.maxHp) * old.maxHp);
  E.leaveBear(a);
  assert.equal(a.hp, expected);
  assert.equal(a.strength, old.strength);
  assert.equal(a.bearCooldown, 3);
});
test("pavois +5 sans parade, bannière destructible et soins infinis du clan", () => {
  const { s, a, b } = pair("pavise_crossbowman", "man_at_arms");
  const before = E.forecast(b, a, s).damage;
  E.fortify(s, a);
  assert.equal(E.forecast(b, a, s).damage, Math.max(1, before - 5));
  assert.equal(E.parryChance(b, a), 0);
  const c = pair("standard_bearer", "man_at_arms");
  E.plantBanner(c.s, c.a);
  assert.equal(c.s.banners?.[0].hp, 10);
  assert.equal(c.a.activeWeaponId, "sword");
  assert.throws(() => E.plantBanner(c.s, c.a));
  const h = pair("clan_healer", "man_at_arms");
  h.b.owner = 1;
  h.b.hp = 1;
  assert.equal(E.healTarget(h.s, h.a, h.b), 15);
  h.b.hp = 1;
  assert.equal(E.healTarget(h.s, h.a, h.b), 15);
});
test("déplacements : alliés traversables, arrivée occupée refusée et décor intact", () => {
  const { s, a, b } = pair();
  b.owner = 1;
  a.move = 8;
  assert.equal(E.path(s, a, b.x, b.y), null);
  assert.ok(E.path(s, a, a.x + 2, a.y));
  b.owner = 0;
  const p = E.path(s, a, a.x + 2, a.y);
  assert.ok(!p || p.cost > 2);
  assert.throws(() => placeTrainingUnit(s, a, b.x, b.y));
});
test("timeline : une seule frappe, récupération puis déplacement de recul", () => {
  for (const frames of [1, 2, 8]) {
    const timing = combatTiming(frames, 10);
    const at = (t: number) => combatPose(t, frames, 10);
    assert.equal(at(100).animation, "move");
    assert.equal(at(timing.approach + 10).animation, "attack");
    assert.equal(at(timing.approach + timing.attack + 10).animation, "idle");
    assert.equal(
      at(timing.approach + timing.attack + timing.recovery + 10).animation,
      "move",
    );
    assert.equal(at(timing.total).animation, "idle");
    assert.ok(at(timing.approach + timing.attack - 1).index < frames);
  }
});
test("simulations 100/1000/10000 reproductibles avec la résolution réelle", () => {
  for (const count of [100, 1000, 10000] as const) {
    const o = { left: "berserker", right: "ironbreaker", count, seed: 42 };
    const a = simulateDuels(o);
    assert.equal(a.leftWins + a.rightWins + a.draws, count);
    assert.ok(a.strikes >= count);
    if (count === 100) assert.deepEqual(a, simulateDuels(o));
  }
});
test("recrutements verrouillés par faction, pas par numéro du joueur", () => {
  const s = createSandbox();
  s.factions = ["knight", "north"];
  assert.equal(E.ownerForFaction(s, "north"), 2);
  E.claimRecruit(s, { id: "test", eligibility: "either" }, 2);
  assert.throws(() =>
    E.claimRecruit(s, { id: "test", eligibility: "either" }, 1),
  );
  assert.throws(() =>
    E.claimRecruit(s, { id: "knight", eligibility: "knight" }, 2),
  );
  assert.throws(() => E.validateCompanions("north", ["astrid"]));
  E.validateCompanions("north", ["astrid", "solveig"]);
});

test("ordre réel : une arme alterne avec la riposte ; deux armes restent ensemble avant le bonus d’agilité", () => {
  for (const classId of ["man_at_arms", "berserker"]) {
    let verified = false;
    for (let seed = 1; seed < 100 && !verified; seed++) {
      const { s, a, b } = pair(classId, "man_at_arms");
      s.seed = seed;
      a.agility = 20;
      b.agility = 5;
      a.parryPoints = b.parryPoints = 0;
      a.hp = a.maxHp = b.hp = b.maxHp = 1000;
      const result = E.resolve(s, a, b);
      if (result.strikes.some((t) => t.critical)) continue;
      verified = true;
      assert.deepEqual(
        result.strikes.map((t) => t.attacker),
        classId === "berserker"
          ? [a.id, a.id, b.id, a.id, a.id]
          : [a.id, b.id, a.id],
      );
      const attack = result.strikes.filter((t) => t.attacker === a.id);
      if (classId === "berserker") {
        assert.equal(attack[0].group, attack[1].group);
        assert.equal(attack[2].group, attack[3].group);
        assert.notEqual(attack[0].group, attack[2].group);
        assert.deepEqual(
          attack.map((t) => t.weaponIndex),
          [0, 1, 0, 1],
        );
      }
      assert.equal(attack.at(-1)?.followUp, true);
    }
    assert.ok(verified);
  }
});

test("atelier : les recrues ont deux choix de fixture et respectent leur plafond de niveau", () => {
  const s = createSandbox();
  const u = trainingUnit(s, "young_viking", 20, 1);
  assert.equal(u.recruitChoices?.length, 2);
  assert.equal(u.level, E.classes.young_viking.maxLevel);
});
