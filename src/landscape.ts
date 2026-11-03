import { cell, map } from "./game/map";
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
const seed = (x: number, y: number, n: number) => {
  const v = Math.sin(x * 127.1 + y * 311.7 + n * 73.3) * 43758.5453;
  return v - Math.floor(v);
};
function tree(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  variant: number,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "#172b2560";
  ctx.beginPath();
  ctx.ellipse(1, 1, size * 0.38, size * 0.12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#51422d";
  ctx.fillRect(-size * 0.055, -size * 0.35, size * 0.11, size * 0.45);
  for (let level = 0; level < 3; level++) {
    const top = -size + level * size * 0.24,
      half = size * (0.19 + level * 0.09),
      bottom = top + size * 0.49;
    ctx.beginPath();
    ctx.moveTo(0, top);
    ctx.bezierCurveTo(
      -half * 0.4,
      top + size * 0.2,
      -half * 0.7,
      bottom - size * 0.06,
      -half,
      bottom,
    );
    ctx.quadraticCurveTo(-half * 0.3, bottom + size * 0.08, 0, bottom);
    ctx.quadraticCurveTo(half * 0.45, bottom + size * 0.09, half, bottom);
    ctx.bezierCurveTo(
      half * 0.7,
      bottom - size * 0.06,
      half * 0.4,
      top + size * 0.2,
      0,
      top,
    );
    const g = ctx.createLinearGradient(-half, 0, half, 0);
    g.addColorStop(0, variant > 0.5 ? "#70815a" : "#647850");
    g.addColorStop(0.48, "#3e5c3d");
    g.addColorStop(1, "#233d31");
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = "#91a27355";
    ctx.lineWidth = 0.35;
    ctx.beginPath();
    ctx.moveTo(-half * 0.7, bottom - 0.3);
    ctx.lineTo(-half * 0.18, top + size * 0.15);
    ctx.stroke();
  }
  ctx.restore();
}
export function paintWoods(ctx: CanvasRenderingContext2D) {
  // A grass margin surrounds irregular clusters; only shared edges receive bridges.
  for (const c of map.filter(isWood)) {
    const x = c.x * 32 + 16,
      y = c.y * 32 + 16,
      neighbors = woodNeighbors(c);
    ctx.strokeStyle = "#34482c55";
    ctx.lineWidth = 19;
    ctx.lineCap = "round";
    for (const i of [1, 2])
      if (neighbors[i]) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + (i === 1 ? 32 : 0), y + (i === 2 ? 32 : 0));
        ctx.stroke();
      }
    const g = ctx.createRadialGradient(x, y, 3, x, y, 15);
    g.addColorStop(0, "#344b2f80");
    g.addColorStop(1, "#344b2f00");
    ctx.fillStyle = g;
    ctx.fillRect(x - 16, y - 16, 32, 32);
  }
  const trees: { x: number; y: number; size: number; variant: number }[] = [];
  for (const c of map.filter(isWood)) {
    const dense = c.terrain === "tree",
      radius = dense ? 11 : 9;
    const placed: { x: number; y: number }[] = [];
    const count = dense ? 7 : 4;
    for (let attempt = 0; attempt < 60 && placed.length < count; attempt++) {
      const angle = seed(c.x, c.y, attempt * 4 + 10) * Math.PI * 2;
      const r = Math.sqrt(seed(c.x, c.y, attempt * 4 + 11)) * radius;
      const x =
        c.x * 32 + 16 + Math.cos(angle) * r + (seed(c.x, c.y, 210) - 0.5) * 3;
      const y = c.y * 32 + 21 + Math.sin(angle) * r * 0.8;
      if (placed.some((p) => Math.hypot(x - p.x, y - p.y) < 5)) continue;
      placed.push({ x, y });
      trees.push({
        x,
        y,
        size: 8 + seed(c.x, c.y, attempt * 4 + 12) * 5,
        variant: seed(c.x, c.y, attempt * 4 + 13),
      });
    }
    const n = woodNeighbors(c);
    if (n[1])
      for (const dy of [-3, 4])
        trees.push({
          x: (c.x + 1) * 32 + (seed(c.x, c.y, 70 + dy) - 0.5) * 3,
          y: c.y * 32 + 20 + dy + (seed(c.x, c.y, 80 + dy) - 0.5) * 4,
          size: 10 + seed(c.x, c.y, 60) * 2,
          variant: 0.7,
        });
    if (n[2])
      for (const dx of [-4, 4])
        trees.push({
          x: c.x * 32 + 16 + dx + (seed(c.x, c.y, 90 + dx) - 0.5) * 4,
          y: (c.y + 1) * 32 + 2 + (seed(c.x, c.y, 100 + dx) - 0.5) * 4,
          size: 10 + seed(c.x, c.y, 61) * 2,
          variant: 0.3,
        });
  }
  trees
    .sort((a, b) => a.y - b.y)
    .forEach((t) => tree(ctx, t.x, t.y, t.size, t.variant));
}
export function paintMountain(ctx: CanvasRenderingContext2D, c: Cell) {
  const variant = (c.x * 7 + c.y * 13) % 3,
    x = c.x * 32,
    y = c.y * 32;
  ctx.save();
  ctx.translate(x, y);
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
