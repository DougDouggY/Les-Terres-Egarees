import type { MaterialSample } from "./material-samples";
export const MATERIAL_PIXELS = 96;
export type MaterialImages = {
  castle: HTMLImageElement;
  boarding: HTMLImageElement;
  regional: HTMLImageElement;
  corrections: HTMLImageElement;
  castleDetails: HTMLImageElement;
  chest: HTMLImageElement;
};
export async function loadMaterialImages(): Promise<MaterialImages> {
  const load = (path: string) =>
    new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(Error(`Ressource introuvable : ${path}`));
      i.src = import.meta.env.BASE_URL + path;
    });
  const [castle, boarding, regional, corrections, castleDetails, chest] =
    await Promise.all([
      load("assets/material-tests/castle-atlas.png"),
      load("assets/material-tests/boarding-atlas.png"),
      load("assets/regional-tiles.png"),
      load("assets/material-tests/corrections-atlas.png"),
      load("assets/material-tests/castle-details.png"),
      load("assets/material-tests/chest.png"),
    ]);
  return { castle, boarding, regional, corrections, castleDetails, chest };
}
export type Crop = [number, number, number, number];
// Explicit source rectangles: generated sheets are NOT assumed to have perfect cells.
export const CASTLE = {
  floor: [5, 5, 303, 303],
  floor2: [320, 5, 303, 303],
  warm: [5, 320, 303, 300],
  roof: [633, 320, 303, 300],
  coping: [7, 688, 296, 47],
  face: [8, 738, 294, 177],
  pillar: [701, 949, 168, 299],
} satisfies Record<string, Crop>;
export const SHIP = {
  wood: [5, 5, 303, 303],
  wood2: [320, 5, 303, 303],
  water: [5, 320, 303, 301],
  railFace: [86, 740, 184, 130],
  railCap: [84, 690, 192, 37],
  post: [450, 637, 105, 294],
  plank: [10, 960, 330, 265],
} satisfies Record<string, Crop>;
export function renderMaterialSample(
  map: MaterialSample,
  images: MaterialImages,
  roof = false,
): HTMLCanvasElement {
  const P = MATERIAL_PIXELS,
    cvs = document.createElement("canvas");
  cvs.width = map.width * P;
  cvs.height = map.height * P;
  const c = cvs.getContext("2d")!;
  c.imageSmoothingEnabled = false;
  const stamp = (
    image: HTMLImageElement,
    src: Crop,
    x: number,
    y: number,
    w = P,
    h = P,
  ) => c.drawImage(image, ...src, x, y, w, h);
  const castle = images.castle,
    ship = images.boarding;
  const waterPattern = c.createPattern(
    periodicWater(images.corrections),
    "repeat",
  )!;
  waterPattern.setTransform(new DOMMatrix().scale((2 * P) / 256));
  const deck = document.createElement("canvas");
  deck.width = deck.height = 256;
  const deckContext = deck.getContext("2d")!;
  deckContext.imageSmoothingEnabled = false;
  deckContext.drawImage(images.corrections, 3, 3, 620, 620, 0, 0, 256, 256);
  const deckPattern = c.createPattern(deck, "repeat")!;
  deckPattern.setTransform(new DOMMatrix().scale((2 * P) / 256));
  function wallH(x: number, y: number, w = P) {
    stamp(castle, CASTLE.face, x, y + 25, w, P - 25);
    stamp(castle, CASTLE.coping, x, y, w, 25);
  }
  function wallV(x: number, y: number) {
    // Use only the approved pale coping, over the entire solid side-wall cell.
    stamp(images.corrections, [321, 630, 302, 620], x, y);
  }
  for (let y = 0; y < map.height; y++)
    for (let x = 0; x < map.width; x++) {
      const xx = x * P,
        yy = y * P,
        t = map.tiles[y * map.width + x];
      c.save();
      c.beginPath();
      c.rect(xx, yy, P, P);
      c.clip();
      if (map.id === "castle") {
        if (t === "grass") {
          const sw = images.regional.width / 8,
            sh = images.regional.height / 4;
          c.save();
          c.translate(xx + (x % 2 ? P : 0), yy + (y % 2 ? P : 0));
          c.scale(x % 2 ? -1 : 1, y % 2 ? -1 : 1);
          c.drawImage(images.regional, 0, 0, sw, sh, 0, 0, P, P);
          c.restore();
        } else {
          stamp(castle, (x + y) % 3 ? CASTLE.floor : CASTLE.floor2, xx, yy);
          c.fillStyle = "#285d942a";
          c.fillRect(xx, yy, P, P);
          if (t === "wallH") wallH(xx, yy);
          if (t === "wallV") wallV(xx, yy);
          if (t === "corner") {
            wallV(xx, yy);
            wallH(xx, yy);
          }
          if (t === "pillar") stamp(castle, CASTLE.pillar, xx + 18, yy, 60, 94);
        }
      } else {
        if (t === "water" || t === "rail" || (t === "plank" && x >= 6)) {
          // Pattern edges are blended once, then repeated without reflection.
          c.fillStyle = waterPattern;
          c.fillRect(xx, yy, P, P);
          if (t === "plank" && x === 6) {
            c.fillStyle = deckPattern;
            c.fillRect(xx, yy, P / 4, P);
          }
          if (t === "rail") {
            c.drawImage(approvedRailTexture(images, y % 2 === 0), xx, yy);
          }
        } else {
          c.fillStyle = deckPattern;
          c.fillRect(xx, yy, P, P);
        }
      }
      c.restore();
    }
  if (map.id === "castle") {
    // Furnishings and doors are sprites, composed before the opaque roof layer.
    stamp(
      images.castleDetails,
      [58, 1051, 292, 163],
      2 * P,
      4 * P,
      3 * P,
      2 * P,
    );
    stamp(images.chest, [328, 178, 875, 657], 6 * P + 8, P + 15, 80, 66);
    const dx = 3 * P,
      dy = 2 * P;
    if (!map.doorOpen && roof)
      stamp(images.castleDetails, [450, 600, 114, 154], dx, dy, P, P);
  }
  if (map.id === "boarding") {
    stamp(ship, [370, 950, 253, 300], 2 * P, P, 2 * P, 2 * P);
    stamp(ship, [958, 955, 290, 290], P + 10, 6 * P + 10, 76, 76);
    stamp(ship, [649, 950, 278, 292], 5 * P + 14, 8, 68, 80);
    // Continuous loose boards cross several logical cells; art is not re-nailed every cell.
    stamp(ship, SHIP.plank, 5 * P, 3 * P, 5 * P, 2 * P);
  }
  if (map.id === "castle" && roof && !map.doorOpen) {
    c.fillStyle = "#22364a";
    c.fillRect(0, 0, 8 * P, 2 * P);
    for (let y = 0; y < 2; y++)
      for (let x = 0; x < 8; x++) stamp(castle, CASTLE.roof, x * P, y * P);
  }
  return cvs;
}

