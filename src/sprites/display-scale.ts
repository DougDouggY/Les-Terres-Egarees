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
