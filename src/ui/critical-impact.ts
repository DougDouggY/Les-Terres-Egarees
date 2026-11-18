/** Shared presentation effect: no character art, combat roll or HP changes. */
export const criticalImpactDuration = 480;
export function criticalImpact(age: number, reducedMotion = false) {
  const active = age >= 0 && age < criticalImpactDuration;
  const strength = active ? Math.max(0, 1 - age / criticalImpactDuration) : 0;
  return {
    active,
    flash: active
      ? Math.max(0, 1 - age / 90) * (reducedMotion ? 0.09 : 0.64)
      : 0,
    shakeX: reducedMotion ? 0 : Math.sin(age * 0.15) * 12 * strength ** 1.5,
    shakeY: reducedMotion ? 0 : Math.cos(age * 0.19) * 5 * strength ** 1.5,
    strength,
  };
}
/** High contrast slashes, shared by every appearance and weapon. */
export function drawCriticalImpact(
  ctx: CanvasRenderingContext2D,
  age: number,
  x: number,
  y: number,
  width: number,
  height: number,
  reducedMotion = false,
) {
  const effect = criticalImpact(age, reducedMotion);
  if (!effect.active) return;
  const reach = Math.min(width * 0.36, 290),
    reveal = reducedMotion ? 1 : Math.min(1, age / 65),
    opacity = reducedMotion ? effect.strength * 0.6 : effect.strength;
  ctx.save();
  ctx.fillStyle = `rgba(5,8,16,${opacity * 0.48})`;
  ctx.fillRect(-width, -height, width * 3, height * 3);
  if (effect.flash > 0) {
    ctx.fillStyle = `rgba(255,250,230,${effect.flash})`;
    ctx.fillRect(-width, -height, width * 3, height * 3);
  }
  ctx.translate(x, y);
  ctx.rotate(-0.65);
  for (const [shift, span] of [
    [0, reach],
    [44, reach * 0.72],
  ]) {
    const end = span * reveal;
    for (const [thickness, color] of [
      [24, "#3b2020"],
      [17, "#f1a345"],
      [8, "#ffe9ad"],
      [3, "#ffffff"],
    ] as const) {
      ctx.globalAlpha = opacity;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(-end, shift);
      ctx.quadraticCurveTo(-end * 0.16, shift - thickness, end, shift);
      ctx.quadraticCurveTo(end * 0.12, shift + thickness, -end, shift);
      ctx.closePath();
      ctx.fill();
    }
  }
  ctx.restore();
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.textAlign = "center";
  ctx.font = "bold 30px sans-serif";
  ctx.lineWidth = 5;
  ctx.strokeStyle = "#171116";
  ctx.fillStyle = "#fff2c1";
  ctx.translate(Math.max(130, Math.min(width - 130, x)), Math.max(50, y - 115));
  if (ctx.getTransform().a < 0) ctx.scale(-1, 1);
  ctx.strokeText("CRITIQUE", 0, 0);
  ctx.fillText("CRITIQUE", 0, 0);
  ctx.restore();
}
