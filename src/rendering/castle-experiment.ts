import type { PlanState, PlanObject } from "../data/plan-maps";
import { doorAvailable, roofVisible } from "../data/plan-maps";
import {
  wallJunction,
  planDoorAxis,
  sideDoorHiddenSide,
} from "./plan-geometry";
import { PLAN_RENDER_TILE as P, type PlanArtwork } from "./plan-renderer";
import { CASTLE } from "../dev/material-renderer";
import { exposedCornerCap } from "./plan-geometry";
import {
  castleFloor,
  castleDoorFrames,
  castleTallWalls,
  castleWallDecor,
  castleRugStyle,
  castleTallVariant,
  castlePassageFace,
  castleRoofCovered,
  castleCopingCell,
  castleCarpetBounds,
} from "./castle-experiment-layout";

type Rect = readonly [number, number, number, number];
type Sheet =
  | "walls"
  | "openings"
  | "floors"
  | "side"
  | "double"
  | "triple"
  | "props"
  | "bookcase"
  | "table"
  | "throne";
export type CastleExperimentArt = Record<Sheet, HTMLImageElement>;
const root = "assets/castle-experiment/";
export function loadCastleExperiment(): Promise<CastleExperimentArt> {
  const files: Record<Sheet, string> = {
    walls: "walls.png",
    openings: "openings.png",
    floors: "floors-and-props.png",
    side: "door-side.png",
    double: "door-double.png",
    triple: "door-triple.png",
    props: "props-transparent.png",
    bookcase: "bookcase-light.png",
    table: "table-benches.png",
    throne: "throne-top-down.png",
  };
  return Promise.all(
    Object.entries(files).map(
      ([key, file]) =>
        new Promise<[string, HTMLImageElement]>((resolve, reject) => {
          const im = new Image();
          im.onload = () => resolve([key, im]);
          im.onerror = () => reject(Error(`Nouveau set introuvable : ${file}`));
          im.src = import.meta.env.BASE_URL + root + file;
        }),
    ),
  ).then(Object.fromEntries) as Promise<CastleExperimentArt>;
}
const woodFloor: Rect = [1465, 614, 172, 170];
const coping: Rect = [786, 139, 94, 98];
const shortWalls: Rect[] = [
  [30, 138, 92, 100],
  [147, 138, 94, 100],
  [268, 138, 94, 100],
  [387, 138, 94, 100],
  [506, 138, 94, 100],
];
const tallWalls: Record<0 | 2 | 3, Rect> = {
  0: [42, 323, 102, 195],
  2: [339, 323, 105, 195],
  3: [487, 323, 107, 195],
};
const shortPillar: Rect = [1066, 138, 94, 100];
const banners: Rect[] = [
  [75, 416, 138, 264],
  [289, 416, 141, 264],
  [505, 416, 145, 264],
];

