import { objectCells, type PlanMap, type PlanObject } from "./plan-maps";
import type { StudyTile } from "../dev/map-studies";
import type { Cell } from "../game/types";

/** Seven one-cell-wide crossings with deliberately unequal intervals. */
export const BOARDING_CROSSINGS = [2, 4, 8, 13, 19, 25, 30] as const;
export const BOARDING_DECKS = [
  { id: 1, type: "deck1", x: 0, y: 1, w: 34, h: 12, name: "Navire normal" },
  { id: 2, type: "deck2", x: 0, y: 17, w: 34, h: 12, name: "Navire fantôme" },
] as const;
/** Narrower decks continue beyond both horizontal edges of the frame. */
export function buildBoardingExperiment(): PlanMap {
  const width = 34,
    height = 30;
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
          y === d.y || y === d.y + d.h - 1 ? "rail" : "deck";
      }
  for (const [i, x] of BOARDING_CROSSINGS.entries()) {
    map.objects.push({
      id: 30000 + i,
      type: "gangway",
      x,
      y: 13,
      w: 1,
      h: 4,
      name: `Passerelle ${i + 1}`,
    });
    for (let y = 12; y <= 17; y++) map.tiles[y * width + x] = "bridge";
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
  // Multi-cell objects reserve their entire footprint, including mast rigging.
  function place(o: PlanObject, blocked: boolean) {
    const cells = objectCells(map, o);
    if (cells.some((k) => !map.cells[k].walk)) return;
    map.objects.push(o);
    if (blocked)
      for (const k of cells)
        Object.assign(map.cells[k], {
          walk: false,
          opaque: true,
          cost: 99,
          interactive: `${o.type}:${o.id}`,
        });
  }
  let id = 31000;
  for (const [i, d] of BOARDING_DECKS.entries()) {
    for (const x of [6, 16, 26])
      place({ id: id++, type: "mast", x, y: d.y + 4, w: 3, h: 3 }, true);
    for (const [x, dy] of [
      [3, 2],
      [12, 8],
      [21, 2],
      [30, 8],
    ])
      place({ id: id++, type: "hatch", x, y: d.y + dy, w: 1, h: 1 }, false);
    for (const [x, dy, type] of [
      [2, 7, "crate"],
      [3, 7, "crate"],
      [11, 2, "barrel"],
      [12, 2, "barrel"],
      [22, 8, "crate"],
      [23, 8, "barrel"],
      [30, 3, "crate"],
      [31, 3, "barrel"],
    ] as const)
      place({ id: id++, type, x, y: d.y + dy, w: 1, h: 1 }, true);
    if (i === 1)
      for (const x of [10, 25])
        place({ id: id++, type: "brazier", x, y: d.y + 8, w: 1, h: 1 }, true);
  }
  map.start = 5 * width + 13;
  if (!map.cells[map.start].walk) throw Error("Point de départ naval obstrué");
  for (const bridge of map.objects.filter((o) => o.type === "gangway"))
    for (const k of objectCells(map, bridge))
      if (!map.cells[k].walk) throw Error("Passerelle obstruée");
  return map;
}
export const boardingExperimentPlan = buildBoardingExperiment();
