import type { PlanMap } from "../data/plan-maps";
import {
  BOARDING_DECKS,
  BOARDING_CROSSINGS,
} from "../data/boarding-experiment";
import { PLAN_RENDER_TILE as P, type PlanArtwork } from "./plan-renderer";
import { periodicWater } from "../dev/material-renderer";
type Rect = readonly [number, number, number, number];
export type BoardingArtwork = {
  elements: HTMLImageElement;
  tiles: HTMLImageElement;
  props: HTMLImageElement;
};
export function loadBoardingArtwork(): Promise<BoardingArtwork> {
  return Promise.all(
    ["elements.png", "tiles.png", "props.png"].map(
      (file) =>
        new Promise<HTMLImageElement>((resolve, reject) => {
          const im = new Image();
          im.onload = () => resolve(im);
          im.onerror = () => reject(Error(`Tileset naval manquant : ${file}`));
          im.src =
            import.meta.env.BASE_URL + "assets/boarding-experiment/" + file;
        }),
    ),
  ).then(([elements, tiles, props]) => ({ elements, tiles, props }));
}
/** Full square surfaces use a centered square crop, never an anisotropic stretch. */
function square(
  c: CanvasRenderingContext2D,
  im: HTMLImageElement,
  r: Rect,
  x: number,
  y: number,
  rotate = false,
) {
  const side = Math.min(r[2], r[3]),
    sx = r[0] + (r[2] - side) / 2,
    sy = r[1] + (r[3] - side) / 2;
  c.save();
  c.translate(x + (rotate ? P : 0), y);
  if (rotate) c.rotate(Math.PI / 2);
  c.drawImage(im, sx, sy, side, side, 0, 0, P, P);
  c.restore();
}
const spriteCache = new WeakMap<
  HTMLImageElement,
  Map<string, HTMLCanvasElement>
