import { promotionBonuses, rules } from "../data/balance";
import { initializeProgression, hasShield, baseOrigin } from "./progression";
import type { Campaign, Unit, Kind, Faction } from "./types";
import {
  classes,
  baseClasses,
  skillNames,
  tuning,
  type Gender,
  type SkillId,
} from "../data/classes";
import { weaponCatalog } from "../data/weapons";
export {
  classes,
  baseClasses,
  skillNames,
  tuning,
  weaponTriangles,
  categoryNames,
} from "../data/classes";
export { weaponCatalog } from "../data/weapons";
export type {
  Gender,
  ClassDefinition,
  WeaponCategory,
  SkillId,
} from "../data/classes";
export type HeroConfig = {
  faction: Faction;
  name: string;
  gender: Gender;
  classId: string;
  weaponId?: string;
};
const legacy: Record<Kind, string> = {
  shield: "raider",
  bow: "hunter",
  sword: "man_at_arms",
  crossbow: "crossbowman",
  skeleton: "skeleton",
};
export const unitClass = (u: Unit) =>
  classes[u.classId ?? legacy[u.kind]] ?? classes[legacy[u.kind]];
export const className = (u: Unit) =>
  u.gender === "female"
    ? (unitClass(u).femaleName ?? unitClass(u).name)
    : unitClass(u).name;
export const hasSkill = (u: Unit, id: SkillId) =>
  unitClass(u).skills.includes(id);
export const activeWeapon = (u: Unit) => {
  const c = unitClass(u),
    id = u.activeWeaponId ?? c.starter[0];
  if (
    c.weapons.includes("magic") &&
    c.skills.includes("heal") &&
    weaponCatalog[id]?.category === "healing"
  )
    return weaponCatalog[
      [...(u.carriedWeapons ?? []), ...c.starter].find(
        (w) => weaponCatalog[w]?.category === "magic",
      )!
    ];
  return weaponCatalog[id];
};
export const weaponName = (u: Unit) =>
  activeWeapon(u)?.name ?? "Arme indisponible";
export const visualState = (u: Unit) =>
  hasSkill(u, "banner")
    ? u.bannerPlanted
      ? "planted"
      : "carried"
    : u.bearForm
      ? "bear"
      : u.fortified
        ? "fortified"
        : "default";
