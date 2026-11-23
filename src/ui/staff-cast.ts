/** Shared staff-origin visual: presentation only, no combat decisions or HP writes. */
export function sampleStaffCast(
  t: number,
  from: { x: number; y: number },
  to: { x: number; y: number },
  hit = true,
) {
  const charge = t >= -320 && t < -180;
  const flying = t >= -180 && t < (hit ? 0 : 160);
  const progress = Math.max(0, (t + 180) / 180);
  return {
    charge,
    flying,
    progress,
    point: {
      x: from.x + (to.x - from.x) * progress,
      y: from.y + (to.y - from.y) * progress,
    },
    impact: hit && t >= 0 && t < 240,
  };
}
export function drawStaffCast(
  ctx: CanvasRenderingContext2D,
  kind: "lightning" | "heal",
  t: number,
  from: { x: number; y: number },
  to: { x: number; y: number },
  size = 70,
  hit = true,
  chargeFrom = from,
) {
  const s = sampleStaffCast(t, from, to, hit),
    color = kind === "heal" ? "#9aefac" : "#a7d8ff";
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  const orb = (x: number, y: number, r: number) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, "#f5ffff");
    g.addColorStop(0.3, color);
    g.addColorStop(1, kind === "heal" ? "#8bedaa00" : "#7bc8ff00");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  };
  if (s.charge)
    orb(chargeFrom.x, chargeFrom.y, size * (0.07 + (0.06 * (t + 320)) / 140));
  if (s.flying) {
    if (kind === "lightning") {
      ctx.lineWidth = Math.max(1, size * 0.025);
      ctx.beginPath();
      for (let i = 0; i <= 7; i++) {
        const f = i / 7,
          back = Math.max(0, s.progress - 0.2 * (1 - f));
        const x = from.x + (to.x - from.x) * back,
          y =
            from.y +
            (to.y - from.y) * back +
            (i === 0 || i === 7
              ? 0
              : Math.sin(i * 7 + t * 0.035) * size * 0.045);
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.stroke();
    }
    orb(s.point.x, s.point.y, size * (0.08 + Math.min(1, s.progress) * 0.05));
  }
  if (kind === "heal" && s.impact) {
    ctx.globalAlpha = 1 - t / 240;
    orb(to.x, to.y, size * 0.24);
  }
  ctx.restore();
}
