import { cell, map } from "./game/active-map";
import type { Cell } from "./game/types";
export const isWood = (c: Cell | undefined) =>
  c?.terrain === "tree" || c?.terrain === "forest";
export function woodNeighbors(c: Cell) {
  return [
    [0, -1],
    [1, 0],
    [0, 1],
    [-1, 0],
  ].map(([dx, dy]) => isWood(cell(c.x + dx, c.y + dy)));
}
/** Original painted atlas canopies, blended across shared edges instead of square mats. */
export function paintWoods(
  ctx: CanvasRenderingContext2D,
  atlas: HTMLImageElement,
) {
  const cache = new Map<number, HTMLCanvasElement>();
  const canopy = (index: number) => {
    let tile = cache.get(index);
    if (tile) return tile;
    tile = document.createElement("canvas");
    tile.width = tile.height = 128;
    const t = tile.getContext("2d")!;
    t.drawImage(
      atlas,
      ((index % 8) * atlas.width) / 8,
      (Math.floor(index / 8) * atlas.height) / 4,
      atlas.width / 8,
      atlas.height / 4,
      0,
      0,
      128,
      128,
    );
    t.globalCompositeOperation = "destination-in";
    t.save();
    t.translate(64, 65);
    t.scale(1, 0.94);
    const mask = t.createRadialGradient(0, 0, 30, 0, 0, 62);
    mask.addColorStop(0, "white");
    mask.addColorStop(0.55, "white");
    mask.addColorStop(1, "#ffffff00");
    t.fillStyle = mask;
    t.beginPath();
    t.arc(0, 0, 62, 0, Math.PI * 2);
    t.fill();
    t.restore();
    cache.set(index, tile);
    return tile;
  };
  const patches: { x: number; y: number; size: number; index: number }[] = [];
  for (const c of map.filter(isWood)) {
    const dense = c.terrain === "tree";
    const index = dense
      ? (c.x + c.y) % 2
        ? 6
        : 22
      : [5, 21, 30][(c.x * 7 + c.y) % 3];
    patches.push({
      x: c.x * 32 + 16,
      y: c.y * 32 + 16,
      size: dense ? 32 : 30,
      index,
    });
    const n = woodNeighbors(c);
    if (n[1])
      patches.push({ x: (c.x + 1) * 32, y: c.y * 32 + 16, size: 24, index });
    if (n[2])
      patches.push({ x: c.x * 32 + 16, y: (c.y + 1) * 32, size: 24, index });
    // Fill four-way joins without extending into a grass cell at concave corners.
    if (n[1] && n[2] && isWood(cell(c.x + 1, c.y + 1)))
      patches.push({ x: (c.x + 1) * 32, y: (c.y + 1) * 32, size: 24, index });
  }
  patches
    .sort((a, b) => a.y - b.y)
    .forEach((p) =>
      ctx.drawImage(
        canopy(p.index),
        p.x - p.size / 2,
        p.y - p.size / 2,
        p.size,
        p.size,
      ),
    );
}
export function paintMountain(ctx: CanvasRenderingContext2D, c: Cell) {
  const variant = (c.x * 7 + c.y * 13) % 3,
    x = c.x * 32,
    y = c.y * 32;
  ctx.save();
  ctx.translate(x, y + 7);
  ctx.scale(1, 0.75);
  const peak = (cx: number, top: number, half: number, base: number) => {
    ctx.beginPath();
    ctx.moveTo(cx - half, base);
    ctx.lineTo(cx - 3, top + 5);
    ctx.lineTo(cx, top);
    ctx.lineTo(cx + 3, top + 6);
    ctx.lineTo(cx + half, base);
    ctx.closePath();
    const g = ctx.createLinearGradient(cx - half, top, cx + half, base);
    g.addColorStop(0, "#b0a379");
    g.addColorStop(0.5, "#7b8062");
    g.addColorStop(1, "#4f5a49");
    ctx.fillStyle = g;
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx, top);
    ctx.lineTo(cx + half, base);
    ctx.lineTo(cx + 2, base - 3);
    ctx.lineTo(cx - 1, top + 8);
    ctx.fillStyle = "#4a5446";
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx - 3, top + 5);
    ctx.lineTo(cx, top);
    ctx.lineTo(cx + 3, top + 6);
    ctx.lineTo(cx + 1, top + 5);
    ctx.lineTo(cx - 1, top + 7);
    ctx.fillStyle = "#d3c8a0";
    ctx.fill();
    ctx.strokeStyle = "#c3b48b80";
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(cx - 2, top + 7);
    ctx.lineTo(cx - 5, base - 7);
    ctx.lineTo(cx - 8, base - 3);
    ctx.stroke();
  };
  ctx.fillStyle = "#34482b40";
  ctx.beginPath();
  ctx.ellipse(16, 26, 14, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  peak(
    variant === 1 ? 18 : 15,
    variant === 2 ? 5 : 2,
    variant === 0 ? 12 : 11,
    27,
  );
  if (variant !== 0) {
    peak(8, 15, 6, 29);
    if (variant === 2) peak(24, 18, 5, 29);
  }
  ctx.restore();
}