export function syncWeapon(u: Unit) {
  const w = activeWeapon(u);
  u.minRange = w.min;
  u.range = w.max + (hasSkill(u, "long_range") && w.category === "bow" ? 1 : 0);
}
export function hydrateClass(u: Unit) {
  u.classId ??= legacy[u.kind];
  u.gender ??= u.kind === "bow" || u.kind === "sword" ? "female" : "male";
  u.carriedWeapons ??= [...unitClass(u).starter];
  u.activeWeaponId ??= u.carriedWeapons[0];
  u.crossbowLoaded ??= true;
  u.bandages ??= 0; // Stock not consumed in this prototype.
  u.bannerPlanted ??= false;
  u.bannerUsed ??= false;
  u.fortified ??= false;
  u.movedDistance ??= 0;
  syncWeapon(u);
  initializeProgression(u);
}
export function kindForClass(id: string): Kind {
  const c = classes[id];
  return id === "skeleton"
    ? "skeleton"
    : c.weapons[0] === "bow"
      ? "bow"
      : c.weapons[0] === "crossbow"
        ? "crossbow"
        : c.faction === "north"
          ? "shield"
          : "sword";
}
export function assignClass(u: Unit, id: string) {
  if (!classes[id]) throw Error("Classe inconnue");
  u.classId = id;
  u.kind = kindForClass(id);
  u.carriedWeapons = [...classes[id].starter];
  u.activeWeaponId = u.carriedWeapons[0];
  u.crossbowLoaded = true;
  u.bannerPlanted = false;
  u.bannerUsed = false;
  u.fortified = false;
  syncWeapon(u);
}
export function discoveries(s: Campaign) {
  return (s.discoveries ??= { classes: [], weapons: [], skills: [] });
}
export function discoverUnit(s: Campaign, u: Unit, own = false) {
  const d = discoveries(s),
    id = unitClass(u).id;
  if (!d.classes.includes(id)) d.classes.push(id);
  const cat = activeWeapon(u).category;
  if (!d.weapons.includes(cat)) d.weapons.push(cat);
  if (own)
    for (const skill of unitClass(u).skills)
      if (!d.skills.includes(skill)) d.skills.push(skill);
}
export function observeSkill(s: Campaign, u: Unit, id: SkillId) {
  if (
    u.owner !== 0 ||
    s.players.some((p) => p.visible.includes(u.y * 60 + u.x))
  ) {
    const d = discoveries(s);
    if (!d.skills.includes(id)) d.skills.push(id);
  }
}
export function promotionOptions(u: Unit) {
  const c = unitClass(u);
  if (u.level < c.maxLevel || c.stage === "advanced" || c.stage === "enemy")
    return [];
  return c.stage === "recruit" ? (u.recruitChoices ?? []) : c.promotions;
}
export function revealPromotionOptions(s: Campaign, u: Unit) {
  if (u.owner === 0) return;
  const d = discoveries(s);
  for (const id of promotionOptions(u))
    if (!d.classes.includes(id)) d.classes.push(id);
}
export function promote(s: Campaign, u: Unit, id: string) {
  if (u.owner === 0 || !promotionOptions(u).includes(id))
    throw Error("Promotion indisponible");
  const c = classes[id];
  if (c.faction !== unitClass(u).faction) throw Error("Promotion incompatible");
  initializeProgression(u);
  const wasRecruit = unitClass(u).stage === "recruit";
  const old = unitClass(u).id,
    weapon = u.activeWeaponId,
    parry = u.parryPoints ?? 0;
  assignClass(u, id);
  if (wasRecruit) u.originClassId = id;
  u.visualFallbackClassId = old;
  u.level = 1;
  u.xp = 0;
  u.promoted = true;
  u.parryBonusWon = false;
  const b = promotionBonuses[id] ?? [];
  if (wasRecruit) {
    const previousMaxHp = u.maxHp;
    // Keep earned growth, with a small advantage over a fresh level-one classmate.
    u.maxHp = Math.max(u.maxHp, c.stats.hp + 2);
    u.strength = Math.max(u.strength, c.stats.strength + 1);
    u.defense = Math.max(u.defense, c.stats.defense + 1);
    u.agility = Math.max(u.agility, c.stats.agility);
    u.initiative = Math.max(u.initiative, c.stats.initiative);
    u.accuracy = Math.max(u.accuracy, c.stats.accuracy);
    u.hp = Math.min(u.maxHp, u.hp + u.maxHp - previousMaxHp);
    u.move = c.stats.move;
    u.vision = c.stats.vision;
  }
  u.maxHp += b[0] ?? 0;
  u.hp = Math.min(u.maxHp, u.hp + (b[0] ?? 0));
  u.strength += b[1] ?? 0;
  u.defense += b[2] ?? 0;
  u.agility += b[3] ?? 0;
  u.initiative += b[4] ?? 0;
  u.accuracy += b[6] ?? 0;
  u.move += b[7] ?? 0;
  if (
    ["huscarl", "clan_healer"].includes(id) &&
    weapon &&
    u.carriedWeapons?.includes(weapon)
  )
    u.activeWeaponId = weapon;
  u.parryPoints = Math.min(
    ["huscarl", "guard_knight"].includes(id) ? 4 : 2,
    parry + (b[5] ?? 0),
  );
  if (hasShield(u) && !u.parryPoints) u.parryPoints = 1;
  if (c.mounted) u.move = 8;
  if (["tracker", "ranger"].includes(id)) u.vision = Math.max(u.vision, 7);
  syncWeapon(u);
  discoverUnit(s, u, true);
}
export function validateRecruit(u: Unit) {
  if (unitClass(u).stage !== "recruit") return;
  const ids = u.recruitChoices;
  if (
    !ids ||
    ids.length !== 2 ||
    new Set(ids).size !== 2 ||
    ids.some(
      (id) =>
        classes[id]?.stage !== "base" ||
        classes[id].faction !== unitClass(u).faction,
    )
  )
    throw Error(
      "Une recrue exige exactement deux classes de base dans ses données personnelles",
    );
}
export function compatibleWeapon(u: Unit, id: string) {
  const w = weaponCatalog[id],
    c = unitClass(u);
  return (
    !!w &&
    c.weapons.includes(w.category) &&
    (c.id !== "hamrammr" ||
      (u.bearForm ? id === "claws" : w.category === "healing")) &&
    (![
      "raider",
      "huscarl",
      "clan_healer",
      "honor_guard",
      "man_at_arms",
      "guard_knight",
      "royal_guard",
    ].includes(c.id) ||
      w.visual.includes("shield")) &&
    (!["berserker", "drengr", "duelist"].includes(c.id) || w.attacks === 2) &&
    !(c.stage === "recruit" && ["rare", "legendary"].includes(w.rarity)) &&
    !(
      hasSkill(u, "banner") &&
      (u.bannerPlanted ? w.category !== "sword" : id !== "banner_lance")
    )
  );
}
