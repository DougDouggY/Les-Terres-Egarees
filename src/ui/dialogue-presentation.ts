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
};
/** Only speakers already encountered in the scene are shown: no future reveal. */
export function dialogueCast(
  s: Campaign,
  lines: DialogueLine[],
  index: number,
): DialoguePortrait[] {
  const slots: Partial<
    Record<"left" | "right", Omit<DialoguePortrait, "active">>
  > = {};
  let current: string | undefined;
  for (let i = 0; i <= index; i++) {
    const l = lines[i];
    if (l.speaker === "narrator" || (l.speaker === "unknown" && !l.unitId)) {
      if (i === index) current = undefined;
      continue;
    }
    const u = l.unitId
      ? s.units.find((u) => u.id === l.unitId)
      : storyUnit(s, l.speaker);
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
      (l.speaker === "north-companion" ||
      l.speaker === "knight-chief" ||
      l.speaker === "captain" ||
      l.speaker === "geraud"
        ? "right"
        : "left");
    if (!existing && slots[side] && !slots[side === "left" ? "right" : "left"])
      side = side === "left" ? "right" : "left";
    slots[side] = { key, name: u?.name ?? "La sorcière", asset, side };
    if (i === index) current = key;
  }
  if (lines[index].speaker === "narrator") return [];
  return Object.values(slots).map((p) => ({
    ...p!,
    active: p!.key === current,
  }));
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
