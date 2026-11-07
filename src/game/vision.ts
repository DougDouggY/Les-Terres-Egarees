import { discoverUnit } from "./classes";
import type { Campaign, Unit } from "./types";
import { cell, map, key, distance, arrivalFootprints } from "./active-map";
import { alive } from "./queries";
export function los(
  a: { x: number; y: number },
  b: { x: number; y: number },
  known?: Set<number>,
): boolean {
  const opaque = (x: number, y: number) =>
    known?.has(key(x, y)) !== false && !!cell(x, y)?.opaque;
  let x = a.x,
    y = a.y;
  const nx = Math.abs(b.x - x),
    ny = Math.abs(b.y - y),
    sx = Math.sign(b.x - x),
    sy = Math.sign(b.y - y);
  let ix = 0,
    iy = 0;
  while (ix < nx || iy < ny) {
    const d = (1 + 2 * ix) * ny - (1 + 2 * iy) * nx;
    if (d === 0) {
      if (opaque(x + sx, y) || opaque(x, y + sy)) return false;
      x += sx;
      y += sy;
      ix++;
      iy++;
    } else if (d < 0) {
      x += sx;
      ix++;
    } else {
      y += sy;
      iy++;
    }
    if (x === b.x && y === b.y) return true;
    if (opaque(x, y)) return false;
  }
  return true;
}
export function visibility(s: Campaign) {
  if (s.mapId === "forest" || s.mapId === "forest-compact") {
    const all = map.map((c) => key(c.x, c.y));
    for (const p of s.players) {
      p.visible = [...all];
      p.explored = [...all];
    }
    for (const u of alive(s)) discoverUnit(s, u, u.owner !== 0);
    return;
  }
  for (const owner of [1, 2] as const) {
    const visible = new Set<number>();
    for (const u of alive(s).filter((u) => u.owner === owner))
      for (const c of map)
        if (distance(u, c) <= u.vision && los(u, c)) visible.add(key(c.x, c.y));
    // A visible wreck/cart is perceived as one object, not as a severed front row.
    // Reveal only its occupied cells inside an actual unit's vision radius;
    // cells behind the opaque footprint remain subject to normal line of sight.
    for (const f of arrivalFootprints) {
      const occupied = map.filter((c) => c.prop?.sector === f.sector);
      if (occupied.some((c) => visible.has(key(c.x, c.y))))
        for (const c of occupied)
          if (
            alive(s).some(
              (u) => u.owner === owner && distance(u, c) <= u.vision,
            )
          )
            visible.add(key(c.x, c.y));
    }
    s.players[owner - 1].visible = [...visible];
  }
  if (s.merged) {
    const v = [...new Set(s.players.flatMap((p) => p.visible))];
    const remembered = [
      ...new Set([...s.players.flatMap((p) => p.explored), ...v]),
    ];
    s.players.forEach((p) => {
      p.visible = [...v];
      p.explored = [...remembered];
    });
  }
  for (const u of alive(s))
    if (s.players.some((p) => p.visible.includes(key(u.x, u.y))))
      discoverUnit(s, u, u.owner !== 0);
  s.players.forEach(
    (p) => (p.explored = [...new Set([...p.explored, ...p.visible])]),
  );
}
export const seen = (s: Campaign, owner: 1 | 2, u: Unit) =>
  s.players[owner - 1].visible.includes(key(u.x, u.y)) &&
  (u.owner !== 3 - owner || s.merged);
