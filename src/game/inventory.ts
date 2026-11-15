import { rules } from "../data/balance";
import type { Campaign, Unit } from "./types";
import { log } from "./campaign";
import { allied } from "./queries";
import { distance } from "./active-map";
// `potions` is the legacy serialized quantity; its contents are now bandages.
export function canUseBandage(s: Campaign, u: Unit, target: Unit) {
  return (
    u.hp > 0 &&
    u.owner !== 0 &&
    u.potions > 0 &&
    target.hp > 0 &&
    target.hp < target.maxHp &&
    s.units.includes(u) &&
    s.units.includes(target) &&
    allied(s, u, target) &&
    distance(u, target) <= 1
  );
}
export function bandageTargets(s: Campaign, u: Unit) {
  return s.units.filter((t) => canUseBandage(s, u, t));
}
export function heal(s: Campaign, u: Unit, target: Unit = u) {
  if (!canUseBandage(s, u, target)) throw Error("Aucun soin possible");
  u.potions--;
  const restored = Math.min(rules.bandageHeal, target.maxHp - target.hp);
  target.hp += restored;
  log(
    s,
    `${u.name} utilise un bandage sur ${target.name} et restaure ${restored} PV.`,
    u.owner as 1 | 2,
  );
  return restored;
}
