import {
  roofVisible,
  type PlanMap,
  type PlanObject,
  type PlanState,
} from "../data/plan-maps";
export type WallAxis = "horizontal" | "vertical";
export function planDoorAxis(map: PlanMap, o: PlanObject): WallAxis {
  if (o.w !== o.h) return o.w > o.h ? "horizontal" : "vertical";
  const wall = (x: number, y: number) =>
    x >= 0 &&
    y >= 0 &&
    x < map.width &&
    y < map.height &&
    map.tiles[y * map.width + x] === "wall";
  return Number(wall(o.x, o.y - 1)) + Number(wall(o.x, o.y + o.h)) >
    Number(wall(o.x - 1, o.y)) + Number(wall(o.x + o.w, o.y))
    ? "vertical"
    : "horizontal";
}
export function wallJunction(
  map: PlanMap,
  x: number,
  y: number,
  opened: ReadonlySet<number>,
) {
  const at = (xx: number, yy: number) =>
    map.doors.find(
      (o) => xx >= o.x && yy >= o.y && xx < o.x + o.w && yy < o.y + o.h,
    );
  const linked = (xx: number, yy: number, axis: WallAxis) => {
    if (xx < 0 || yy < 0 || xx >= map.width || yy >= map.height) return false;
    if (map.tiles[yy * map.width + xx] === "wall") return true;
    const d = at(xx, yy);
    return !!d && planDoorAxis(map, d) === axis;
  };
  const n = linked(x, y - 1, "vertical"),
    s = linked(x, y + 1, "vertical"),
    w = linked(x - 1, y, "horizontal"),
    e = linked(x + 1, y, "horizontal");
  const opening = (xx: number, yy: number, axis: WallAxis) => {
    const d = at(xx, yy);
    return !!d && opened.has(d.id) && planDoorAxis(map, d) === axis;
  };
  // The continuing vertical spine owns a crossing; a front facade cannot cut through it.
  const axis: WallAxis = s || (!w && !e) ? "vertical" : "horizontal";
  return {
    axis,
    n,
    s,
    w,
    e,
    northJoin: n && axis === "horizontal",
    openN: opening(x, y - 1, "vertical"),
    openS: opening(x, y + 1, "vertical") || (n && !s && !w && !e),
    openW: opening(x - 1, y, "horizontal"),
    openE: opening(x + 1, y, "horizontal"),
  };
}
export function carpetVisualBounds(map: PlanMap, carpet: PlanObject) {
  const throne = map.objects.find((o) => o.type === "throne");
  const contains = (o: PlanObject, x: number, y: number) =>
    x >= o.x && y >= o.y && x < o.x + o.w && y < o.y + o.h;
  const room =
    throne &&
    map.objects.find(
      (o) =>
        o.type === "room" &&
        contains(o, throne.x + throne.w / 2, throne.y + throne.h / 2),
    );
  if (
    room &&
    carpet.h > carpet.w &&
    contains(room, carpet.x + carpet.w / 2, carpet.y + carpet.h / 2)
  )
    return {
      ...carpet,
      x: carpet.x + (carpet.w - carpet.h) / 2,
      y: carpet.y + (carpet.h - carpet.w) / 2,
      w: carpet.h,
      h: carpet.w,
    };
  return { ...carpet };
}
/** Decorate only pre-existing blocked storage footprints, never an additional route cell. */
export function storageSprites(o: PlanObject): PlanObject[] {
  return [o];
}

/** Zero-based cells matched to the green marks against the authored 42 × 34 raster.
 * Only the exposed corner gets a flat stone top; neighboring closed floors keep their roof.
 */
export const castleCornerCaps = [
  [20, 0],
  [9, 4],
  [20, 4],
  [27, 14],
  [38, 14],
  [4, 24],
  [9, 24],
  [14, 26],
  [27, 26],
] as const;
export function exposedCornerCap(s: PlanState, x: number, y: number) {
  if (
    s.map.id !== "castle" ||
    !castleCornerCaps.some(([cx, cy]) => cx === x && cy === y)
  )
    return false;
  // Once the armory is visible, this junction continues its south-facing facade.
  if (x === 9 && y === 24 && s.revealed.has(23 * s.map.width + 8)) return false;
  return [-1, 1].some((dx) =>
    [-1, 1].some((dy) => {
      const xx = x + dx,
        yy = y + dy;
      if (xx < 0 || yy < 0 || xx >= s.map.width || yy >= s.map.height)
        return true;
      const k = yy * s.map.width + xx;
      return !s.map.building.has(k) || s.revealed.has(k);
    }),
  );
}
/** The stone half belongs to the hidden room, never a rotated front door. */
export function sideDoorHiddenSide(
  s: PlanState,
  o: PlanObject,
): "left" | "right" {
  const hidden = (x: number) =>
    Array.from({ length: o.h }, (_, dy) =>
      roofVisible(s, (o.y + dy) * s.map.width + x),
    ).some(Boolean);
  if (hidden(o.x - 1)) return "left";
  if (hidden(o.x + o.w)) return "right";
  // Once both rooms are exposed retain the authored room-facing frame.
  return o.id === 16 ? "right" : "left";
}

/** Existing south exterior outlines; do not project over the entrance staircase. */
export function exteriorFacadeCells(map: PlanMap): number[] {
  if (map.id !== "castle") return [];
  return map.tiles.flatMap((t, k) => {
    const below = k + map.width;
    return t === "wall" &&
      below < map.tiles.length &&
      !map.building.has(below) &&
      map.cells[below].terrain === "grass"
      ? [k]
      : [];
  });
}
