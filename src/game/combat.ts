import type { Campaign, Unit } from "./types";
import { cell, distance } from "./map";
import { los } from "./vision";
import { allied } from "./queries";
import { log } from "./campaign";
import {
  discoveries,
  activeWeapon,
  unitClass,
  hasSkill,
  tuning,
  weaponTriangles,
  observeSkill,
  revealPromotionOptions,
} from "./classes";
export function offensiveReady(u: Unit) {
  const w = activeWeapon(u);
  return w.category !== "healing" && (!w.reload || u.crossbowLoaded !== false);
}
export function canAttack(a: Unit, b: Unit) {
  return (
    a.hp > 0 &&
    b.hp > 0 &&
    (a.owner === 0) !== (b.owner === 0) &&
    offensiveReady(a) &&
    distance(a, b) >= a.minRange &&
    distance(a, b) <= a.range &&
    los(a, b)
  );
}
export function triangle(a: Unit, b: Unit) {
  const x = activeWeapon(a).category,
    y = activeWeapon(b).category;
  for (const ring of weaponTriangles) {
    const i = ring.indexOf(x),
      j = ring.indexOf(y);
    if (i >= 0 && j >= 0 && i !== j)
      return (i + 1) % ring.length === j ? 1 : -1;
  }
  return 0;
}
function bannerBonus(s: Campaign | undefined, u: Unit) {
  if (!s) return { hit: 0, defense: 0 };
  const active = s.banners?.some(
    (b) =>
      distance(b, u) <= tuning.banner.radius &&
      u.owner !== 0 &&
      (b.owner === u.owner || s.merged),
  );
  return active
    ? { hit: tuning.banner.hit, defense: tuning.banner.defense }
    : { hit: 0, defense: 0 };
}
export function forecast(a: Unit, b: Unit, s?: Campaign) {
  const w = activeWeapon(a),
    c = unitClass(b),
    adv = triangle(a, b),
    supportA = bannerBonus(s, a),
    supportB = bannerBonus(s, b);
  const effective =
    w.effective === "mounted"
      ? c.mounted
      : w.effective === "flying"
        ? c.flying
        : w.effective === "armored"
          ? c.armored
          : false;
  const pierce = hasSkill(a, "pierce") ? tuning.pierce : 0,
    charge =
      hasSkill(a, "charge") &&
      (a.movedDistance ?? 0) >= tuning.charge.minimumSteps
        ? tuning.charge.damage
        : 0;
  const shield =
    b.fortified && hasSkill(b, "fortify") && distance(a, b) > 1
      ? tuning.paviseDefense
      : 0;
  const rounds = a.agility - b.agility >= 4 ? 2 : 1;
  return {
    damage: Math.max(
      1,
      a.strength +
        w.power +
        adv * tuning.triangle.damage +
        (effective ? tuning.effectiveDamage : 0) +
        charge -
        Math.max(0, b.defense - pierce) -
        (cell(b.x, b.y)?.defense ?? 0) -
        supportB.defense -
        shield,
    ),
    hit: Math.max(
      25,
      Math.min(
        98,
        a.accuracy +
          w.accuracy -
          b.agility * 2 +
          adv * tuning.triangle.hit +
          supportA.hit,
      ),
    ),
    crit: Math.max(2, Math.floor(a.agility / 2)),
    strikes: rounds * w.attacks,
    counter: canAttack(b, a),
    advantage: adv,
    effective: !!effective,
    pierce,
    charge,
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
  parried?: boolean;
  interceptedFor?: string;
  counter?: boolean;
};
export type Battle = {
  strikes: Strike[];
  xp: { id: string; amount: number; level: boolean; before: number }[];
};
function random(s: Campaign) {
  s.seed = (Math.imul(s.seed, 1664525) + 1013904223) >>> 0;
  return (s.seed / 4294967296) * 100;
}
function resultBuilder(s: Campaign) {
  const result: Battle = { strikes: [], xp: [] },
    hp = new Map(s.units.map((u) => [u.id, u.hp]));
  function strike(x: Unit, requested: Unit, counter = false) {
    if ((hp.get(x.id) ?? 0) <= 0 || (hp.get(requested.id) ?? 0) <= 0) return;
    const protector = s.units
      .filter(
        (p) =>
          p.id !== requested.id &&
          hasSkill(p, "intercept") &&
          allied(s, p, requested) &&
          (hp.get(p.id) ?? 0) > 0 &&
          distance(p, requested) === 1,
      )
      .sort((a, b) => a.id.localeCompare(b.id))[0];
    const y = protector ?? requested,
      p = forecast(x, y, s),
      hit = random(s) < p.hit,
      parried =
        hit &&
        hasSkill(y, "parry") &&
        distance(x, y) === 1 &&
        random(s) < tuning.parryChance,
      critical = hit && !parried && random(s) < p.crit,
      damage = hit && !parried ? p.damage * (critical ? 3 : 1) : 0;
    hp.set(y.id, Math.max(0, hp.get(y.id)! - damage));
    result.strikes.push({
      attacker: x.id,
      defender: y.id,
      hit,
      critical,
      damage,
      hpAfter: hp.get(y.id)!,
      blocked: parried,
      parried,
      interceptedFor: protector ? requested.id : undefined,
      counter,
    });
    if (
      p.effective &&
      (x.owner !== 0 ||
        s.players.some((player) => player.visible.includes(y.y * 60 + y.x)))
    ) {
      const weakness = `${activeWeapon(x).category}:${unitClass(y).id}`;
      const known = (discoveries(s).weaknesses ??= []);
      if (!known.includes(weakness)) known.push(weakness);
    }
    if (protector) observeSkill(s, protector, "intercept");
    if (parried) observeSkill(s, y, "parry");
    if (hasSkill(x, "dual")) observeSkill(s, x, "dual");
    if (p.charge) observeSkill(s, x, "charge");
    if (p.pierce) observeSkill(s, x, "pierce");
  }
  function bundle(x: Unit, y: Unit, counter = false) {
    for (let i = 0; i < activeWeapon(x).attacks; i++) strike(x, y, counter);
  }
  function finish() {
    for (const u of s.units)
      if (
        u.owner !== 0 &&
        !u.summonedBy &&
        result.strikes.some((t) => t.attacker === u.id)
      ) {
        const kills = new Set(
            result.strikes
              .filter((t) => t.attacker === u.id && t.hpAfter === 0)
              .map((t) => t.defender),
          ).size,
          amount = kills ? 65 + Math.max(0, kills - 1) * 40 : 25;
        result.xp.push({
          id: u.id,
          amount,
          level: u.level < unitClass(u).maxLevel && u.xp + amount >= 100,
          before: u.xp,
        });
      }
    return result;
  }
  return { result, hp, strike, bundle, finish };
}
export function resolve(s: Campaign, a: Unit, b: Unit): Battle {
  if (!canAttack(a, b)) throw Error("Attaque impossible");
  const out = resultBuilder(s),
    counter = canAttack(b, a);
  out.bundle(a, b);
  if (counter) out.bundle(b, a, true);
  if (a.agility - b.agility >= 4) out.bundle(a, b);
  else if (counter && b.agility - a.agility >= 4) out.bundle(b, a, true);
  if (activeWeapon(a).reload) a.crossbowLoaded = false;
  if (counter && activeWeapon(b).reload) b.crossbowLoaded = false;
  return out.finish();
}
export function canCastAreaAt(
  s: Campaign,
  u: Unit,
  target: { x: number; y: number },
) {
  return (
    hasSkill(u, "area") &&
    offensiveReady(u) &&
    activeWeapon(u).category === "magic" &&
    distance(u, target) >= u.minRange &&
    distance(u, target) <= u.range &&
    los(u, target) &&
    s.units.some(
      (t) =>
        t.hp > 0 &&
        (t.owner === 0) !== (u.owner === 0) &&
        distance(t, target) <= tuning.area.radius &&
        los(target, t),
    )
  );
}
export function resolveArea(
  s: Campaign,
  u: Unit,
  target: { x: number; y: number },
): Battle {
  if (!canCastAreaAt(s, u, target)) throw Error("Zone sans cible valide");
  const out = resultBuilder(s);
  for (const t of s.units.filter(
    (t) =>
      t.hp > 0 &&
      (t.owner === 0) !== (u.owner === 0) &&
      distance(t, target) <= tuning.area.radius &&
      los(target, t),
  ))
    out.strike(u, t);
  observeSkill(s, u, "area");
  return out.finish();
}
export function applyStrike(s: Campaign, strike: Strike) {
  const target = s.units.find((u) => u.id === strike.defender);
  if (target) target.hp = strike.hpAfter;
}
export function applyXp(s: Campaign, b: Battle) {
  for (const e of b.xp) {
    const u = s.units.find((u) => u.id === e.id)!;
    if (u.level >= unitClass(u).maxLevel) {
      u.xp = 0;
      revealPromotionOptions(s, u);
      continue;
    }
    u.xp += e.amount;
    while (u.xp >= 100 && u.level < unitClass(u).maxLevel) {
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
    if (u.level >= unitClass(u).maxLevel) u.xp = 0;
    revealPromotionOptions(s, u);
  }
}
