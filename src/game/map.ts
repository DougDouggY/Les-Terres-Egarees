import type { Cell, Terrain } from "./types";
export const W = 30,
  H = 20,
  TILE = 32;
const terrains: Record<Terrain, [number, boolean, number, boolean, number]> = {
  grass: [1, true, 0, false, 0],
  earth: [1, true, 0, false, 1],
  road: [1, true, 0, false, 2],
  sand: [2, true, 0, false, 3],
  water: [99, false, 0, false, 4],
  forest: [2, true, 2, false, 5],
  tree: [99, false, 0, true, 6],
  rock: [99, false, 0, true, 7],
  wall: [99, false, 0, true, 8],
  ruin: [2, true, 3, false, 9],
  floor: [1, true, 1, false, 10],
  debris: [2, true, 1, false, 11],
  wagon: [99, false, 0, true, 12],
  stairs: [1, true, 1, false, 13],
  altar: [99, false, 0, true, 31],
  arrival: [99, false, 0, true, 0],
};
// Hand-authored, immutable mission layout. Each character describes one logical and visual cell.
const layout = [
  "~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~",
  "~~~ssssgggTTggggggTTggggggTTgg",
  "~~sssssgggTTggggggTTggggggTTgg",
  "~ssssssggggggggggggggggggggggg",
  "~ssddssgggTTggggggggggTTgggggg",
  "~ssssrrrrrrrrgggggggggTTgggggg",
  "~ssssrrgggggrggg####gggggggggg",
  "~sssssrgTTggrggg#ff#ggggTTgggg",
  "~ssgggrgTTggrggg#ff#ggggTTgggg",
  "~sggggrrrrrrrrrrruufrrrrrrgggg",
  "~sgggggggggggrrruuuurrgggrgggg",
  "~sggggTTgggggrrruuuurrgggrgggg",
  "~sggggTTgggggrrrfuffrrgggrgggg",
  "~sgggggggggggggrrrrgggggrggggg",
  "~sgggggTTgggggggggrgggTTrggggg",
  "~sgggggTTgggggggggrgggTTrggggg",
  "~sggggggggggggggggrrrrrrrrrrgg",
  "~sgggggggTTggggggggggggggrgggg",
  "~sgggggggTTggggggggggggggrgggg",
  "~sssssssssssssssssssssssssssss",
];
const codes: Record<string, Terrain> = {
  "~": "water",
  s: "sand",
  g: "grass",
  T: "tree",
  r: "road",
  "#": "wall",
  f: "floor",
  u: "ruin",
  d: "debris",
};
if (layout.length !== H || layout.some((row) => row.length !== W))
  throw Error("Carte mal alignée");
export const map: Cell[] = layout.flatMap((row, y) =>
  Array.from({ length: W }, (_, x) => {
    const terrain = codes[row[x] ?? "g"];
    const [cost, walk, defense, opaque, tile] = terrains[terrain];
    return {
      x,
      y,
      terrain,
      cost,
      walk,
      defense,
      opaque,
      tile,
      base: x <= 6 && y <= 9 ? ("sand" as const) : ("grass" as const),
      ...(x === 16 && y === 10
        ? { interactive: "Sanctuaire des Veilleurs" }
        : {}),
    };
  }),
);
function set(x: number, y: number, t: Terrain) {
  const [cost, walk, defense, opaque, tile] = terrains[t];
  Object.assign(map[y * W + x], {
    terrain: t,
    cost,
    walk,
    defense,
    opaque,
    tile,
  });
}
set(17, 10, "altar");
set(25, 17, "wagon");
set(24, 17, "debris");
set(15, 9, "stairs");
set(19, 10, "stairs");
set(8, 6, "rock");
set(21, 13, "rock");
set(22, 7, "forest");
set(10, 9, "forest");
// Authored courtyard: four double-width gates, broken outer walls and inner baffles.
export const MAP_REVISION = 2;
export const refurbishedWalls = new Set<number>();
const wallSegments = [
  [12, 6, 16, 6],
  [19, 6, 22, 6],
  [12, 7, 12, 8],
  [12, 11, 12, 13],
  [22, 7, 22, 8],
  [22, 11, 22, 13],
  [12, 14, 16, 14],
  [19, 14, 22, 14],
  [10, 11, 10, 12],
  [24, 7, 24, 8],
  [14, 8, 14, 9],
  [20, 11, 20, 12],
];
for (const [x1, y1, x2, y2] of wallSegments)
  for (let y = y1; y <= y2; y++)
    for (let x = x1; x <= x2; x++) {
      const c = map[y * W + x];
      if (c.walk) refurbishedWalls.add(y * W + x);
      set(x, y, "wall");
    }
for (const [x, y] of [
  [12, 9],
  [12, 10],
  [22, 9],
  [22, 10],
  [17, 6],
  [18, 6],
  [17, 14],
  [18, 14],
])
  set(x, y, "stairs");
// Multi-cell arrival props: one explicit 3×2 collision/occlusion footprint per sector.
export const arrivalFootprints = [
  { sector: 1 as const, x: 3, y: 2, w: 3, h: 2 },
  { sector: 2 as const, x: 24, y: 17, w: 3, h: 2 },
];
for (const footprint of arrivalFootprints)
  for (let dy = 0; dy < footprint.h; dy++)
    for (let dx = 0; dx < footprint.w; dx++) {
      const x = footprint.x + dx,
        y = footprint.y + dy;
      set(x, y, "arrival");
      map[y * W + x].prop = { sector: footprint.sector, dx, dy };
    }
export const cell = (x: number, y: number) =>
  x >= 0 && y >= 0 && x < W && y < H ? map[y * W + x] : undefined;
export const key = (x: number, y: number) => y * W + x;
export const distance = (
  a: { x: number; y: number },
  b: { x: number; y: number },
) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

export function tileIndex(c: Cell) {
  if (c.terrain === "arrival") return c.base === "sand" ? 3 : 0;
  if (c.terrain === "water") return 4;
  if (c.terrain === "sand") {
    const l = cell(c.x - 1, c.y)?.terrain === "water",
      t = cell(c.x, c.y - 1)?.terrain === "water";
    return l && t ? 18 : l ? 16 : t ? 17 : 3;
  }
  if (c.terrain === "road") {
    const l = cell(c.x - 1, c.y)?.terrain === "road",
      r = cell(c.x + 1, c.y)?.terrain === "road",
      t = cell(c.x, c.y - 1)?.terrain === "road",
      b = cell(c.x, c.y + 1)?.terrain === "road";
    return (l || r) && (t || b) ? 23 : t || b ? 21 : 20;
  }
  if (c.terrain === "tree") return [6, 28, 29][(c.x + c.y) % 3];
  if (c.terrain === "wall") return wallVariant(c).tile;
  return c.tile;
}

export function wallVariant(c: Cell) {
  const n = cell(c.x, c.y - 1)?.terrain === "wall",
    e = cell(c.x + 1, c.y)?.terrain === "wall",
    south = cell(c.x, c.y + 1)?.terrain === "wall",
    w = cell(c.x - 1, c.y)?.terrain === "wall";
  if (n && e && !south && !w) return { tile: 25, rotation: 0 };
  if (e && south && !n && !w) return { tile: 25, rotation: Math.PI / 2 };
  if (south && w && !n && !e) return { tile: 25, rotation: Math.PI };
  if (w && n && !e && !south) return { tile: 25, rotation: Math.PI * 1.5 };
  if ((n || south) && !e && !w) return { tile: 24, rotation: 0 };
  return { tile: e || w ? 8 : 26, rotation: 0 };
}
