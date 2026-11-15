import type { Faction } from "../game/types";
export type Portrait = {
  id: string;
  faction?: Faction;
  gender?: "male" | "female";
  category: "selectable" | "reserved" | "generic";
};
const numbered = (prefix: string, count: number) =>
  Array.from(
    { length: count },
    (_, i) => `${prefix}${String(i + 1).padStart(2, "0")}`,
  );
export const portraits: Portrait[] = [
  ...numbered("C", 12).map((id, i) => ({
    id,
    faction: "knight" as const,
    gender: i < 7 ? ("male" as const) : ("female" as const),
    category: "selectable" as const,
  })),
  ...numbered("V", 12).map((id, i) => ({
    id,
    faction: "north" as const,
    gender: [0, 1, 2, 3, 4, 8].includes(i)
      ? ("male" as const)
      : ("female" as const),
    category: "selectable" as const,
  })),
  ...numbered("R", 4).map((id) => ({ id, category: "reserved" as const })),
  ...numbered("N", 5).map((id) => ({ id, category: "generic" as const })),
];
/** Unimplemented characters reserve art only; no unit or story event is created. */
export const predefinedPortraits = {
  maelys: { portraitId: "R01", unitId: "story-witch", name: "Maëlys" },
  sister: { portraitId: "R02", unitId: null, name: "La sœur de Maëlys" },
  geraud: { portraitId: "R03", unitId: "geraud", name: "Géraud" },
  atalia: { portraitId: "R04", unitId: null, name: "Atalia" },
} as const;
export const portraitDefinition = (id: string) =>
  portraits.find((p) => p.id === id);
export const compatiblePortraits = (
  faction: Faction,
  gender: "male" | "female",
  excluded: string[] = [],
) =>
  portraits.filter(
    (p) =>
      p.category === "selectable" &&
      p.faction === faction &&
      p.gender === gender &&
      !excluded.includes(p.id),
  );
export const portraitAsset = (id: string) => `assets/portraits/${id}.png`;
