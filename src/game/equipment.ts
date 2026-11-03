import type { Campaign, Unit } from "./types";
import {
  activeWeapon,
  compatibleWeapon,
  syncWeapon,
  discoverUnit,
} from "./classes";
import { current } from "./campaign";
export function requireOwnTurn(s: Campaign, u: Unit) {
  if (
    s.phase !== "battle" ||
    s.scene ||
    u.hp <= 0 ||
    u.owner === 0 ||
    u.owner !== s.active ||
    current(s)?.id !== u.id
  )
    throw Error("Action réservée à l’activation de cette unité");
}
export function equipWeapon(s: Campaign, u: Unit, id: string) {
  requireOwnTurn(s, u);
  if (!u.carriedWeapons?.includes(id) || !compatibleWeapon(u, id))
    throw Error("Arme incompatible ou non transportée");
  u.activeWeaponId = id;
  syncWeapon(u);
  discoverUnit(s, u, true);
}
export function reloadWeapon(s: Campaign, u: Unit) {
  requireOwnTurn(s, u);
  if (!activeWeapon(u).reload || u.crossbowLoaded !== false)
    throw Error("Aucune arme à recharger");
  u.crossbowLoaded = true;
}
