import {
  profileKey,
  resolveClip,
  type SpriteProfile,
  type Clip,
} from "./catalog";
import { resourceRect } from "./geometry";
import type { Unit } from "../game/types";
import { classes } from "../data/classes";
export type CombatSkin = {
  id: string;
  profile: SpriteProfile;
  mounted: boolean;
  issues: { animation: string; reason: string }[];
};
const neverCombatSources = new Set(["assets/sprites.png", "sprites.png"]);
/** Reviewed same-costume defence sheets; other foreign-sheet clips are quarantined. */
const approvedCrossSheets = new Set([
  "raider:female:axe-shield:default:block",
  "raider:male:sword-shield:default:block",
  "cavalry:any:sword-shield:default:block",
  "sans_guard:any:sword-shield:default:block",
]);
export function buildCombatSkin(
  original: SpriteProfile | undefined,
  replacement?: SpriteProfile,
): CombatSkin | undefined {
  if (!original) return;
  const id = profileKey(original),
    p = replacement ?? original;
  const issues: CombatSkin["issues"] = [];
  const attack = resolveClip(p, "attack"),
    guard = resolveClip(p, "combat_idle") ?? resolveClip(p, "idle");
  const primary = attack ?? guard;
  const profile: SpriteProfile = { ...p, clips: {} };
  for (const name of Object.keys(p.clips)) {
    const c = resolveClip(p, name);
    if (!c) continue;
    if (
      neverCombatSources.has(c.source) ||
      (!replacement &&
        name === "block" &&
        primary &&
        c.source !== primary.source &&
        !approvedCrossSheets.has(id + ":" + name))
    ) {
      issues.push({
        animation: name,
        reason: `Planche incompatible écartée : ${c.source}`,
      });
      continue;
    }
    if (name.startsWith("combat_")) continue;
    // Guard/recovery and attack belong to one wardrobe, not to unrelated map art.
    if (["idle", "move"].includes(name) && attack && c.source !== attack.source)
      continue;
    if (name === "evade" && c.source !== primary?.source) {
      issues.push({
        animation: name,
        reason: "Ancienne esquive d’un autre skin écartée",
      });
      continue;
    }
    profile.clips[name] = { ...c };
  }
  if (primary) {
    const c = attack ?? guard!;
    const frame = attack ? c.frames.length - 1 : 0;
    const cell = c.cells?.[frame] ?? { row: c.row, column: c.frames[frame] };
    const idle: Clip = {
      ...c,
      row: cell.row,
      frames: [cell.column],
      cells: [cell],
      fps: 2,
      loop: true,
      status: "provisional",
      note: "Garde extraite du même atlas que l’attaque, aucune substitution de skin.",
    };
    if (resolveClip(p, "combat_idle"))
      profile.clips.idle = resolveClip(p, "combat_idle")!;
    else profile.clips.idle = profile.clips.idle ?? idle;
    if (!profile.clips.move) {
      profile.clips.move = {
        reuse: "idle",
        status: "provisional",
        note: "Pas spécifiques manquants : garde du même skin conservée pendant le déplacement.",
      };
      issues.push({
        animation: "move",
        reason: "Marche de combat spécifique manquante",
      });
    }
  }
  // Counter attacks are the SAME identity and weapon; an alternate gesture is optional.
  if (attack)
    profile.clips.counter = {
      reuse: "attack",
      note: "Même skin et même arme, événement de riposte fourni par le moteur.",
    };
  if (attack && !profile.clips.attack_again)
    profile.clips.attack_again = {
      reuse: "attack",
      note: "Seconde activation d’agilité : même arme, même skin.",
    };
  for (const name of ["idle", "damage", "evade", "death"])
    if (!resolveClip(profile, name))
      issues.push({
        animation: name,
        reason: "Dessin cohérent manquant ; aucune pose d’un autre personnage.",
      });
  if (attack && attack.frames.length < 4)
    issues.push({
      animation: "attack",
      reason:
        "Séquence courte existante, anticipation/récupération détaillées encore manquantes.",
    });
  for (const name of Object.keys(profile.clips)) {
    const c = resolveClip(profile, name)!;
    if (c.frames.some((_, i) => resourceRect(c, i)?.ambiguous))
      issues.push({
        animation: name,
        reason: `Découpage ambigu à contrôler : ${c.source}`,
      });
  }
  const result = {
    id,
    profile,
    mounted: !!classes[p.classId]?.mounted || p.classId === "sans_rider",
    issues,
  };
  return result;
}
