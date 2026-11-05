import type { Campaign, Unit } from "./types";
import { cell, distance } from "./map";
import { los } from "./vision";
import { allied } from "./queries";
import { log } from "./campaign";
import {
  activeWeapon,
  unitClass,
  hasSkill,
  weaponTriangles,
  observeSkill,
  revealPromotionOptions,
} from "./classes";
import { rules } from "../data/balance";
import { randomPercent } from "./rng";
import { hasShield, initializeProgression, gainLevel } from "./progression";
export function effectiveAgility(u: Unit) {
  return Math.max(0, u.agility - (activeWeapon(u).agilityPenalty ?? 0));
}
export function offensiveReady(u: Unit) {
  const w = activeWeapon(u);
  return w.category !== "healing";
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
function support(s: Campaign | undefined, u: Unit) {
  if (!s) return { hit: 0, defense: 0 };
  const banner = s.banners?.some(
    (b) =>
      (b.hp ?? rules.banner.hp) > 0 &&
      distance(b, u) <= rules.banner.radius &&
      u.owner !== 0 &&
      (b.owner === u.owner || s.merged),
  );
  const aura = s.units.some(
    (p) =>
      p.id !== u.id &&
      p.hp > 0 &&
      hasSkill(p, "defense_aura") &&
      allied(s, p, u) &&
      distance(p, u) === 1,
  );
  return {
    hit: banner ? rules.banner.hit : 0,
    defense:
      (banner ? rules.banner.defense : 0) +
      (aura ? rules.auraDefense : 0) +
      (u.buff?.defense ?? 0),
  };
}
export function parryChance(a: Unit, b: Unit) {
  if (
    !hasShield(b) ||
    activeWeapon(a).category === "magic" ||
    activeWeapon(a).category === "healing"
  )
    return 0;
  initializeProgression(b);
  const ranged = ["bow", "crossbow"].includes(activeWeapon(a).category);
  if (!ranged && distance(a, b) !== 1) return 0;
  return Math.min(
    100,
    (b.parryPoints ?? 1) *
      (ranged ? rules.parry.rangedPerPoint : rules.parry.meleePerPoint),
  );
}
export function forecast(
  a: Unit,
  b: Unit,
  s?: Campaign,
  options: { counter?: boolean; charge?: boolean } = {},
) {
  const w = activeWeapon(a),
    c = unitClass(b),
    adv = triangle(a, b),
    sa = support(s, a),
    sb = support(s, b);
  const effective =
    w.effective === "mounted"
      ? c.mounted
      : w.effective === "flying"
        ? c.flying
        : w.effective === "armored"
          ? c.armored
          : false;
  const pierce = hasSkill(a, "pierce") ? Math.floor(b.defense / 3) : 0;
  const charge =
    !options.counter &&
    options.charge !== false &&
    hasSkill(a, "charge") &&
    (a.movedDistance ?? 0) >= rules.chargeSteps
      ? rules.chargeDamage
      : 0;
  const cover = s?.sandboxFlat ? 0 : (cell(b.x, b.y)?.defense ?? 0);
  const defense =
    Math.max(0, b.defense - pierce) +
    cover +
    sb.defense +
    (b.fortified && hasSkill(b, "fortify") ? rules.paviseDefense : 0);
  const damage = Math.max(
    rules.minimumDamage,
    a.strength +
      w.power +
      adv * rules.triangle.damage +
      (effective ? rules.effectiveDamage : 0) +
      charge -
      defense,
  );
  const hit = Math.max(
    rules.hitMinimum,
    Math.min(
      rules.hitMaximum,
      a.accuracy +
        w.accuracy -
        Math.floor(effectiveAgility(b) / 2) +
        adv * rules.triangle.hit +
        sa.hit,
    ),
  );
  return {
    damage,
    hit,
    crit: Math.min(
      rules.criticalMaximum,
      Math.max(rules.criticalMinimum, Math.floor(a.agility / 3)),
    ),
    strikes:
      (effectiveAgility(a) - effectiveAgility(b) >= rules.doubleThreshold
        ? 2
        : 1) * w.attacks,
    counter: canAttack(b, a),
    advantage: adv,
    effective: !!effective,
    pierce,
    charge,
    parry: parryChance(a, b),
    effectiveAgility: effectiveAgility(a),
    defense,
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
  parryCounter?: boolean;
  sequence?: number;
  group?: number;
  weaponIndex?: number;
  followUp?: boolean;
  forecast?: ReturnType<typeof forecast>;
};
export type Battle = {
  strikes: Strike[];
  xp: { id: string; amount: number; level: boolean; before: number }[];
  levelGains?: Record<string, import("./progression").StatGains>;
};
function resultBuilder(s: Campaign) {
  const result: Battle = { strikes: [], xp: [] },
    hp = new Map(s.units.map((u) => [u.id, u.hp]));
  type Plan = {
    a: Unit;
    b: Unit;
    counter: boolean;
    parryCounter: boolean;
    doubles: boolean;
    sequences: { id: number; weapon: number; critical: boolean }[];
  };
  let serial = 0,
    groupSerial = 0,
    counterSpent = false,
    counterPlan: Plan | undefined;
  const charged = new Set<string>();
  const parryReplies = new Set<string>();
  function alive(u: Unit) {
    return (hp.get(u.id) ?? 0) > 0;
  }
  function strike(
    a: Unit,
    requested: Unit,
    critical: boolean,
    counter = false,
    parryCounter = false,
    sequence = 0,
    group?: number,
    weaponIndex?: number,
    followUp = false,
  ) {
    const protector = s.units.find(
      (p) =>
        p.id !== requested.id &&
        alive(p) &&
        hasSkill(p, "intercept") &&
        allied(s, p, requested) &&
        distance(p, requested) === 1,
    );
    const b = protector ?? requested;
    if (!alive(a) || !alive(b)) return;
    const p = forecast(a, b, s, { counter, charge: !charged.has(a.id) });
    charged.add(a.id);
    const hit = randomPercent(s) < p.hit,
      parried = hit && randomPercent(s) < p.parry;
    const damage =
      hit && !parried
        ? p.damage * (critical ? rules.criticalMultiplier : 1)
        : 0;
    hp.set(b.id, Math.max(0, hp.get(b.id)! - damage));
    result.strikes.push({
      attacker: a.id,
      defender: b.id,
      hit,
      critical,
      damage,
      hpAfter: hp.get(b.id)!,
      blocked: parried,
      parried,
      counter,
      parryCounter,
      sequence,
      group,
      weaponIndex,
      followUp,
      forecast: p,
      interceptedFor: protector ? requested.id : undefined,
    });
    if (parried) observeSkill(s, b, "parry");
    if (p.pierce) observeSkill(s, a, "pierce");
    if (p.charge) observeSkill(s, a, "charge");
    if (
      parried &&
      !parryCounter &&
      distance(a, b) === 1 &&
      !parryReplies.has(b.id) &&
      alive(b) &&
      canAttack(b, a)
    ) {
      parryReplies.add(b.id);
      // Immediate parry retaliation is independent of the normal defender turn.
      execute(prepare(b, a, true, true));
    }
  }
  function prepare(
    a: Unit,
    b: Unit,
    counter = false,
    parryCounter = false,
  ): Plan {
    return {
      a,
      b,
      counter,
      parryCounter,
      doubles:
        effectiveAgility(a) - effectiveAgility(b) >= rules.doubleThreshold,
      sequences: Array.from(
        { length: activeWeapon(a).attacks },
        (_, weapon) => ({
          id: serial++,
          weapon,
          critical: randomPercent(s) < forecast(a, b, s).crit,
        }),
      ),
    };
  }
  function execute(plan: Plan, followUp = false) {
    if (followUp && !plan.doubles) return;
    const group = groupSerial++;
    for (const seq of plan.sequences) {
      if (!alive(plan.a) || !alive(plan.b)) break;
      if (followUp && seq.critical) continue;
      strike(
        plan.a,
        plan.b,
        seq.critical,
        plan.counter,
        plan.parryCounter,
        seq.id,
        group,
        seq.weapon,
        followUp,
      );
    }
  }
  function reply(a: Unit, b: Unit, parryCounter = false) {
    if (counterSpent || !alive(a) || !alive(b)) return;
    counterSpent = true;
    counterPlan = prepare(a, b, true, parryCounter);
    execute(counterPlan);
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
        ).size;
        const amount = kills ? 65 + Math.max(0, kills - 1) * 40 : 25;
        result.xp.push({
          id: u.id,
          amount,
          before: u.xp,
          level: u.level < unitClass(u).maxLevel && u.xp + amount >= 100,
        });
      }
    return result;
  }
  return {
    result,
    hp,
    strike,
    prepare,
    execute,
    reply,
    finish,
    get counterPlan() {
      return counterPlan;
    },
    get counterSpent() {
      return counterSpent;
    },
  };
}
export function resolve(s: Campaign, a: Unit, b: Unit): Battle {
  if (!canAttack(a, b)) throw Error("Attaque impossible");
  const out = resultBuilder(s),
    canCounter = canAttack(b, a);
  const opening = out.prepare(a, b);
  out.execute(opening);
  if (canCounter && !out.counterSpent) out.reply(b, a);
  out.execute(opening, true);
  if (out.counterPlan) out.execute(out.counterPlan, true);
  if (activeWeapon(a).reload) a.crossbowLoaded = true;
  if (
    out.result.strikes.some((t) => t.attacker === b.id) &&
    activeWeapon(b).reload
  )
    b.crossbowLoaded = true;
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
        distance(t, target) <= rules.areaRadius &&
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
      distance(t, target) <= rules.areaRadius &&
      los(target, t),
  ))
    out.strike(u, t, randomPercent(s) < forecast(u, t, s).crit);
  observeSkill(s, u, "area");
  return out.finish();
}
export function applyStrike(s: Campaign, strike: Strike) {
  const u = s.units.find((u) => u.id === strike.defender);
  if (u) u.hp = strike.hpAfter;
}
export function applyXp(s: Campaign, b: Battle) {
  b.levelGains ??= {};
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
      const gains = gainLevel(s, u);
      b.levelGains[u.id] = Object.fromEntries(
        Object.entries(gains).map(([key, value]) => [
          key,
          (b.levelGains![u.id]?.[key as keyof typeof gains] ?? 0) +
            (value ?? 0),
        ]),
      );
      log(s, `${u.name} atteint le niveau ${u.level}.`);
    }
    if (u.level >= unitClass(u).maxLevel) u.xp = 0;
    revealPromotionOptions(s, u);
  }
}
