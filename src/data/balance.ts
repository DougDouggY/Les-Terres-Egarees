export const baseBalance: Record<
  string,
  {
    stats: [number, number, number, number, number, number, number, number];
    growth: [number, number, number, number, number];
  }
> = {
  squire: { stats: [15, 3, 2, 5, 80, 4, 6, 4], growth: [60, 40, 30, 40, 35] },
  north_warrior: {
    stats: [23, 7, 5, 7, 85, 5, 5, 6],
    growth: [80, 60, 30, 25, 25],
  },
  raider: { stats: [21, 6, 6, 8, 85, 5, 5, 7], growth: [75, 40, 50, 30, 30] },
  nordic_blade: {
    stats: [18, 5, 3, 11, 90, 6, 5, 10],
    growth: [65, 35, 20, 65, 55],
  },
  hunter: { stats: [18, 5, 3, 9, 90, 6, 7, 9], growth: [60, 45, 20, 50, 50] },
  shaman: { stats: [17, 5, 2, 8, 90, 5, 5, 7], growth: [55, 65, 15, 35, 40] },
  man_at_arms: {
    stats: [22, 6, 7, 7, 85, 5, 5, 6],
    growth: [80, 35, 55, 25, 25],
  },
  spearman: { stats: [21, 6, 5, 8, 85, 5, 5, 7], growth: [70, 50, 35, 40, 35] },
  crossbowman: {
    stats: [19, 5, 4, 7, 85, 5, 6, 6],
    growth: [60, 50, 25, 30, 35],
  },
  swordsman: {
    stats: [18, 5, 3, 11, 90, 6, 5, 10],
    growth: [65, 35, 20, 65, 55],
  },
  sorcerer: { stats: [17, 6, 2, 8, 90, 5, 5, 7], growth: [55, 70, 15, 35, 40] },
};
// [PV, Force/Puissance, Défense, Agilité, Initiative, Parade, Précision, Déplacement]
export const promotionBonuses: Record<string, number[]> = {
  berserker: [3, 2, 0, 1, 0],
  ironbreaker: [4, 2, 1, 0, 0],
  huscarl: [4, 0, 2, 0, 0, 1],
  clan_healer: [3, 0, 1, 0, 0],
  drengr: [2, 1, 0, 2, 2],
  honor_guard: [3, 0, 2, 0, 0, 1],
  master_hunter: [2, 0, 0, 0, 1, 0, 5],
  tracker: [3, 0, 0, 1, 1, 0, 0, 1],
  volva: [3, 2, 0, 0, 0],
  hamrammr: [4, 0, 0, 0, 0],
  guard_knight: [4, 0, 2, 0, 0, 1],
  cavalry: [3, 0, 1, 0, 2],
  royal_guard: [4, 0, 2, 0, 0, 1],
  mounted_spearman: [3, 1, 0, 0, 2],
  standard_bearer: [3, 0, 1, 0, 0],
  ranger: [3, 0, 0, 1, 1, 0, 0, 1],
  pavise_crossbowman: [4, 0, 2, 0, 0],
  duelist: [2, 1, 0, 2, 2],
  executioner: [4, 3, 0, 0, 0],
  necromancer: [3, 2, 0, 0, 0],
  archmage: [3, 3, 0, 0, 0],
};
export const rules = {
  minimumDamage: 1,
  doubleThreshold: 4,
  hitMinimum: 0,
  hitMaximum: 100,
  criticalMinimum: 2,
  criticalMaximum: 15,
  criticalMultiplier: 3,
  caps: {
    maxHp: 9999,
    strength: 255,
    defense: 255,
    agility: 255,
    initiative: 255,
  },
  growthMaxRerolls: 10000,
  parry: {
    meleePerPoint: 10,
    rangedPerPoint: 15,
    levelChances: [5, 10, 15, 20, 25, 30],
    ordinaryMaximum: 2,
    specialMaximum: 4,
  },
  auraDefense: 2,
  healBase: 5,
  bandageHeal: 15,
  healRange: 2,
  chargeSteps: 3,
  chargeDamage: 3,
  paviseDefense: 5,
  bear: {
    hpMultiplier: 1.4,
    strength: 5,
    defense: 2,
    agility: -2,
    move: 2,
    duration: 3,
    cooldown: 3,
  },
  summons: {
    hp: 10,
    strength: 3,
    defense: 1,
    agility: 4,
    initiative: 4,
    move: 4,
    limit: 2,
    duration: 3,
  },
  // Values without a final specification remain explicit test parameters.
  triangle: { damage: 1, hit: 10 },
  effectiveDamage: 3,
  banner: { hp: 10, radius: 5, hit: 5, defense: 1 },
  areaRadius: 1,
};
export const weaponBalance: Record<string, [number, number, number]> = {
  sword: [5, 5, 0],
  axe: [7, -10, 2],
  lance: [6, 0, 1],
  bow: [5, 5, 0],
  crossbow: [8, -5, 2],
  magic: [6, 0, 0],
  healing: [0, 0, 0],
};
