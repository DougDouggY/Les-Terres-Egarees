import type { Campaign, Unit } from "./types";
import { cell, distance } from "./map";
import { los } from "./vision";
import { log } from "./campaign";
export function canAttack(a: Unit, b: Unit) {
  return (
    a.hp > 0 &&
    b.hp > 0 &&
    (a.owner === 0) !== (b.owner === 0) &&
    distance(a, b) >= a.minRange &&
    distance(a, b) <= a.range &&
    los(a, b)
  );
}
export function forecast(a: Unit, b: Unit) {
  const cover = cell(b.x, b.y)?.defense ?? 0;
  return {
    damage: Math.max(1, a.strength - b.defense - cover),
    hit: Math.max(25, Math.min(98, a.accuracy - b.agility * 2)),
    crit: Math.max(2, Math.floor(a.agility / 2)),
    strikes: a.agility - b.agility >= 4 ? 2 : 1,
    counter: canAttack(b, a),
  };
}
export type Strike = {
  attacker: string;
  defender: string;
  hit: boolean;
  critical: boolean;
  damage: number;
  hpAfter: number;
  blocked: boolean;
};
export type Battle = {
  strikes: Strike[];
  xp: { id: string; amount: number; level: boolean; before: number }[];
};
function random(s: Campaign) {
  s.seed = (Math.imul(s.seed, 1664525) + 1013904223) >>> 0;
  return (s.seed / 4294967296) * 100;
}
// Computes the complete result first. Rendering applies each validated impact exactly once.
export function resolve(s: Campaign, a: Unit, b: Unit): Battle {
  if (!canAttack(a, b)) throw Error("Attaque impossible");
  const result: Battle = { strikes: [], xp: [] },
    hp = new Map(s.units.map((u) => [u.id, u.hp]));
  const f = forecast(a, b);
  function strike(x: Unit, y: Unit) {
    if (hp.get(x.id)! <= 0 || hp.get(y.id)! <= 0) return;
    const p = forecast(x, y),
      hit = random(s) < p.hit,
      critical = hit && random(s) < p.crit,
      damage = hit ? p.damage * (critical ? 3 : 1) : 0;
    hp.set(y.id, Math.max(0, hp.get(y.id)! - damage));
    result.strikes.push({
      attacker: x.id,
      defender: y.id,
      hit,
      critical,
      damage,
      hpAfter: hp.get(y.id)!,
      blocked: hit && !critical && y.defense >= 7,
    });
  }
  strike(a, b);
  if (f.counter) strike(b, a);
  if (f.strikes === 2) strike(a, b);
  for (const u of [a, b])
    if (u.owner !== 0 && result.strikes.some((t) => t.attacker === u.id)) {
      const amount = result.strikes.some(
        (t) => t.attacker === u.id && t.hpAfter === 0,
      )
        ? 65
        : 25;
      result.xp.push({
        id: u.id,
        amount,
        level: u.xp + amount >= 100,
        before: u.xp,
      });
    }
  return result;
}
export function applyStrike(s: Campaign, strike: Strike) {
  const target = s.units.find((u) => u.id === strike.defender)!;
  target.hp = strike.hpAfter;
}
export function applyXp(s: Campaign, b: Battle) {
  for (const e of b.xp) {
    const u = s.units.find((u) => u.id === e.id)!;
    u.xp += e.amount;
    if (u.xp >= 100) {
      u.xp -= 100;
      u.level++;
      u.maxHp += 3;
      u.hp = Math.min(u.maxHp, u.hp + 3);
      u.strength++;
      u.defense++;
      log(
        s,
        `${u.name} atteint le niveau ${u.level}. PV +3 · Force +1 · Défense +1`,
      );
    }
  }
}
