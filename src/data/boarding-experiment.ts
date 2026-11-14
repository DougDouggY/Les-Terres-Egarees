import {
  buildPlan,
  objectCells,
  type PlanMap,
  type PlanObject,
} from "./plan-maps";
import type { StudyTile } from "../dev/map-studies";
import type { Cell } from "../game/types";

/** Seven one-cell-wide crossings with deliberately unequal intervals. */
export const BOARDING_CROSSINGS = [2, 4, 8, 13, 19, 25, 30] as const;
export const BOARDING_DECKS = [
  { id: 1, type: "deck1", x: 0, y: 1, w: 34, h: 18, name: "Navire normal" },
  { id: 2, type: "deck2", x: 0, y: 23, w: 34, h: 18, name: "Navire fantôme" },
] as const;
/** Clockwise rotation preserves the approved two 18×34 deck envelopes. */
export function buildBoardingExperiment(): PlanMap {
  const source = buildPlan("boarding"),
    width = source.height,
    height = source.width;
  const map: PlanMap = {
    id: "boarding",
    name: "Abordage — Navire normal et bateau fantôme",
    width,
    height,
    tiles: Array<StudyTile>(width * height).fill("water"),
    cells: [],
    objects: BOARDING_DECKS.map((o) => ({ ...o })),
    building: new Set(),
    doors: [],
    start: 0,
  };
  for (const d of BOARDING_DECKS)
    for (let y = d.y; y < d.y + d.h; y++)
      for (let x = 0; x < width; x++) {
        map.tiles[y * width + x] =
          x === 0 || x === width - 1 || y === d.y || y === d.y + d.h - 1
            ? "rail"
            : "deck";
      }
  for (const [i, x] of BOARDING_CROSSINGS.entries()) {
    map.objects.push({
      id: 30000 + i,
      type: "gangway",
      x,
      y: 19,
      w: 1,
      h: 4,
      name: `Passerelle ${i + 1}`,
    });
    for (let y = 18; y <= 23; y++) map.tiles[y * width + x] = "bridge";
  }
  map.cells = map.tiles.map(
    (tile, k) =>
      ({
        x: k % width,
        y: Math.floor(k / width),
        terrain:
          tile === "water" ? "water" : tile === "rail" ? "wall" : "floor",
        walk: tile !== "water" && tile !== "rail",
        opaque: tile === "rail",
        cost: tile === "water" || tile === "rail" ? 99 : 1,
        defense: 0,
        tile: 26,
        base: "grass",
      }) satisfies Cell,
  );
  const occupied = new Set<number>();
  for (const o of source.objects.filter(
    (o) => !["deck1", "deck2", "gangway"].includes(o.type),
  )) {
    const ghost = o.x >= 23,
      d = BOARDING_DECKS[ghost ? 1 : 0];
    const x = Math.max(
      1,
      Math.min(width - 2, Math.floor(source.height - o.y - o.h / 2)),
    );
    const y = Math.max(
      d.y + 1,
      Math.min(d.y + d.h - 2, Math.floor(o.x + o.w / 2)),
    );
    const type = o.type.startsWith("half_mast") ? "mast" : o.type;
    const prop: PlanObject = { ...o, type, x, y, w: 1, h: 1 };
    const k = y * width + x;
    if (occupied.has(k)) continue;
    occupied.add(k);
    map.objects.push(prop);
    if (["mast", "crate", "barrel"].includes(type))
      Object.assign(map.cells[k], {
        walk: false,
        opaque: true,
        cost: 99,
        interactive: `${type}:${o.id}`,
      });
  }
  for (const [i, x, y] of [
    [0, 10, 28],
    [1, 26, 35],
  ]) {
    const prop: PlanObject = {
      id: 30100 + i,
      type: "brazier",
      x,
      y,
      w: 1,
      h: 1,
    };
    if (map.cells[y * width + x].walk) {
      map.objects.push(prop);
      Object.assign(map.cells[y * width + x], {
        walk: false,
        opaque: true,
        cost: 99,
        interactive: `brazier:${prop.id}`,
      });
    }
  }
  const oldX = source.start % source.width,
    oldY = Math.floor(source.start / source.width);
  map.start = oldX * width + (source.height - 1 - oldY);
  if (!map.cells[map.start].walk) throw Error("Point de départ naval obstrué");
  for (const bridge of map.objects.filter((o) => o.type === "gangway"))
    for (const k of objectCells(map, bridge))
      if (!map.cells[k].walk) throw Error("Passerelle obstruée");
  return map;
}
export const boardingExperimentPlan = buildBoardingExperiment();
