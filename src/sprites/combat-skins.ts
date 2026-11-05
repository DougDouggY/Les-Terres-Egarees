import type { Unit } from "../game/types";
import { profileKey, type SpriteProfile } from "./catalog";
import { buildCombatSkin, type CombatSkin } from "./combat-skin-core";
export type { CombatSkin } from "./combat-skin-core";
const additions = import.meta.glob("../assets/tactical/*.combat.json", {
  eager: true,
  import: "default",
}) as Record<string, { profiles: SpriteProfile[] }>;
const replacements = new Map(
  Object.values(additions)
    .flatMap((d) => d.profiles)
    .map((p) => [profileKey(p), p]),
);
const cache = new WeakMap<SpriteProfile, CombatSkin>();
export function combatSkin(p: SpriteProfile | undefined) {
  if (!p) return;
  const cached = cache.get(p);
  if (cached) return cached;
  const skin = buildCombatSkin(p, replacements.get(profileKey(p)))!;
  cache.set(p, skin);
  return skin;
}

export function skinForUnit(unit: Unit, profiles: SpriteProfile[]) {
  if (unit.combatSkinId)
    return combatSkin(
      profiles.find((p) => profileKey(p) === unit.combatSkinId),
    );
}
