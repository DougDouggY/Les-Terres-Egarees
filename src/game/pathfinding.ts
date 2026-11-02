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
): { cost: number; steps: number[] } | null {
  const target = cell(x, y);
  if (
    !target?.walk ||
    (!ignoreUnits && at(s, x, y) && at(s, x, y)?.id !== u.id)
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
      const occupant = n ? at(s, n.x, n.y) : undefined;
      if (
        !n?.walk ||
        (!ignoreUnits &&
          occupant &&
          occupant.id !== u.id &&
          !allied(s, u, occupant))
      )
        continue;
      const nk = key(n.x, n.y),
        cost = dist.get(k)! + n.cost;
      if (cost < (dist.get(nk) ?? Infinity)) {
        dist.set(nk, cost);
        prev.set(nk, k);
        if (!open.includes(nk)) open.push(nk);
      }
    }
  }
  return null;
}
export function reachable(s: Campaign, u: Unit) {
  const result = new Map<number, { cost: number; steps: number[] }>();
  for (const c of map) {
    if (distance(u, c) > u.move) continue;
    const p = path(s, u, c.x, c.y);
    if (p && p.cost <= u.move) result.set(key(c.x, c.y), p);
  }
  return result;
}

/** All legal weapon cells from the supplied movement origins, without consulting rendering. */
export function attackCells(
  u: Unit,
  origins: Iterable<number> = [key(u.x, u.y)],
): Set<number> {
  const result = new Set<number>();
  for (const origin of origins) {
    const from = map[origin];
    if (!from) continue;
    for (let dy = -u.range; dy <= u.range; dy++)
      for (let dx = -u.range; dx <= u.range; dx++) {
        const target = cell(from.x + dx, from.y + dy);
        if (!target?.walk) continue;
        const d = Math.abs(dx) + Math.abs(dy);
        if (d >= u.minRange && d <= u.range && los(from, target))
          result.add(key(target.x, target.y));
      }
  }
  return result;
}
