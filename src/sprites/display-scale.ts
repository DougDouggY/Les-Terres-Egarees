import { resolveClip, type SpriteProfile } from "./catalog";
import { profileMetrics } from "./geometry";
/** Screen-space previews use anatomical height, never the union of attack/weapon poses. */
export function anatomicalPlacement(
  profile: SpriteProfile | undefined,
  animation: string,
  bodyHeight: number,
) {
  const clip = resolveClip(profile, animation);
  const reference =
    profile && clip
      ? profileMetrics(profile).references.get(clip.source)
      : undefined;
  return reference ? { scale: bodyHeight / reference } : undefined;
}
/** Single-pose Chamane: small upper-body sway with invariant feet and no foreign pose. */
export function tacticalIdleSway(
  classId: string | undefined,
  gender: string | undefined,
  animation: string,
  frame: number,
  frameCount: number | undefined,
) {
  return classId === "shaman" &&
    gender === "female" &&
    animation === "idle" &&
    frameCount === 1
    ? frame % 2
      ? 0.014
      : -0.014
    : 0;
}
