import type { Faction } from "../game/types";
/** Existing cast only: no new identities, dialogue or portraits. */
export const companionRoster = [
  {
    id: "astrid",
    name: "Astrid",
    faction: "north" as Faction,
    classId: "hunter",
    gender: "female" as const,
  },
  {
    id: "solveig",
    name: "Solveig",
    faction: "north" as Faction,
    classId: "hunter",
    gender: "female" as const,
  },
  {
    id: "bryn",
    name: "Bryn",
    faction: "north" as Faction,
    classId: "raider",
    gender: "male" as const,
  },
  {
    id: "gaspard",
    name: "Gaspard",
    faction: "knight" as Faction,
    classId: "crossbowman",
    gender: "male" as const,
  },
  {
    id: "alix",
    name: "Alix",
    faction: "knight" as Faction,
    classId: "crossbowman",
    gender: "male" as const,
  },
  {
    id: "ysilde",
    name: "Ysilde",
    faction: "knight" as Faction,
    classId: "man_at_arms",
    gender: "female" as const,
  },
];
export const companionCount = (f: Faction) => (f === "north" ? 2 : 1);
export function validateCompanions(f: Faction, ids: string[]) {
  if (
    ids.length !== companionCount(f) ||
    new Set(ids).size !== ids.length ||
    ids.some(
      (id) => !companionRoster.some((c) => c.id === id && c.faction === f),
    )
  )
    throw Error(
      "Sélectionnez le nombre requis de compagnons de cette faction.",
    );
}

/** Newest valid choice replaces the oldest, preserving chronological order. */
export function toggleCompanion(
  f: Faction,
  selected: string[],
  id: string,
  checked: boolean,
) {
  if (!companionRoster.some((c) => c.id === id && c.faction === f))
    return selected;
  const next = selected.filter(
    (x) =>
      x !== id && companionRoster.some((c) => c.id === x && c.faction === f),
  );
  if (checked) next.push(id);
  return next.slice(-companionCount(f));
}
