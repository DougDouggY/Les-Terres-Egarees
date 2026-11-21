import annotations from "../assets/tactical/combat-anchors.json";
import { resolveClip, type SpriteProfile } from "./catalog";
import { profileMetrics } from "./geometry";

/** The illustrated weapon tip, mirrored around the same feet anchor as the actor. */
export function illustratedWeaponPoint(
  profile: SpriteProfile | undefined,
  animation: string,
  frame: number,
  x: number,
  ground: number,
  body: number,
  direction: number,
) {
  const clip = resolveClip(profile, animation);
  if (profile && clip) {
    const index = Math.max(0, Math.min(clip.frames.length - 1, frame));
    const cell = clip.cells?.[index] ?? {
      row: clip.row,
      column: clip.frames[index],
    };
    const table = annotations as Record<
      string,
      Record<
        string,
        {
          feetX: number;
          feetY: number;
          weaponTip: { x: number; y: number };
        }
      >
    >;
    const a = table[clip.source]?.[`${cell.row}:${cell.column}`];
    const reference = profileMetrics(profile).references.get(clip.source);
    if (a && reference)
      return {
        x: x + (direction * (a.weaponTip.x - a.feetX) * body) / reference,
        y: ground + ((a.weaponTip.y - a.feetY) * body) / reference,
      };
  }
  return { x: x + direction * body * 0.25, y: ground - body * 0.6 };
}
