import type { Campaign } from "./types";
import { cell, key } from "./map";
export function encode(s: Campaign) {
  if (s.phase === "defeat")
    throw Error(
      "La dernière sauvegarde stable est conservée après une défaite",
    );
  if (s.scene || s.phase === "intro")
    throw Error("Sauvegarde indisponible pendant une cinématique");
  return JSON.stringify(s);
}
export function decode(raw: string): Campaign {
  const s = JSON.parse(raw);
  if (
    s.version !== 1 ||
    !Array.isArray(s.units) ||
    !Array.isArray(s.players) ||
    s.players.length !== 2 ||
    !Array.isArray(s.fronts)
  )
    throw Error("Sauvegarde incompatible");
  validate(s);
  return s;
}
export function validate(s: Campaign) {
  const occupied = new Set<number>(),
    ids = new Set<string>();
  for (const u of s.units) {
    if (ids.has(u.id)) throw Error("Identifiant dupliqué");
    ids.add(u.id);
    if (
      !Number.isInteger(u.x) ||
      !Number.isInteger(u.y) ||
      !cell(u.x, u.y)?.walk
    )
      throw Error("Unité hors grille ou sur obstacle");
    if (u.hp > 0) {
      const k = key(u.x, u.y);
      if (occupied.has(k)) throw Error("Unités superposées");
      occupied.add(k);
    }
  }
}
