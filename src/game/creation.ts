import type { Faction } from "./types";
import { baseClasses } from "./classes";
export const startingHeroClasses = (faction: Faction) =>
  baseClasses(faction).filter((c) => c.id !== "sorcerer");
export type CreationFlow = {
  step: 1 | 2 | 3;
  heroReady: [boolean, boolean];
  partyReady: [boolean, boolean];
  introPage: [number, number];
};
export const newCreationFlow = (): CreationFlow => ({
  step: 1,
  heroReady: [false, false],
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
