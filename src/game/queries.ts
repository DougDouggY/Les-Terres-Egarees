import type { Campaign, Unit } from "./types";
export const alive = (s: Campaign) => s.units.filter((u) => u.hp > 0);
export const at = (s: Campaign, x: number, y: number) =>
  alive(s).find((u) => u.x === x && u.y === y);

/** Passage is shared by one army, and by the two expeditions after their alliance. */
export const allied = (s: Campaign, a: Unit, b: Unit) =>
  a.owner === b.owner || (s.merged && a.owner !== 0 && b.owner !== 0);
