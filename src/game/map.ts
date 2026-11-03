import type { Cell, Terrain } from "./types";
export const W = 60,
  H = 40,
  TILE = 32,
  MAP_REVISION = 7;
const terrains: Record<Terrain, [number, boolean, number, boolean, number]> = {
  grass: [1, true, 0, false, 0],
  earth: [1, true, 0, false, 28],
  road: [1, true, 0, false, 2],
  sand: [2, true, 0, false, 3],
  water: [99, false, 0, false, 4],
  forest: [2, true, 2, false, 5],
  tree: [3, true, 3, true, 6],
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
function setExact(x: number, y: number, t: Terrain) {
  const c = cell(x, y);
  if (!c) throw Error("Terrain hors carte");
  const [cost, walk, defense, opaque, tile] = terrains[t];
  Object.assign(c, { terrain: t, cost, walk, defense, opaque, tile });
}
// The earlier 30 × 20 layout is expanded in world cells; landmarks remain compact.
function set(x: number, y: number, t: Terrain) {
  for (let dy = 0; dy < 2; dy++)
    for (let dx = 0; dx < 2; dx++) setExact(x * 2 + dx, y * 2 + dy, t);
}
export const village = {
  x: 30,
  y: 16,
  w: 3,
  h: 3,
  entry: { x: 31, y: 18 },
  name: "Village détruit des Veilleurs",
};
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
    setExact(c.x, c.y, "sand");
}
for (const [x, y] of [
  [3, 3],
  [3, 4],
  [4, 4],
  [2, 5],
  [3, 5],
])
  set(x, y, "sand");
// Authored, uneven woodland silhouettes in single cells, with walkable fringes.
// Each row is [dy, left, right] relative to its centre; no repeated 2 × 2 blocks.
function woodland(cx: number, cy: number, rows: number[][]) {
  const occupied = new Set<number>();
  for (const [dy, left, right] of rows)
    for (let dx = left; dx <= right; dx++) {
      const c = cell(cx + dx, cy + dy);
      if (
        c?.terrain === "grass" ||
        c?.terrain === "forest" ||
        c?.terrain === "tree"
      ) {
        occupied.add(key(c.x, c.y));
        setExact(c.x, c.y, "forest");
      }
    }
  for (const k of occupied) {
    const c = map[k];
    const interior = [
      [0, -1],
      [1, 0],
      [0, 1],
      [-1, 0],
    ].every(([dx, dy]) => occupied.has(key(c.x + dx, c.y + dy)));
    if (interior) setExact(c.x, c.y, "tree");
  }
}
woodland(20, 4, [
  [-3, -1, 1],
  [-2, -3, 2],
  [-1, -4, 4],
  [0, -4, 5],
  [1, -3, 4],
  [2, -2, 3],
  [3, 0, 1],
]);
woodland(41, 4, [
  [-3, 0, 1],
  [-2, -2, 2],
  [-1, -3, 3],
  [0, -3, 4],
  [1, -2, 3],
  [2, -2, 1],
  [3, 0, 1],
]);
woodland(15, 18, [
  [-3, -1, 1],
  [-2, -3, 2],
  [-1, -4, 4],
  [0, -3, 4],
  [1, -4, 3],
  [2, -2, 3],
  [3, -2, 1],
]);
woodland(10, 25, [
  [-3, 0, 1],
  [-2, -1, 2],
  [-1, -3, 2],
  [0, -3, 3],
  [1, -2, 2],
  [2, -1, 1],
  [3, 0, 1],
]);
woodland(24, 29, [
  [-3, -1, 0],
  [-2, -2, 2],
  [-1, -4, 3],
  [0, -4, 4],
  [1, -3, 3],
  [2, -1, 3],
  [3, 0, 1],
]);
// The ruined settlement sits inside a woodland belt, with its southern road open.
woodland(26, 13, [
  [-3, -1, 0],
  [-2, -2, 2],
  [-1, -3, 3],
  [0, -3, 2],
  [1, -4, 1],
  [2, -3, 1],
  [3, -1, 0],
]);
woodland(36, 14, [
  [-4, 0, 1],
  [-3, -1, 2],
  [-2, -3, 3],
  [-1, -3, 4],
  [0, -2, 4],
  [1, -1, 3],
  [2, 0, 2],
  [3, 0, 1],
]);
woodland(28, 24, [
  [-3, -1, 1],
  [-2, -2, 2],
  [-1, -3, 2],
  [0, -4, 3],
  [1, -3, 2],
  [2, -2, 1],
  [3, 0, 1],
]);
woodland(36, 23, [
  [-3, -1, 1],
  [-2, -3, 2],
  [-1, -3, 3],
  [0, -2, 4],
  [1, -3, 3],
  [2, -1, 3],
  [3, 0, 1],
]);
// The ambushed convoy follows a forest road rather than standing in a meadow.
woodland(45, 34, [
  [-4, -1, 1],
  [-3, -2, 2],
  [-2, -3, 3],
  [-1, -4, 3],
  [0, -3, 4],
  [1, -2, 3],
  [2, -2, 2],
  [3, 0, 1],
]);
woodland(54, 34, [
  [-4, 0, 1],
  [-3, -1, 2],
  [-2, -3, 3],
  [-1, -3, 4],
  [0, -2, 4],
  [1, -3, 3],
  [2, -3, 2],
  [3, -2, 2],
  [4, 0, 1],
]);
// Keep starting clearings and the sides of the wreck traversable.
for (const [x, y] of [
  [10, 10],
  [11, 11],
  [52, 32],
  [53, 33],
  [16, 10],
  [48, 28],
  [28, 20],
  [37, 20],
  [12, 9],
  [54, 36],
  [49, 33],
  [49, 34],
  [49, 35],
  [51, 33],
  [51, 34],
  [51, 35],
]) {
  if (["forest", "tree"].includes(cell(x, y)!.terrain))
    setExact(x, y, "forest");
}
// Clear linked paths out of the southern starting glade and reinforcement grove.
for (let y = 31; y <= 34; y++)
  for (let x = 51; x <= 54; x++) {
    if (["forest", "tree"].includes(cell(x, y)!.terrain))
      setExact(x, y, "forest");
  }
