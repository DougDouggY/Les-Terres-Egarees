import type { PlanMap, PlanObject } from "../data/plan-maps";
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
