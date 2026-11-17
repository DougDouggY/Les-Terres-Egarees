/** Shared presentation effect: independent of character art and combat rules. */
export function criticalImpact(age: number, reducedMotion = false) {
  const active = age >= 0 && age < 280;
  const strength = active ? Math.max(0, 1 - age / 280) : 0;
  return {
    active,
    flash: strength * (reducedMotion ? 0.12 : 0.48),
    shakeX: reducedMotion ? 0 : Math.sin(age * 0.16) * 7 * strength,
    shakeY: reducedMotion ? 0 : Math.cos(age * 0.21) * 3 * strength,
    strength,
  };
}