function tools(
  c: CanvasRenderingContext2D,
  art: CastleExperimentArt,
  old: PlanArtwork,
) {
  const stamp = (
    sheet: Sheet,
    r: Rect,
    x: number,
    y: number,
    w = P,
    h = P,
    flip = false,
  ) => {
    c.save();
    c.translate(x + (flip ? w : 0), y);
    if (flip) c.scale(-1, 1);
    c.drawImage(art[sheet], ...r, 0, 0, w, h);
    c.restore();
  };
  const floor = (s: PlanState, x: number, y: number) => {
    const material = castleFloor(s.map, x, y);
    if (material === "approved") {
      c.drawImage(
        old.castle,
        ...((x + y) % 3 ? CASTLE.floor : CASTLE.floor2),
        x * P,
        y * P,
        P,
        P,
      );
      c.fillStyle = "#285d942a";
      c.fillRect(x * P, y * P, P, P);
    } else if (material === "checker") {
      // The reference has 3×3 squares: invert every other tile to join the checks.
      for (let dy = 0; dy < 3; dy++)
        for (let dx = 0; dx < 3; dx++) {
          const dark = (x * 3 + dx + y * 3 + dy) % 2;
          stamp(
            "floors",
            dark ? [621, 188, 34, 35] : [584, 188, 34, 35],
            x * P + (dx * P) / 3,
            y * P + (dy * P) / 3,
            P / 3,
            P / 3,
          );
        }
      c.fillStyle = "#151c30a8";
      c.fillRect(x * P, y * P, P, P);
    } else {
      stamp("floors", woodFloor, x * P, y * P);
      c.fillStyle = "#111b28a0";
      c.fillRect(x * P, y * P, P, P);
    }
  };
  function face(x: number, y: number, tall = false, pillar?: "left" | "right") {
    const seed = (x * 7 + y * 11) >>> 0;
    if (pillar) {
      if (tall) {
        stamp("walls", tallWalls[0], x * P, y * P, P, 2 * P);
        stamp(
          "walls",
          [701, 323, 52, 195],
          x * P + (pillar === "left" ? 0 : P * 0.52),
          y * P,
          P * 0.48,
          2 * P,
          pillar === "left",
        );
      } else stamp("walls", shortPillar, x * P, y * P, P, P, pillar === "left");
      return;
    }
    const decor = castleWallDecor(x, y);
    if (tall) {
      // Tall masonry stays two cells high. No freestanding columns on long facades.
      stamp(
        "walls",
        tallWalls[decor === "window" ? 0 : castleTallVariant(x, y)],
        x * P,
        y * P,
        P,
        2 * P,
      );
      if (decor === "banner")
        stamp("openings", banners[2], x * P, y * P, P, 2 * P);
      if (decor === "window")
        stamp("openings", [513, 106, 142, 162], x * P, y * P);
    } else if (decor === "window")
      stamp("openings", [513, 106, 142, 162], x * P, y * P);
    else if (decor === "banner")
      stamp("walls", [586, 609, 101, 109], x * P, y * P);
    else if (decor === "torch")
      stamp("walls", [174, 607, 101, 111], x * P, y * P);
    else stamp("walls", shortWalls[seed % shortWalls.length], x * P, y * P);
  }

  function door(s: PlanState, o: PlanObject) {
    if (s.opened.has(o.id)) return;
    if (planDoorAxis(s.map, o) === "vertical") {
      const flip = sideDoorHiddenSide(s, o) === "right";
      for (let dy = 0; dy < o.h; dy++) {
        // The stone is exactly the same material and scale as an adjacent coping tile.
        stamp("walls", coping, o.x * P, (o.y + dy) * P);
        c.save();
        c.translate(o.x * P + (flip ? P : 0), (o.y + dy) * P);
        if (flip) c.scale(-1, 1);
        c.drawImage(art.side, 24, 0, 8, 32, P * 0.75, 0, P * 0.25, P);
        c.restore();
      }
    } else if (o.w === 2)
      stamp("double", [0, 0, 64, 32], o.x * P, o.y * P, 2 * P, o.h * P);
    else if (o.w === 3)
      stamp("triple", [0, 0, 96, 32], o.x * P, o.y * P, 3 * P, o.h * P);
    else
      stamp(
        "openings",
        [75, 106, 145, 163],
        o.x * P,
        o.y * P,
        o.w * P,
        o.h * P,
      );
  }
  return { stamp, floor, face, door };
}
/** This alternate renderer shares all geometry and interaction with the approved castle. */
export function renderCastleExperiment(
  s: PlanState,
  old: PlanArtwork,
  art: CastleExperimentArt,
  openedChests: ReadonlySet<number> = new Set(),
) {
  const a = document.createElement("canvas");
  a.width = s.map.width * P;
  a.height = s.map.height * P;
  const c = a.getContext("2d")!;
  c.imageSmoothingEnabled = false;
  const { stamp, floor, face, door } = tools(c, art, old),
    map = s.map,
    tall = castleTallWalls(map);
  // Fresh terrain underlay: never inherit the previous facade or staircase pixels.
  for (let y = 0; y < map.height; y++)
    for (let x = 0; x < map.width; x++) {
      if (map.building.has(y * map.width + x)) floor(s, x, y);
      else {
        const t = map.tiles[y * map.width + x],
          sw = old.regional.width / 8,
          sh = old.regional.height / 4;
        c.save();
        c.translate(x * P + (x % 2 ? P : 0), y * P + (y % 2 ? P : 0));
        c.scale(x % 2 ? -1 : 1, y % 2 ? -1 : 1);
        c.drawImage(
          old.regional,
          (t === "path" ? 2 : 0) * sw,
          0,
          sw,
          sh,
          0,
          0,
          P,
          P,
        );
        c.restore();
      }
    }
  for (const k of map.building) {
    if (map.tiles[k] !== "wall") continue;
    const x = k % map.width,
      y = Math.floor(k / map.width),
      joint = wallJunction(map, x, y, s.opened);
    if (castleCopingCell(s, k) || exposedCornerCap(s, x, y))
      stamp("walls", coping, x * P, y * P);
    else if (joint.axis === "vertical" && !castlePassageFace(s, x, y))
      stamp("walls", coping, x * P, y * P);
    else face(x, y, tall.has(k));
  }
  for (const f of castleDoorFrames(map))
    face(f.x, f.y, tall.has(f.y * map.width + f.x), f.pillar);
  for (const o of map.objects.filter((o) => o.type === "carpet")) {
    const b = castleCarpetBounds(map, o);
    const rugs: Rect[] = [
      [900, 239, 107, 111],
      [1034, 239, 106, 111],
      [1166, 239, 106, 111],
    ];
    const r = rugs[castleRugStyle(o.id)];
    // Repeat the inner weave, excluding each sample's dark outline and bevel.
    // Only the perimeter of the complete runner has an edge, never each tile.
    c.save();
    c.beginPath();
    c.rect(b.x * P, b.y * P, b.w * P, b.h * P);
    c.clip();
    for (let dy = 0; dy < b.h; dy++)
      for (let dx = 0; dx < b.w; dx++)
        stamp(
          "floors",
          [r[0] + 6, r[1] + 6, r[2] - 12, r[3] - 12],
          (b.x + dx) * P,
          (b.y + dy) * P,
          P,
          P,
        );
    c.strokeStyle = "#631117";
    c.lineWidth = 4;
    c.strokeRect(b.x * P + 2, b.y * P + 2, b.w * P - 4, b.h * P - 4);
    c.restore();
  }

  const props = art.props;
  const prop = (
    col: number,
    row: number,
    x: number,
    y: number,
    w: number,
    h: number,
  ) => {
    const sw = props.width / 3,
      sh = props.height / 3;
    c.drawImage(props, col * sw, row * sh, sw, sh, x, y, w, h);
  };
  for (const o of map.objects) {
    const x = o.x * P,
      y = o.y * P,
      w = o.w * P,
      h = o.h * P;
    if (o.type === "pillar") prop(2, 2, x - 7, y - 10, P + 14, P + 20);
    if (o.type === "chest")
      prop(
        o.id % 3,
        openedChests.has(o.id) ? 1 : 0,
        x - 8,
        y - 8,
        P + 16,
        P + 16,
      );
    if (o.type === "reinforcement") prop(1, 2, x - 8, y - 8, P + 16, P + 16);
    if (o.type === "bookcase") c.drawImage(art.bookcase, x, y, w, h);
    if (o.type === "bookcase-vertical") {
      c.save();
      c.translate(x + w, y);
      c.rotate(Math.PI / 2);
      c.drawImage(art.bookcase, 0, 0, h, w);
      c.restore();
    }
    if (o.type === "table-benches") c.drawImage(art.table, x, y, w, h);
    if (o.type === "stairs") {
      // Plain lower masonry backs every transparent pixel of the staircase.
      for (let dy = 0; dy < o.h; dy++)
        for (let dx = 0; dx < o.w; dx++)
          stamp("walls", [42, 424, 102, 94], x + dx * P, y + dy * P);
      // One broad staircase: side rails only at the outer edges, repeating treads inside.
      const sx = props.width / 1263,
        sy = props.height / 1246;
      const draw = (r: Rect, xx: number, ww: number) =>
        c.drawImage(
          props,
          r[0] * sx,
          r[1] * sy,
          r[2] * sx,
          r[3] * sy,
          xx,
          y,
          ww,
          h,
        );
      draw([92, 865, 25, 288], x, P * 0.12);
      for (let dx = 0; dx < o.w; dx++)
        draw(
          [119, 865, 224, 288],
          x + P * 0.12 + (dx * (w - P * 0.24)) / o.w,
          (w - P * 0.24) / o.w,
        );
      draw([346, 865, 25, 288], x + w - P * 0.12, P * 0.12);
    }
    if (o.type === "throne") c.drawImage(art.throne, x, y, w, h);
    if (o.type === "door") door(s, o);
  }
  return a;
}
export function renderCastleExperimentRoof(
  s: PlanState,
  old: PlanArtwork,
  art: CastleExperimentArt,
) {
  const a = document.createElement("canvas");
  a.width = s.map.width * P;
  a.height = s.map.height * P;
  const c = a.getContext("2d")!;
  c.imageSmoothingEnabled = false;
  const { stamp, door } = tools(c, art, old),
    map = s.map;
  // This layer owns roofs only. Repainting legacy facades here leaked old art
  // over the lower course of the new two-cell walls after opening a room.
  for (const k of map.building) {
    if (!castleRoofCovered(s, k)) continue;
    const x = k % map.width,
      y = Math.floor(k / map.width);
    c.fillStyle = "#22364a";
    c.fillRect(x * P, y * P, P, P);
    c.drawImage(old.castle, ...CASTLE.roof, x * P, y * P, P, P);
  }
  // Only available gates are visible through a closed roof. Their neighbors
  // remain covered until that part of the building has actually been revealed.
  for (const o of map.doors) if (doorAvailable(s, o)) door(s, o);

  return a;
}
