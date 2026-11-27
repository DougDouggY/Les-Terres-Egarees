import type { Cell, Terrain } from "../game/types";
import type { campBuildings } from "./kingdom-camp-map";
export type MilitaryBuilding = (typeof campBuildings)[number] & {
  description: string;
};
export type MilitaryProp = {
  id: string;
  type:
    | "tree"
    | "bush"
    | "well"
    | "crate"
    | "barrel"
    | "cart"
    | "rack"
    | "firewood";
  x: number;
  y: number;
  w: number;
  h: number;
  sprite?: number;
  walk?: boolean;
};
export type MilitaryWall = {
  x: number;
  y: number;
  axis: "horizontal" | "vertical";
  material: "stone" | "fence";
};
export type MilitaryCamp = {
  width: number;
  height: number;
  cells: Cell[];
  start: { x: number; y: number };
  buildings: MilitaryBuilding[];
  props: MilitaryProp[];
  walls: MilitaryWall[];
};
/** Separate close-scale test composition. No units, visit rewards or battle events. */
export function militaryCamp(): MilitaryCamp {
  const width = 20,
    height = 24,
    start = { x: 9, y: 22 };
  const buildings = [
    {
      id: "main-barracks",
      name: "Grande caserne",
      kind: "barracks",
      x: 3,
      y: 3,
      w: 3,
      h: 2,
      variant: 0,
      description: "Le cantonnement principal des soldats du Royaume.",
    },
    {
      id: "officers",
      name: "Logement des officiers",
      kind: "house",
      x: 13,
      y: 2,
      w: 2,
      h: 2,
      variant: 1,
      description: "Le logement et le poste de travail des officiers du camp.",
    },
    {
      id: "stores",
      name: "Entrepôt de matériel",
      kind: "warehouse",
      x: 14,
      y: 10,
      w: 3,
      h: 2,
      variant: 2,
      description: "Les réserves et l’équipement de la garnison.",
    },
    {
      id: "prison",
      name: "Prison du camp",
      kind: "cells",
      x: 4,
      y: 16,
      w: 3,
      h: 2,
      variant: 3,
      description: "Le bâtiment où le Royaume retient ses prisonniers.",
    },
    {
      id: "second-barracks",
      name: "Petite caserne",
      kind: "barracks",
      x: 11,
      y: 18,
      w: 2,
      h: 2,
      variant: 4,
      description: "Un second logement de soldats, près de la cour basse.",
    },
    {
      id: "provisions",
      name: "Intendance",
      kind: "house",
      x: 3,
      y: 9,
      w: 2,
      h: 2,
      variant: 5,
      description: "Le lieu de préparation et de distribution des provisions.",
    },
  ].map((b) => ({
    ...b,
    entry: { x: b.x + Math.floor(b.w / 2), y: b.y + b.h - 1 },
  }));
  const props: MilitaryProp[] = [
    { id: "well", type: "well", x: 10, y: 10, w: 1, h: 1 },
    ...[
      [0, 2],
      [8, 2],
      [18, 2],
      [0, 20],
      [17, 22],
      [0, 23],
      [18, 7],
      [6, 11],
      [14, 20],
    ].map(([x, y], i) => ({
      id: `tree-${i}`,
      type: "tree" as const,
      x,
      y,
      w: 1,
      h: 1,
      sprite: i % 3 === 1 ? 1 : 0,
    })),
    ...[
      [1, 4],
      [6, 4],
      [7, 7],
      [11, 3],
      [18, 5],
      [12, 8],
      [5, 10],
      [7, 16],
      [13, 15],
      [16, 17],
      [5, 22],
      [15, 0],
      [3, 18],
      [17, 17],
    ].map(([x, y], i) => ({
      id: `bush-${i}`,
      type: "bush" as const,
      x,
      y,
      w: 1,
      h: 1,
      sprite: 2,
      walk: true,
    })),
    { id: "store-crates", type: "crate", x: 17, y: 10, w: 1, h: 1, sprite: 12 },
    {
      id: "store-barrels",
      type: "barrel",
      x: 17,
      y: 11,
      w: 1,
      h: 1,
      sprite: 13,
    },
    { id: "store-cart", type: "cart", x: 15, y: 14, w: 1, h: 1, sprite: 14 },
    {
      id: "officers-crate",
      type: "crate",
      x: 15,
      y: 3,
      w: 1,
      h: 1,
      sprite: 12,
    },
    { id: "woodpile", type: "firewood", x: 6, y: 12, w: 1, h: 1, sprite: 3 },
    {
      id: "provisions-barrel",
      type: "barrel",
      x: 3,
      y: 11,
      w: 1,
      h: 1,
      sprite: 13,
    },
    { id: "weapons", type: "rack", x: 7, y: 4, w: 1, h: 1, sprite: 8 },
    { id: "lower-cart", type: "cart", x: 16, y: 21, w: 1, h: 1, sprite: 14 },
  ];
  const walls: MilitaryWall[] = [];
  const h = (
    y: number,
    from: number,
    to: number,
    gaps: number[],
    material: "stone" | "fence" = "stone",
  ) => {
    for (let x = from; x <= to; x++)
      if (!gaps.includes(x)) walls.push({ x, y, axis: "horizontal", material });
  };
  const v = (
    x: number,
    from: number,
    to: number,
    gaps: number[],
    material: "stone" | "fence" = "stone",
  ) => {
    for (let y = from; y <= to; y++)
      if (!gaps.includes(y) && !walls.some((p) => p.x === x && p.y === y))
        walls.push({ x, y, axis: "vertical", material });
  };
  h(6, 2, 7, [4, 5]);
  h(1, 12, 17, []);
  h(6, 12, 17, [14, 15]);
  v(12, 2, 5, [4, 5]);
  v(17, 2, 5, [4, 5]);
  h(14, 2, 13, [7, 8, 9]);
  v(2, 15, 20, [18, 19]);
  v(18, 9, 15, [12, 13], "fence");
  h(15, 14, 18, [16, 17], "fence");
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
  const set = (
    x: number,
    y: number,
    terrain: Terrain,
    walk = true,
    defense = 0,
  ) => {
    Object.assign(cells[y * width + x], {
      terrain,
      walk,
      cost: walk
        ? terrain === "road"
          ? 0.75
          : terrain === "forest"
            ? 2
            : 1
        : 99,
      defense,
      opaque: terrain === "wall" || terrain === "tree",
      tile: terrain === "road" ? 2 : 0,
    });
  };
  const road = (x: number, y: number, w: number, h: number) => {
    for (let dy = 0; dy < h; dy++)
      for (let dx = 0; dx < w; dx++) set(x + dx, y + dy, "road");
  };
  road(8, 0, 2, 24);
  road(4, 5, 6, 1);
  road(5, 6, 2, 8);
  road(14, 4, 2, 4);
  road(9, 7, 7, 2);
  for (let y = 9; y <= 13; y++)
    road(y === 9 || y === 13 ? 8 : 7, y, y === 9 || y === 13 ? 4 : 6, 1);
  road(4, 11, 5, 1);
  road(5, 18, 5, 2);
  road(12, 20, 6, 2);
  road(17, 12, 2, 10);
  road(12, 12, 6, 2);
  road(12, 13, 2, 4);
  for (const b of buildings) road(b.entry.x, b.entry.y + 1, 1, 1);
  for (let y = 18; y < 24; y++)
    for (let x = 19 - (y > 21 ? 1 : 0); x < 20; x++) set(x, y, "water", false);
  for (const p of props)
    for (let dy = 0; dy < p.h; dy++)
      for (let dx = 0; dx < p.w; dx++)
        set(
          p.x + dx,
          p.y + dy,
          p.type === "tree" ? "tree" : p.type === "bush" ? "forest" : "wagon",
          !!p.walk,
          p.type === "bush" ? 1 : 0,
        );
  for (const p of walls) set(p.x, p.y, "wall", false, 1);
  for (const b of buildings)
    for (let y = b.y; y < b.y + b.h; y++)
      for (let x = b.x; x < b.x + b.w; x++) {
        set(x, y, "wall", false);
        cells[y * width + x].interactive = `visit:${b.id}`;
      }
  return { width, height, start, cells, buildings, props, walls };
}
export function militaryBuildingAt(scene: MilitaryCamp, x: number, y: number) {
  return scene.buildings.find(
    (b) =>
      (x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h) ||
      (x === b.entry.x && y === b.entry.y + 1),
  );
}
export function militaryVisitCell(scene: MilitaryCamp, b: MilitaryBuilding) {
  return (b.entry.y + 1) * scene.width + b.entry.x;
}
