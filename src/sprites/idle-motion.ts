import type { SpriteProfile } from "./catalog";

const baseClasses = new Set([
  "raider",
  "north_warrior",
  "nordic_blade",
  "hunter",
  "shaman",
  "man_at_arms",
  "spearman",
  "crossbowman",
  "swordsman",
  "sorcerer",
]);
export function groundedIdleClass(classId: string | undefined) {
  return (
    !!classId &&
    (baseClasses.has(classId) ||
      classId === "skeleton" ||
      classId.startsWith("sans_"))
  );
}
export function groundedIdle(profile: SpriteProfile | undefined) {
  return (
    !!profile &&
    profile.state === "default" &&
    groundedIdleClass(profile.classId)
  );
}
/** A continuous, quiet breath about the feet. No stepping pose or anchor swap. */
export function idleBreath(time: number) {
  const phase = (time * Math.PI * 2) / 2200;
  return {
    lean: Math.sin(phase) * 0.012,
    height: 1 - (1 - Math.cos(phase)) * 0.012,
  };
}
