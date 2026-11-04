import { insertInitiative } from "./initiative";
import { rules } from "../data/balance";
import type { Campaign, Unit } from "./types";
import { applyXp } from "./combat";
import { current, log } from "./campaign";
import { at, allied, alive } from "./queries";
import { cell, distance } from "./map";
import { los, visibility } from "./vision";
import { requireOwnTurn } from "./equipment";
import {
  hasSkill,
  activeWeapon,
  tuning,
  syncWeapon,
  discoverUnit,
  observeSkill,
} from "./classes";
import { makeClassUnit } from "./units";
export function canHealTarget(s: Campaign, u: Unit, t: Unit) {
  const magic =
      hasSkill(u, "heal") &&
      !u.bearForm &&
      activeWeapon(u).category === "healing",
    bandage = hasSkill(u, "bandage");
  return (
    u.hp > 0 &&
    t.hp > 0 &&
    t.hp < t.maxHp &&
    allied(s, u, t) &&
    (magic || bandage) &&
    distance(u, t) >= (magic ? 1 : 0) &&
    distance(u, t) <= (magic ? rules.healRange : 1) &&
    los(u, t)
  );
}
export function healTarget(s: Campaign, u: Unit, t: Unit) {
  requireOwnTurn(s, u);
  if (!canHealTarget(s, u, t)) throw Error("Soins impossibles");
  const amount = Math.min(
    hasSkill(u, "bandage") ? rules.bandageHeal : rules.healBase + u.strength,
    t.maxHp - t.hp,
  );
  t.hp += amount;

  observeSkill(s, u, hasSkill(u, "bandage") ? "bandage" : "heal");
  applyXp(s, {
    strikes: [],
    xp: [
      {
        id: u.id,
        amount: tuning.healingXp,
        before: u.xp,
        level: u.level < 20 && u.xp + tuning.healingXp >= 100,
      },
    ],
  });
  log(s, `${u.name} soigne ${t.name} : +${amount} PV.`);
  return amount;
}
export function plantBanner(s: Campaign, u: Unit) {
  requireOwnTurn(s, u);
  if (!hasSkill(u, "banner") || u.bannerUsed)
    throw Error("La bannière ne peut être plantée qu’une fois par bataille");
  u.bannerUsed = u.bannerPlanted = true;
  u.activeWeaponId = "sword";
  syncWeapon(u);
  (s.banners ??= []).push({
    owner: u.owner as 1 | 2,
    x: u.x,
    y: u.y,
    hp: rules.banner.hp,
    maxHp: rules.banner.hp,
  });
  observeSkill(s, u, "banner");
  discoverUnit(s, u, true);
  log(s, `${u.name} plante sa bannière et prend son épée.`);
}
export function fortify(s: Campaign, u: Unit) {
  requireOwnTurn(s, u);
  if (!hasSkill(u, "fortify") || u.fortified)
    throw Error("Fortification indisponible");
  u.fortified = true;
  observeSkill(s, u, "fortify");
}
export function summonCells(s: Campaign, u: Unit) {
  if (
    !hasSkill(u, "summon") ||
    alive(s).filter((t) => t.summonedBy === u.id).length >= tuning.summon.limit
  )
    return [];
  return [
    [0, -1],
    [1, 0],
    [0, 1],
    [-1, 0],
  ]
    .map(([dx, dy]) => cell(u.x + dx, u.y + dy))
    .filter((c) => c?.walk && !at(s, c.x, c.y)) as NonNullable<
    ReturnType<typeof cell>
  >[];
}
export function summon(s: Campaign, u: Unit, x: number, y: number) {
  requireOwnTurn(s, u);
  if (!summonCells(s, u).some((c) => c.x === x && c.y === y))
    throw Error("Invocation impossible");
  const summoned = makeClassUnit(
    `summon-${u.id}-${s.summonSerial ?? 0}`,
    u.owner,
    u.front,
    tuning.summon.template,
    "Créature temporaire",
    x,
    y,
  );
  s.summonSerial = (s.summonSerial ?? 0) + 1;
  Object.assign(summoned, {
    hp: rules.summons.hp,
    maxHp: rules.summons.hp,
    strength: rules.summons.strength,
    defense: rules.summons.defense,
    agility: rules.summons.agility,
    initiative: rules.summons.initiative,
    move: rules.summons.move,
  });
  summoned.summonedBy = u.id;
  summoned.summonTurns = tuning.summon.turns;
  summoned.summonedAt = s.activationSerial ?? 0;
  s.units.push(summoned);
  insertInitiative(s, [summoned.id]);
  observeSkill(s, u, "summon");
  discoverUnit(s, summoned, true);
  visibility(s);
  return summoned;
}
export function finishActivationSkills(s: Campaign) {
  const u = current(s);
  if (u?.summonedBy && u.hp > 0) {
    u.summonTurns = (u.summonTurns ?? 1) - 1;
    if (u.summonTurns <= 0) u.hp = 0;
  }
  if (u) {
    if (u.bearForm && --u.bearTurns! <= 0) leaveBear(u);
    else if (!u.bearForm && (u.bearCooldown ?? 0) > 0) u.bearCooldown!--;
    if (u.buff && --u.buff.turns <= 0) delete u.buff;
  }
  s.activationSerial = (s.activationSerial ?? 0) + 1;
}

