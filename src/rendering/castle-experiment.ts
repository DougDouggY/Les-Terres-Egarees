import type { PlanState, PlanObject } from "../data/plan-maps";
import { doorAvailable, roofVisible } from "../data/plan-maps";
import {
  wallJunction,
  planDoorAxis,
  sideDoorHiddenSide,
  carpetVisualBounds,
} from "./plan-geometry";
import {
  renderPlanBase,
  renderPlanRoof,
  PLAN_RENDER_TILE as P,
  type PlanArtwork,
} from "./plan-renderer";
import {
  castleFloor,
  castleDoorFrames,
  castleTallWalls,
  castleWallDecor,
  castleRugStyle,
} from "./castle-experiment-layout";

type Rect = readonly [number, number, number, number];
type Sheet =
  "walls" | "openings" | "floors" | "side" | "double" | "triple" | "props";
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
const floors: Record<string, Rect> = {
  slabs: [38, 187, 113, 114],
  cobbles: [175, 187, 113, 114],
  bricks: [311, 187, 112, 114],
  diamonds: [445, 187, 113, 114],
  checker: [582, 187, 111, 114],
  worn: [38, 327, 113, 113],
  mossSlabs: [175, 327, 113, 113],
  moss: [312, 327, 111, 113],
  patchwork: [445, 327, 113, 113],
  mossBricks: [582, 327, 111, 113],
  wood: [1465, 614, 172, 170],
};
const coping: Rect = [786, 139, 94, 98];
const shortWalls: Rect[] = [
  [30, 138, 92, 100],
  [147, 138, 94, 100],
  [268, 138, 94, 100],
  [387, 138, 94, 100],
  [506, 138, 94, 100],
];
const tallWalls: Rect[] = [
  [42, 323, 102, 195],
  [189, 323, 104, 195],
  [339, 323, 105, 195],
  [487, 323, 107, 195],
];
const shortPillar: Rect = [1066, 138, 94, 100];
const tallPillar: Rect = [676, 323, 105, 195];
const banners: Rect[] = [
  [75, 416, 138, 264],
  [289, 416, 141, 264],
  [505, 416, 145, 264],
];

function tools(c: CanvasRenderingContext2D, art: CastleExperimentArt) {
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
  const floor = (s: PlanState, x: number, y: number) =>
    stamp("floors", floors[castleFloor(s.map, x, y)], x * P, y * P);
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
      stamp("walls", tallWalls[seed % 4], x * P, y * P, P, 2 * P);
      if (decor === "banner")
        stamp("openings", banners[2], x * P, y * P, P, 2 * P);
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
      const flip = sideDoorHiddenSide(s, o) === "left";
      for (let dy = 0; dy < o.h; dy++)
        stamp("side", [0, 0, 32, 32], o.x * P, (o.y + dy) * P, P, P, flip);
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
) {
  const a = renderPlanBase(s, old),
    c = a.getContext("2d")!;
  c.imageSmoothingEnabled = false;
  const { stamp, floor, face, door } = tools(c, art),
    map = s.map,
    tall = castleTallWalls(map);
  for (const k of map.building)
    floor(s, k % map.width, Math.floor(k / map.width));
  for (const k of map.building) {
    if (map.tiles[k] !== "wall") continue;
    const x = k % map.width,
      y = Math.floor(k / map.width),
      joint = wallJunction(map, x, y, s.opened);
    if (joint.axis === "vertical") stamp("walls", coping, x * P, y * P);
    else face(x, y, tall.has(k));
  }
  for (const f of castleDoorFrames(map))
    face(f.x, f.y, tall.has(f.y * map.width + f.x), f.pillar);
  for (const o of map.objects.filter((o) => o.type === "carpet")) {
    const b = carpetVisualBounds(map, o);
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
    if (o.type === "chest") prop(o.id % 3, 0, x - 8, y - 8, P + 16, P + 16);
    if (o.type === "reinforcement") prop(1, 2, x - 8, y - 8, P + 16, P + 16);
    if (o.type === "stairs") {
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
    if (o.type === "throne")
      c.drawImage(old.directional, 305, 24, 420, 800, x, y, w, h);
    if (o.type === "door") door(s, o);
  }
  return a;
}
export function renderCastleExperimentRoof(
  s: PlanState,
  old: PlanArtwork,
  art: CastleExperimentArt,
) {
  const a = renderPlanRoof(s, old),
    c = a.getContext("2d")!;
  c.imageSmoothingEnabled = false;
  const { stamp, face, door } = tools(c, art),
    map = s.map,
    tall = castleTallWalls(map);
  const outside = (x: number, y: number) =>
    x < 0 ||
    y < 0 ||
    x >= map.width ||
    y >= map.height ||
    !map.building.has(y * map.width + x);
  for (const k of map.building) {
    if (!roofVisible(s, k) || map.tiles[k] !== "wall") continue;
    const x = k % map.width,
      y = Math.floor(k / map.width);
    if (outside(x - 1, y) || outside(x + 1, y) || outside(x, y - 1))
      stamp("walls", coping, x * P, y * P);
    if (tall.has(k)) face(x, y, true);
  }
  for (const f of castleDoorFrames(map))
    if (roofVisible(s, f.y * map.width + f.x))
      face(f.x, f.y, tall.has(f.y * map.width + f.x), f.pillar);
  for (const o of map.doors) if (doorAvailable(s, o)) door(s, o);
  return a;
}
