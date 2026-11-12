import { gridPath } from "./grid-path";
import { effectiveMove } from "./enemy-activation";
import { hasSkill } from "./classes";
import { offensiveReady } from "./combat";
import type { Campaign, Unit } from "./types";
import { cell, map, key, W, H, distance } from "./active-map";
import { at, allied } from "./queries";
import { los } from "./vision";
export function path(
  s: Campaign,
  u: Unit,
  x: number,
  y: number,
  ignoreUnits = false,
  knowledge = false,
): { cost: number; steps: number[] } | null {
  const known =
    knowledge && u.owner !== 0
      ? new Set([
          ...s.players[u.owner - 1].explored,
          ...s.players[u.owner - 1].visible,
          key(u.x, u.y),
        ])
      : undefined;
  const visible =
    knowledge && u.owner !== 0
      ? new Set(s.players[u.owner - 1].visible)
      : undefined;
  const knownOccupant = (x: number, y: number) => {
    const t = at(s, x, y);
    return t && (!visible || allied(s, u, t) || visible.has(key(x, y)))
      ? t
      : undefined;
  };
  const target = cell(x, y);
  if (
    !target ||
    (known?.has(key(x, y)) !== false && !target.walk) ||
    (!ignoreUnits && knownOccupant(x, y) && knownOccupant(x, y)?.id !== u.id)
  )
    return null;
  return gridPath(W, H, key(u.x, u.y), key(x, y), (nk) => {
    const n = map[nk],
      occupant = knownOccupant(n.x, n.y);
    if (
      (known?.has(nk) !== false && !n.walk) ||
      (!ignoreUnits &&
        occupant &&
        occupant.id !== u.id &&
        !allied(s, u, occupant))
    )
      return null;
    return known && !known.has(nk)
      ? 1
      : hasSkill(u, "forest_move") && ["forest", "tree"].includes(n.terrain)
        ? 1
        : n.cost;
  });
}
export function reachable(s: Campaign, u: Unit, knowledge = false) {
  const result = new Map<number, { cost: number; steps: number[] }>();
  for (const c of map) {
    if (distance(u, c) > Math.floor(effectiveMove(u) / 0.75)) continue;
    const p = path(s, u, c.x, c.y, false, knowledge);
    if (p && p.cost <= effectiveMove(u)) result.set(key(c.x, c.y), p);
  }
  return result;
}

/** All legal weapon cells from the supplied movement origins, without consulting rendering. */
export function attackCells(
  u: Unit,
  origins: Iterable<number> = [key(u.x, u.y)],
  known?: Set<number>,
): Set<number> {
  const result = new Set<number>();
  if (!offensiveReady(u)) return result;
  for (const origin of origins) {
    const from = map[origin];
    if (!from) continue;
    for (let dy = -u.range; dy <= u.range; dy++)
      for (let dx = -u.range; dx <= u.range; dx++) {
        const target = cell(from.x + dx, from.y + dy);
        if (
          !target ||
          (known?.has(key(target.x, target.y)) !== false && !target.walk)
        )
          continue;
        const d = Math.abs(dx) + Math.abs(dy);
        if (d >= u.minRange && d <= u.range && los(from, target, known))
          result.add(key(target.x, target.y));
      }
  }
  return result;
}
