import { doorAt, type PlanState } from "../data/plan-maps";
import type { PlanMap, PlanObject } from "../data/plan-maps";
import {
  exteriorFacadeCells,
  planDoorAxis,
  wallJunction,
} from "./plan-geometry";
import { hash } from "./plan-tileset";
/** The approved stone floor is reused; kitchen and library keep their special floors. */
export function castleFloor(map: PlanMap, x: number, y: number): string {
  const room = map.objects.find(
    (o) =>
      o.type === "room" &&
      x >= o.x &&
      y >= o.y &&
      x < o.x + o.w &&
      y < o.y + o.h,
  );
  if (room?.name === "Cantine") return "checker";
  if (room?.name === "Bibliothèque") return "wood";
  return "approved";
}
export function castleWallDecor(
  x: number,
  y: number,
): "window" | "banner" | "torch" | "plain" {
  if (y === 0 && [3, 7, 12, 16, 25, 29, 34, 38].includes(x)) return "window";
  // Only the matching torn red banners flank the entrance on the exterior.
  if (y === 26 && [17, 24].includes(x)) return "banner";
  // One restrained symmetric pair in the throne room's interior wall.
  if (y === 14 && [25, 36].includes(x)) return "banner";
  if (
    (y === 0 && [5, 14, 27, 36].includes(x)) ||
    (y === 14 && [28, 33].includes(x))
  )
    return "torch";
  return "plain";
}
export function castleRugStyle(id: number) {
  return hash(id, 37) % 3;
}
export type DoorFrame = {
  door: PlanObject;
  x: number;
  y: number;
  pillar: "left" | "right";
};
export function castleDoorFrames(map: PlanMap): DoorFrame[] {
  return map.doors
    .filter((d) => planDoorAxis(map, d) === "horizontal")
    .flatMap((door) => [
      { door, x: door.x - 1, y: door.y, pillar: "right" as const },
      { door, x: door.x + door.w, y: door.y, pillar: "left" as const },
    ])
    .filter(
      (f) =>
        f.x >= 0 &&
        f.x < map.width &&
        map.tiles[f.y * map.width + f.x] === "wall" &&
        (f.door.id === 13 ||
          !exteriorFacadeCells(map).includes(f.y * map.width + f.x)),
    );
}
export function castleTallWalls(map: PlanMap) {
  return new Set(exteriorFacadeCells(map));
}

/** Second tall-wall sample is excluded; the niche is a rare accent. */
export function castleTallVariant(x: number, y: number): 0 | 2 | 3 {
  const n = hash(x, y) % 12;
  return n === 0 ? 2 : n % 2 ? 0 : 3;
}
/** Finish the upper end of a lateral passage with a front face, not a flat cap. */
export function castlePassageFace(s: PlanState, x: number, y: number): boolean {
  const m = s.map,
    k = y * m.width + x,
    below = k + m.width;
  if (
    m.tiles[k] !== "wall" ||
    y + 1 >= m.height ||
    !m.building.has(below) ||
    m.tiles[below] === "wall"
  )
    return false;
  const d = doorAt(m, below);
  if (d && !s.opened.has(d.id)) return false;
  const joint = wallJunction(m, x, y, s.opened);
  return joint.axis === "vertical" && (joint.n || joint.openS);
}
