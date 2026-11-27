import type { TerrainDraft } from "./future-terrain-maps";
export type Land =
  | "grass"
  | "road"
  | "forest"
  | "rock"
  | "water"
  | "mountain"
  | "paving"
  | "bridge";
export type DraftBuilding = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  kind: "house" | "store" | "barracks" | "stable" | "headquarters";
};
export type DraftProp = {
  id: string;
  frame: number;
  x: number;
  y: number;
  w: number;
  h: number;
};
export type DraftGate = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  vertical: boolean;
};
export type LandscapeDraft = {
  terrain: Land[];
  walls: { x: number; y: number }[];
  towers: { x: number; y: number }[];
  buildings: DraftBuilding[];
  gates: DraftGate[];
  props: DraftProp[];
};
export const LANDSCAPE_ASSETS = {
  regional: "assets/regional-tiles.png",
  camp: "assets/future-terrain/camp.png",
  fortress: "assets/chapter-5-6/fortress-materials.png",
  objects: "assets/chapter-5-6/objects-atlas.png",
  sideGate: "assets/chapter-5-6/side-gate.png",
} as const;
/** Graphical terrain proposals only. Gate openings are inspection states, never battle events. */
export function campaignTerrainDrafts(): TerrainDraft[] {
  const create = (
    id: "convoy" | "fortress",
    width: number,
    height: number,
    title: string,
  ): TerrainDraft => ({
    id,
    title,
    width,
    height,
    atlas: "wilds",
    tiles: Array(width * height).fill(0),
    blocked: Array(width * height).fill(false),
    // Connectivity anchors describe road accesses, not unit deployment or mission objectives.
    start: [2, height - 6],
    destination: [width - 3, 5],
    layout: {
      terrain: Array(width * height).fill("grass"),
      walls: [],
      towers: [],
      buildings: [],
      gates: [],
      props: [],
    },
  });
  const convoy = create("convoy", 56, 40, "Chapitre V · Le convoi"),
    fort = create("fortress", 56, 44, "Chapitre VI · La forteresse");
  const put = (m: TerrainDraft, x: number, y: number, t: Land) => {
    if (x < 0 || y < 0 || x >= m.width || y >= m.height) return;
    m.layout!.terrain[y * m.width + x] = t;
  };
  const disk = (
    m: TerrainDraft,
    cx: number,
    cy: number,
    rx: number,
    ry: number,
    t: Land,
  ) => {
    for (let y = cy - ry; y <= cy + ry; y++)
      for (let x = cx - rx; x <= cx + rx; x++)
        if (
          ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <
          1 + Math.sin(x * 3 + y) * 0.13
        )
          put(m, x, y, t);
  };
  const line = (
    m: TerrainDraft,
    points: number[][],
    width: number,
    t: Land,
  ) => {
    for (let p = 1; p < points.length; p++) {
      const [a, b] = points[p - 1],
        [x, y] = points[p],
        steps = Math.max(Math.abs(x - a), Math.abs(y - b));
      for (let i = 0; i <= steps; i++) {
        const cx = Math.round(a + ((x - a) * i) / Math.max(1, steps)),
          cy = Math.round(b + ((y - b) * i) / Math.max(1, steps));
        for (let dy = 0; dy < width; dy++)
          for (let dx = 0; dx < width; dx++) put(m, cx + dx, cy + dy, t);
      }
    }
  };
  for (const [x, y, rx, ry] of [
    [9, 5, 8, 5],
    [24, 6, 6, 5],
    [46, 32, 9, 7],
    [6, 33, 6, 6],
  ])
    disk(convoy, x, y, rx, ry, "mountain");
  for (const [x, y, rx, ry] of [
    [8, 15, 7, 5],
    [22, 31, 9, 6],
    [43, 8, 9, 5],
    [43, 25, 6, 5],
    [23, 16, 6, 4],
  ])
    disk(convoy, x, y, rx, ry, "forest");
  for (const [x, y, rx, ry] of [
    [16, 8, 3, 3],
    [22, 9, 3, 3],
    [36, 31, 3, 4],
  ])
    disk(convoy, x, y, rx, ry, "rock");
  for (let y = 0; y < 40; y++) {
    const x = 31 + Math.round(Math.sin(y * 0.15) * 2);
    for (let dx = 0; dx < 3; dx++) put(convoy, x + dx, y, "water");
  }
  line(
    convoy,
    [
      [0, 25],
      [12, 25],
      [23, 21],
      [33, 19],
      [42, 17],
      [55, 12],
    ],
    4,
    "road",
  );
  line(
    convoy,
    [
      [5, 25],
      [9, 21],
      [14, 15],
      [18, 12],
      [26, 13],
      [29, 19],
    ],
    2,
    "road",
  );
  line(
    convoy,
    [
      [38, 19],
      [38, 26],
      [45, 29],
      [51, 23],
      [51, 15],
    ],
    2,
    "road",
  );
  for (let y = 19; y <= 23; y++)
    for (let x = 29; x <= 35; x++) put(convoy, x, y, "bridge");
  convoy.layout!.buildings = [
    { id: "road-house", kind: "house", x: 4, y: 19, w: 5, h: 4 },
    { id: "abandoned-store", kind: "store", x: 45, y: 3, w: 6, h: 5 },
  ];
  convoy.layout!.props = [
    { id: "wagon-a", frame: 0, x: 9, y: 25, w: 3, h: 2 },
    { id: "wagon-b", frame: 1, x: 14, y: 25, w: 3, h: 2 },
    { id: "cart", frame: 2, x: 47, y: 9, w: 2, h: 2 },
    { id: "barrels", frame: 10, x: 42, y: 7, w: 1, h: 1 },
    { id: "road-barricade", frame: 3, x: 20, y: 10, w: 2, h: 1 },
  ];
  convoy.start = [1, 26];
  convoy.destination = [54, 13];
  // Large exterior: vegetated slopes, a stream and three approaches to the enceinte.
  for (const [x, y, rx, ry] of [
    [3, 5, 6, 7],
    [50, 5, 6, 6],
    [5, 38, 7, 6],
    [49, 37, 7, 7],
  ])
    disk(fort, x, y, rx, ry, "mountain");
  for (const [x, y, rx, ry] of [
    [5, 19, 4, 6],
    [50, 20, 5, 7],
    [15, 40, 6, 4],
    [36, 40, 6, 4],
  ])
    disk(fort, x, y, rx, ry, "forest");
  for (let y = 0; y < 44; y++) {
    const bank = 7 + Math.round(Math.sin(y * 0.17));
    for (let dx = 0; dx < 3; dx++) put(fort, bank + dx, y, "water");
  }
  for (let y = 7; y <= 31; y++)
    for (let x = 13; x <= 43; x++) put(fort, x, y, "paving");
  line(
    fort,
    [
      [25, 43],
      [25, 32],
      [25, 27],
      [25, 18],
      [32, 18],
      [32, 15],
    ],
    3,
    "road",
  );
  line(
    fort,
    [
      [0, 28],
      [6, 28],
      [11, 20],
      [15, 18],
      [24, 18],
    ],
    2,
    "road",
  );
  line(
    fort,
    [
      [55, 27],
      [48, 27],
      [45, 23],
      [41, 23],
      [41, 19],
      [31, 19],
    ],
    2,
    "road",
  );
  for (let y = 26; y <= 29; y++)
    for (let x = 5; x <= 11; x++) put(fort, x, y, "bridge");
  const fl = fort.layout!;
  for (let x = 12; x <= 44; x++)
    for (const y of [6, 32]) fl.walls.push({ x, y });
  for (let y = 7; y < 32; y++)
    for (const x of [12, 44]) fl.walls.push({ x, y });
  fl.gates = [
    { id: "main-gate", x: 25, y: 32, w: 3, h: 1, vertical: false },
    { id: "west-postern", x: 12, y: 18, w: 1, h: 2, vertical: true },
    { id: "east-postern", x: 44, y: 23, w: 1, h: 2, vertical: true },
  ];
  fl.walls = fl.walls.filter(
    (p) =>
      !fl.gates.some(
        (g) => p.x >= g.x && p.x < g.x + g.w && p.y >= g.y && p.y < g.y + g.h,
      ),
  );
  fl.towers = [
    { x: 11, y: 5 },
    { x: 43, y: 5 },
    { x: 11, y: 31 },
    { x: 43, y: 31 },
    { x: 22, y: 31 },
    { x: 28, y: 31 },
  ];
  fl.buildings = [
    { id: "barracks", kind: "barracks", x: 16, y: 10, w: 8, h: 6 },
    { id: "headquarters", kind: "headquarters", x: 29, y: 9, w: 10, h: 7 },
    { id: "stables", kind: "stable", x: 16, y: 22, w: 8, h: 6 },
    { id: "stores", kind: "store", x: 33, y: 24, w: 7, h: 5 },
  ];
  fl.props = [
    { id: "supplies-a", frame: 11, x: 35, y: 19, w: 2, h: 2 },
    { id: "supplies-b", frame: 10, x: 38, y: 19, w: 2, h: 2 },
    { id: "hay", frame: 14, x: 17, y: 20, w: 2, h: 1 },
    { id: "ballista-west", frame: 12, x: 16, y: 29, w: 2, h: 2 },
    { id: "ballista-east", frame: 12, x: 40, y: 29, w: 2, h: 2 },
    { id: "ram", frame: 13, x: 29, y: 37, w: 3, h: 2 },
    { id: "cage", frame: 8, x: 41, y: 11, w: 2, h: 2 },
    { id: "chest", frame: 9, x: 40, y: 17, w: 1, h: 1 },
    { id: "weapons", frame: 15, x: 24, y: 10, w: 2, h: 1 },
  ];
  fort.start = [25, 42];
  fort.destination = [26, 8];
  for (const m of [convoy, fort]) {
    const l = m.layout!;
    l.terrain.forEach(
      (t, k) => (m.blocked[k] = ["water", "mountain", "rock"].includes(t)),
    );
    for (const p of [
      ...l.walls,
      ...l.towers.flatMap((p) =>
        Array.from({ length: 9 }, (_, i) => ({
          x: p.x + (i % 3),
          y: p.y + Math.floor(i / 3),
        })),
      ),
    ])
      m.blocked[p.y * m.width + p.x] = true;
    for (const b of l.buildings)
      for (let y = b.y; y < b.y + b.h; y++)
        for (let x = b.x; x < b.x + b.w; x++) m.blocked[y * m.width + x] = true;
  }
  return [convoy, fort];
}
