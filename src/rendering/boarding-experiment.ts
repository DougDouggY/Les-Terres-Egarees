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
  structures: HTMLImageElement;
  details: HTMLImageElement;
};
export function loadBoardingArtwork(): Promise<BoardingArtwork> {
  return Promise.all(
    [
      "elements.png",
      "tiles.png",
      "props.png",
      "structures.png",
      "details.png",
    ].map(
      (file) =>
        new Promise<HTMLImageElement>((resolve, reject) => {
          const im = new Image();
          im.onload = () => resolve(im);
          im.onerror = () => reject(Error(`Tileset naval manquant : ${file}`));
          im.src =
            import.meta.env.BASE_URL + "assets/boarding-experiment/" + file;
        }),
    ),
  ).then(([elements, tiles, props, structures, details]) => ({
    elements,
    tiles,
    props,
    structures,
    details,
  }));
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
/** Textured square assets share the supplied tileset's material and light. */
function structure(
  c: CanvasRenderingContext2D,
  art: BoardingArtwork,
  index: number,
  x: number,
  y: number,
  size = P,
  flip = false,
) {
  const cell = art.structures.width / 3;
  c.save();
  c.translate(x, y + (flip ? size : 0));
  if (flip) c.scale(1, -1);
  // Crop the atlas gutters; the footprint underneath is always opaque.
  c.drawImage(
    art.structures,
    (index % 3) * cell + 6,
    Math.floor(index / 3) * cell + 6,
    cell - 12,
    cell - 12,
    0,
    0,
    size,
    size,
  );
  c.restore();
}
const detailCache = new WeakMap<
  HTMLImageElement,
  Map<number, HTMLCanvasElement>
>();
/** Trim transparent atlas padding without changing the sprite's proportions. */
function detail(art: BoardingArtwork, index: number): HTMLCanvasElement {
  let cache = detailCache.get(art.details);
  if (!cache) {
    cache = new Map();
    detailCache.set(art.details, cache);
  }
  const hit = cache.get(index);
  if (hit) return hit;
  const side = art.details.width / 4;
  const raw = document.createElement("canvas");
  raw.width = raw.height = Math.floor(side);
  const rc = raw.getContext("2d")!;
  rc.drawImage(
    art.details,
    (index % 4) * side + 4,
    Math.floor(index / 4) * side + 4,
    side - 8,
    side - 8,
    0,
    0,
    raw.width,
    raw.height,
  );
  const data = rc.getImageData(0, 0, raw.width, raw.height).data;
  let l = raw.width,
    t = raw.height,
    r = 0,
    b = 0;
  for (let y = 0; y < raw.height; y++)
    for (let x = 0; x < raw.width; x++)
      if (data[(y * raw.width + x) * 4 + 3] > 100) {
        l = Math.min(l, x);
        t = Math.min(t, y);
        r = Math.max(r, x + 1);
        b = Math.max(b, y + 1);
      }
  const out = document.createElement("canvas");
  out.width = Math.max(1, r - l);
  out.height = Math.max(1, b - t);
  out
    .getContext("2d")!
    .drawImage(raw, l, t, out.width, out.height, 0, 0, out.width, out.height);
  cache.set(index, out);
  return out;
}
function deckDetail(
  c: CanvasRenderingContext2D,
  art: BoardingArtwork,
  index: number,
  x: number,
  y: number,
) {
  const im = detail(art, index),
    scale = (P - 6) / Math.max(im.width, im.height);
  c.drawImage(
    im,
    x * P + (P - im.width * scale) / 2,
    y * P + (P - im.height * scale) / 2,
    im.width * scale,
    im.height * scale,
  );
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
        if (map.tiles[y * map.width + x] !== "bridge") {
          c.fillStyle = ghost ? "#284348" : "#604027";
          c.fillRect(x * P, y * P, P, P);
          c.save();
          c.translate(x * P, (y + (y !== d.y ? 1 : 0)) * P);
          if (y !== d.y) c.scale(1, -1);
          // The broad top occupies most of the rail; only a shallow side remains.
          c.drawImage(detail(art, ghost ? 3 : 2), 0, 0, P, P);
          c.restore();
        }
      }
  }
  for (const x of BOARDING_CROSSINGS)
    for (let y = 12; y <= 17; y++)
      square(c, art.tiles, [36, 500, 98, 102], x * P, y * P, true);
  for (const o of map.objects) {
    const ghost = o.y >= 17;
    if (o.type === "mast") {
      c.fillStyle = ghost ? "#284348" : "#604027";
      c.fillRect(o.x * P, o.y * P, 3 * P, 3 * P);
      structure(c, art, ghost ? 1 : 0, o.x * P, o.y * P, 3 * P);
      continue;
    }
    if (o.type === "crate" && ghost) {
      structure(c, art, 2, o.x * P, o.y * P);
      continue;
    }
    if (["reinforcement", "rope", "anchor"].includes(o.type)) {
      deckDetail(
        c,
        art,
        o.type === "reinforcement"
          ? ghost
            ? 5
            : 4
          : o.type === "rope"
            ? 6
            : 7,
        o.x,
        o.y,
      );
      continue;
    }
    if (o.type === "brokenfloor") {
      square(c, art.tiles, [634, 287, 103, 104], o.x * P, o.y * P);
      continue;
    }
    const index = (
      {
        mast: ghost ? 5 : 4,
        crate: 6,
        barrel: ghost ? 7 : 8,
        hatch: ghost ? 13 : 12,
        sack: 9,
        brazier: 11,
      } as Record<string, number>
    )[o.type];
    if (index !== undefined)
      c.drawImage(boardingSprite(art, index), o.x * P, o.y * P, P, P);
  }
  // Height is purely visual: the original 3×3 metal bases and collisions remain.
  // Draw poles last so they rise above the deck towards its upper rail.
  for (const o of map.objects.filter((o) => o.type === "mast")) {
    const im = detail(art, o.y >= 17 ? 1 : 0);
    const height = 4.7 * P,
      width = (height * im.width) / im.height;
    c.drawImage(
      im,
      (o.x + 1.5) * P - width / 2,
      (o.y - 2.9) * P,
      width,
      height,
    );
  }
  return a;
}
