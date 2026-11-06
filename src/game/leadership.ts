import type { Campaign, Unit } from "./types";
export const leaderInitiativeBonus = 1;
export const effectiveInitiative = (u: Unit) =>
  u.initiative + (u.leader && u.owner !== 0 ? leaderInitiativeBonus : 0);
export function leadershipVacancies(s: Campaign): (1 | 2)[] {
  if (s.sandbox || s.phase !== "battle") return [];
  return ([1, 2] as const).filter(
    (owner) =>
      s.units.some((u) => u.owner === owner && u.hp > 0 && !u.summonedBy) &&
      !s.units.some(
        (u) => u.owner === owner && u.hp > 0 && u.leader && !u.summonedBy,
      ),
  );
}
export function appointLeader(s: Campaign, owner: 1 | 2, id: string) {
  if (!leadershipVacancies(s).includes(owner))
    throw Error("Cette équipe possède déjà un chef.");
  const next = s.units.find(
    (u) => u.id === id && u.owner === owner && u.hp > 0 && !u.summonedBy,
  );
  if (!next) throw Error("Choisissez un survivant de votre équipe.");
  for (const u of s.units) if (u.owner === owner) u.leader = u === next;
  // The bonus affects the next initiative sort; spent turns and the current actor stay intact.
  if (s.chapter1?.prepared) delete s.chapter1.prepared[owner];
}
