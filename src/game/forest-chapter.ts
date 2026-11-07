import { patrolDeployment, commitPatrol } from "./patrol-staging";
import type { Campaign, Unit } from "./types";
import type { ForestSceneId } from "../data/forest-chapter";
import {
  activateMap,
  cell,
  distance,
  key,
  map,
  MAP_REVISION,
} from "./active-map";
import { makeClassUnit } from "./units";
import { discoverUnit, classes } from "./classes";
import {
  initiativeOrder,
  globalInitiative,
  insertInitiative,
} from "./initiative";
import { claimRecruit, ownerForFaction } from "./recruitment";
import { visibility } from "./vision";
export type PatrolChoice = "travelers" | "storm";
export type ForestProgress = {
  stagingVersion?: 2 | 3;
  confirmedBy?: (1 | 2)[];
  voteRevision?: number;
  stage:
    | "introduction"
    | "choice"
    | "deployment"
    | "battle"
    | "recruitment"
    | "cave"
    | "complete";
  votes: Partial<Record<1 | 2, PatrolChoice>>;
  choice?: PatrolChoice;
  geraudRecruited?: boolean;
  talkActorId?: string;
  completed: ForestSceneId[];
};
export function forestScene(
  s: Campaign,
  id: import("../data/prologue").ChapterSceneId,
) {
  s.chapter1 ??= { started: true, completed: [] };
  s.chapter1.pending = { id, owner: ownerForFaction(s, "knight"), page: 0 };
  s.scene = "chapter1:" + id;
  s.scenePage = 0;
}
export function recruitWitch(s: Campaign) {
  const owner = ownerForFaction(s, "knight");
  if (s.units.some((u) => u.id === "story-witch")) return;
  claimRecruit(s, { id: "story-witch", eligibility: "knight" }, owner);
  const lead =
    s.units.find((u) => u.owner === owner && u.leader && u.hp > 0) ??
    s.units.find((u) => u.owner === owner && u.hp > 0)!;
  const free = map
    .filter(
      (c) =>
        c.walk && !s.units.some((u) => u.hp > 0 && u.x === c.x && u.y === c.y),
    )
    .sort(
      (a, b) =>
        distance(a, lead) - distance(b, lead) || key(a.x, a.y) - key(b.x, b.y),
    )[0];
  if (!free) throw Error("Aucune case pour la sorcière");
  const witch = makeClassUnit(
    "story-witch",
    owner,
    owner,
    "sorcerer",
    "Maëlys",
    free.x,
    free.y,
    "female",
  );
  s.units.push(witch);
  discoverUnit(s, witch, true);
  insertInitiative(s, [witch.id]);
}
/** No roster reconstruction: actual heroes, fallen units, levels, XP and equipment survive. */
export function beginForestChapter(s: Campaign) {
  if (s.forestChapter) return false;
  recruitWitch(s);
  s.units = s.units.filter((u) => u.owner !== 0 && !u.summonedBy);
  s.mapId = "forest-compact";
  activateMap("forest-compact");
  s.mapRevision = MAP_REVISION;
  s.banners = [];
  delete s.committedMove;
  delete s.encounterContinuation;
  // A compact two-abreast march on the existing two-cell-wide trail.
  const ordered = s.units
    .slice()
    .sort((a, b) => Number(b.leader) - Number(a.leader));
  ordered.forEach((u, i) => {
    u.x = 8 - Math.floor(i / 2);
    u.y = 9 + (i % 2);
    if (u.hp > 0) u.hp = u.maxHp;
    u.movedDistance = 0;
    u.fortified = false;
    u.arriving = false;
    delete u.aiTargetId;
  });
  const deployment = patrolDeployment.map(
    (d) => [d.id, d.cls, d.spawn[0], d.spawn[1]] as const,
  );
  for (const [id, cls, x, y] of deployment) {
    const u = makeClassUnit(
      id,
      0,
      1,
      cls,
      id === "geraud"
        ? "Géraud"
        : id === "valdren-captain"
          ? "Capitaine de Valdren"
          : classes[cls].name,
      x,
      y,
      "male",
      cls === "squire" ? ["man_at_arms", "spearman"] : undefined,
    );
    // Chapter-specific enemies only. Class definitions and player stats are untouched.
    Object.assign(u, {
      maxHp: id === "valdren-captain" ? 26 : 20,
      hp: id === "valdren-captain" ? 26 : 20,
      strength: id === "valdren-captain" ? 7 : 5,
      defense: id === "valdren-captain" ? 4 : 2,
      agility: 4,
      initiative: id === "valdren-captain" ? 6 : 4,
      move: 4,
      vision: 14,
      potions: 0,
      level: id === "valdren-captain" ? 3 : 1,
    });
    const d = patrolDeployment.find((d) => d.id === id)!;
    u.enemyAI =
      id === "valdren-captain"
        ? { mode: "boss", initialHp: u.hp, awakened: false }
        : { mode: d.group === "vanguard" ? "active" : "zone", group: d.group };
    s.units.push(u);
  }
  s.enemyGroups = {
    middle: { active: false, zone: { x: 16, y: 0, w: 11, h: 20 } },
    rear: { active: false, zone: { x: 22, y: 0, w: 12, h: 20 } },
  };
  s.merged = true;
  s.chapterMode = "cooperative";
  s.phase = "battle";
  s.forestChapter = {
    stagingVersion: 3,
    stage: "introduction",
    votes: {},
    completed: [],
  };
  s.common = { round: 1, index: 0, queue: initiativeOrder(s.units) };
  s.initiativeVersion = 2;
  s.fronts = [structuredClone(s.common), structuredClone(s.common)];
  delete s.previousInitiative;
  for (const p of s.players) {
    p.visible = [];
    p.explored = [];
    p.camera = { x: 0, y: 3 };
    p.journal.push("Chapitre 1 — Pour ne pas oublier");
  }
  visibility(s);
  forestScene(s, "c1-title");
  return true;
}
export function votePatrol(s: Campaign, owner: 1 | 2, choice: PatrolChoice) {
  const f = s.forestChapter;
  if (
    !f ||
    f.stage !== "choice" ||
    s.chapter1?.pending?.id !== "c1-choice" ||
    ![1, 2].includes(owner) ||
    !["travelers", "storm"].includes(choice)
  )
    throw Error("Choix indisponible");
  if (f.votes[owner] !== choice) {
    f.voteRevision = (f.voteRevision ?? 0) + 1;
    f.confirmedBy = [];
  }
  f.votes[owner] = choice;
  return false;
}
export function confirmPatrol(
  s: Campaign,
  owner?: 1 | 2,
  expected?: { choice: PatrolChoice; revision: number },
) {
  const f = s.forestChapter;
  if (
    !f ||
    f.stage !== "choice" ||
    s.chapter1?.pending?.id !== "c1-choice" ||
    !f.votes[1] ||
    f.votes[1] !== f.votes[2]
  )
    throw Error("Les deux joueurs doivent choisir la même réponse.");
  if (
    expected &&
    (expected.choice !== f.votes[1] ||
      expected.revision !== (f.voteRevision ?? 0))
  )
    return false;
  if (owner !== undefined && ![1, 2].includes(owner))
    throw Error("Joueur invalide");
  const readers = owner ? [owner] : ([1, 2] as const);
  f.confirmedBy ??= [];
  for (const r of readers)
    if (!f.confirmedBy.includes(r)) f.confirmedBy.push(r);
  if (f.confirmedBy.length < 2) return false;
  f.choice = f.votes[1];
  f.stage = "introduction";
  forestScene(s, f.choice === "storm" ? "c1-storm" : "c1-travelers");
  return true;
}
export function canTalkGeraud(s: Campaign, u: Unit) {
  const g = s.units.find((t) => t.id === "geraud");
  return !!(
    s.forestChapter?.stage === "battle" &&
    s.forestChapter.choice === "storm" &&
    !s.forestChapter.geraudRecruited &&
    !s.scene &&
    s.phase === "battle" &&
    u.hp > 0 &&
    u.owner === ownerForFaction(s, "knight") &&
    globalInitiative(s).queue[globalInitiative(s).index] === u.id &&
    g?.owner === 0 &&
    g.hp > 0 &&
    distance(u, g) === 1
  );
}
export function talkGeraud(s: Campaign, u: Unit) {
  if (!canTalkGeraud(s, u)) throw Error("Géraud ne peut pas être abordé.");
  s.committedMove = u.id;
  s.forestChapter!.talkActorId = u.id;
  s.forestChapter!.stage = "recruitment";
  forestScene(s, "c1-recruit");
}
export function finishForestScene(s: Campaign, id: ForestSceneId) {
  const f = s.forestChapter!;
  f.completed.push(id);
  if (id === "c1-title") forestScene(s, "c1-warning");
  else if (id === "c1-warning") {
    if (f.stagingVersion === 3) {
      forestScene(s, "c1-approach");
      return;
    }
    commitPatrol(s, "approach");
    f.stage = "choice";
    forestScene(s, "c1-choice");
  } else if (id === "c1-travelers" || id === "c1-storm") {
    if (f.stagingVersion) {
      f.stage = "deployment";
      forestScene(s, "c1-deploy");
    } else f.stage = "battle";
  } else if (id === "c1-approach") {
    commitPatrol(s, "approach");
    forestScene(s, "c1-captain");
  } else if (id === "c1-captain") {
    f.stage = "choice";
    forestScene(s, "c1-choice");
  } else if (id === "c1-deploy") {
    commitPatrol(s, "deployment");
    f.stage = "battle";
    visibility(s);
  } else if (id === "c1-recruit") {
    const g = s.units.find((u) => u.id === "geraud")!;
    const owner = ownerForFaction(s, "knight");
    claimRecruit(s, { id: "geraud", eligibility: "knight" }, owner);
    // Deliberately leave every queue, current index, PV, position and status unchanged.
    g.owner = owner;
    g.front = owner;
    delete g.aiTargetId;
    f.geraudRecruited = true;
    f.stage = "battle";
    discoverUnit(s, g, true);
    visibility(s);
  } else if (id === "c1-cave") {
    f.stage = "complete";
    s.phase = "summary";
    for (const u of s.units) if (u.owner !== 0 && u.hp > 0) u.hp = u.maxHp;
  }
}
export function forestEncounter(s: Campaign) {
  const f = s.forestChapter;
  if (!f || s.scene || s.phase !== "battle" || f.stage !== "battle")
    return false;
  if (s.units.some((u) => u.owner === 0 && u.hp > 0)) return false;
  f.stage = "cave";
  forestScene(s, "c1-cave");
  return true;
}
/** Isolated test state: no persistence or normal-save writes occur in this helper. */
export function prepareChapterOneTest(s: Campaign) {
  s.developmentTest = "chapter-one";
  s.chapter1 = {
    started: true,
    completed: [
      "prologue",
      "arrival-1",
      "arrival-2",
      "ruins-1",
      "ruins-2",
      "meeting",
    ],
    allied: true,
  };
  s.merged = true;
  s.phase = "battle";
  s.events = ["meeting", "horde", "storm", "victory"];
  for (const u of s.units) if (u.owner === 0) u.hp = 0;
  forestScene(s, "alliance"); // legacy prologue finale uses the shared director
  return s;
}
