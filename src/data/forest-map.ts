import type { Cell } from "../game/types";
/** Separate authored forest, no landmark from the prologue. Grid dimensions remain save-compatible. */
export function forestMap(width: number, height: number) {
  type ForestTerrain = "grass" | "road" | "forest" | "tree" | "rock" | "hill";
  const terrain: Record<
    ForestTerrain,
    [number, boolean, number, boolean, number]
  > = {
    grass: [1, true, 0, false, 0],
    road: [0.75, true, 0, false, 2],
    forest: [2, true, 2, false, 5],
    tree: [3, true, 3, true, 6],
    rock: [99, false, 0, true, 7],
    hill: [2, true, 1, false, 14],
  };
  const cells: Cell[] = Array.from({ length: width * height }, (_, i) => ({
    x: i % width,
    y: Math.floor(i / width),
    terrain: "grass",
    cost: 1,
    walk: true,
    defense: 0,
    opaque: false,
    tile: 0,
    base: "grass",
  }));
  const set = (x: number, y: number, t: ForestTerrain) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const [cost, walk, defense, opaque, tile] = terrain[t];
    Object.assign(cells[y * width + x], {
      terrain: t,
      cost,
      walk,
      defense,
      opaque,
      tile,
    });
  };
  // Uneven woodland masses leave a broad central clearing and two alternative tracks.
  for (const [cx, cy, rx, ry] of [
    [8, 8, 9, 7],
    [25, 8, 10, 6],
    [44, 9, 11, 8],
    [7, 30, 9, 8],
    [25, 34, 10, 5],
    [46, 32, 11, 7],
    [24, 20, 4, 3],
    [39, 24, 4, 4],
  ])
    for (let y = cy - ry; y <= cy + ry; y++)
      for (let x = cx - rx; x <= cx + rx; x++) {
        const d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
        if (d < 0.9 + Math.sin(x * 2 + y) * 0.14)
          set(x, y, d < 0.48 ? "tree" : "forest");
      }
  for (const [cx, cy] of [
    [11, 16],
    [22, 28],
    [36, 16],
    [46, 21],
    [52, 15],
  ]) {
    set(cx, cy, "rock");
    set(cx + 1, cy, "rock");
    set(cx, cy + 1, "hill");
  }
  const routes = [
    [
      [2, 24],
      [18, 24],
      [18, 23],
      [33, 23],
      [33, 21],
      [43, 21],
      [43, 17],
      [57, 17],
    ],
    [
      [18, 23],
      [18, 16],
      [29, 16],
      [29, 21],
      [33, 21],
    ],
    [
      [19, 24],
      [19, 29],
      [35, 29],
      [35, 23],
      [40, 23],
    ],
  ];
  for (const route of routes)
    for (let i = 1; i < route.length; i++) {
      let [x, y] = route[i - 1];
      const [tx, ty] = route[i];
      while (true) {
        set(x, y, "road");
        if (y + 1 < height) set(x, y + 1, "road");
        if (x === tx && y === ty) break;
        if (x !== tx) x += Math.sign(tx - x);
        else y += Math.sign(ty - y);
      }
    }
  // Starting clearings, interception line and Géraud's approach are deliberately open.
  for (const [cx, cy, r] of [
    [15, 22, 3],
    [15, 26, 3],
    [30, 23, 3],
    [33, 19, 2],
  ])
    for (let y = cy - r; y <= cy + r; y++)
      for (let x = cx - r; x <= cx + r; x++)
        if (cells[y * width + x]?.terrain !== "road") set(x, y, "grass");
  return { cells, routes };
}
