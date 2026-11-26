import type { Cell, Terrain } from "../game/types";
import type { VillageProp } from "./village-tileset";
export const CAMP_W = 32,
  CAMP_H = 26;
export const campStart = { x: 16, y: 24 };
export const campBuildings = [
  { id: "hall", name: "Maison commune", x: 14, y: 3, variant: 1 },
  { id: "home-west", name: "Maison", x: 4, y: 5, variant: 0 },
  { id: "workshop", name: "Atelier", x: 23, y: 6, variant: 2 },
  { id: "home-south", name: "Chaumière", x: 6, y: 17, variant: 3 },
  { id: "home-east", name: "Maison", x: 23, y: 18, variant: 0 },
].map((b) => ({ ...b, w: 5, h: 5, entry: { x: b.x + 2, y: b.y + 4 } }));
export const campVillage = campBuildings[0];
export const campProps: {
  type: VillageProp;
  x: number;
  y: number;
  w: number;
  h: number;
}[] = [
  { type: "well", x: 16, y: 12, w: 1, h: 1 },
  { type: "crate", x: 21, y: 11, w: 1, h: 1 },
  { type: "barrel", x: 22, y: 12, w: 1, h: 1 },
  { type: "barrel", x: 28, y: 9, w: 1, h: 1 },
  ...[
    [1, 1],
    [1, 21],
    [28, 1],
    [28, 14],
    [18, 22],
    [11, 16],
  ].map(([x, y]) => ({ type: "tree" as const, x, y, w: 2, h: 2 })),
  ...[
    [1, 6],
    [2, 7],
    [10, 4],
    [11, 5],
    [21, 2],
    [26, 13],
    [27, 14],
    [13, 20],
    [19, 19],
    [10, 25],
    [1, 17],
    [3, 14],
    [20, 8],
    [20, 9],
  ].map(([x, y]) => ({ type: "bush" as const, x, y, w: 1, h: 1 })),
  ...[
    [11, 18],
    [12, 18],
    [11, 19],
    [12, 19],
    [11, 20],
    [12, 20],
    [28, 19],
    [29, 19],
    [28, 20],
    [29, 20],
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
/** Only preview geometry changes. No campaign, roster, RNG or save is touched. */
export function setCampHouseOpen(cells: Cell[], id: string, open: boolean) {
  const b = campBuildings.find((b) => b.id === id);
  if (!b) throw Error("Maison inconnue");
  for (let dy = 0; dy < 5; dy++)
    for (let dx = 0; dx < 5; dx++) {
      const c = cells[(b.y + dy) * CAMP_W + b.x + dx],
        door = dx === 2 && dy === 4,
        inside = dx > 0 && dx < 4 && dy > 0 && dy < 4,
        crate = dx === 1 && dy === 1;
      const walk = open && (door || (inside && !crate));
      Object.assign(c, {
        terrain: walk ? "floor" : open && inside && crate ? "wagon" : "wall",
        walk,
        cost: walk ? 1 : 99,
        defense: walk ? 1 : 0,
        opaque: !walk && !(open && inside && crate),
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
  // Streets at person scale: two-square passages and a small square around the well.
  for (let y = 8; y <= 25; y++) for (const x of [16, 17]) set(x, y, "road");
  for (let x = 6; x <= 26; x++) for (const y of [12, 13]) set(x, y, "road");
  for (let y = 10; y <= 13; y++)
    for (const x of [6, 7, 25, 26]) set(x, y, "road");
  for (let y = 10; y <= 14; y++)
    for (let x = 12; x <= 20; x++) set(x, y, "road");
  for (let x = 8; x <= 17; x++) for (const y of [22, 23]) set(x, y, "road");
  for (let x = 17; x <= 26; x++) set(x, 23, "road");
  for (const b of campBuildings) set(b.entry.x, b.entry.y + 1, "road");
  // The stream is now a village-edge watercourse, not a regional river/mountain border.
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
