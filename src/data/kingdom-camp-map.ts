import type { Cell, Terrain } from "../game/types";
export const CAMP_W = 40,
  CAMP_H = 28;
export const campStart = { x: 6, y: 24 };
export const campVillage = {
  x: 28,
  y: 7,
  w: 3,
  h: 3,
  name: "Village en bois",
  entry: { x: 29, y: 9 },
} as const;
// The compact village is the only building footprint on this board.
export const campBuildings = [{ id: "village", ...campVillage }] as const;
export const campMountainPatches = [
  { x: 17, y: 3, rx: 3, ry: 2 },
  { x: 35, y: 22, rx: 4, ry: 3 },
  { x: 7, y: 12, rx: 2, ry: 3 },
] as const;
/** Navigation checks only; these names are never drawn on the map. */
export const campLandmarks = [
  { name: "Arrivée", ...campStart },
  { name: "Village", x: 29, y: 10 },
  { name: "Rivière", x: 3, y: 12 },
  { name: "Montagne", x: 35, y: 22 },
];
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
  function set(x: number, y: number, terrain: Terrain) {
    if (x < 0 || y < 0 || x >= CAMP_W || y >= CAMP_H) return;
    const blocked = ["wall", "rock", "water"].includes(terrain);
    Object.assign(cells[y * CAMP_W + x], {
      terrain,
      walk: !blocked,
      cost: blocked
        ? 99
        : terrain === "road"
          ? 0.75
          : ["forest", "tree"].includes(terrain)
            ? 2
            : 1,
      defense: ["forest", "tree"].includes(terrain) ? 2 : 0,
      opaque: (blocked && terrain !== "water") || terrain === "tree",
      tile:
        (
          {
            water: 4,
            sand: 3,
            grass: 0,
            road: 2,
            forest: 5,
            tree: 6,
            rock: 7,
            wall: 9,
            floor: 26,
          } as Partial<Record<Terrain, number>>
        )[terrain] ?? 0,
    });
  }
  // Uneven groves and open clearings, rather than a rectangular fortified yard.
  for (const [cx, cy, rx, ry] of [
    [12, 6, 5, 3],
    [8, 20, 3, 3],
    [23, 24, 4, 3],
    [34, 13, 4, 3],
    [25, 3, 3, 2],
    [18, 15, 3, 3],
    [2, 3, 3, 3],
    [38, 4, 2, 4],
  ])
    for (let y = cy - ry - 1; y <= cy + ry + 1; y++)
      for (let x = cx - rx - 1; x <= cx + rx + 1; x++) {
        const d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
        if (d < 1 + Math.sin(x * 1.8 + y) * 0.18)
          set(x, y, d < 0.48 ? "tree" : "forest");
      }
  for (const p of campMountainPatches)
    for (let y = p.y - p.ry; y <= p.y + p.ry; y++)
      for (let x = p.x - p.rx; x <= p.x + p.rx; x++)
        if (((x - p.x) / p.rx) ** 2 + ((y - p.y) / p.ry) ** 2 <= 1.1)
          set(x, y, "rock");
  // A narrow stream with two banks, not a moat around the battlefield.
  for (let y = 0; y < CAMP_H; y++) {
    const x = 3 + Math.round(Math.sin(y / 4) * 1.4);
    for (const dx of [0, 1]) set(x + dx, y, "water");
  }
  for (const c of cells)
    if (
      c.terrain !== "water" &&
      c.x < 7 &&
      [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ].some(([dx, dy]) => {
        const x = c.x + dx,
          y = c.y + dy;
        return (
          x >= 0 &&
          x < CAMP_W &&
          y >= 0 &&
          y < CAMP_H &&
          cells[y * CAMP_W + x].terrain === "water"
        );
      })
    )
      set(c.x, c.y, "sand");
  const routes = [
    [
      [6, 24],
      [11, 24],
      [11, 21],
      [15, 21],
      [15, 19],
      [21, 19],
      [21, 15],
      [25, 15],
      [25, 11],
      [29, 11],
      [29, 9],
    ],
    [
      [21, 19],
      [29, 19],
      [29, 16],
      [35, 16],
    ],
  ];
  for (const route of routes)
    for (let i = 1; i < route.length; i++) {
      let [x, y] = route[i - 1];
      const [tx, ty] = route[i];
      while (true) {
        set(x, y, "road");
        set(x + 1, y, "road");
        if (x === tx && y === ty) break;
        if (x !== tx) x += Math.sign(tx - x);
        else y += Math.sign(ty - y);
      }
    }
  for (let dy = 0; dy < 3; dy++)
    for (let dx = 0; dx < 3; dx++) {
      const x = campVillage.x + dx,
        y = campVillage.y + dy;
      set(x, y, "wall");
      cells[y * CAMP_W + x].villagePart = { dx, dy };
    }
  set(campVillage.entry.x, campVillage.entry.y, "floor");
  cells[campVillage.entry.y * CAMP_W + campVillage.entry.x].defense = 3;
  for (let x = campVillage.entry.x - 1; x <= campVillage.entry.x + 1; x++)
    set(x, campVillage.entry.y + 1, "grass");
  return { cells, routes, width: CAMP_W, height: CAMP_H };
}
