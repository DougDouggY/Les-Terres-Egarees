import {
  map,
  cell,
  W,
  H,
  TILE,
  tileIndex,
  wallVariant,
  stairsRotation,
  key,
} from "./game/map";
import type { Cell, Faction } from "./game/types";
export type TerrainStyle = "blended" | "continuous" | "varied";
export const terrainStyles: Record<TerrainStyle, string> = {
  blended: "1 · Tuiles fondues",
  continuous: "2 · Sol continu",
  varied: "3 · Tuiles variées",
};
/** Stable decorative variation. Never changes terrain types, costs or collisions. */
export function decorationIndex(x: number, y: number) {
  let n = Math.imul(x + 37, 374761393) ^ Math.imul(y + 71, 668265263);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  const v = (n ^ (n >>> 16)) >>> 0;
  return v % 10 < 3 ? 0 : 1 + (v % 7);
}
const grounds = new Set(["grass", "earth", "sand", "forest", "floor", "ruin"]);
export class TerrainRenderer {
  reset() {
    this.cache.clear();
  }
  private cache = new Map<string, HTMLCanvasElement>();
  private continuousTextures = new Map<string, HTMLCanvasElement>();
  private patches = new Map<string, HTMLCanvasElement>();
  constructor(
    private atlas: HTMLImageElement,
    private roads: HTMLImageElement,
    private grass: HTMLImageElement,
    private arrivals: HTMLImageElement,
  ) {}
  private tile(
    ctx: CanvasRenderingContext2D,
    index: number,
    x: number,
    y: number,
    angle = 0,
  ) {
    const sw = this.atlas.width / 8,
      sh = this.atlas.height / 4;
    ctx.save();
    ctx.translate(x + 16, y + 16);
    ctx.rotate(angle);
    ctx.drawImage(
      this.atlas,
      (index % 8) * sw,
      Math.floor(index / 8) * sh,
      sw,
      sh,
      -16,
      -16,
      32,
      32,
    );
    ctx.restore();
  }
  private patch(c: Cell) {
    const id =
      c.terrain === "grass"
        ? `grass-${decorationIndex(c.x, c.y)}`
        : `tile-${tileIndex(c)}`;
    let patch = this.patches.get(id);
    if (!patch) {
      patch = document.createElement("canvas");
      patch.width = patch.height = 128;
      const p = patch.getContext("2d")!;
      if (c.terrain === "grass")
        p.drawImage(
          this.grass,
          decorationIndex(c.x, c.y) * 128,
          0,
          128,
          128,
          0,
          0,
          128,
          128,
        );
      else {
        const i = tileIndex(c),
          sw = this.atlas.width / 8,
          sh = this.atlas.height / 4;
        p.drawImage(
          this.atlas,
          (i % 8) * sw,
          Math.floor(i / 8) * sh,
          sw,
          sh,
          0,
          0,
          128,
          128,
        );
      }
      this.patches.set(id, patch);
    }
    return patch;
  }
  layer(style: TerrainStyle, factions: readonly Faction[]) {
    if (
      ![this.atlas, this.roads, this.grass, this.arrivals].every(
        (i) => i.complete && i.naturalWidth,
      )
    )
      return null;
    const signature = style + factions.join("/");
    const cached = this.cache.get(signature);
    if (cached) return cached;
    const raw = document.createElement("canvas");
    raw.width = W * TILE * 2;
    raw.height = H * TILE * 2;
    const ctx = raw.getContext("2d")!;
    ctx.scale(2, 2);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    for (const c of map) {
      const x = c.x * 32,
        y = c.y * 32;
      if (style === "continuous" && grounds.has(c.terrain)) {
        // One world-space texture per material; cell clipping preserves the exact footprint.
        // Mirrored copies join exactly: one material field in world coordinates,
        // rather than restarting a texture at every logical cell.
        const material = c.terrain === "grass" ? "grass" : String(tileIndex(c));
        let field = this.continuousTextures.get(material);
        if (!field) {
          const source = c.terrain === "grass" ? this.grass : this.atlas,
            index = c.terrain === "grass" ? 0 : tileIndex(c),
            sw = source === this.grass ? 128 : this.atlas.width / 8,
            sh = source === this.grass ? 128 : this.atlas.height / 4;
          field = document.createElement("canvas");
          field.width = field.height = 256;
          const f = field.getContext("2d")!;
          for (let by = 0; by < 2; by++)
            for (let bx = 0; bx < 2; bx++) {
              f.save();
              f.translate(bx === 0 ? 0 : 256, by === 0 ? 0 : 256);
              f.scale(bx === 0 ? 1 : -1, by === 0 ? 1 : -1);
              f.drawImage(
                source,
                (index % 8) * sw,
                Math.floor(index / 8) * sh,
                sw,
                sh,
                0,
                0,
                128,
                128,
              );
              f.restore();
            }
          this.continuousTextures.set(material, field);
        }
        const pattern = ctx.createPattern(field, "repeat")!;
        pattern.setTransform(new DOMMatrix().scale(0.75));
        ctx.fillStyle = pattern;
        ctx.fillRect(x, y, 32, 32);
      } else if (c.terrain === "grass")
        ctx.drawImage(this.patch(c), x, y, 32, 32);
      else this.tile(ctx, tileIndex(c), x, y);
    }
    if (style === "blended")
      for (const c of map) {
        if (!grounds.has(c.terrain)) continue;
        const x = c.x * 32,
          y = c.y * 32;
        for (const [dx, dy] of [
          [1, 0],
          [0, 1],
        ]) {
          const n = cell(c.x + dx, c.y + dy);
          if (!n || !grounds.has(n.terrain)) continue;
          // Blend two illustrated textures across the shared edge, clipped to walkable ground.
          const p = this.patch(n);
          ctx.save();
          ctx.beginPath();
          ctx.rect(x, y, 32, 32);
          ctx.clip();
          const blend = document.createElement("canvas");
          blend.width = blend.height = 64;
          const b = blend.getContext("2d")!;
          b.drawImage(p, 0, 0, 64, 64);
          b.globalCompositeOperation = "destination-in";
          const gradient = b.createLinearGradient(
            dx ? 48 : 0,
            dy ? 48 : 0,
            dx ? 64 : 0,
            dy ? 64 : 0,
          );
          gradient.addColorStop(0, "transparent");
          gradient.addColorStop(1, "#fff");
          b.fillStyle = gradient;
          b.fillRect(0, 0, 64, 64);
          ctx.drawImage(blend, x, y, 32, 32);
          ctx.restore();
        }
      }
    // Structural tiles are laid back on top; no blend can soften a wall or its collision.
    for (const c of map) {
      const x = c.x * 32,
        y = c.y * 32;
      if (c.terrain === "sand" && tileIndex(c) !== 3)
        this.tile(ctx, tileIndex(c), x, y);
      else if (c.terrain === "road") {
        let bits = 0;
        for (const [dx, dy, b] of [
          [0, -1, 1],
          [1, 0, 2],
          [0, 1, 4],
          [-1, 0, 8],
        ])
          if (
            ["road", "floor", "ruin", "stairs"].includes(
              cell(c.x + dx, c.y + dy)?.terrain ?? "",
            )
          )
            bits |= b;
        const sw = this.roads.width / 4,
          sh = this.roads.height / 8;
        ctx.drawImage(
          this.roads,
          (bits % 4) * sw,
          (Math.floor(bits / 4) + (c.base === "sand" ? 4 : 0)) * sh,
          sw,
          sh,
          x,
          y,
          32,
          32,
        );
      } else if (c.terrain === "wall") {
        const v = wallVariant(c);
        this.tile(ctx, v.tile, x, y, v.rotation);
      } else if (c.terrain === "stairs")
        this.tile(ctx, 13, x, y, stairsRotation(c));
      else if (!grounds.has(c.terrain)) this.tile(ctx, tileIndex(c), x, y);
      if (c.prop) {
        const column = factions[c.prop.sector - 1] === "north" ? 0 : 1;
        ctx.drawImage(
          this.arrivals,
          column * 96 + c.prop.dx * 32,
          (c.prop.sector - 1) * 64 + c.prop.dy * 32,
          32,
          32,
          x,
          y,
          32,
          32,
        );
      }
    }
    const shaded = document.createElement("canvas");
    shaded.width = raw.width;
    shaded.height = raw.height;
    const dark = shaded.getContext("2d")!;
    dark.filter = "saturate(.77) brightness(.82)";
    dark.drawImage(raw, 0, 0);
    this.cache.set(signature, shaded);
    return shaded;
  }
}
