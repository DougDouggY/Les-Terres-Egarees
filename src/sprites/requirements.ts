import type { VisualClass } from "./visual-classes";
import type { SpriteProfile } from "./catalog";
export function requiredAnimations(
  c: VisualClass,
  p: Pick<SpriteProfile, "equipment" | "state">,
  available: string[] = [],
) {
  const names = [
    "idle",
    ...(p.state === "fortified" ? [] : ["move"]),
    ...(c.offensive === false || p.equipment === "healing"
      ? []
      : ["attack", "counter", "critical"]),
    "damage",
    "death",
    "evade",
  ];
  if (p.equipment.includes("shield") || c.skills.includes("parry"))
    names.push("block");
  if (p.equipment === "crossbow") names.push("reload");
  for (const skill of c.skills) {
    if (skill === "banner") {
      if (p.state === "carried") names.push("banner");
      continue;
    }
    if (skill === "fortify") {
      if (p.state !== "fortified") names.push("fortify");
      continue;
    }
    names.push(
      ...((
        {
          transform: ["transform"],
          buff: ["buff"],
          heal: ["heal"],
          bandage: ["heal"],
          summon: ["summon"],
          area: ["area"],
          charge: ["charge"],
          intercept: ["intercept"],
        } as Record<string, string[]>
      )[skill] ?? []),
    );
  }
  return [...new Set([...names, ...available])];
}
