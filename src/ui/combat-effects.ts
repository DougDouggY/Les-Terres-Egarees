import effectsUrl from "../assets/effects/combat-magic.png?url";
import type { Unit } from "../game/types";
import { activeWeapon, unitClass } from "../game/classes";
export type MagicEffect = "heal" | "fire" | "lightning";
export function attackEffect(u: Unit): MagicEffect | undefined {
  return activeWeapon(u)?.category === "magic"
    ? unitClass(u).faction === "north"
      ? "lightning"
      : "fire"
    : undefined;
}
let atlas: HTMLImageElement | undefined;
function effectImage() {
  if (!atlas) {
    atlas = new Image();
    atlas.src = effectsUrl;
  }
  return atlas;
}
export async function preloadEffects() {
  try {
    await effectImage().decode();
  } catch {
    /* Missing effects never replace a character or alter combat. */
  }
}
export function drawEffectFrame(
  ctx: CanvasRenderingContext2D,
  kind: MagicEffect,
  frame: number,
  x: number,
  y: number,
  size: number,
  flip = false,
) {
  const im = effectImage();
  if (!im.complete || !im.naturalWidth) return false;
  const cell = im.naturalWidth / 6,
    row = { heal: 0, fire: 1, lightning: 2 }[kind];
  ctx.save();
  ctx.translate(x, y);
  if (flip) ctx.scale(-1, 1);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(
    im,
    Math.min(5, Math.max(0, Math.floor(frame))) * cell,
    (row * im.naturalHeight) / 3,
    cell,
    im.naturalHeight / 3,
    -size / 2,
    -size / 2,
    size,
    size,
  );
  ctx.restore();
  return true;
}
/** Elapsed relative to damage impact, shared by campaign and independent tests. */
export function drawSpell(
  ctx: CanvasRenderingContext2D,
  kind: MagicEffect,
  t: number,
  from: { x: number; y: number },
  to: { x: number; y: number },
  size = 110,
) {
  if (kind === "heal") return;
  const flip = to.x < from.x;
  if (kind === "fire" && t >= -320 && t < -180)
    drawEffectFrame(
      ctx,
      kind,
      t < -250 ? 0 : 1,
      from.x,
      from.y,
      size * 0.65,
      flip,
    );
  if (kind === "fire" && t >= -180 && t < 0) {
    const p = (t + 180) / 180;
    drawEffectFrame(
      ctx,
      kind,
      t < -90 ? 2 : 3,
      from.x + (to.x - from.x) * p,
      from.y + (to.y - from.y) * p,
      size,
      flip,
    );
  }
  if (kind === "lightning") {
    if (t < -360 || t > 280) return;
    const cloudY = to.y - size * 1.48,
      appear = Math.min(1, (t + 360) / 180),
      fade = t > 100 ? Math.max(0, (280 - t) / 180) : 1;
    ctx.save();
    ctx.globalAlpha = appear * fade;
    ctx.lineJoin = "bevel";
    if (t >= -75 && t < 200) {
      const points = [
        [to.x - 12, cloudY + 10],
        [to.x + 16, cloudY + size * 0.38],
        [to.x - 16, cloudY + size * 0.65],
        [to.x + 9, cloudY + size * 0.91],
        [to.x - 4, to.y],
      ];
      const reach = Math.max(0, Math.min(1, (t + 75) / 75)),
        n = (points.length - 1) * reach;
      const line = (width: number, color: string) => {
        ctx.lineWidth = width;
        ctx.strokeStyle = color;
        ctx.beginPath();
        ctx.moveTo(...(points[0] as [number, number]));
        for (let i = 1; i <= Math.floor(n); i++)
          ctx.lineTo(...(points[i] as [number, number]));
        if (n % 1) {
          const i = Math.floor(n),
            q = n - i;
          ctx.lineTo(
            points[i][0] + (points[i + 1][0] - points[i][0]) * q,
            points[i][1] + (points[i + 1][1] - points[i][1]) * q,
          );
        }
        ctx.stroke();
      };
      ctx.shadowColor = "#71bfff";
      ctx.shadowBlur = 18;
      line(size * 0.22, "#51a1ff77");
      line(size * 0.105, "#91d8ff");
      line(size * 0.04, "#f3ffff");
      if (reach > 0.65) {
        ctx.lineWidth = size * 0.045;
        ctx.strokeStyle = "#b9efff";
        for (const dir of [-1, 1]) {
          ctx.beginPath();
          ctx.moveTo(to.x, cloudY + size * 0.62);
          ctx.lineTo(to.x + dir * size * 0.45, cloudY + size * 0.8);
          ctx.lineTo(to.x + dir * size * 0.25, cloudY + size * 0.95);
          ctx.stroke();
        }
      }
      ctx.shadowBlur = 0;
    }
    // Layered stepped cloud hides the bolt root; no atlas edge can appear.
    for (const [dx, dy, r, color] of [
      [-0.65, 0.05, 0.43, "#555d69"],
      [-0.25, -0.12, 0.55, "#656d78"],
      [0.28, -0.1, 0.53, "#737c85"],
      [0.7, 0.05, 0.37, "#5c6571"],
    ] as const) {
      ctx.fillStyle = color;
      for (let y = -r * size; y < r * size; y += 4) {
        const half = Math.sqrt(Math.max(0, (r * size) ** 2 - y * y));
        ctx.fillRect(
          Math.round(to.x + dx * size - half),
          Math.round(cloudY + dy * size + y),
          Math.ceil(half * 2),
          4,
        );
      }
    }
    if (t >= 0) {
      ctx.globalAlpha = fade * Math.max(0, 1 - t / 280);
      ctx.strokeStyle = "#d5faff";
      ctx.lineWidth = 3;
      for (let i = 0; i < 9; i++) {
        const a = (i * Math.PI * 2) / 9;
        ctx.beginPath();
        ctx.moveTo(to.x + Math.cos(a) * 8, to.y + Math.sin(a) * 8);
        ctx.lineTo(
          to.x + Math.cos(a) * size * 0.48,
          to.y + Math.sin(a) * size * 0.48,
        );
        ctx.stroke();
      }
    }
    ctx.restore();
    return;
  }
  if (t >= 0 && t < 280)
    drawEffectFrame(ctx, kind, t < 140 ? 4 : 5, to.x, to.y, size * 1.2, flip);
}
export function drawHealing(
  ctx: CanvasRenderingContext2D,
  t: number,
  x: number,
  ground: number,
  size = 170,
) {
  if (t < 0 || t > 1100) return;
  drawEffectFrame(
    ctx,
    "heal",
    Math.min(5, Math.floor(t / 180)),
    x,
    ground - size * 0.46,
    size,
  );
}
export function drawArrow(
  ctx: CanvasRenderingContext2D,
  t: number,
  from: { x: number; y: number },
  to: { x: number; y: number },
) {
  if (t < -100 || t >= 0) return;
  const p = (t + 100) / 100,
    x = from.x + (to.x - from.x) * p,
    y = from.y + (to.y - from.y) * p,
    dir = to.x > from.x ? 1 : -1;
  ctx.save();
  ctx.strokeStyle = "#e8d8ae";
  ctx.fillStyle = "#e8d8ae";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x - dir * 30, y);
  ctx.lineTo(x, y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x - dir * 10, y - 5);
  ctx.lineTo(x - dir * 10, y + 5);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
