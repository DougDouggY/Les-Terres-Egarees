import type { Campaign, Faction } from "./types";
export type RecruitDefinition = {
  id: string;
  eligibility: Faction | "either";
  narrativeTransferAllowed?: boolean;
};
export function claimRecruit(
  s: Campaign,
  definition: RecruitDefinition,
  owner: 1 | 2,
) {
  if (
    definition.eligibility !== "either" &&
    s.factions[owner - 1] !== definition.eligibility
  )
    throw Error("Recrutement réservé à une autre faction");
  const claims = (s.recruitmentClaims ??= {});
  if (claims[definition.id] && claims[definition.id] !== owner)
    throw Error("Ce personnage a déjà rejoint l’autre groupe");
  claims[definition.id] = owner;
}
export function ownerForFaction(
  s: Pick<Campaign, "factions">,
  f: Faction,
): 1 | 2 {
  const i = s.factions.indexOf(f);
  if (i < 0) throw Error("Faction absente");
  return (i + 1) as 1 | 2;
}
export const campaignHooks = {
  sanctuaryMeeting: {
    faction: "knight" as Faction,
    event: "witch-encounter",
    status: "unwritten" as const,
  },
};
export function chapterContext(s: Campaign) {
  return {
    mode: s.chapterMode ?? (s.merged ? "cooperative" : "separate"),
    objectives: Object.fromEntries(s.factions.map((f) => [f, "sanctuary"])),
    pendingEvents: s.events.includes("victory")
      ? [campaignHooks.sanctuaryMeeting]
      : [],
  };
}
