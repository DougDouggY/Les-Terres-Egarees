import type { Campaign } from "./types";
export const alive = (s: Campaign) => s.units.filter((u) => u.hp > 0);
export const at = (s: Campaign, x: number, y: number) =>
  alive(s).find((u) => u.x === x && u.y === y);
