/** Visual reaction only: the engine has already decided hit/miss/block. */
export function dodgeReaction(
  progress: number,
  projectile: boolean,
  impact: number,
  meleeStart: number,
  meleeEnd: number,
  synchronizedMelee = false,
) {
  const timed = projectile || synchronizedMelee;
  const start = timed ? impact - (projectile ? 0.075 : 0.035) : meleeStart;
  const end = timed ? impact + 0.3 : meleeEnd;
  if (progress < start || progress >= end) return undefined;
  // A projectile dodge reaches its illustrated back step as the arrow arrives.
  const phase = timed
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

export function synchronizeMeleeDodge(classId?: string, gender?: string) {
  return !(classId === "nordic_blade" && gender === "female");
}
