import type { Campaign } from "./types";
import { makeClassUnit } from "./units";
import { map, key, distance, village } from "./active-map";
import { at } from "./queries";
import { reachable, attackCells } from "./pathfinding";
export type ChapterEnemy = "sword" | "axe" | "lance" | "bow";
const profiles = {
  sword: ["skeleton", "Porte-lame déchu"],
  axe: ["sans_axe", "Squelette hacheur"],
  lance: ["sans_spear", "Squelette lancier"],
  bow: ["sans_archer", "Archer squelette"],
} as const;
export function chapterEnemy(
  id: string,
  front: 1 | 2,
  type: ChapterEnemy,
  x: number,
  y: number,
) {
  const [cls, name] = profiles[type];
  const u = makeClassUnit(id, 0, front, cls, name, x, y, "male");
  Object.assign(u, {
    hasPersonalName: false,
    factionLabel: "Sans-repos",
    kind: "skeleton" as const,
    hp: 18,
    maxHp: 18,
    strength: type === "bow" ? 4 : 5,
    defense: 1,
    agility: 3,
    initiative: 4,
    accuracy: 58,
    move: 3,
    vision: 6,
    potions: 0,
  });
  return u;
}
export const prologueDeployment: {
  id: string;
  side: 1 | 2;
  type: ChapterEnemy;
  x: number;
  y: number;
}[] = [
  { id: "e1", side: 1, type: "axe", x: 16, y: 10 },
  { id: "e2", side: 2, type: "sword", x: 48, y: 28 },
  { id: "e3", side: 1, type: "sword", x: 28, y: 20 },
  { id: "e4", side: 2, type: "lance", x: 37, y: 20 },
  { id: "e7", side: 1, type: "lance", x: 22, y: 13 },
  { id: "e8", side: 1, type: "bow", x: 22, y: 18 },
  { id: "e9", side: 2, type: "axe", x: 44, y: 25 },
  { id: "e10", side: 2, type: "bow", x: 42, y: 27 },
];
export function freeChapterCell(
  s: Pick<Campaign, "units">,
  x: number,
  y: number,
) {
  return map
    .filter(
      (c) =>
        c.walk && !s.units.some((u) => u.hp > 0 && u.x === c.x && u.y === c.y),
    )
    .sort(
      (a, b) =>
        distance(a, { x, y }) - distance(b, { x, y }) ||
        key(a.x, a.y) - key(b.x, b.y),
    )[0];
}
export function spawnSanctuaryGuards(s: Campaign) {
  const unsafe = new Set<number>();
  for (const a of s.units.filter((u) => u.owner !== 0 && u.hp > 0)) {
    const origins = reachable(s, a);
    origins.set(key(a.x, a.y), { cost: 0, steps: [key(a.x, a.y)] });
    for (const k of attackCells(a, origins.keys())) unsafe.add(k);
  }
  const candidates = map
    .filter(
      (c) =>
        c.walk && distance(c, village.entry) >= 8 && !unsafe.has(key(c.x, c.y)),
    )
    .sort(
      (a, b) =>
        distance(a, village.entry) - distance(b, village.entry) ||
        key(a.x, a.y) - key(b.x, b.y),
    );
  const ids: string[] = [];
  for (const i of [0, 1] as const) {
    const c = candidates.find(
      (c) =>
        !at(s, c.x, c.y) &&
        s.units
          .filter((u) => u.hp > 0 && u.owner !== 0)
          .every((u) => distance(c, u) > 4),
    );
    if (!c) throw Error("Aucune arrivée sûre pour les sentinelles");
    const guard = chapterEnemy(
      `sanctuary-${i}`,
      i === 0 ? 1 : 2,
      i === 0 ? "sword" : "lance",
      c.x,
      c.y,
    );
    guard.arriving = true;
    s.units.push(guard);
    ids.push(guard.id);
  }
  return ids;
}

export { prologueDeployment as chapter1Deployment };
