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
  const ranged = kind === "bow" || kind === "crossbow",
    enemy = owner === 0;
  return {
    id,
    owner,
    front,
    kind,
    name,
    x,
    y,
    hp: enemy ? 19 : ranged ? 25 : 36,
    maxHp: enemy ? 19 : ranged ? 25 : 36,
    strength: enemy ? 8 : ranged ? 11 : 13,
    agility: kind === "bow" ? 11 : kind === "skeleton" ? 5 : 7,
    initiative: kind === "bow" ? 15 : kind === "crossbow" ? 12 : enemy ? 7 : 10,
    defense: enemy ? 3 : ranged ? 3 : 7,
    accuracy: ranged ? 90 : enemy ? 78 : 94,
    move: ranged ? 5 : 4,
    vision: 6,
    minRange: ranged ? 2 : 1,
    range: ranged ? 3 : 1,
    xp: 0,
    level: 1,
    potions: 2,
    leader,
  };
}
