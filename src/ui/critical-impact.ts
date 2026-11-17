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
/** High contrast slash and fragments, shared by every appearance and weapon. */
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
    ctx.lineCap = "round";
    for (const [lineWidth, color] of [
      [26, "#351719"],
      [17, "#f29235"],
      [8, "#ffe5a2"],
      [3, "#ffffff"],
    ] as const) {
      ctx.globalAlpha = opacity;
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.beginPath();
      ctx.moveTo(-end, shift);
      ctx.lineTo(end, shift);
      ctx.stroke();
    }
  }
  ctx.restore();
  ctx.save();
  ctx.globalAlpha = opacity;
  for (let i = 0; i < 12; i++) {
    const angle = i * 2.39996,
      distance = 35 + (reducedMotion ? 25 : age * (0.22 + (i % 3) * 0.06)),
      px = x + Math.cos(angle) * distance,
      py = y + Math.sin(angle) * distance * 0.6;
    ctx.fillStyle = i % 2 ? "#fff4c7" : "#f8a94e";
    ctx.beginPath();
    ctx.moveTo(px, py - 8);
    ctx.lineTo(px + 5, py + 3);
    ctx.lineTo(px - 4, py + 7);
    ctx.closePath();
    ctx.fill();
  }
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
