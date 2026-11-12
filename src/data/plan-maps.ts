import source from "./tactical-plans.json";
import type { Cell } from "../game/types";
import { gridPath } from "../game/grid-path";
import type { StudyMap, StudyTile } from "../dev/map-studies";
export type PlanObject = {
  id: number;
  type: string;
  x: number;
  y: number;
  w: number;
  h: number;
  name?: string;
  open?: boolean;
};
export type PlanMap = StudyMap & {
  cells: Cell[];
  objects: PlanObject[];
  building: Set<number>;
  doors: PlanObject[];
};
export type PlanState = {
  map: PlanMap;
  opened: Set<number>;
  revealed: Set<number>;
  doorMethods: Map<number, "key" | "destroy">;
};
export const PLAN_SOURCE = source;
export function objectCells(
  map: Pick<PlanMap, "width" | "height">,
  o: PlanObject,
): number[] {
  const cells: number[] = [];
  for (let y = o.y; y < o.y + o.h; y++)
    for (let x = o.x; x < o.x + o.w; x++)
      if (x >= 0 && y >= 0 && x < map.width && y < map.height)
        cells.push(y * map.width + x);
  return cells;
}
export function neighbors(
  map: Pick<PlanMap, "width" | "height">,
  k: number,
): number[] {
  const x = k % map.width,
    y = Math.floor(k / map.width),
    out: number[] = [];
  for (const [dx, dy] of [
    [0, -1],
    [1, 0],
    [0, 1],
    [-1, 0],
  ])
    if (x + dx >= 0 && y + dy >= 0 && x + dx < map.width && y + dy < map.height)
      out.push((y + dy) * map.width + x + dx);
  return out;
}
const blockedObjects = new Set([
  "pillar",
  "chest",
  "throne",
  "mast",
  "half_mast_top",
  "half_mast_bottom",
  "crate",
  "barrel",
]);
export function buildPlan(id: "castle" | "boarding"): PlanMap {
  const plan = id === "castle" ? source.maps.castle : source.maps.ship;
  const width = plan.w,
    height = plan.h,
    objects = structuredClone(plan.objects) as PlanObject[];
  const map: PlanMap = {
    id,
    name:
      id === "castle"
        ? "Chapitre 3 — Le château oublié"
        : "Chapitre 9 — À l’abordage !",
    width,
    height,
    tiles: [],
    cells: [],
    start: id === "castle" ? 32 * width + 20 : 20 * width + 6,
    objects,
    building: new Set(),
    doors: objects.filter((o) => o.type === "door"),
  };
  const raw: string[] =
    id === "castle"
      ? source.maps.castle.tileGrid.tiles
          .flat()
          .map((t) => (t === "carpet" || t === "throne" ? "floor" : t))
      : Array(width * height).fill("water");
  // The supplied raster owns architecture; authored objects own furniture and door footprints.
  if (id === "boarding") {
    for (const o of objects.filter((o) =>
      ["deck1", "deck2", "gangway"].includes(o.type),
    ))
      for (const k of objectCells(map, o))
        raw[k] = o.type === "gangway" ? "bridge" : "deck";
    for (const o of objects.filter(
      (o) => o.type === "deck1" || o.type === "deck2",
    ))
      for (let y = 0; y < height; y++)
        for (const x of [o.x, o.x + o.w - 1]) {
          const k = y * width + x,
            inner = o.type === "deck1" ? x === o.x + o.w - 1 : x === o.x;
          const opening =
            inner &&
            objects.some(
              (g) => g.type === "gangway" && y >= g.y && y < g.y + g.h,
            );
          if (!opening) raw[k] = "rail";
        }
  } else {
    for (const o of objects.filter((o) => o.type === "carpet"))
      for (const k of objectCells(map, o))
        if (raw[k] !== "wall") raw[k] = "carpet";
    for (const o of map.doors)
      for (const k of objectCells(map, o)) raw[k] = "door";
    // Footprint covers all building cells, independent of obsolete room.open flags.
    raw.forEach((t, k) => {
      if (!["grass", "path", "stairs", "void"].includes(t)) map.building.add(k);
    });
  }
  map.tiles = raw.map(
    (t) =>
      (({ carpet: "rug", door: "floor", stairs: "path", throne: "floor" })[t] ??
        t) as StudyTile,
  );
  map.cells = raw.map((t, k) => {
    const walk = !["wall", "water", "rail", "void"].includes(t);
    return {
      x: k % width,
      y: Math.floor(k / width),
      terrain:
        t === "grass"
          ? "grass"
          : t === "path"
            ? "road"
            : t === "stairs"
              ? "stairs"
              : t === "water"
                ? "water"
                : t === "wall" || t === "rail"
                  ? "wall"
                  : "floor",
      cost: walk ? 1 : 99,
      walk,
      defense: t === "floor" || t === "carpet" ? 3 : 0,
      opaque: t === "wall" || t === "rail",
      tile: t === "grass" ? 0 : t === "path" ? 2 : 26,
      base: "grass",
    } satisfies Cell;
  });
  for (const o of objects)
    if (blockedObjects.has(o.type))
      for (const k of objectCells(map, o))
        Object.assign(map.cells[k], {
          walk: false,
          opaque: true,
          cost: 99,
          interactive: `${o.type}:${o.id}`,
        });
  for (const o of map.doors)
    for (const k of objectCells(map, o))
      map.cells[k].interactive = `door:${o.id}`;
  return map;
}
export const castlePlan = buildPlan("castle"),
  boardingPlan = buildPlan("boarding");