export function transformBear(s: Campaign, u: Unit) {
  requireOwnTurn(s, u);
  if (u.classId !== "hamrammr") throw Error("Transformation indisponible");
  if (u.bearForm) {
    leaveBear(u);
    return;
  }
  if ((u.bearCooldown ?? 0) > 0) throw Error("Transformation en récupération");
  u.bearBase = {
    maxHp: u.maxHp,
    strength: u.strength,
    defense: u.defense,
    agility: u.agility,
    move: u.move,
    weapon: u.activeWeaponId!,
  };
  u.bearForm = true;
  u.bearTurns = rules.bear.duration;
  u.maxHp = Math.ceil(u.maxHp * rules.bear.hpMultiplier);
  u.hp = Math.min(u.maxHp, Math.ceil(u.hp * rules.bear.hpMultiplier));
  u.strength += rules.bear.strength;
  u.defense += rules.bear.defense;
  u.agility = Math.max(0, u.agility + rules.bear.agility);
  u.move += rules.bear.move;
  u.activeWeaponId = "claws";
  syncWeapon(u);
}
export function leaveBear(u: Unit) {
  if (!u.bearForm || !u.bearBase) return;
  const hp =
    u.hp > 0 ? Math.max(1, Math.ceil((u.hp / u.maxHp) * u.bearBase.maxHp)) : 0;
  Object.assign(u, { ...u.bearBase, hp, activeWeaponId: u.bearBase.weapon });
  delete (u as Unit & { weapon?: string }).weapon;
  u.bearForm = false;
  u.bearCooldown = rules.bear.cooldown;
  delete u.bearBase;
  syncWeapon(u);
}
export function improveAlly(s: Campaign, u: Unit, t: Unit) {
  requireOwnTurn(s, u);
  if (!hasSkill(u, "buff") || !allied(s, u, t) || distance(u, t) > 2)
    throw Error("Amélioration impossible");
  t.buff = { defense: rules.auraDefense, turns: 2 };
}
export function damageBanner(s: Campaign, u: Unit, index: number) {
  if (u.owner === 0) {
    if (s.phase !== "battle" || s.scene || u.hp <= 0 || current(s)?.id !== u.id)
      throw Error("Activation ennemie requise");
  } else requireOwnTurn(s, u);
  const b = s.banners?.[index];
  if (
    !b ||
    (b.hp ?? rules.banner.hp) <= 0 ||
    b.owner === u.owner ||
    (s.merged && u.owner !== 0) ||
    distance(u, b) !== 1
  )
    throw Error("Bannière hors de portée");
  b.hp = Math.max(
    0,
    (b.hp ?? rules.banner.hp) - Math.max(1, u.strength + activeWeapon(u).power),
  );
}
