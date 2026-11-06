import { hasSkill } from "./classes";
import { offensiveReady } from "./combat";
import type { Campaign, Unit } from "./types";
import { cell, map, key, W, H, distance } from "./map";
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
  const start = key(u.x, u.y),
    end = key(x, y),
    dist = new Map<number, number>([[start, 0]]),
    prev = new Map<number, number>(),
    open = [start];
  while (open.length) {
    open.sort((a, b) => dist.get(a)! - dist.get(b)!);
    const k = open.shift()!;
    if (k === end) {
      const steps = [end];
      while (steps[0] !== start) steps.unshift(prev.get(steps[0])!);
      return { cost: dist.get(k)!, steps };
    }
    const c = map[k];
    for (const [dx, dy] of [
      [0, -1],
      [1, 0],
      [0, 1],
      [-1, 0],
    ]) {
      const n = cell(c.x + dx, c.y + dy);
      const occupant = n ? knownOccupant(n.x, n.y) : undefined;
      if (
        !n ||
        (known?.has(key(n.x, n.y)) !== false && !n.walk) ||
        (!ignoreUnits &&
          occupant &&
          occupant.id !== u.id &&
          !allied(s, u, occupant))
      )
        continue;
      const nk = key(n.x, n.y),
        cost =
          dist.get(k)! +
          (known && !known.has(nk)
            ? 1
            : hasSkill(u, "forest_move") &&
                ["forest", "tree"].includes(n.terrain)
              ? 1
              : n.cost);
      if (cost < (dist.get(nk) ?? Infinity)) {
        dist.set(nk, cost);
        prev.set(nk, k);
        if (!open.includes(nk)) open.push(nk);
      }
    }
  }
  return null;
}
export function reachable(s: Campaign, u: Unit, knowledge = false) {
  const result = new Map<number, { cost: number; steps: number[] }>();
  for (const c of map) {
    if (distance(u, c) > Math.floor(u.move / 0.75)) continue;
    const p = path(s, u, c.x, c.y, false, knowledge);
    if (p && p.cost <= u.move) result.set(key(c.x, c.y), p);
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
