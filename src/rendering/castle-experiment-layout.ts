import {
  doorAt,
  roofVisible,
  buildPlan,
  type PlanState,
} from "../data/plan-maps";
import type { PlanMap, PlanObject } from "../data/plan-maps";
import {
  exteriorFacadeCells,
  planDoorAxis,
  wallJunction,
  carpetVisualBounds,
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
  if (room?.name === "Cantine") return "wood";
  if (room?.name === "Bibliothèque") return "wood";
  return "approved";
}
export function castleWallDecor(
  x: number,
  y: number,
): "window" | "banner" | "torch" | "plain" {
  if (
    CASTLE_EXTRA_WINDOWS.includes(y * 42 + x + 1) ||
    (y === 0 && [3, 7, 12, 16, 25, 29, 34, 38].includes(x))
  )
    return "window";
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

/** One-based review notes, matching the hover tooltip. */
export const CASTLE_EXTRA_WINDOWS = [629, 1011, 1309, 1315, 1332, 1339];
export const CASTLE_COPING_CELLS = [1013, 1107, 1120, 627, 879, 1047, 757];
export const CASTLE_ROOF_CELLS = [21, 1018];
export function castleExteriorWall(map: PlanMap, k: number): boolean {
  if (map.tiles[k] !== "wall") return false;
  const x = k % map.width,
    y = Math.floor(k / map.width);
  for (let dy = -1; dy <= 1; dy++)
    for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const xx = x + dx,
        yy = y + dy;
      if (
        xx < 0 ||
        yy < 0 ||
        xx >= map.width ||
        yy >= map.height ||
        !map.building.has(yy * map.width + xx)
      )
        return true;
    }
  return false;
}
export function castleRoofCovered(s: PlanState, k: number): boolean {
  if (!roofVisible(s, k)) return false;
  if (castleEntryFace(s, k)) return false;
  if (s.opened.has(13) && CASTLE_ENTRY_COPING_CELLS.includes(k + 1))
    return false;
  if (castleHiddenBorder(s.map, k)) return true;
  if (CASTLE_ROOF_CELLS.includes(k + 1)) return true;
  if (CASTLE_COPING_CELLS.includes(k + 1)) return false;
  return !castleExteriorWall(s.map, k);
}
export function buildCastleExperimentPlan(): PlanMap {
  const map = buildPlan("castle");
  const throne = map.objects.find((o) => o.type === "throne")!;
  // Free the removed northern row (290/291); keep the complete sprite in 2×2.
  for (let x = throne.x; x < throne.x + throne.w; x++) {
    const cell = map.cells[throne.y * map.width + x];
    Object.assign(cell, { walk: true, opaque: false, cost: 1 });
    delete cell.interactive;
  }
  throne.y += 1;
  throne.h = 2;
  const furniture: PlanObject[] = [
    {
      id: 20001,
      type: "bookcase",
      x: 30,
      y: 25,
      w: 3,
      h: 2,
      name: "Rayonnage nord",
    },
    {
      id: 20002,
      type: "bookcase",
      x: 29,
      y: 28,
      w: 3,
      h: 2,
      name: "Rayonnage sud",
    },
    {
      id: 20003,
      type: "bookcase",
      x: 34,
      y: 28,
      w: 3,
      h: 2,
      name: "Rayonnage du mur droit",
    },
    ...[3, 7, 11, 15].map((y, i) => ({
      id: 20100 + i,
      type: "table-benches",
      x: 2,
      y,
      w: 4,
      h: 2,
      name: "Table et bancs",
    })),
  ];
  for (const item of furniture) {
    map.objects.push(item);
    for (let y = item.y; y < item.y + item.h; y++)
      for (let x = item.x; x < item.x + item.w; x++) {
        const k = y * map.width + x;
        if (!map.cells[k].walk)
          throw Error(
            `Mobilier superposé à un obstacle : ${item.id}, case ${k + 1}`,
          );
        Object.assign(map.cells[k], {
          walk: false,
          opaque: true,
          cost: 99,
          interactive: `${item.type}:${item.id}`,
        });
      }
  }
  return map;
}
export const castleExperimentPlan = buildCastleExperimentPlan();

export function castleCarpetBounds(map: PlanMap, carpet: PlanObject) {
  const bounds = carpetVisualBounds(map, carpet);
  if (carpet.id !== 10002) return bounds;
  const door = map.doors.find((d) => d.id === 16);
  if (!door) return bounds;
  const start = door.x + door.w,
    end = bounds.x + bounds.w;
  return { ...bounds, x: start, w: end - start };
}

export const CASTLE_ENTRY_COPING_CELLS = [178, 189, 616];
export function castleEntryFace(s: PlanState, k: number) {
  return s.opened.has(13) && k + 1 === 1018;
}
/** The user's ranges mean the top row, the west column through 967, and east through 588. */
export function castleHiddenBorder(map: PlanMap, k: number) {
  const x = k % map.width,
    y = Math.floor(k / map.width);
  return (
    y === 0 ||
    (x === 0 && k + 1 <= 967) ||
    (x === map.width - 1 && k + 1 <= 588)
  );
}
export function castleCopingCell(s: PlanState, k: number) {
  return (
    CASTLE_COPING_CELLS.includes(k + 1) ||
    (s.opened.has(13) && CASTLE_ENTRY_COPING_CELLS.includes(k + 1))
  );
}
