import type { Campaign, Unit } from "./types";
import { path } from "./pathfinding";
import { visibility } from "./vision";
export function move(s: Campaign, u: Unit, x: number, y: number) {
  const p = path(s, u, x, y);
  if (!p || p.cost > u.move) throw Error("Déplacement impossible");
  if (u.x !== x || u.y !== y) {
    u.fortified = false;
    u.movedDistance = p.steps.length - 1;
  }
  u.x = x;
  u.y = y;
  visibility(s);
  return p;
}
