import type { Campaign, Unit } from "./types";
import { log } from "./campaign";
export function heal(s: Campaign, u: Unit) {
  if (u.potions <= 0 || u.hp === u.maxHp) throw Error("Aucun soin possible");
  u.potions--;
  u.hp = Math.min(u.maxHp, u.hp + 18);
  log(s, `${u.name} récupère 18 PV.`, u.owner as 1 | 2);
}