for (let x = 51; x <= 54; x++)
  if (["forest", "tree"].includes(cell(x, 36)!.terrain))
    setExact(x, 36, "forest");
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
  for (let x = minX; x < W / 2; x++) set(x, y, "rock");
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
    [52, 32],
    [50, 32],
  ],
  [
    [10, 10],
    [20, 10],
    [20, 16],
    [27, 16],
    [27, 20],
    [31, 20],
    [31, 18],
  ],
  [
    [59, 36],
    [50, 36],
    [50, 32],
    [46, 32],
    [46, 26],
    [39, 26],
    [39, 20],
    [31, 20],
  ],
  [
    [20, 10],
    [27, 10],
    [27, 14],
  ],
];
for (const route of roadRoutes)
  for (let i = 1; i < route.length; i++) {
    let [x, y] = route[i - 1];
    const [tx, ty] = route[i];
    setExact(x, y, "road");
    while (x !== tx || y !== ty) {
      x += Math.sign(tx - x);
      y += Math.sign(ty - y);
      setExact(x, y, "road");
    }
  }
for (let dy = 0; dy < 3; dy++)
  for (let dx = 0; dx < 3; dx++) {
    const x = village.x + dx,
      y = village.y + dy;
    setExact(x, y, dx === 1 && dy === 2 ? "floor" : "village");
    cell(x, y)!.villagePart = { dx, dy };
    cell(x, y)!.tile = (dy + 1) * 8 + dx + 1;
  }
cell(village.entry.x, village.entry.y)!.interactive =
  village.name + " · entrée sud";
export const arrivalFootprints = [
  { sector: 1 as const, x: 6, y: 6, w: 1, h: 1 },
  { sector: 2 as const, x: 50, y: 34, w: 1, h: 1 },
];
for (const f of arrivalFootprints) {
  setExact(f.x, f.y, "arrival");
  const c = cell(f.x, f.y)!;
  c.prop = { sector: f.sector, dx: 0, dy: 0 };
  c.tile = f.sector === 1 ? 8 : 12;
}
for (const c of map)
  c.base = c.terrain === "sand" || c.prop?.sector === 1 ? "sand" : "grass";
// Legacy saves are relocated only when their scaled position is now blocked.
export const refurbishedWalls = new Set(
  map.filter((c) => !c.walk).map((c) => key(c.x, c.y)),
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
