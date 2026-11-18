/** Shared parry marker: visual only, no roll, damage, timing or audio. */
export const parryImpactDuration = 300;
export function parryImpact(age: number, reducedMotion = false) {
  const active = age >= 0 && age < parryImpactDuration;
  return {
    active,
    scale: reducedMotion ? 1 : 0.45 + Math.min(1, Math.max(0, age) / 85) * 0.75,
    opacity: active
      ? Math.min(1, age / 20) * Math.max(0, 1 - age / parryImpactDuration)
      : 0,
    burst: reducedMotion ? 0 : Math.min(1, Math.max(0, (age - 115) / 185)),
  };
}
function shieldPath(ctx: CanvasRenderingContext2D) {
  ctx.beginPath();
  ctx.moveTo(0, -0.48);
  ctx.lineTo(0.4, -0.32);
  ctx.lineTo(0.35, 0.15);
  ctx.quadraticCurveTo(0.23, 0.4, 0, 0.56);
  ctx.quadraticCurveTo(-0.23, 0.4, -0.35, 0.15);
  ctx.lineTo(-0.4, -0.32);
  ctx.closePath();
}
export function drawParryImpact(
  ctx: CanvasRenderingContext2D,
  age: number,
  x: number,
  y: number,
  size = 110,
  reducedMotion = false,
) {
  const p = parryImpact(age, reducedMotion);
  if (!p.active) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size * p.scale, size * p.scale);
  ctx.globalAlpha = p.opacity;
  ctx.shadowColor = "#8bdeff";
  ctx.shadowBlur = reducedMotion ? 0 : 16;
  ctx.lineJoin = "round";
  if (p.burst === 0) {
    shieldPath(ctx);
    ctx.fillStyle = "rgba(114,207,255,0.38)";
    ctx.fill();
    ctx.strokeStyle = "#5bbaff";
    ctx.lineWidth = 0.075;
    ctx.stroke();
    ctx.strokeStyle = "#f4feff";
    ctx.lineWidth = 0.026;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, -0.35);
    ctx.lineTo(0, 0.36);
    ctx.moveTo(-0.24, -0.12);
    ctx.lineTo(0.24, -0.12);
    ctx.strokeStyle = "#e5fbff";
    ctx.lineWidth = 0.027;
    ctx.stroke();
  } else {
    const outline = [
      [0, -0.48],
      [0.4, -0.32],
      [0.35, 0.15],
      [0, 0.56],
      [-0.35, 0.15],
      [-0.4, -0.32],
      [0, -0.48],
    ];
    for (let i = 0; i < outline.length - 1; i++) {
      const a = outline[i],
        b = outline[i + 1],
        mx = (a[0] + b[0]) / 2,
        my = (a[1] + b[1]) / 2;
      const dx = mx * p.burst * 1.8,
        dy = my * p.burst * 1.8;
      ctx.beginPath();
      ctx.moveTo(a[0] + dx, a[1] + dy);
      ctx.lineTo(b[0] + dx, b[1] + dy);
      ctx.strokeStyle = "#7fceff";
      ctx.lineWidth = 0.065 * (1 - p.burst * 0.6);
      ctx.stroke();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 0.02;
      ctx.stroke();
    }
  }
  ctx.restore();
}
