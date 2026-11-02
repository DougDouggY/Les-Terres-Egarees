import type { Campaign, Unit } from "./types";
import { path } from "./pathfinding";
import { visibility } from "./vision";
export function move(s: Campaign, u: Unit, x: number, y: number) {
  const p = path(s, u, x, y);
  if (!p || p.cost > u.move) throw Error("Déplacement impossible");
  u.x = x;
  u.y = y;
  visibility(s);
  return p;
}
