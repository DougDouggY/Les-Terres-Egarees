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
  const magic = hasSkill(u, "heal") && activeWeapon(u).category === "healing",
    bandage = hasSkill(u, "bandage") && (u.bandages ?? 0) > 0;
  return (
    u.hp > 0 &&
    t.hp > 0 &&
    t.hp < t.maxHp &&
    allied(s, u, t) &&
    (magic || bandage) &&
    distance(u, t) <=
      (magic ? tuning.heal.magicRange : tuning.heal.bandageRange) &&
    los(u, t)
  );
}
export function healTarget(s: Campaign, u: Unit, t: Unit) {
  requireOwnTurn(s, u);
  if (!canHealTarget(s, u, t)) throw Error("Soins impossibles");
  const amount = Math.min(tuning.heal.power, t.maxHp - t.hp);
  t.hp += amount;
  if (hasSkill(u, "bandage") && activeWeapon(u).category !== "healing")
    u.bandages!--;
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
  (s.banners ??= []).push({ owner: u.owner as 1 | 2, x: u.x, y: u.y });
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
  summoned.summonedBy = u.id;
  summoned.summonTurns = tuning.summon.turns;
  summoned.summonedAt = s.activationSerial ?? 0;
  s.units.push(summoned);
  const f = s.merged ? s.common : s.fronts[u.front - 1];
  f.queue.push(summoned.id);
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
  s.activationSerial = (s.activationSerial ?? 0) + 1;
}
