import type { Cell, Terrain } from "../game/types";
import type { VillageProp } from "./village-tileset";
export const CAMP_W = 32,
  CAMP_H = 26;
export const campStart = { x: 15, y: 24 };
export const campBuildings = [
  {
    id: "house",
    name: "Petite maison",
    x: 3,
    y: 8,
    w: 6,
    h: 5,
    variant: 0,
    kind: "house",
  },
  {
    id: "warehouse",
    name: "Entrepôt",
    x: 15,
    y: 2,
    w: 9,
    h: 7,
    variant: 1,
    kind: "warehouse",
  },
  {
    id: "barracks",
    name: "Dortoir des soldats",
    x: 5,
    y: 17,
    w: 9,
    h: 7,
    variant: 2,
    kind: "barracks",
  },
  {
    id: "cells",
    name: "Bâtiment des cellules",
    x: 21,
    y: 13,
    w: 9,
    h: 7,
    variant: 3,
    kind: "cells",
  },
].map((b) => ({
  ...b,
  entry: { x: b.x + Math.floor(b.w / 2), y: b.y + b.h - 1 },
}));
export const campVillage = campBuildings[0];
export type CampFurniture = {
  type: "crate" | "barrel" | "bed" | "barsH" | "barsV" | "cellGate";
  x: number;
  y: number;
  w: number;
  h: number;
};
/** Coordinates local to each interior; no props extend onto the exterior wall ring. */
export function campFurniture(
  b: (typeof campBuildings)[number],
): CampFurniture[] {
  const put = (
    type: CampFurniture["type"],
    x: number,
    y: number,
    w = 1,
    h = 1,
  ) => ({ type, x: b.x + x, y: b.y + y, w, h });
  if (b.kind === "house")
    return [put("crate", 1, 1), put("bed", b.w - 3, 1, 2, 2)];
  if (b.kind === "warehouse")
    return [
      put("crate", 1, 1),
      put("crate", 2, 1),
      put("crate", 1, 2),
      put("crate", 6, 1),
      put("crate", 7, 1),
      put("barrel", 7, 3),
      put("barrel", 1, 4),
    ];
  if (b.kind === "barracks")
    return [
      put("bed", 1, 1, 2, 2),
      put("bed", 6, 1, 2, 2),
      put("bed", 1, 3, 2, 2),
      put("bed", 6, 3, 2, 2),
    ];
  return [
    put("barsH", 1, 3),
    put("cellGate", 2, 3),
    put("barsH", 3, 3),
    put("barsH", 5, 3),
    put("cellGate", 6, 3),
    put("barsH", 7, 3),
    put("barsV", 4, 1),
    put("barsV", 4, 2),
  ];
}
export const campProps: {
  type: VillageProp;
  x: number;
  y: number;
  w: number;
  h: number;
}[] = [
  { type: "well", x: 15, y: 13, w: 2, h: 2 },
  { type: "crate", x: 25, y: 5, w: 1, h: 1 },
  { type: "barrel", x: 25, y: 7, w: 1, h: 1 },
  ...[
    [1, 1],
    [1, 22],
    [28, 1],
    [27, 22],
    [13, 1],
  ].map(([x, y]) => ({ type: "tree" as const, x, y, w: 2, h: 2 })),
  ...[
    [1, 6],
    [1, 12],
    [10, 4],
    [11, 5],
    [12, 3],
    [29, 10],
    [27, 11],
    [14, 23],
    [19, 24],
    [1, 17],
    [13, 8],
  ].map(([x, y]) => ({ type: "bush" as const, x, y, w: 1, h: 1 })),
  ...[
    [10, 6],
    [11, 6],
    [10, 7],
    [11, 7],
  ].map(([x, y]) => ({ type: "garden" as const, x, y, w: 1, h: 1 })),
];
export const campLandmarks = [
  { name: "Arrivée", ...campStart },
  ...campBuildings.map((b) => ({ name: b.id, x: b.entry.x, y: b.entry.y + 1 })),
];
export function campHouseAt(x: number, y: number) {
  return campBuildings.find(
    (b) => x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h,
  );
}
export function isCampInterior(
  b: (typeof campBuildings)[number],
  x: number,
  y: number,
) {
  return x > b.x && x < b.x + b.w - 1 && y > b.y && y < b.y + b.h - 1;
}
/** Roof visibility never changes the four-wall footprint. Only the doorway and interior become accessible. */
export function setCampHouseOpen(cells: Cell[], id: string, open: boolean) {
  const b = campBuildings.find((b) => b.id === id);
  if (!b) throw Error("Bâtiment inconnu");
  const furniture = campFurniture(b);
  for (let y = b.y; y < b.y + b.h; y++)
    for (let x = b.x; x < b.x + b.w; x++) {
      const c = cells[y * CAMP_W + x],
        door = x === b.entry.x && y === b.entry.y,
        inside = isCampInterior(b, x, y);
      const prop = furniture.find(
        (p) => x >= p.x && x < p.x + p.w && y >= p.y && y < p.y + p.h,
      );
      const walk = open && (door || (inside && !prop));
      Object.assign(c, {
        terrain: walk ? "floor" : open && inside && prop ? "wagon" : "wall",
        walk,
        cost: walk ? 1 : 99,
        defense: walk ? 1 : 0,
        opaque: !walk && !(open && inside && prop),
        tile: walk ? 26 : 9,
        interactive: `house:${id}`,
      });
    }
}
export function kingdomCampMap() {
  const cells: Cell[] = Array.from({ length: CAMP_W * CAMP_H }, (_, i) => ({
    x: i % CAMP_W,
    y: Math.floor(i / CAMP_W),
    terrain: "grass",
    cost: 1,
    walk: true,
    defense: 0,
    opaque: false,
    tile: 0,
    base: "grass",
  }));
  function set(
    x: number,
    y: number,
    terrain: Terrain,
    walk = true,
    opaque = false,
  ) {
    const c = cells[y * CAMP_W + x];
    if (c)
      Object.assign(c, {
        terrain,
        walk,
        opaque,
        cost: walk ? (terrain === "road" ? 0.75 : 1) : 99,
        tile: terrain === "road" ? 2 : terrain === "water" ? 4 : 0,
      });
  }
  // Winding two-cell lanes follow the staggered buildings rather than a central cross.
  for (let y = 10; y <= 25; y++) for (const x of [17, 18]) set(x, y, "road");
  for (let x = 6; x <= 18; x++) for (const y of [14, 15]) set(x, y, "road");
  for (let y = 13; y <= 14; y++) for (const x of [6, 7]) set(x, y, "road");
  for (let x = 17; x <= 25; x++) for (const y of [10, 11]) set(x, y, "road");
  for (let y = 9; y <= 10; y++) for (const x of [19, 20]) set(x, y, "road");
  for (let x = 17; x <= 25; x++) for (const y of [21, 22]) set(x, y, "road");
  for (let y = 20; y <= 21; y++) for (const x of [25, 26]) set(x, y, "road");
  for (let x = 9; x <= 18; x++) for (const y of [24, 25]) set(x, y, "road");
  for (const b of campBuildings) set(b.entry.x, b.entry.y + 1, "road");
  for (let y = 0; y < CAMP_H; y++)
    for (const x of [30, 31]) set(x, y, "water", false, false);
  for (const p of campProps)
    for (let dy = 0; dy < p.h; dy++)
      for (let dx = 0; dx < p.w; dx++) {
        const garden = p.type === "garden",
          tree = p.type === "tree",
          bush = p.type === "bush";
        set(
          p.x + dx,
          p.y + dy,
          garden ? "earth" : tree ? "tree" : bush ? "forest" : "wagon",
          garden,
          tree,
        );
        const c = cells[(p.y + dy) * CAMP_W + p.x + dx];
        if (garden) c.cost = 2;
        if (bush) c.defense = 1;
      }
  for (const b of campBuildings) setCampHouseOpen(cells, b.id, false);
  return { cells, routes: [] as number[][][], width: CAMP_W, height: CAMP_H };
}