export function doorAt(map: PlanMap, k: number) {
  return map.doors.find((o) => objectCells(map, o).includes(k));
}
export function createPlanState(map: PlanMap): PlanState {
  return {
    map,
    opened: new Set(),
    revealed: new Set(),
    doorMethods: new Map(),
  };
}
function structureOpen(s: PlanState, k: number) {
  const d = doorAt(s.map, k);
  return s.map.tiles[k] !== "wall" && (!d || s.opened.has(d.id));
}
export function roofVisible(s: PlanState, k: number): boolean {
  if (!s.map.building.has(k)) return false;
  if (s.revealed.has(k)) return false;
  if (s.map.tiles[k] === "wall") {
    // The wall facing a revealed room must be visible even while the room on
    // its other side stays roofed. Only untouched corners retain their roof.
    if (neighbors(s.map, k).some((n) => s.revealed.has(n))) return false;
    const edges = new Set(
      neighbors(s.map, k)
        .flatMap((n) => (s.map.tiles[n] === "wall" ? neighbors(s.map, n) : [n]))
        .filter((n) => s.map.building.has(n) && s.map.tiles[n] !== "wall"),
    );
    return !edges.size || ![...edges].every((n) => s.revealed.has(n));
  }
  return true;
}
export function doorAvailable(s: PlanState, o: PlanObject) {
  return (
    !s.opened.has(o.id) &&
    objectCells(s.map, o).some((k) =>
      neighbors(s.map, k).some(
        (n) => !roofVisible(s, n) && s.map.cells[n].walk,
      ),
    )
  );
}
export function openPlanDoor(
  s: PlanState,
  id: number,
  method: "key" | "destroy",
): boolean {
  const door = s.map.doors.find((o) => o.id === id);
  if (!door || !doorAvailable(s, door)) return false;
  s.opened.add(id);
  s.doorMethods.set(id, method);
  // Flood only through real openings. Furnishings don't subdivide roof regions.
  const queue = objectCells(s.map, door),
    seen = new Set(queue);
  for (let i = 0; i < queue.length; i++) {
    const k = queue[i];
    if (s.map.building.has(k)) s.revealed.add(k);
    for (const n of neighbors(s.map, k))
      if (!seen.has(n) && structureOpen(s, n)) {
        seen.add(n);
        queue.push(n);
      }
  }
  return true;
}
export function planWalkable(s: PlanState, k: number): boolean {
  const cell = s.map.cells[k],
    door = doorAt(s.map, k);
  return (
    !!cell &&
    cell.walk &&
    (!door || s.opened.has(door.id)) &&
    !roofVisible(s, k)
  );
}
export function planPath(s: PlanState, from: number, to: number) {
  if (!planWalkable(s, from) || !planWalkable(s, to)) return null;
  return (
    gridPath(s.map.width, s.map.height, from, to, (k) =>
      planWalkable(s, k) ? s.map.cells[k].cost : null,
    )?.steps ?? null
  );
}
