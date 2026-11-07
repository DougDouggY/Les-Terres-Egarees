import { paintWoods, paintMountain } from "./landscape";
import {
  map,
  W,
  H,
  TILE,
  tileIndex,
  village,
  roadRoutes,
  currentMapId,
} from "./game/active-map";
import type { Faction } from "./game/types";
export type TerrainStyle = "regional";
export const terrainStyles: Record<TerrainStyle, string> = {
  regional: "Carte régionale · secteurs ≈ 100 m",
};
export function decorationIndex(x: number, y: number) {
  let n = Math.imul(x + 37, 374761393) ^ Math.imul(y + 71, 668265263);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  const v = (n ^ (n >>> 16)) >>> 0;
  return v % 10 < 3 ? 0 : 1 + (v % 7);
}
export class TerrainRenderer {
  private board = currentMapId;
  private cache: HTMLCanvasElement | null = null;
  private stamps = new Map<number, HTMLCanvasElement>();
  constructor(
    private atlas: HTMLImageElement,
    _roads?: HTMLImageElement,
    _grass?: HTMLImageElement,
    _arrivals?: HTMLImageElement,
  ) {}
  reset() {
    this.cache = null;
  }
  private stamp(
    ctx: CanvasRenderingContext2D,
    index: number,
    x: number,
    y: number,
    flip = false,
  ) {
    const sw = this.atlas.width / 8,
      sh = this.atlas.height / 4;
    ctx.save();
    ctx.translate(x + 16, y + 16);
    if (flip) ctx.scale(-1, 1);
    let tile = this.stamps.get(index);
    if (!tile) {
      tile = document.createElement("canvas");
      tile.width = tile.height = 128;
      const t = tile.getContext("2d")!;
      t.drawImage(
        this.atlas,
        (index % 8) * sw,
        Math.floor(index / 8) * sh,
        sw,
        sh,
        0,
        0,
        128,
        128,
      );
      const pixels = t.getImageData(0, 0, 128, 128);
      for (let py = 0; py < 128; py++)
        for (let px = 0; px < 128; px++) {
          const edge = Math.min(px, py, 127 - px, 127 - py) / 14;
          const i = (py * 128 + px) * 4;
          pixels.data[i + 3] *= Math.min(1, edge);
          // Remove the wagon's grassy matte so the forest road remains visible
          // beneath the original wooden wreck and its canvas covering.
          if (index === 12) {
            const greenExcess = pixels.data[i + 1] - pixels.data[i];
            pixels.data[i + 3] *= Math.max(
              0,
              Math.min(1, (3 - greenExcess) / 7),
            );
          }
        }
      t.putImageData(pixels, 0, 0);
      this.stamps.set(index, tile);
    }
    ctx.drawImage(tile, -16, -16, 32, 32);
    ctx.restore();
  }
  private pattern(ctx: CanvasRenderingContext2D, index: number) {
    const tile = document.createElement("canvas");
    tile.width = tile.height = 128;
    tile
      .getContext("2d")!
      .drawImage(
        this.atlas,
        ((index % 8) * this.atlas.width) / 8,
        (Math.floor(index / 8) * this.atlas.height) / 4,
        this.atlas.width / 8,
        this.atlas.height / 4,
        0,
        0,
        128,
        128,
      );
    // Mirrored repeats share identical pixels at each edge.
    const seamless = document.createElement("canvas");
    seamless.width = seamless.height = 256;
    const m = seamless.getContext("2d")!;
    for (let y = 0; y < 2; y++)
      for (let x = 0; x < 2; x++) {
        m.save();
        m.translate(x ? 256 : 0, y ? 256 : 0);
        m.scale(x ? -1 : 1, y ? -1 : 1);
        m.drawImage(tile, 0, 0);
        m.restore();
      }
    const p = ctx.createPattern(seamless, "repeat")!;
    p.setTransform(new DOMMatrix().scale(0.5));
    return p;
  }
  private mask(
    predicate: (c: (typeof map)[number]) => boolean,
    w: number,
    h: number,
    beach = false,
  ) {
    const raw = document.createElement("canvas");
    raw.width = w;
    raw.height = h;
    const r = raw.getContext("2d")!;
    r.fillStyle = "white";
    for (const c of map)
      if (predicate(c)) r.fillRect(c.x * 64, c.y * 64, 64, 64);
    const soft = document.createElement("canvas");
    soft.width = w;
    soft.height = h;
    const s = soft.getContext("2d")!;
    s.filter = beach ? "blur(18px)" : "blur(10px)";
    s.drawImage(raw, 0, 0);
    const image = s.getImageData(0, 0, w, h);
    for (let i = 3; i < image.data.length; i += 4)
      image.data[i] = Math.max(
        0,
        Math.min(
          255,
          ((image.data[i] - (beach ? 40 : 72)) * 255) / (beach ? 180 : 110),
        ),
      );
    s.putImageData(image, 0, 0);
    return soft;
  }
  layer(_style: TerrainStyle, _factions: readonly Faction[]) {
    if (!this.atlas.complete || !this.atlas.naturalWidth) return null;
    if (this.board !== currentMapId) {
      this.reset();
      this.board = currentMapId;
    }
    if (this.cache) return this.cache;
    const raw = document.createElement("canvas");
    raw.width = W * TILE * 2;
    raw.height = H * TILE * 2;
    const ctx = raw.getContext("2d")!;
    ctx.scale(2, 2);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.fillStyle = this.pattern(ctx, 0);
    ctx.fillRect(0, 0, W * TILE, H * TILE);
    // Small accents vary by sector, while ground texture and coast masks cross tile edges.
    for (const c of map)
      if (c.terrain === "grass" && decorationIndex(c.x, c.y) > 3)
        this.stamp(
          ctx,
          [1, 13, 15, 24][decorationIndex(c.x, c.y) % 4],
          c.x * 32,
          c.y * 32,
        );
    const waterMask = this.mask(
        (c) => c.terrain === "water",
        raw.width,
        raw.height,
      ),
      beachMask = this.mask(
        (c) =>
          c.terrain === "water" || c.terrain === "sand" || c.prop?.sector === 1,
        raw.width,
        raw.height,
        true,
      );
    for (const [index, mask] of [
      [3, beachMask],
      [4, waterMask],
    ] as const) {
      const painted = document.createElement("canvas");
      painted.width = raw.width;
      painted.height = raw.height;
      const p = painted.getContext("2d")!;
      p.scale(2, 2);
      p.fillStyle = this.pattern(p, index);
      p.fillRect(0, 0, W * TILE, H * TILE);
      p.setTransform(1, 0, 0, 1, 0, 0);
      p.globalCompositeOperation = "destination-in";
      p.drawImage(mask, 0, 0);
      ctx.drawImage(painted, 0, 0, W * TILE, H * TILE);
    }
    // A continuous foam line follows the actual water-mask contour, including corners.
    const foam = document.createElement("canvas");
    foam.width = raw.width;
    foam.height = raw.height;
    const f = foam.getContext("2d")!,
      pixels = waterMask
        .getContext("2d")!
        .getImageData(0, 0, raw.width, raw.height);
    for (let i = 0; i < pixels.data.length; i += 4) {
      const a = pixels.data[i + 3] / 255;
      pixels.data[i] = 222;
      pixels.data[i + 1] = 230;
      pixels.data[i + 2] = 202;
      pixels.data[i + 3] = Math.sin(a * Math.PI) * 170;
    }
    f.putImageData(pixels, 0, 0);
    ctx.drawImage(foam, 0, 0, W * TILE, H * TILE);
    // Paths are textured strokes along the authored cell centres, with rounded junctions.
    if (currentMapId === "forest-compact") {
      const painted = document.createElement("canvas");
      painted.width = raw.width;
      painted.height = raw.height;
      const p = painted.getContext("2d")!;
      p.scale(2, 2);
      p.fillStyle = this.pattern(p, 2);
      p.fillRect(0, 0, W * TILE, H * TILE);
      p.setTransform(1, 0, 0, 1, 0, 0);
      p.globalCompositeOperation = "destination-in";
      p.drawImage(
        this.mask((c) => c.terrain === "road", raw.width, raw.height),
        0,
        0,
      );
      ctx.drawImage(painted, 0, 0, W * TILE, H * TILE);
    } else
      for (const route of roadRoutes) {
        ctx.beginPath();
        ctx.moveTo((route[0][0] + 0.5) * 32, (route[0][1] + 0.5) * 32);
        for (let i = 1; i < route.length; i++)
          ctx.lineTo((route[i][0] + 0.5) * 32, (route[i][1] + 0.5) * 32);
        ctx.lineJoin = ctx.lineCap = "round";
        ctx.lineWidth = 13;
        ctx.strokeStyle = "#73704466";
        ctx.stroke();
        ctx.lineWidth = 9;
        ctx.strokeStyle = this.pattern(ctx, 2);
        ctx.stroke();
      }
    for (const c of map) {
      const x = c.x * 32,
        y = c.y * 32;
      if (c.villagePart) continue;
      if (c.terrain === "rock") paintMountain(ctx, c);
      else if (c.terrain === "hill") this.stamp(ctx, 14, x, y);
      else if (c.prop) this.stamp(ctx, c.prop.sector === 1 ? 8 : 12, x, y);
    }
    paintWoods(ctx, this.atlas);
    // The nine connected atlas cells form one landmark, still backed by nine exact cells.
    const sw = this.atlas.width / 8,
      sh = this.atlas.height / 4;
    if (currentMapId === "prologue")
      ctx.drawImage(
        this.atlas,
        sw,
        sh,
        sw * 3,
        sh * 3,
        village.x * 32,
        village.y * 32,
        96,
        96,
      );
    const shaded = document.createElement("canvas");
    shaded.width = raw.width;
    shaded.height = raw.height;
    const dark = shaded.getContext("2d")!;
    dark.filter = "saturate(.85) brightness(.9)";
    dark.drawImage(raw, 0, 0);
    this.cache = shaded;
    return shaded;
  }
}
