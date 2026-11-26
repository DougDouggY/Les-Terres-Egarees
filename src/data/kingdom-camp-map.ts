import type { Cell, Terrain } from "../game/types";
export const CAMP_W = 40,
  CAMP_H = 28;
export const campStart = { x: 4, y: 24 };
export const campVillage = {
  x: 28,
  y: 7,
  w: 3,
  h: 3,
  name: "Village en bois",
  entry: { x: 29, y: 9 },
} as const;
export const campBuildings = [
  { id: "barracks", name: "Baraquement", x: 12, y: 7, w: 6, h: 4 },
  { id: "store", name: "Réserve", x: 12, y: 15, w: 5, h: 3 },
  { id: "village", ...campVillage },
  { id: "tower-sw", name: "Tour de garde", x: 9, y: 21, w: 2, h: 2 },
  { id: "tower-se", name: "Tour de garde", x: 15, y: 21, w: 2, h: 2 },
] as const;
export const campLandmarks = [
  { name: "Arrivée proposée", x: 4, y: 24 },
  { name: "Entrée principale", x: 12, y: 23 },
  { name: "Cour centrale", x: 22, y: 13 },
  { name: "Passage secondaire", x: 9, y: 17 },
  { name: "Enclos vide", x: 29, y: 18 },
  { name: "Entrée du village", x: 29, y: 10 },
  { name: "Rivière", x: 2, y: 12 },
  { name: "Montagnes", x: 37, y: 1 },
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
    const blocked =
      terrain === "wall" || terrain === "rock" || terrain === "water";
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
            earth: 28,
          } as Partial<Record<Terrain, number>>
        )[terrain] ?? 0,
    });
  }
  // Irregular woodland edge; all camp architecture is aligned to complete cells.
  for (const c of cells) {
    const ripple = Math.sin(c.y * 0.8) * 1.5;
    if (
      c.x < 2 + ripple ||
      c.x > 37 - ripple ||
      c.y < 2 + Math.sin(c.x * 0.6) ||
      c.y > 26 + Math.sin(c.x * 0.6)
    )
      set(c.x, c.y, (c.x + c.y) % 3 === 0 ? "forest" : "tree");
  }
  for (const [cx, cy, rx, ry] of [
    [5, 6, 4, 4],
    [5, 13, 3, 3],
    [22, 2, 3, 2],
    [37, 18, 2, 5],
  ])
    for (let y = cy - ry; y <= cy + ry; y++)
      for (let x = cx - rx; x <= cx + rx; x++) {
        const d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
        if (d < 1 + Math.sin(x * 2 + y) * 0.16)
          set(x, y, d < 0.45 ? "tree" : "forest");
      }
  for (let y = 5; y < 23; y++) for (let x = 10; x < 36; x++) set(x, y, "earth");
  for (let x = 9; x <= 36; x++) {
    set(x, 4, "wall");
    set(x, 23, "wall");
  }
  for (let y = 4; y <= 23; y++) {
    set(9, y, "wall");
    set(36, y, "wall");
  }
  const road = (x: number, y: number) => set(x, y, "road");
  for (let x = 2; x <= 13; x++) for (const y of [24, 25]) road(x, y);
  for (let y = 12; y <= 25; y++) for (const x of [12, 13]) road(x, y);
  for (let x = 12; x <= 32; x++) for (const y of [12, 13]) road(x, y);
  for (let y = 6; y <= 21; y++) for (const x of [22, 23]) road(x, y);
  for (let x = 5; x <= 23; x++) for (const y of [17, 18]) road(x, y);
  // Keep the road inside the western wall, except for its two-cell opening.
  for (const y of [17, 18]) road(9, y);
  for (const b of campBuildings)
    for (let y = b.y; y < b.y + b.h; y++)
      for (let x = b.x; x < b.x + b.w; x++) set(x, y, "wall");
  // Empty holding yard. No prisoners or recruitment identities are created.
  for (let x = 26; x <= 33; x++) {
    set(x, 16, "wall");
    set(x, 21, "wall");
  }
  for (let y = 16; y <= 21; y++) {
    set(26, y, "wall");
    set(33, y, "wall");
  }
  for (const y of [18, 19]) set(26, y, "earth");
  for (let x = 27; x <= 32; x++)
    for (let y = 17; y <= 20; y++) set(x, y, "earth");
  // The nine village cells form one landmark, with the southern middle as its gate.
  for (let dy = 0; dy < 3; dy++)
    for (let dx = 0; dx < 3; dx++) {
      const c = cells[(campVillage.y + dy) * CAMP_W + campVillage.x + dx];
      c.villagePart = { dx, dy };
    }
  set(campVillage.entry.x, campVillage.entry.y, "floor");
  cells[campVillage.entry.y * CAMP_W + campVillage.entry.x].defense = 3;
  // River and mountain art is reused unchanged from the prologue atlas.
  for (let y = 0; y < CAMP_H; y++) {
    const x = Math.max(0, Math.round(1 + Math.sin(y / 4) * 0.7));
    for (const dx of [0, 1]) set(x + dx, y, "water");
  }
  for (let y = 0; y < CAMP_H; y++)
    for (let x = 0; x < 5; x++) {
      const c = cells[y * CAMP_W + x];
      if (
        c.terrain !== "water" &&
        c.terrain !== "road" &&
        [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ].some(
          ([dx, dy]) => cells[(y + dy) * CAMP_W + x + dx]?.terrain === "water",
        )
      )
        set(x, y, "sand");
    }
  for (let y = 0; y < 3; y++)
    for (let x = 34 + y; x < CAMP_W; x++) set(x, y, "rock");
  return { cells, routes: [] as number[][][], width: CAMP_W, height: CAMP_H };
}
