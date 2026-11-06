/** Independent developer arena. Never calls createCampaign, advance, or mission events. */
import { classes, activeWeapon, promote, syncWeapon, tuning } from "./classes";
import { makeClassUnit } from "./units";
import type { Campaign, Unit } from "./types";
import { map, cell, distance } from "./active-map";
import { resolve, applyStrike, canAttack } from "./combat";
import { baseOrigin, gainLevel } from "./progression";
import { move } from "./movement";
import { finishActivationSkills } from "./skills";
export function createSandbox(seed = 92481): Campaign {
  const p = () => ({
    camera: { x: 24, y: 14 },
    explored: map.map((_, i) => i),
    visible: map.map((_, i) => i),
    journal: [],
    intro: 0,
  });
  return {
    version: 1,
    initiativeVersion: 2,
    sandbox: true,
    sandboxFlat: true,
    factions: ["north", "knight"],
    units: [],
    players: [p(), p()],
    fronts: [
      { round: 1, queue: [], index: 0 },
      { round: 1, queue: [], index: 0 },
    ],
    common: { round: 1, queue: [], index: 0 },
    merged: true,
    events: [],
    scene: null,
    scenePage: 0,
    phase: "battle",
    active: 1,
    seed,
    inventory: [],
    world: [],
    history: [],
  };
}
export function trainingUnit(
  s: Campaign,
  classId: string,
  level = 1,
  promotedLevel = 1,
  owner: 0 | 1 | 2 = 1,
) {
  const c = classes[classId];
  if (!c) throw Error("Classe inconnue");
  const base = baseOrigin(classId),
    u = makeClassUnit(
      `test-${s.units.length}`,
      owner === 0 ? 1 : owner,
      1,
      base,
      c.name,
      30 + s.units.length,
      20,
      "male",
      c.stage === "recruit"
        ? (Object.values(classes)
            .filter((x) => x.stage === "base" && x.faction === c.faction)
            .slice(0, 2)
            .map((x) => x.id) as [string, string])
        : undefined,
    );
  s.units.push(u);
  if (base !== classId && c.stage === "advanced") {
    while (u.level < 20) gainLevel(s, u);
    promote(s, u, classId);
    while (u.level < promotedLevel) gainLevel(s, u);
  } else {
    while (u.level < Math.min(level, classes[u.classId!].maxLevel))
      gainLevel(s, u);
  }
  u.owner = owner;
  u.hp = u.maxHp;
  s.common.queue.push(u.id);
  return u;
}
export function placeTrainingUnit(s: Campaign, u: Unit, x: number, y: number) {
  if (
    !s.sandbox ||
    !cell(x, y)?.walk ||
    s.units.some((t) => t.hp > 0 && t.id !== u.id && t.x === x && t.y === y)
  )
    throw Error("Case occupée ou infranchissable");
  u.x = x;
  u.y = y;
}
export function moveTrainingUnit(s: Campaign, u: Unit, x: number, y: number) {
  if (!s.sandbox) throw Error("Atelier uniquement");
  return move(s, u, x, y);
}
export function finishTrainingActivation(s: Campaign) {
  if (!s.sandbox) throw Error("Atelier uniquement");
  finishActivationSkills(s);
  s.common.index = (s.common.index + 1) % Math.max(1, s.common.queue.length);
  const u = s.units.find((u) => u.id === s.common.queue[s.common.index]);
  if (u && u.owner !== 0) s.active = u.owner;
}
export type SimulationOptions = {
  left: string;
  right: string;
  count: 100 | 1000 | 10000;
  level?: 1 | 10 | 20;
  promotedLevel?: 1 | 10 | 20;
  seed?: number;
  bear?: boolean;
};
export function simulateDuels(o: SimulationOptions) {
  let leftWins = 0,
    rightWins = 0,
    draws = 0,
    hits = 0,
    misses = 0,
    criticals = 0,
    parries = 0,
    strikes = 0,
    rounds = 0;
  const rng = { seed: o.seed ?? 12345 };
  for (let duel = 0; duel < o.count; duel++) {
    const s = createSandbox(rng.seed),
      a = trainingUnit(s, o.left, o.level ?? 1, o.promotedLevel ?? 1),
      b = trainingUnit(s, o.right, o.level ?? 1, o.promotedLevel ?? 1, 0);
    const d = Math.max(a.minRange, b.minRange);
    b.x = a.x + Math.max(1, Math.min(2, d));
    b.y = a.y;
    if (o.bear && a.classId === "hamrammr") {
      // Same transformation as game, kept in the caller's live activation.
      transform(s, a);
    }
    const actors = [a, b].sort(
      (x, y) => y.initiative - x.initiative || x.id.localeCompare(y.id),
    );
    for (let turn = 0; turn < 100 && a.hp > 0 && b.hp > 0; turn++) {
      const u = actors[turn % 2],
        t = u === a ? b : a;
      s.common.index = s.common.queue.indexOf(u.id);
      if (u.owner !== 0) s.active = u.owner;
      rounds++;
      try {
        if (activeWeapon(u).reload && u.crossbowLoaded === false) {
          u.crossbowLoaded = true;
          if (tuning.reloadConsumesAction) continue;
        }
        if (!canAttack(u, t)) {
          // Approach to a legal attack distance; no mission movement or AI.
          const desired = Math.max(1, u.minRange);
          t.x = u.x + (u === a ? desired : -desired);
          t.y = u.y;
        }
        if (!canAttack(u, t)) continue;
        const battle = resolve(s, u, t);
        for (const hit of battle.strikes) {
          applyStrike(s, hit);
          strikes++;
          hits += Number(hit.hit);
          misses += Number(!hit.hit);
          criticals += Number(hit.critical);
          parries += Number(hit.blocked);
        }
      } finally {
        finishActivationSkills(s);
      }
    }
    if (a.hp > 0 && b.hp === 0) leftWins++;
    else if (b.hp > 0 && a.hp === 0) rightWins++;
    else draws++;
    rng.seed = s.seed;
  }
  return {
    count: o.count,
    leftWins,
    rightWins,
    draws,
    strikes,
    hits,
    misses,
    criticals,
    parries,
    meanTurns: rounds / o.count,
    seed: rng.seed,
  };
}
import { transformBear as transform } from "./skills";
export const copyValidatedMap = () => structuredClone(map);
