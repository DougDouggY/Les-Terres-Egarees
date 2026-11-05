import type { Campaign, Unit } from "./types";
import { key, map } from "./map";
import { at, allied } from "./queries";
import { hasSkill } from "./classes";
import { path } from "./pathfinding";
import { visibility } from "./vision";
export function move(s: Campaign, u: Unit, x: number, y: number) {
  if (s.committedMove === u.id)
    throw Error("Le déplacement de cette activation est déjà engagé.");
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

/** Execute only the valid prefix of a knowledge-based route; never cross hidden blockers. */
export function movementPrefix(
  s: Campaign,
  u: Unit,
  planned: { steps: number[] },
) {
  const steps = [key(u.x, u.y)];
  let cost = 0,
    interrupted = false;
  for (const k of planned.steps.slice(1)) {
    const c = map[k],
      occupant = c && at(s, c.x, c.y);
    const stepCost =
      c && hasSkill(u, "forest_move") && ["forest", "tree"].includes(c.terrain)
        ? 1
        : (c?.cost ?? Infinity);
    if (
      !c?.walk ||
      (occupant && occupant.id !== u.id && !allied(s, u, occupant)) ||
      cost + stepCost > u.move
    ) {
      interrupted = true;
      break;
    }
    cost += stepCost;
    steps.push(k);
  }
  // Allied cells may be crossed but are never a legal stopping place.
  while (steps.length > 1) {
    const c = map[steps.at(-1)!],
      occupant = at(s, c.x, c.y);
    if (!occupant || occupant.id === u.id) break;
    steps.pop();
    interrupted = true;
  }
  cost = steps.slice(1).reduce((total, k) => {
    const c = map[k];
    return (
      total +
      (hasSkill(u, "forest_move") && ["forest", "tree"].includes(c.terrain)
        ? 1
        : c.cost)
    );
  }, 0);
  return { steps, cost, interrupted, destination: map[steps.at(-1)!] };
}
