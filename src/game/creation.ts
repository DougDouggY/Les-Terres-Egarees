import { compatiblePortraits } from "../data/portraits";
import type { Faction } from "./types";
import { baseClasses } from "./classes";
export const startingHeroClasses = (faction: Faction) =>
  baseClasses(faction).filter((c) => c.id !== "sorcerer");
export type CreationFlow = {
  step: 1 | 2 | 3;
  heroReady: [boolean, boolean];
  faceStage: [
    "details" | "choose" | "confirmed",
    "details" | "choose" | "confirmed",
  ];
  partyReady: [boolean, boolean];
  introPage: [number, number];
};
export const newCreationFlow = (): CreationFlow => ({
  step: 1,
  heroReady: [false, false],
  faceStage: ["details", "details"],
  partyReady: [false, false],
  introPage: [0, 0],
});
export const recruitmentVoice = (f: Faction) =>
  f === "north"
    ? [
        "Prêt pour le grand voyage vers l’ouest ?",
        "Allez, il nous reste deux places pour la traversée. Fais ton choix.",
      ]
    : [
        "Allez, on y va ! Le convoi ne va pas tarder. Dépêchez-vous !",
        "Choisis l’un de ces compagnons pour compléter la bande.",
      ];

export function cycleFace(
  faction: Faction,
  gender: "male" | "female",
  current: string | undefined,
  direction: -1 | 1,
  excluded: string[] = [],
) {
  const options = compatiblePortraits(faction, gender, excluded);
  if (!options.length) return undefined;
  const i = options.findIndex((p) => p.id === current);
  return options[(Math.max(0, i) + direction + options.length) % options.length]
    .id;
}
export const afterFaceLine = (faction: Faction, gender: "male" | "female") =>
  faction === "north"
    ? `${gender === "female" ? "Prête" : "Prêt"} pour le grand voyage à l'ouest ?`
    : recruitmentVoice("knight")[0];