>();
/** Alpha bounds make tall props fit their square footprint while preserving proportions. */
export function boardingSprite(
  art: BoardingArtwork,
  index: number,
  cool = false,
): HTMLCanvasElement {
  let cache = spriteCache.get(art.props);
  if (!cache) {
    cache = new Map();
    spriteCache.set(art.props, cache);
  }
  const key = `${index}:${cool}`;
  const old = cache.get(key);
  if (old) return old;
  const sw = art.props.width / 4,
    sh = art.props.height / 4;
  const raw = document.createElement("canvas");
  raw.width = Math.round(sw);
  raw.height = Math.round(sh);
  const rc = raw.getContext("2d")!;
  rc.imageSmoothingEnabled = false;
  rc.drawImage(
    art.props,
    (index % 4) * sw,
    Math.floor(index / 4) * sh,
    sw,
    sh,
    0,
    0,
    raw.width,
    raw.height,
  );
  const pixels = rc.getImageData(0, 0, raw.width, raw.height).data;
  let left = raw.width,
    top = raw.height,
    right = 0,
    bottom = 0;
  for (let y = 0; y < raw.height; y++)
    for (let x = 0; x < raw.width; x++)
      if (pixels[(y * raw.width + x) * 4 + 3] > 24) {
        left = Math.min(left, x);
        top = Math.min(top, y);
        right = Math.max(right, x + 1);
        bottom = Math.max(bottom, y + 1);
      }
  const a = document.createElement("canvas");
  a.width = a.height = P;
  const c = a.getContext("2d")!;
  c.imageSmoothingEnabled = false;
  if (right > left && bottom > top) {
    const w = right - left,
      h = bottom - top,
      scale = Math.min((P - 8) / w, (P - 8) / h);
    c.drawImage(
      raw,
      left,
      top,
      w,
      h,
      (P - w * scale) / 2,
      (P - h * scale) / 2,
      w * scale,
      h * scale,
    );
  }
  if (cool) {
    c.globalCompositeOperation = "source-atop";
    c.fillStyle = "#24667b66";
    c.fillRect(0, 0, P, P);
  }
  cache.set(key, a);
  return a;
}
/** Opaque raised timber seen from above; its outer lip meets the water. */
function rail(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  ghost: boolean,
  top: boolean,
) {
  const px = x * P,
    py = y * P;
  c.fillStyle = ghost ? "#132e33" : "#342317";
  c.fillRect(px, py, P, P);
  c.fillStyle = ghost ? "#36575b" : "#735036";
  c.fillRect(px, py + 8, P, P - 16);
  c.fillStyle = ghost ? "#668384" : "#b88b59";
  c.fillRect(px, py + (top ? 8 : P - 23), P, 15);
  c.fillStyle = ghost ? "#1d3c41" : "#4d3323";
  c.fillRect(px, py + (top ? P - 22 : 23), P, 10);
  // Squared posts and metal bolts are solid, including on the ghost ship.
  c.fillStyle = ghost ? "#45686a" : "#8e6742";
  c.fillRect(px + 5, py + 13, 22, P - 26);
  c.fillStyle = ghost ? "#96a5a3" : "#b7a58a";
  for (const yy of [23, P - 28]) c.fillRect(px + 13, py + yy, 6, 6);
}
/** Three-cell square rigging base, with a large timber mast viewed from above. */
function mast(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  ghost: boolean,
) {
  const cx = (x + 1.5) * P,
    cy = (y + 1.5) * P;
  c.save();
  c.translate(cx, cy);
  c.fillStyle = "#00000055";
  c.beginPath();
  c.ellipse(8, 13, P * 1.15, P * 0.98, 0, 0, Math.PI * 2);
  c.fill();
  c.strokeStyle = ghost ? "#849491" : "#c9ad75";
  c.lineWidth = 9;
  for (const [dx, dy] of [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ]) {
    c.beginPath();
    c.moveTo(dx * P * 1.25, dy * P * 1.25);
    c.lineTo(dx * P * 0.48, dy * P * 0.48);
    c.stroke();
  }
  for (const [radius, color] of [
    [0.91, ghost ? "#1b3539" : "#39291e"],
    [0.79, ghost ? "#6c8d83" : "#c1a66b"],
    [0.66, ghost ? "#2f5556" : "#765039"],
    [0.54, ghost ? "#577b72" : "#ac7c4d"],
  ] as const) {
    c.fillStyle = color;
    c.beginPath();
    c.arc(0, 0, radius * P, 0, Math.PI * 2);
    c.fill();
  }
  c.strokeStyle = ghost ? "#365552" : "#715035";
  c.lineWidth = 4;
  for (const radius of [0.22, 0.38]) {
    c.beginPath();
    c.arc(0, 0, radius * P, 0.2, Math.PI * 1.85);
    c.stroke();
  }
  c.restore();
}
export function renderBoardingExperiment(
  map: PlanMap,
  old: PlanArtwork,
  art: BoardingArtwork,
): HTMLCanvasElement {
  const a = document.createElement("canvas");
  a.width = map.width * P;
  a.height = map.height * P;
  const c = a.getContext("2d")!;
  c.imageSmoothingEnabled = false;
  const water = c.createPattern(periodicWater(old.corrections), "repeat")!;
  water.setTransform(new DOMMatrix().scale((2 * P) / 256));
  c.fillStyle = water;
  c.fillRect(0, 0, a.width, a.height);
  for (const [i, d] of BOARDING_DECKS.entries()) {
    const ghost = i === 1;
    for (let y = d.y; y < d.y + d.h; y++)
      for (let x = 0; x < map.width; x++) {
        // One coherent plank material per ship, with detail supplied by props.
        square(
          c,
          ghost ? art.tiles : art.elements,
          ghost ? [155, 164, 103, 104] : [38, 164, 99, 99],
          x * P,
          y * P,
        );
      }
    for (const y of [d.y, d.y + d.h - 1])
      for (let x = 0; x < map.width; x++) {
        if (map.tiles[y * map.width + x] !== "bridge")
          rail(c, x, y, ghost, y === d.y);
      }
  }
  for (const x of BOARDING_CROSSINGS)
    for (let y = 12; y <= 17; y++)
      square(c, art.tiles, [36, 500, 98, 102], x * P, y * P, true);
  for (const o of map.objects) {
    const ghost = o.y >= 17;
    if (o.type === "mast") {
      mast(c, o.x, o.y, ghost);
      continue;
    }
    const index = (
      {
        mast: ghost ? 5 : 4,
        crate: 6,
        barrel: ghost ? 7 : 8,
        hatch: ghost ? 13 : 12,
        brazier: 11,
      } as Record<string, number>
    )[o.type];
    if (index !== undefined)
      c.drawImage(boardingSprite(art, index), o.x * P, o.y * P, P, P);
  }
  return a;
}
