/** Visual reaction only: the engine has already decided hit/miss/block. */
export function dodgeReaction(
  progress: number,
  projectile: boolean,
  impact: number,
  meleeStart: number,
  meleeEnd: number,
) {
  const start = projectile ? impact - 0.075 : meleeStart;
  const end = projectile ? impact + 0.3 : meleeEnd;
  if (progress < start || progress >= end) return undefined;
  // A projectile dodge reaches its illustrated back step as the arrow arrives.
  const phase = projectile
    ? progress < impact
      ? ((progress - start) / (impact - start)) * 0.5
      : 0.5 + ((progress - impact) / (end - impact)) * 0.5
    : (progress - start) / (end - start);
  return { phase, retreat: Math.sin(phase * Math.PI) };
}

export function shieldReaction(progress: number, impact = 0.42) {
  progress -= impact - 0.42;
  if (progress < 0.24 || progress >= 0.82) return undefined;
  return progress < 0.36
    ? ((progress - 0.24) / 0.12) * 0.33
    : progress < 0.58
      ? 0.5
      : 0.67 + ((progress - 0.58) / 0.24) * 0.32;
}
