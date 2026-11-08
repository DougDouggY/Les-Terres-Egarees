import { rules } from "../data/balance";
import type { Campaign, Unit } from "./types";
import { log } from "./campaign";
// `potions` is the legacy serialized quantity; its contents are now bandages.
export function heal(s: Campaign, u: Unit) {
  if (u.potions <= 0 || u.hp === u.maxHp) throw Error("Aucun soin possible");
  u.potions--;
  const restored = Math.min(rules.bandageHeal, u.maxHp - u.hp);
  u.hp += restored;
  log(
    s,
    `${u.name} utilise des bandages et récupère ${restored} PV.`,
    u.owner as 1 | 2,
  );
}
