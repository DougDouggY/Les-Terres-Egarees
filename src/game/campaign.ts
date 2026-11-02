import type { Campaign, Unit, Perspective, Faction } from "./types";
import { key, cell, map, distance, MAP_REVISION } from "./map";
import { makeUnit } from "./units";
import { alive, at } from "./queries";
import { visibility } from "./vision";
const order = (units: Unit[]) =>
  units
    .filter((u) => u.hp > 0)
    .sort((a, b) => b.initiative - a.initiative || a.id.localeCompare(b.id))
    .map((u) => u.id);
export function createCampaign(factions: [Faction, Faction]): Campaign {
  const units: Unit[] = [];
  for (const owner of [1, 2] as const) {
    const north = factions[owner - 1] === "north";
    const x = owner === 1 ? 5 : 26,
      y = owner === 1 ? 5 : 16;
    units.push(
      makeUnit(
        `p${owner}a`,
        owner,
        owner,
        north ? "shield" : "sword",
        north
          ? owner === 1
            ? "Eirik"
            : "Bryn"
          : owner === 1
            ? "Ysilde"
            : "Maël",
        x,
        y,
        true,
      ),
      makeUnit(
        `p${owner}b`,
        owner,
        owner,
        north ? "bow" : "crossbow",
        north
          ? owner === 1
            ? "Astrid"
            : "Solveig"
          : owner === 1
            ? "Gaspard"
            : "Alix",
        x + 1,
        y + 1,
      ),
    );
  }
  units.push(
    makeUnit("e1", 0, 1, "skeleton", "Guetteur noyé", 11, 5),
    makeUnit("e2", 0, 2, "skeleton", "Porte-lame déchu", 24, 14),
    makeUnit("e3", 0, 1, "skeleton", "Veilleur des ruines", 14, 10),
    makeUnit("e4", 0, 2, "skeleton", "Gardien sans nom", 19, 11),
  );
  const p = (): Perspective => ({
    camera: { x: 0, y: 0 },
    explored: [],
    visible: [],
    journal: ["Une terre inconnue. Restez ensemble."],
    intro: 0,
  });
  const s: Campaign = {
    version: 1,
    mapRevision: MAP_REVISION,
    factions,
    units,
    players: [p(), p()],
    fronts: [
      { round: 1, queue: order(units.filter((u) => u.front === 1)), index: 0 },
      { round: 1, queue: order(units.filter((u) => u.front === 2)), index: 0 },
    ],
    common: { round: 1, queue: [], index: 0 },
    merged: false,
    events: [],
    scene: "intro1",
    scenePage: 0,
    phase: "intro",
    active: 1,
    seed: 92481,
    inventory: [
      { name: "Vivres récupérés", count: 4 },
      { name: "Fragments d’obsidienne", count: 0 },
    ],
    world: ["sanctuary", "coast", "ruins"],
    history: [],
  };
  visibility(s);
  return s;
}
export const front = (s: Campaign) =>
  s.merged ? s.common : s.fronts[s.active - 1];
export const current = (s: Campaign) =>
  s.units.find((u) => u.id === front(s).queue[front(s).index]);
export function log(s: Campaign, msg: string, owner?: 1 | 2) {
  s.history.push(msg);
  (owner ? [s.players[owner - 1]] : s.players).forEach((p) =>
    p.journal.push(msg),
  );
}
function event(s: Campaign, id: string) {
  if (s.events.includes(id)) return false;
  s.events.push(id);
  return true;
}
export function encounter(s: Campaign) {
  visibility(s);
  if (
    !s.merged &&
    alive(s).some(
      (u) => u.owner === 1 && s.players[1].visible.includes(key(u.x, u.y)),
    )
  ) {
    s.scene = "meeting";
    s.scenePage = 0;
    return true;
  }
  return false;
}
export function merge(s: Campaign) {
  if (s.merged) return;
  s.merged = true;
  // A finite final defence guarantees a real common battle, even if both fronts
  // have already cleared every roaming enemy before discovering one another.
  const candidates = [
    { x: 14, y: 12 },
    { x: 20, y: 10 },
    { x: 20, y: 12 },
    { x: 16, y: 13 },
    ...map
      .filter((c) => c.walk)
      .sort(
        (a, b) => distance(a, { x: 17, y: 10 }) - distance(b, { x: 17, y: 10 }),
      ),
  ];
  for (const i of [0, 1] as const) {
    const location = candidates.find(
      (c) => cell(c.x, c.y)?.walk && !at(s, c.x, c.y),
    );
    if (!location) throw Error("Aucune case pour les sentinelles");
    const guard = makeUnit(
      `sanctuary-${i}`,
      0,
      i === 0 ? 1 : 2,
      "skeleton",
      i === 0 ? "Sentinelle des Veilleurs" : "Gardien du dernier seuil",
      location.x,
      location.y,
    );
    Object.assign(guard, {
      hp: 30,
      maxHp: 30,
      strength: 11,
      defense: 5,
      initiative: 9,
    });
    s.units.push(guard);
  }
  event(s, "sanctuary-guards");
  log(s, "Deux sentinelles émergent des ruines. Tenez les deux flancs !");
  s.common = { round: 1, index: 0, queue: order(alive(s)) };
  event(s, "meeting");
  visibility(s);
  log(
    s,
    "Les champs de vision sont partagés. Un nouveau round commun commence.",
  );
}
export function advance(s: Campaign) {
  const f = front(s);
  do {
    f.index++;
  } while (
    f.index < f.queue.length &&
    !s.units.find((u) => u.id === f.queue[f.index] && u.hp > 0)
  );
  if (f.index >= f.queue.length) {
    f.round++;
    f.index = 0;
    f.queue = order(alive(s).filter((u) => s.merged || u.front === s.active));
  }
  const r = s.merged
    ? Math.max(...s.fronts.map((f) => f.round))
    : Math.max(...s.fronts.map((f) => f.round));
  if (r >= 2 && event(s, "storm")) {
    s.scene = "storm";
    s.scenePage = 0;
    log(s, "L’orage revient. La terre se souvient.");
  }
  if (r >= 3 && event(s, "horde")) {
    for (const [id, fr, x, y] of [
      ["e5", 1, 6, 4],
      ["e6", 2, 27, 18],
    ] as const) {
      if (!at(s, x, y))
        s.units.push(
          makeUnit(id, 0, fr, "skeleton", "Égaré de la horde", x, y),
        );
    }
    log(s, "La horde approche. Atteignez le sanctuaire !");
    s.scene = "horde";
    s.scenePage = 0;
  }
  checkEnd(s);
}
export function checkEnd(s: Campaign) {
  if (!alive(s).some((u) => u.owner !== 0 && u.leader)) {
    s.phase = "defeat";
    s.scene = null;
    return;
  }
  if (s.merged && !alive(s).some((u) => u.owner === 0) && event(s, "victory")) {
    s.scene = "ending";
    s.scenePage = 0;
    log(s, "Le sanctuaire est à vous. Pour cette nuit.");
  }
}
