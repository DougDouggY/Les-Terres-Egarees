/** Presentation only. Actions play once; retreat can never select an attack frame. */
export function combatTiming(frames: number, fps: number, ranged = false) {
  const approach = ranged ? 0 : 280,
    attack = Math.max(600, (frames / Math.max(1, fps)) * 1000),
    recovery = 180,
    retreat = ranged ? 0 : 360;
  return {
    approach,
    attack,
    recovery,
    retreat,
    impact: approach + attack * 0.5,
    total: approach + attack + recovery + retreat + 180,
  };
}
export function combatPose(
  elapsed: number,
  frames: number,
  fps: number,
  ranged = false,
  counter = false,
) {
  const timing = combatTiming(frames, fps, ranged),
    { approach, attack, recovery, retreat } = timing;
  let animation = "idle",
    index = 0,
    travel = 0;
  if (elapsed < 0) {
    animation = "move";
    index = Math.floor(Math.max(0, elapsed + 400) / 130) % 2;
  } else if (elapsed < approach) {
    animation = "move";
    index = Math.floor(elapsed / 130) % 2;
    travel = elapsed / approach;
  } else if (elapsed < approach + attack) {
    animation = counter ? "counter" : "attack";
    index = Math.min(
      frames - 1,
      Math.floor(((elapsed - approach) / attack) * frames),
    );
    travel = ranged ? 0 : 1;
  } else if (elapsed < approach + attack + recovery) {
    travel = ranged ? 0 : 1;
  } else if (elapsed < approach + attack + recovery + retreat) {
    animation = "move";
    index = Math.floor(elapsed / 130) % 2;
    travel = 1 - (elapsed - approach - attack - recovery) / retreat;
  }
  return { ...timing, animation, index, travel };
}
