import cloudUrl from "../assets/effects/storm-cloud-v6.png?url";
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
let stormCloud: HTMLImageElement | undefined;
function cloudImage() {
  if (!stormCloud) {
    stormCloud = new Image();
    stormCloud.src = cloudUrl;
  }
  return stormCloud;
}
function effectImage() {
  if (!atlas) {
    atlas = new Image();
    atlas.src = effectsUrl;
  }
  return atlas;
}
export async function preloadEffects() {
  try {
    await Promise.all([effectImage().decode(), cloudImage().decode()]);
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
  if (kind === "lightning" && t >= -80 && t < 100)
    drawEffectFrame(
      ctx,
      kind,
      t < 0 ? 2 : 3,
      to.x,
      to.y - 25,
      size * 1.55,
      flip,
    );
  // Exact V4 bolt and mirror above. Draw the cloud last to conceal its cut root.
  if (
    kind === "lightning" &&
    t >= -300 &&
    t < 280 &&
    stormCloud?.complete &&
    stormCloud.naturalWidth
  ) {
    const appear = Math.min(1, (t + 300) / 140),
      fade = t > 100 ? Math.max(0, (280 - t) / 180) : 1;
    const x = Math.round((to.x + (flip ? 1 : -1) * size * 0.63) / 3) * 3;
    const y = Math.round((to.y - 25 - size * 0.69 - 9) / 3) * 3;
    ctx.save();
    ctx.globalAlpha = appear * fade;
    ctx.drawImage(
      stormCloud,
      x - size * 1.36,
      y - size * 0.74,
      size * 2.72,
      size * 1.36,
    );
    ctx.restore();
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