const waterCache = new WeakMap<HTMLImageElement, HTMLCanvasElement>();
/** Pair opposing border texels, feather inward, and leave the center artwork intact. */
export function periodicWater(image: HTMLImageElement): HTMLCanvasElement {
  const previous = waterCache.get(image);
  if (previous) return previous;
  const tile = document.createElement("canvas");
  tile.width = tile.height = 256;
  const ctx = tile.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(image, 630, 3, 620, 620, 0, 0, 256, 256);
  const pixels = ctx.getImageData(0, 0, 256, 256),
    data = pixels.data,
    N = 256,
    band = 28;
  const pair = (a: number, b: number, weight: number) => {
    for (let ch = 0; ch < 3; ch++) {
      const mean = (data[a + ch] + data[b + ch]) / 2;
      data[a + ch] = Math.round(data[a + ch] * (1 - weight) + mean * weight);
      data[b + ch] = Math.round(data[b + ch] * (1 - weight) + mean * weight);
    }
  };
  for (let y = 0; y < N; y++)
    for (let i = 0; i < band; i++)
      pair((y * N + i) * 4, (y * N + N - 1 - i) * 4, (1 - i / band) ** 2);
  for (let x = 0; x < N; x++)
    for (let i = 0; i < band; i++)
      pair((i * N + x) * 4, ((N - 1 - i) * N + x) * 4, (1 - i / band) ** 2);
  ctx.putImageData(pixels, 0, 0);
  waterCache.set(image, tile);
  return tile;
}

const railCache = new WeakMap<MaterialImages, HTMLCanvasElement[]>();
/** Rasterize once at native resolution so all maps sample the same bevel texels. */
export function approvedRailTexture(
  images: MaterialImages,
  posts: boolean,
): HTMLCanvasElement {
  let pair = railCache.get(images);
  if (!pair) {
    pair = [];
    railCache.set(images, pair);
  }
  const index = posts ? 1 : 0;
  if (pair[index]) return pair[index];
  const tile = document.createElement("canvas");
  tile.width = tile.height = MATERIAL_PIXELS;
  const c = tile.getContext("2d")!;
  c.imageSmoothingEnabled = false;
  c.drawImage(images.corrections, 633, 630, 302, 620, 0, 0, 24, 96);
  c.drawImage(images.corrections, 960, 640, 80, 600, 2, 0, 7, 96);
  c.fillStyle = "#efcf8f";
  c.fillRect(2, 0, 2, 96);
  c.fillStyle = "#49321f";
  c.fillRect(9, 0, 2, 96);
  c.fillStyle = "#111c20aa";
  c.fillRect(22, 0, 2, 96);
  if (posts) c.drawImage(images.boarding, ...SHIP.post, 1, 12, 22, 66);
  pair[index] = tile;
  return tile;
}
