import { colorForOwner } from "../game/team-colors";
import type { Campaign, Unit } from "../game/types";
import type { DialogueLine } from "../data/prologue";
import { storyUnit } from "../game/prologue";
import { unitPortrait } from "../game/portraits";
import { portraitAsset } from "../data/portraits";
export type DialoguePortrait = {
  key: string;
  name: string;
  asset: string;
  side: "left" | "right";
  active: boolean;
  depth: "front" | "back";
  teamColor?: string;
};
/** Only speakers already encountered in the scene are shown: no future reveal. */
export function dialogueCast(
  s: Campaign,
  lines: DialogueLine[],
  index: number,
): DialoguePortrait[] {
  const slots: Record<string, Omit<DialoguePortrait, "active" | "depth">> = {};
  let current: string | undefined;
  let witchApproach = false;
  for (let i = 0; i <= index; i++) {
    const l = lines[i];
    if (s.chapter1?.pending?.id === "alliance" && l.speaker === "unknown") {
      witchApproach = true;
      for (const p of Object.values(slots)) p.side = "right";
    }
    if (l.speaker === "narrator" || (l.speaker === "unknown" && !l.unitId)) {
      if (i === index) current = undefined;
      continue;
    }
    const u = l.unitId
      ? s.units.find((u) => u.id === l.unitId)
      : storyUnit(s, l.speaker);
    if (u && u.hp <= 0) continue;
    const asset = u
      ? unitPortrait(s, u)
      : l.speaker === "witch"
        ? portraitAsset("R01")
        : undefined;
    if (!asset) continue;
    const key = u?.portraitIdentity ?? u?.id ?? l.speaker;
    const existing = Object.values(slots).find((p) => p?.key === key);
    let side: "left" | "right" =
      existing?.side ??
      (l.unitId && u
        ? u.owner === 1
          ? "left"
          : "right"
        : l.speaker === "north-companion" ||
            l.speaker === "knight-chief" ||
            l.speaker === "captain" ||
            l.speaker === "geraud"
          ? "right"
          : "left");
    if (
      !existing &&
      !l.unitId &&
      Object.values(slots).some((p) => p.side === side) &&
      !Object.values(slots).some((p) => p.side !== side)
    )
      side = side === "left" ? "right" : "left";
    if (witchApproach) side = l.speaker === "witch" ? "left" : "right";
    if (!existing) {
      const same = Object.values(slots).filter((p) => p.side === side);
      if (same.length >= 2) delete slots[same[0].key];
    }
    delete slots[key];
    slots[key] = {
      key,
      name: u?.name ?? "La sorcière",
      asset,
      side,
      teamColor: u ? colorForOwner(s.teamColors, u.owner) : undefined,
    };
    if (i === index) current = key;
  }
  if (lines[index].speaker === "narrator") return [];
  const cast: DialoguePortrait[] = Object.values(slots).map((p) => ({
    ...p!,
    active: p!.key === current,
    depth:
      p!.key === current ||
      (!Object.values(slots).some(
        (q) => q.side === p!.side && q.key === current,
      ) &&
        Object.values(slots)
          .filter((q) => q.side === p!.side)
          .at(-1)?.key === p!.key)
        ? "front"
        : "back",
  }));
  if (lines[index].cue === "rescue") {
    const victim = storyUnit(s, "knight-chief"),
      key = victim?.portraitIdentity ?? victim?.id;
    const v = cast.find((p) => p.key === key);
    if (v) {
      for (const p of cast)
        if (p.side === v.side && p.key !== v.key)
          p.side = v.side === "left" ? "right" : "left";
      for (const side of ["left", "right"] as const) {
        const group = cast.filter((p) => p.side === side);
        for (const p of group) p.depth = p.active || p === v ? "front" : "back";
      }
      v.depth = "front";
      cast.push({
        key: "chapter-ambush",
        name: "Sans-Repos",
        asset: portraitAsset("N05"),
        side: v.side,
        active: false,
        depth: "back",
        teamColor: "pink",
      });
    }
  }
  return cast;
}
/** Visual pages preserve every original character and never advance the story early. */
export function dialoguePages(text: string, limit: number): string[] {
  const pages: string[] = [];
  let rest = text;
  while (rest.length > limit) {
    const space = rest.lastIndexOf(" ", limit);
    const cut = space > limit / 2 ? space + 1 : limit;
    pages.push(rest.slice(0, cut));
    rest = rest.slice(cut);
  }
  pages.push(rest);
  return pages;
}
