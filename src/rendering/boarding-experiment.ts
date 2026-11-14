import type { PlanMap, PlanObject } from "../data/plan-maps";
import {
  BOARDING_DECKS,
  BOARDING_CROSSINGS,
} from "../data/boarding-experiment";
import { PLAN_RENDER_TILE as P, type PlanArtwork } from "./plan-renderer";
import { periodicWater } from "../dev/material-renderer";
import { hash } from "./plan-tileset";
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
function hull(c: CanvasRenderingContext2D, y: number, h: number) {
  const left = 2,
    right = 34 * P - 2,
    top = y * P + 3,
    bottom = (y + h) * P - 3,
    middle = (top + bottom) / 2;
  c.beginPath();
  c.moveTo(left + P * 0.6, top);
  c.lineTo(right - P, top);
  c.lineTo(right, middle);
  c.lineTo(right - P, bottom);
  c.lineTo(left + P * 0.6, bottom);
  c.quadraticCurveTo(left, bottom, left, bottom - P * 0.6);
  c.lineTo(left, top + P * 0.6);
  c.quadraticCurveTo(left, top, left + P * 0.6, top);
  c.closePath();
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
    c.save();
    hull(c, d.y, d.h);
    c.clip();
    for (let y = d.y; y < d.y + d.h; y++)
      for (let x = 0; x < map.width; x++) {
        const seed = hash(x, y);
        if (ghost) {
          const r: Rect =
            seed % 17 === 0
              ? [634, 164, 103, 104]
              : seed % 7 === 0
                ? [275, 164, 103, 104]
                : [155, 164, 103, 104];
          square(c, art.tiles, r, x * P, y * P);
        } else square(c, art.elements, [38, 164, 99, 99], x * P, y * P);
      }
    c.restore();
    hull(c, d.y, d.h);
    c.strokeStyle = ghost ? "#173e47" : "#38271c";
    c.lineWidth = 9;
    c.stroke();
    hull(c, d.y, d.h);
    c.strokeStyle = ghost ? "#87a99a" : "#d6ab72";
    c.lineWidth = 3;
    c.stroke();
    for (const y of [d.y, d.y + d.h - 1])
      for (let x = 1; x < map.width - 1; x++) {
        if (map.tiles[y * map.width + x] === "bridge") continue;
        let index = 0;
        if (ghost) {
          if ([5, 17, 28].includes(x)) index = 1;
          else if ([11, 24].includes(x)) index = 2;
          else if (x === 21) index = 3;
        }
        // Join cell edges with a continuous cap; crossing cells remain open.
        c.fillStyle = ghost ? "#355f61" : "#835d38";
        c.fillRect(x * P, y * P + 20, P, 6);
        c.fillStyle = ghost ? "#8daaa1" : "#dbb67d";
        c.fillRect(x * P, y * P + 20, P, 2);
        c.drawImage(
          boardingSprite(art, index, ghost && index === 0),
          x * P,
          y * P,
          P,
          P,
        );
      }
    // The stern and pointed bow stay entirely in blocked edge cells.
    c.fillStyle = ghost ? "#26494d" : "#6d4c2d";
    c.fillRect(4, (d.y + 0.8) * P, 12, (d.h - 1.6) * P);
    c.fillStyle = ghost ? "#83a59a" : "#dbb477";
    c.fillRect(4, (d.y + 0.8) * P, 3, (d.h - 1.6) * P);
  }
  for (const x of BOARDING_CROSSINGS)
    for (let y = 18; y <= 23; y++)
      square(c, art.tiles, [36, 500, 98, 102], x * P, y * P, true);
  for (const o of map.objects) {
    const ghost = o.y >= 23;
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
