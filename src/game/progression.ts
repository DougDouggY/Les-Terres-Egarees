import type { Unit } from "./types";
import { classes } from "../data/classes";
import { baseBalance, rules } from "../data/balance";
import { weaponCatalog } from "../data/weapons";
import { randomPercent, hashSeed } from "./rng";
export const growingStats = [
  "maxHp",
  "strength",
  "defense",
  "agility",
  "initiative",
] as const;
export type StatGains = Partial<Record<(typeof growingStats)[number], number>>;
export function baseOrigin(id: string): string {
  if (baseBalance[id]) return id;
  return (
    Object.values(classes).find((c) => c.promotions.includes(id))?.id ?? id
  );
}
export function hasShield(u: Unit) {
  const visual =
    weaponCatalog[u.activeWeaponId ?? classes[u.classId ?? "raider"].starter[0]]
      ?.visual ?? "";
  return (
    !u.fortified &&
    u.classId !== "pavise_crossbowman" &&
    visual.includes("shield")
  );
}
export function parryMaximum(u: Unit) {
  return ["huscarl", "guard_knight"].includes(u.classId ?? "") ? 4 : 2;
}
export function initializeProgression(u: Unit) {
  u.originClassId ??= baseOrigin(u.classId ?? "raider");
  u.parryPoints ??= hasShield(u) ? 1 : 0;
  u.parryBonusWon ??= false;
  u.promoted ??= classes[u.classId ?? "raider"].stage === "advanced";
}
export function individualize(u: Unit, seed = hashSeed(u.id + u.name)) {
  const rng = { seed };
  const vector = Array.from(
    { length: 4 },
    () => Math.floor((randomPercent(rng) / 100) * 3) - 1,
  );
  let sum = vector.reduce((a, b) => a + b, 0);
  for (let attempts = 0; sum !== 0 && attempts < 100; attempts++) {
    const i = Math.floor(randomPercent(rng) / 25);
    if (sum > 0 && vector[i] > -1) {
      vector[i]--;
      sum--;
    } else if (sum < 0 && vector[i] < 1) {
      vector[i]++;
      sum++;
    }
  }
  const hp = Math.floor(randomPercent(rng) / 20) - 2;
  const values = [hp, ...vector];
  u.individualVariation = Object.fromEntries(
    growingStats.map((stat, i) => [stat, values[i]]),
  );
  for (let i = 0; i < growingStats.length; i++) {
    const stat = growingStats[i];
    u[stat] = Math.max(stat === "maxHp" ? 1 : 0, u[stat] + values[i]);
  }
  u.hp = u.maxHp;
  return values;
}
export function gainLevel(s: { seed: number }, u: Unit) {
  initializeProgression(u);
  const growth = baseBalance[u.originClassId!]?.growth ?? [60, 40, 30, 40, 35];
  const eligible = growingStats.filter(
    (stat, i) => u[stat] < rules.caps[stat] && growth[i] > 0,
  );
  const gains: StatGains = {};
  if (eligible.length) {
    let attempts = 0;
    while (!Object.keys(gains).length && attempts++ < rules.growthMaxRerolls) {
      for (let i = 0; i < growingStats.length; i++) {
        const stat = growingStats[i];
        if (eligible.includes(stat) && randomPercent(s) < growth[i])
          gains[stat] = 1;
      }
    }
    if (!Object.keys(gains).length)
      gains[eligible[Math.floor((randomPercent(s) / 100) * eligible.length)]] =
        1;
  }
  for (const stat of growingStats)
    if (gains[stat]) {
      if (u.bearBase && u.bearForm && stat !== "initiative") {
        const key = stat as "maxHp" | "strength" | "defense" | "agility";
        u.bearBase[key]++;
        if (stat === "maxHp") {
          const old = u.maxHp;
          u.maxHp = Math.ceil(u.bearBase.maxHp * rules.bear.hpMultiplier);
          u.hp = Math.min(u.maxHp, u.hp + u.maxHp - old);
        } else u[stat] = Math.max(0, u.bearBase[key] + rules.bear[stat]);
      } else {
        u[stat]++;
        if (stat === "maxHp") u.hp = Math.min(u.maxHp, u.hp + 1);
      }
    }
  u.level++;
  u.lastLevelGains = gains;
  if (
    hasShield(u) &&
    !u.parryBonusWon &&
    u.level >= 15 &&
    u.level <= 20 &&
    (u.parryPoints ?? 0) < parryMaximum(u) &&
    randomPercent(s) < rules.parry.levelChances[u.level - 15]
  ) {
    u.parryPoints = (u.parryPoints ?? 1) + 1;
    u.parryBonusWon = true;
  }
  return gains;
}
export function powerLabel(u: Unit) {
  return u.classId === "hamrammr"
    ? u.bearForm
      ? "Force"
      : "Puissance"
    : classes[u.classId ?? "raider"].weapons.some(
          (w) => w === "magic" || w === "healing",
        )
      ? "Puissance"
      : "Force";
}
