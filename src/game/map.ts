import type { Cell, Terrain } from "./types";
export const W = 30,
  H = 20,
  TILE = 32,
  MAP_REVISION = 4;
const terrains: Record<Terrain, [number, boolean, number, boolean, number]> = {
  grass: [1, true, 0, false, 0],
  earth: [1, true, 0, false, 28],
  road: [1, true, 0, false, 2],
  sand: [2, true, 0, false, 3],
  water: [99, false, 0, false, 4],
  forest: [2, true, 2, false, 5],
  tree: [99, false, 0, true, 6],
  rock: [99, false, 0, true, 7],
  wall: [99, false, 0, true, 9],
  ruin: [2, true, 2, false, 23],
  floor: [1, true, 3, false, 26],
  debris: [2, true, 1, false, 23],
  wagon: [99, false, 0, true, 12],
  stairs: [1, true, 1, false, 2],
  altar: [99, false, 0, true, 31],
  arrival: [99, false, 0, true, 8],
  hill: [2, true, 1, false, 14],
  village: [99, false, 0, true, 9],
};
export const map: Cell[] = Array.from({ length: W * H }, (_, i) => ({
  x: i % W,
  y: Math.floor(i / W),
  terrain: "grass",
  cost: 1,
  walk: true,
  defense: 0,
  opaque: false,
  tile: 0,
  base: "grass",
}));
export const key = (x: number, y: number) => y * W + x;
export const cell = (x: number, y: number) =>
  x >= 0 && y >= 0 && x < W && y < H ? map[key(x, y)] : undefined;
export const distance = (
  a: { x: number; y: number },
  b: { x: number; y: number },
) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
function set(x: number, y: number, t: Terrain) {
  const c = cell(x, y);
  if (!c) throw Error("Terrain hors carte");
  const [cost, walk, defense, opaque, tile] = terrains[t];
  Object.assign(c, { terrain: t, cost, walk, defense, opaque, tile });
}
// A small, authored bay in the north-west; there is no sea along the other edges.
for (const [y, maxX] of [
  [0, 5],
  [1, 4],
  [2, 3],
  [3, 2],
  [4, 1],
])
  for (let x = 0; x <= maxX; x++) set(x, y, "water");
for (const c of map) {
  if (c.terrain === "water") continue;
  if (
    [-1, 0, 1].some((dy) =>
      [-1, 0, 1].some((dx) => cell(c.x + dx, c.y + dy)?.terrain === "water"),
    )
  )
    set(c.x, c.y, "sand");
}
for (const [x, y] of [
  [3, 3],
  [3, 4],
  [4, 4],
  [2, 5],
  [3, 5],
])
  set(x, y, "sand");
// Clusters represent woodlands and mountain ranges, not individual full-size trees.
for (const [x, y] of [
  [9, 1],
  [10, 1],
  [9, 2],
  [10, 2],
  [11, 2],
  [20, 1],
  [21, 1],
  [20, 2],
  [7, 8],
  [8, 8],
  [7, 9],
  [8, 9],
  [6, 10],
  [7, 10],
  [11, 14],
  [12, 14],
  [11, 15],
  [12, 15],
  [22, 16],
  [22, 17],
  [23, 17],
  [24, 18],
  [4, 12],
  [5, 12],
  [4, 13],
])
  set(x, y, "tree");
for (const [x, y] of [
  [8, 1],
  [11, 1],
  [8, 2],
  [11, 3],
  [19, 1],
  [21, 2],
  [19, 3],
  [6, 8],
  [9, 8],
  [6, 9],
  [8, 10],
  [10, 14],
  [13, 14],
  [10, 15],
  [13, 15],
  [21, 16],
  [23, 16],
  [23, 18],
  [5, 11],
  [5, 13],
  [6, 13],
  [18, 16],
])
  set(x, y, "forest");
