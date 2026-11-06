import {
  chapterEnemy,
  chapter1Deployment,
  freeChapterCell,
  spawnSanctuaryGuards,
} from "./chapter1-enemies";
import { chapterEnabled, chapterEncounter } from "./chapter1";
import { companionRoster, validateCompanions } from "../data/companions";
import { individualize } from "./progression";
import { defaultTeamColors } from "./team-colors";
import {
  discoverUnit,
  type HeroConfig,
  baseClasses,
  classes,
  syncWeapon,
  compatibleWeapon,
} from "./classes";
import { makeClassUnit } from "./units";
import { finishActivationSkills } from "./skills";
import type { Campaign, Unit, Perspective, Faction } from "./types";
import { key, MAP_REVISION, village } from "./map";
import { alive, at } from "./queries";
import { visibility } from "./vision";
import {
  initiativeOrder as order,
  globalInitiative,
  stepInitiative,
  insertInitiative,
} from "./initiative";
export function createCampaign(
  factions: [Faction, Faction],
  heroes?: [HeroConfig, HeroConfig],
  companions?: [string[], string[]],
): Campaign {
  if (factions[0] === factions[1])
    throw Error("Les deux joueurs doivent choisir des factions différentes.");
  if (heroes && !companions)
    throw Error("La sélection des compagnons est obligatoire.");
  const units: Unit[] = [];
  for (const owner of [1, 2] as const) {
    const faction = factions[owner - 1],
      north = faction === "north",
      x = north ? 10 : 52,
      y = north ? 10 : 32;
    const h = heroes?.[owner - 1] ?? {
      faction,
      name: north ? "Eirik" : "Maël",
      gender: "male" as const,
      classId: north ? "raider" : "man_at_arms",
    };
    if (
      h.faction !== faction ||
      classes[h.classId]?.faction !== faction ||
      classes[h.classId]?.stage !== "base" ||
      !h.name.trim() ||
      h.name.trim().length > 32
    )
      throw Error("Héros invalide");
    const hero = makeClassUnit(
      `p${owner}a`,
      owner,
      owner,
      h.classId,
      h.name.trim(),
      x,
      y,
      h.gender,
    );
    hero.leader = true;
    if (h.weaponId) {
      if (!compatibleWeapon(hero, h.weaponId))
        throw Error("Arme initiale incompatible");
      hero.activeWeaponId = h.weaponId;
      hero.carriedWeapons = Array.from(
        new Set([...(hero.carriedWeapons ?? []), h.weaponId]),
      );
      syncWeapon(hero);
    }
    individualize(hero);
    units.push(hero);
    const ids =
      companions?.[owner - 1] ?? (north ? ["astrid", "solveig"] : ["gaspard"]);
    validateCompanions(faction, ids);
    ids.forEach((id, i) => {
      const c = companionRoster.find((c) => c.id === id)!;
      const unit = makeClassUnit(
        `p${owner}${i === 0 ? "b" : "c"}`,
        owner,
        owner,
        c.classId,
        c.name,
        x + (i === 0 ? 1 : 0),
        y + 1,
        c.gender,
      );
      individualize(unit);
      units.push(unit);
    });
  }
  for (const d of chapter1Deployment) {
    const c = freeChapterCell({ units }, d.x, d.y);
    if (!c) throw Error("Déploiement ennemi impossible");
    units.push(chapterEnemy(d.id, d.side, d.type, c.x, c.y));
  }
  for (const u of units.filter((u) => u.owner === 0))
    u.front = (factions.indexOf(u.front === 1 ? "north" : "knight") + 1) as
      1 | 2;
  const p = (): Perspective => ({
    camera: { x: 0, y: 0 },
    explored: [],
    visible: [],
    journal: ["Une terre inconnue. Restez ensemble."],
    intro: 0,
  });
  const s: Campaign = {
    chapter1RulesVersion: 2,
    chapter1: { started: false, completed: [] },
    version: 1,
    teamColors: { ...defaultTeamColors },
    mapRevision: MAP_REVISION,
    factions,
    units,
    players: [p(), p()],
    fronts: [
      { round: 1, queue: order(units.filter((u) => u.front === 1)), index: 0 },
      { round: 1, queue: order(units.filter((u) => u.front === 2)), index: 0 },
    ],
    common: { round: 1, queue: order(units), index: 0 },
    initiativeVersion: 2,
    merged: false,
    events: [],
    scene: null,
    scenePage: 0,
    phase: "battle",
    active: 1,
    seed: 92481,
    inventory: [
      { name: "Vivres récupérés", count: 4 },
      { name: "Fragments d’obsidienne", count: 0 },
    ],
    world: ["sanctuary", "coast", "ruins"],
    history: [],
  };
  for (const u of units.filter((u) => u.owner !== 0)) discoverUnit(s, u, true);
  visibility(s);
  return s;
}
export const front = globalInitiative;
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
  if (chapterEnabled(s)) return chapterEncounter(s);
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
  globalInitiative(s);
  s.merged = true;
  const guards = spawnSanctuaryGuards(s);
  event(s, "sanctuary-guards");
  log(s, "Des silhouettes convergent vers les ruines. Sécurisez l’entrée !");
  insertInitiative(s, guards);
  event(s, "meeting");
  visibility(s);
  log(
    s,
    "Les champs de vision sont partagés. L’ordre d’initiative se poursuit.",
  );
}
export function advance(s: Campaign) {
  delete s.committedMove;
  finishActivationSkills(s);
  stepInitiative(s);
  const r = front(s).round;
  if (r >= 2 && event(s, "storm")) {
    log(s, "L’orage revient. La terre se souvient.");
  }
  if (r >= 3 && event(s, "horde")) {
    const arrivals: string[] = [];
    for (const [id, fr, x, y, type] of [
      ["e5", 1, 12, 9, "sword"],
      ["e6", 2, 54, 36, "axe"],
      ["e11", 1, 13, 8, "lance"],
      ["e12", 2, 55, 35, "sword"],
      ["e13", 1, 11, 9, "axe"],
      ["e14", 2, 53, 36, "lance"],
    ] as const) {
      const c = freeChapterCell(s, x, y);
      if (!c) continue;
      const owner = (s.factions.indexOf(fr === 1 ? "north" : "knight") + 1) as
        1 | 2;
      s.units.push(chapterEnemy(id, owner, type, c.x, c.y));
      arrivals.push(id);
    }
    insertInitiative(s, arrivals, false);
    log(s, "La horde approche. Atteignez le sanctuaire !");
  }
  const next = current(s);
  if (next) next.movedDistance = 0;
  checkEnd(s);
}
export function checkEnd(s: Campaign) {
  if (
    !s.sandbox &&
    ([1, 2] as const).some(
      (owner) => !alive(s).some((u) => u.owner === owner && !u.summonedBy),
    )
  ) {
    for (const u of s.units) if (u.summonedBy) u.hp = 0;
    s.phase = "defeat";
    s.scene = null;
    return;
  }
  if (s.merged && !alive(s).some((u) => u.owner === 0) && event(s, "victory")) {
    for (const u of s.units) if (u.summonedBy) u.hp = 0;
    if (!chapterEnabled(s)) s.scene = "ending";
    s.scenePage = 0;
    log(s, "Le sanctuaire est à vous. Pour cette nuit.");
  }
}

/** Temporary review shortcut: only an expedition physically near the village can use it. */
export function canFinishBattleForTest(s: Campaign) {
  return (
    s.phase === "battle" &&
    !s.scene &&
    (!chapterEnabled(s) || s.chapter1!.completed.includes("meeting")) &&
    alive(s).some(
      (u) =>
        u.owner !== 0 &&
        Math.max(village.x - u.x, 0, u.x - (village.x + village.w - 1)) +
          Math.max(village.y - u.y, 0, u.y - (village.y + village.h - 1)) <=
          3,
    )
  );
}
export function finishBattleForTest(s: Campaign) {
  if (!canFinishBattleForTest(s))
    throw Error("Rejoignez les abords des ruines pour utiliser ce raccourci");
  if (!s.merged) merge(s);
  for (const u of s.units) if (u.owner === 0) u.hp = 0;
  event(s, "battle-finished-test");
  log(s, "Raccourci de test : la bataille est terminée pour visiter le camp.");
  checkEnd(s);
}
