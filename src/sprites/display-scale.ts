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
/** No replacement art: every genuine single-pose idle gets the same gentle breath. */
export function tacticalIdleSway(
  _classId: string | undefined,
  _gender: string | undefined,
  animation: string,
  frame: number,
  frameCount: number | undefined,
) {
  return animation === "idle" && frameCount === 1
    ? frame % 2
      ? 0.014
      : -0.014
    : 0;
}
export function idleAnimationFrame(
  profile: SpriteProfile | undefined,
  time: number,
) {
  const clip = resolveClip(profile, "idle");
  return clip && clip.frames.length > 1
    ? Math.floor((time * Math.max(0.1, clip.fps)) / 1000)
    : Math.floor(time / 600);
}