for (const [y, minX] of [
  [0, 24],
  [1, 25],
  [2, 24],
  [3, 26],
  [4, 25],
  [5, 26],
  [6, 27],
  [7, 28],
])
  for (let x = minX; x < W; x++) set(x, y, "rock");
set(8, 6, "rock");
for (const [x, y] of [
  [23, 1],
  [23, 3],
  [24, 5],
  [26, 7],
  [22, 7],
])
  set(x, y, "hill");
// Authored routes bend through the landscape; painting follows these exact cells.
export const roadRoutes: number[][][] = [
  [
    [5, 5],
    [10, 5],
    [10, 8],
    [13, 8],
    [13, 11],
    [16, 11],
    [16, 10],
  ],
  [
    [26, 16],
    [23, 16],
    [23, 13],
    [20, 13],
    [20, 11],
    [16, 11],
  ],
  [
    [10, 5],
    [14, 5],
    [14, 7],
  ],
];
for (const route of roadRoutes)
  for (let i = 1; i < route.length; i++) {
    let [x, y] = route[i - 1];
    const [tx, ty] = route[i];
    set(x, y, "road");
    while (x !== tx || y !== ty) {
      x += Math.sign(tx - x);
      y += Math.sign(ty - y);
      set(x, y, "road");
    }
  }
export const village = {
  x: 15,
  y: 8,
  w: 3,
  h: 3,
  entry: { x: 16, y: 10 },
  name: "Village détruit des Veilleurs",
};
for (let dy = 0; dy < 3; dy++)
  for (let dx = 0; dx < 3; dx++) {
    const x = village.x + dx,
      y = village.y + dy;
    set(x, y, dx === 1 && dy === 2 ? "floor" : "village");
    cell(x, y)!.villagePart = { dx, dy };
    cell(x, y)!.tile = (dy + 1) * 8 + dx + 1;
  }
cell(village.entry.x, village.entry.y)!.interactive =
  village.name + " · entrée sud";
export const arrivalFootprints = [
  { sector: 1 as const, x: 3, y: 3, w: 1, h: 1 },
  { sector: 2 as const, x: 25, y: 17, w: 1, h: 1 },
];
for (const f of arrivalFootprints) {
  set(f.x, f.y, "arrival");
  const c = cell(f.x, f.y)!;
  c.prop = { sector: f.sector, dx: 0, dy: 0 };
  c.tile = f.sector === 1 ? 8 : 12;
}
for (const c of map)
  c.base = c.terrain === "sand" || c.prop?.sector === 1 ? "sand" : "grass";
const legacyWalk =
  "000000000000000000000000000000000111111100111111001111110011001000111100111111001111110011011000111111111111111111111111011111111100111111111100111111011111111111111111111100111111011111110111001001100001111111011111110011011101111101001111011111110011011101111101001111011111111111111111111111111111011111111111101010001011111111011111001101011111111101111111011111001101111111111111111111011111111111011111111101111111011111100111000001101000111111011111100111111111111100111111011111111111111111111111111111011111111001111111111111000111011111111001111111111111000111011111111111111111111111111111";
const legacyChanged = new Set<number>([
  192, 193, 194, 195, 200, 201, 202, 222, 252, 342, 372, 402, 232, 262, 352,
  382, 412, 432, 433, 434, 435, 436, 439, 440, 441, 340, 370, 254, 284, 350,
  380, 313, 315, 318, 319, 321,
]);
export const refurbishedWalls = new Set(
  map
    .filter(
      (c) =>
        !c.walk &&
        (legacyWalk[key(c.x, c.y)] === "1" || legacyChanged.has(key(c.x, c.y))),
    )
    .map((c) => key(c.x, c.y)),
);
export function tileIndex(c: Cell) {
  return c.tile;
}
// Retained helpers for older renderer clients; no staircases remain at regional scale.
export function stairsRotation(_c: Cell) {
  return 0;
}
export function wallVariant(c: Cell) {
  return { tile: c.tile, rotation: 0 };
}
