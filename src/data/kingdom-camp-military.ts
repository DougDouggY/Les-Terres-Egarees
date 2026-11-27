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
  const width = 40,
    height = 32,
    start = { x: 18, y: 30 };
  const buildings = [
    {
      id: "main-barracks",
      name: "Grande caserne",
      kind: "barracks",
      x: 5,
      y: 4,
      w: 9,
      h: 7,
      variant: 0,
      description: "Le cantonnement principal des soldats du Royaume.",
    },
    {
      id: "officers",
      name: "Logement des officiers",
      kind: "house",
      x: 25,
      y: 3,
      w: 8,
      h: 6,
      variant: 1,
      description: "Le logement et le poste de travail des officiers du camp.",
    },
    {
      id: "stores",
      name: "Entrepôt de matériel",
      kind: "warehouse",
      x: 27,
      y: 13,
      w: 9,
      h: 7,
      variant: 2,
      description: "Les réserves et l’équipement de la garnison.",
    },
    {
      id: "prison",
      name: "Prison du camp",
      kind: "cells",
      x: 6,
      y: 21,
      w: 10,
      h: 7,
      variant: 3,
      description: "Le bâtiment où le Royaume retient ses prisonniers.",
    },
    {
      id: "second-barracks",
      name: "Petite caserne",
      kind: "barracks",
      x: 19,
      y: 23,
      w: 8,
      h: 6,
      variant: 0,
      description: "Un second logement de soldats, près de la cour basse.",
    },
    {
      id: "provisions",
      name: "Intendance",
      kind: "house",
      x: 3,
      y: 13,
      w: 6,
      h: 5,
      variant: 1,
      description: "Le lieu de préparation et de distribution des provisions.",
    },
  ].map((b) => ({
    ...b,
    entry: { x: b.x + Math.floor(b.w / 2), y: b.y + b.h - 1 },
  }));
  const props: MilitaryProp[] = [
    { id: "well", type: "well", x: 20, y: 14, w: 2, h: 2 },
    ...[
      [1, 2],
      [16, 2],
      [36, 3],
      [1, 25],
      [34, 28],
      [1, 29],
      [37, 10],
      [15, 14],
      [28, 25],
    ].map(([x, y], i) => ({
      id: `tree-${i}`,
      type: "tree" as const,
      x,
      y,
      w: 2,
      h: 2,
      sprite: i % 3 === 1 ? 1 : 0,
    })),
    ...[
      [3, 4],
      [14, 6],
      [16, 8],
      [22, 5],
      [37, 6],
      [24, 12],
      [10, 15],
      [16, 22],
      [28, 21],
      [31, 25],
      [10, 29],
      [30, 1],
      [4, 23],
      [36, 25],
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
    { id: "store-crates", type: "crate", x: 36, y: 15, w: 1, h: 1, sprite: 12 },
    {
      id: "store-barrels",
      type: "barrel",
      x: 36,
      y: 17,
      w: 1,
      h: 1,
      sprite: 13,
    },
    { id: "store-cart", type: "cart", x: 31, y: 21, w: 2, h: 1, sprite: 14 },
    {
      id: "officers-crate",
      type: "crate",
      x: 33,
      y: 5,
      w: 1,
      h: 1,
      sprite: 12,
    },
    { id: "woodpile", type: "firewood", x: 10, y: 17, w: 2, h: 1, sprite: 3 },
    {
      id: "provisions-barrel",
      type: "barrel",
      x: 3,
      y: 18,
      w: 1,
      h: 1,
      sprite: 13,
    },
    { id: "weapons", type: "rack", x: 16, y: 10, w: 1, h: 1, sprite: 8 },
    { id: "lower-cart", type: "cart", x: 30, y: 29, w: 2, h: 1, sprite: 14 },
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
  h(12, 3, 13, [9, 10]);
  h(2, 23, 35, []);
  h(10, 23, 35, [29, 30]);
  v(23, 3, 9, [6, 7]);
  v(35, 3, 9, [6, 7]);
  h(19, 3, 15, [10, 11, 12]);
  v(3, 20, 28, [24, 25]);
  v(37, 13, 20, [18, 19], "fence");
  h(22, 30, 37, [33, 34], "fence");
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
  road(17, 0, 2, 32);
  road(9, 11, 10, 2);
  road(29, 9, 2, 4);
  road(18, 11, 12, 2);
  for (let y = 12; y <= 18; y++) {
    const left = y === 12 || y === 18 ? 17 : 16;
    road(left, y, y === 12 || y === 18 ? 7 : 9, 1);
  }
  road(6, 18, 12, 1);
  road(9, 13, 2, 6);
  road(11, 28, 8, 2);
  road(23, 29, 8, 2);
  road(29, 20, 2, 10);
  road(24, 20, 11, 2);
  road(24, 17, 2, 5);
  for (const b of buildings) road(b.entry.x, b.entry.y + 1, 1, 1);
  for (let y = 24; y < 32; y++)
    for (let x = 38 - (y > 28 ? 1 : 0); x < 40; x++) set(x, y, "water", false);
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
