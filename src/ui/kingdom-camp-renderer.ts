import { TerrainRenderer, type TerrainStyle } from "../terrain";
import { map, W, H, currentMapId } from "../game/active-map";
import type { Faction } from "../game/types";
import { campBuildings } from "../data/kingdom-camp-map";
import type { Cell } from "../game/types";
/** Pixel-aligned architectural overlay on the game's existing regional terrain. */
export function paintKingdomCamp(ctx: CanvasRenderingContext2D, cells: Cell[]) {
  const rect = (x: number, y: number, w: number, h: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
  };
  const polygon = (points: number[][], color: string) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    ctx.fill();
  };
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  for (const c of cells) {
    if (
      c.terrain !== "wall" ||
      campBuildings.some(
        (b) => c.x >= b.x && c.x < b.x + b.w && c.y >= b.y && c.y < b.y + b.h,
      )
    )
      continue;
    const x = c.x * 32,
      y = c.y * 32;
    const cage = c.x >= 26 && c.x <= 33 && c.y >= 16 && c.y <= 21;
    rect(x + 3, y + 25, 32, 10, "#18231a66");
    for (let i = 0; i < 5; i++) {
      const px = x + i * 6 + 1,
        height = cage ? 23 : 27;
      rect(px, y + 31 - height, 5, height, "#574130");
      polygon(
        [
          [px, y + 31 - height],
          [px + 2, y + 26 - height],
          [px + 5, y + 31 - height],
        ],
        "#b99563",
      );
      rect(px + 1, y + 32 - height, 2, height - 2, "#9d794a");
      rect(px + 4, y + 32 - height, 1, height - 2, "#352c25");
    }
    rect(x, y + 12, 32, 3, "#c09d66");
    rect(x, y + 15, 32, 3, "#45382b");
    rect(x, y + 24, 32, 3, "#7d5c39");
    for (const px of [4, 26]) rect(x + px, y + 13, 2, 2, "#b5b0a0");
  }
  for (const b of campBuildings) {
    const x = b.x * 32,
      y = b.y * 32,
      w = b.w * 32,
      h = b.h * 32;
    rect(x + 7, y + 9, w, h, "#11241966");
    if (b.id.startsWith("tower")) {
      rect(x + 5, y + 10, w - 10, h - 10, "#63492e");
      for (let k = 9; k < w - 6; k += 8)
        rect(x + k, y + 12, 2, h - 15, "#a88150");
      polygon(
        [
          [x, y + 12],
          [x + w / 2, y],
          [x + w, y + 12],
          [x + w - 7, y + 25],
          [x + 7, y + 25],
        ],
        "#494d50",
      );
      rect(x + 3, y + 12, w - 6, 3, "#aaa48c");
      for (const dx of [4, w - 8]) rect(x + dx, y + 24, 4, h - 24, "#c09b66");
      rect(x + 10, y + h - 13, w - 20, 4, "#3e3026");
      continue;
    }
    // Full-cell rectangular footprints; roofs never imply an accessible interior.
    const command = b.id === "command";
    rect(x + 4, y + 21, w - 8, h - 21, command ? "#c5b58a" : "#80613e");
    for (let k = 8; k < w - 8; k += 10)
      rect(x + k, y + 24, 2, h - 25, command ? "#a49777" : "#b08a58");
    polygon(
      [
        [x, y + h * 0.57],
        [x + w * 0.5, y],
        [x + w, y + h * 0.57],
      ],
      command ? "#c6b690" : "#4e5961",
    );
    polygon(
      [
        [x + w * 0.5, y],
        [x + w, y + h * 0.57],
        [x + w - 6, y + h * 0.63],
        [x + w * 0.5, y + 9],
      ],
      command ? "#8c835f" : "#303f4b",
    );
    if (command) {
      for (const t of [0.25, 0.5, 0.75])
        polygon(
          [
            [x + w * 0.5, y + 3],
            [x + w * t - 7, y + h * 0.57],
            [x + w * t + 7, y + h * 0.57],
          ],
          "#887845",
        );
    } else {
      for (let row = 14; row < h * 0.56; row += 10) {
        const inset = (1 - row / (h * 0.57)) * w * 0.5;
        rect(x + inset, y + row, w - inset * 2, 2, "#727a79");
        for (let k = inset + 12; k < w - inset; k += 16)
          rect(x + k, y + row - 7, 1, 7, "#303d45");
      }
    }
    rect(x + 4, y + h * 0.59, w - 8, 4, "#d1b67e");
    rect(x + w * 0.44, y + h * 0.65, w * 0.18, h * 0.35, "#292c25");
    rect(x + w * 0.44 - 3, y + h * 0.65, 3, h * 0.35, "#d3b47c");
    rect(x + w * 0.62, y + h * 0.65, 3, h * 0.35, "#d3b47c");
    for (const t of [0.18, 0.77]) {
      rect(x + w * t, y + h * 0.7, 18, 15, "#252e29");
      rect(x + w * t, y + h * 0.7 + 6, 18, 2, "#b5a179");
    }
  }
  // Kingdom pennants distinguish the command tent without introducing a unit.
  rect(25 * 32 + 12, 8 * 32, 3, 75, "#b0a17e");
  polygon(
    [
      [25 * 32 + 15, 8 * 32],
      [25 * 32 + 36, 8 * 32 + 5],
      [25 * 32 + 31, 8 * 32 + 27],
      [25 * 32 + 15, 8 * 32 + 22],
    ],
    "#a08b38",
  );
  rect(25 * 32 + 20, 8 * 32 + 7, 3, 11, "#e9d994");
  ctx.restore();
}

/** Extends the existing regional terrain without changing its protected renderer. */
export class CampTerrainRenderer extends TerrainRenderer {
  private campLayer: HTMLCanvasElement | null = null;
  constructor(private campAtlas: HTMLImageElement) {
    super(campAtlas);
  }
  override layer(style: TerrainStyle, factions: readonly Faction[]) {
    const base = super.layer(style, factions);
    if (!base || currentMapId !== "kingdom-camp") return base;
    if (this.campLayer) return this.campLayer;
    const layer = document.createElement("canvas");
    layer.width = base.width;
    layer.height = base.height;
    const ctx = layer.getContext("2d")!;
    ctx.drawImage(base, 0, 0);
    ctx.scale(2, 2);
    for (const [index, predicate] of [
      [28, (c: Cell) => c.terrain === "earth" || c.terrain === "wall"],
      [2, (c: Cell) => c.terrain === "road"],
    ] as const) {
      const tile = document.createElement("canvas");
      tile.width = tile.height = 64;
      tile
        .getContext("2d")!
        .drawImage(
          this.campAtlas,
          ((index % 8) * this.campAtlas.width) / 8,
          (Math.floor(index / 8) * this.campAtlas.height) / 4,
          this.campAtlas.width / 8,
          this.campAtlas.height / 4,
          0,
          0,
          64,
          64,
        );
      ctx.save();
      ctx.beginPath();
      for (const c of map)
        if (predicate(c)) ctx.rect(c.x * 32, c.y * 32, 32, 32);
      ctx.clip();
      ctx.filter = "saturate(.85) brightness(.9)";
      ctx.fillStyle = ctx.createPattern(tile, "repeat")!;
      ctx.fillRect(0, 0, W * 32, H * 32);
      ctx.restore();
    }
    paintKingdomCamp(ctx, map);
    this.campLayer = layer;
    return layer;
  }
}
