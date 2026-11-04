import { initializeProgression } from "./progression";
import { hydrateClass, assignClass, classes, validateRecruit } from "./classes";
import type { Unit, Kind } from "./types";
export const names: Record<Kind, string> = {
  shield: "Guerrier au bouclier",
  bow: "Archer nordique",
  sword: "Homme d’armes",
  crossbow: "Arbalétrier",
  skeleton: "Squelette maudit",
};
export const weapons: Record<Kind, string> = {
  shield: "Hache de fer",
  bow: "Arc de frêne",
  sword: "Épée longue",
  crossbow: "Arbalète",
  skeleton: "Lame rouillée",
};
const legacyClass: Record<Kind, string> = {
  shield: "raider",
  bow: "hunter",
  sword: "man_at_arms",
  crossbow: "crossbowman",
  skeleton: "skeleton",
};
export function makeUnit(
  id: string,
  owner: 0 | 1 | 2,
  front: 1 | 2,
  kind: Kind,
  name: string,
  x: number,
  y: number,
  leader = false,
): Unit {
  const u = makeClassUnit(
    id,
    owner,
    front,
    legacyClass[kind],
    name,
    x,
    y,
    kind === "bow" || kind === "sword" ? "female" : "male",
  );
  u.leader = leader;
  return u;
}
export function makeClassUnit(
  id: string,
  owner: 0 | 1 | 2,
  front: 1 | 2,
  classId: string,
  name: string,
  x: number,
  y: number,
  gender: "male" | "female" = "male",
  recruitChoices?: [string, string],
): Unit {
  const c = classes[classId];
  if (!c) throw Error("Classe inconnue");
  const v = c.stats;
  const u: Unit = {
    id,
    owner,
    front,
    kind: "shield",
    name,
    x,
    y,
    hp: v.hp,
    maxHp: v.hp,
    strength: v.strength,
    agility: v.agility,
    initiative: v.initiative,
    defense: v.defense,
    accuracy: v.accuracy,
    move: v.move,
    vision: v.vision,
    minRange: 1,
    range: 1,
    xp: 0,
    level: 1,
    potions: 2,
    leader: false,
    gender,
  };
  if (recruitChoices) u.recruitChoices = recruitChoices;
  assignClass(u, classId);
  hydrateClass(u);
  validateRecruit(u);
  initializeProgression(u);
  return u;
}
