import { forestLines, type ForestSceneId } from "../data/forest-chapter";
import { beginForestChapter, finishForestScene } from "./forest-chapter";
import { globalInitiative } from "./initiative";
import { sharedChapterScene } from "./cooperation";
import type { Campaign, Unit } from "./types";
import { village, key, distance } from "./active-map";
import {
  arrivalNorth,
  arrivalKnight,
  waitingNorth,
  waitingKnight,
  ruinsNorth,
  ruinsKnight,
  meeting,
  alliance,
  type ChapterSceneId,
  type Speaker,
  type DialogueLine,
} from "../data/chapter1";
export type Chapter1Progress = {
  started: boolean;
  completed: ChapterSceneId[];
  pending?: {
    id: ChapterSceneId;
    owner: 1 | 2;
    page: number;
    readBy?: (1 | 2)[];
  };
  alerted?: boolean;
  prepared?: Partial<Record<1 | 2, string>>;
  allied?: boolean;
  guideMet?: boolean;
  complete?: boolean;
};
export const chapterScenes: ChapterSceneId[] = [
  "c1-title",
  "c1-warning",
  "c1-choice",
  "c1-travelers",
  "c1-storm",
  "c1-recruit",
  "c1-cave",
  "prologue",
  "arrival-1",
  "arrival-2",
  "ruins-1",
  "ruins-2",
  "waiting-1",
  "waiting-2",
  "meeting",
  "alliance",
];
export const chapterEnabled = (s: Campaign) =>
  !!s.chapter1?.started && !s.forestChapter && !s.sandbox;
export function chapterOwnerForFaction(
  s: Campaign,
  faction: "north" | "knight",
): 1 | 2 {
  return (s.factions.indexOf(faction) + 1) as 1 | 2;
}
export function storyUnit(s: Campaign, speaker: Speaker): Unit | undefined {
  if (speaker === "witch") return s.units.find((u) => u.id === "story-witch");
  if (speaker === "captain")
    return s.units.find((u) => u.id === "valdren-captain");
  if (speaker === "geraud") return s.units.find((u) => u.id === "geraud");
  if (speaker === "narrator" || speaker === "unknown") return undefined;
  const faction = speaker.startsWith("north") ? "north" : "knight",
    owner = chapterOwnerForFaction(s, faction);
  const group = s.units.filter(
    (u) => u.owner === owner && u.hp > 0 && !u.summonedBy,
  );
  return speaker.endsWith("companion")
    ? (group.find((u) => !u.leader) ?? group[0])
    : (group.find((u) => u.leader) ?? group[0]);
}
export function chapterLines(s: Campaign, id: ChapterSceneId): DialogueLine[] {
  if (id.startsWith("c1-")) return forestLines(id as ForestSceneId);
  if (id === "prologue")
    return [
      { speaker: "narrator" as const, text: "Prologue — Les Terres Égarées" },
    ];
  if (id === "meeting") return meeting;
  if (id === "alliance") return alliance;
  const owner = Number(id.at(-1)) as 1 | 2,
    north = s.factions[owner - 1] === "north";
  if (id.startsWith("waiting")) return north ? waitingNorth : waitingKnight;
  return id.startsWith("arrival")
    ? north
      ? arrivalNorth
      : arrivalKnight
    : north
      ? ruinsNorth
      : ruinsKnight;
}
export function queueChapterScene(
  s: Campaign,
  id: ChapterSceneId,
  owner: 1 | 2 = s.active,
) {
  if (
    !chapterEnabled(s) ||
    s.chapter1!.pending ||
    s.chapter1!.completed.includes(id)
  )
    return false;
  s.chapter1!.pending = { id, owner, page: 0 };
  s.scene = "chapter1:" + id;
  s.scenePage = 0;
  return true;
}
export function beginChapter1(s: Campaign) {
  s.chapter1 ??= { started: false, completed: [] };
  s.chapter1.started = true;
  return queueChapterScene(s, "prologue", 1);
}
/** Only legacy saves in progress adopt the current story stage; finished saves stay finished. */
export function upgradeChapter1(s: Campaign) {
  if (s.chapter1 || s.sandbox || s.phase !== "battle") return;
  s.chapter1 = {
    started: true,
    completed: [
      "arrival-1",
      "arrival-2",
      ...(s.merged
        ? (["ruins-1", "ruins-2", "meeting"] as ChapterSceneId[])
        : []),
    ],
  };
}
const distanceToRuins = (u: { x: number; y: number }) =>
  Math.max(village.x - u.x, 0, u.x - (village.x + village.w - 1)) +
  Math.max(village.y - u.y, 0, u.y - (village.y + village.h - 1));
export function chapterEncounter(s: Campaign) {
  if (!chapterEnabled(s) || s.scene || s.chapter1!.complete) return false;
  const own = s.units.filter(
    (u) => u.hp > 0 && u.owner === s.active && !u.summonedBy,
  );
  if (own.some((u) => distanceToRuins(u) <= 4)) s.chapter1!.alerted = true;
  const discovery = ("ruins-" + s.active) as ChapterSceneId;
  if (
    !s.chapter1!.completed.includes(discovery) &&
    own.some((u) => distanceToRuins(u) <= 15)
  )
    return queueChapterScene(s, discovery);
  if (
    !s.merged &&
    [1, 2].every(
      (owner) =>
        s.chapter1!.completed.includes(("ruins-" + owner) as ChapterSceneId) &&
        s.units.some(
          (u) =>
            u.owner === owner &&
            u.hp > 0 &&
            !u.summonedBy &&
            distanceToRuins(u) <= 4,
        ),
    )
  )
    return queueChapterScene(s, "meeting");
  if (!s.merged && own.some((u) => distanceToRuins(u) <= 4))
    return queueChapterScene(s, ("waiting-" + s.active) as ChapterSceneId);
  return false;
}
export function advanceChapterLine(
  s: Campaign,
  reader?: 1 | 2,
  expected?: { id: ChapterSceneId; page: number },
): ChapterSceneId | undefined {
  const p = s.chapter1?.pending;
  if (p?.id === "c1-choice") return; // Only matching votes may advance the common choice.
  if (!p || (expected && (expected.id !== p.id || expected.page !== p.page)))
    return;
  if (reader) {
    if (!sharedChapterScene(p.id) && reader !== p.owner) return;
    if (sharedChapterScene(p.id)) {
      p.readBy ??= [];
      if (!p.readBy.includes(reader)) p.readBy.push(reader);
      if (p.readBy.length < 2) return;
    }
  }
  const lines = chapterLines(s, p.id),
    current = lines[p.page];
  if (current?.milestone === "alliance") s.chapter1!.allied = true;
  if (current?.speaker === "witch") s.chapter1!.guideMet = true;
  p.readBy = [];
  p.page++;
  s.scenePage = p.page;
  if (p.page < lines.length) return;
  const id = p.id;
  s.chapter1!.completed.push(id);
  delete s.chapter1!.pending;
  s.scene = null;
  s.scenePage = 0;
  if (id === "prologue") queueChapterScene(s, "arrival-1", 1);
  if (id === "arrival-1") queueChapterScene(s, "arrival-2", 2);
  if (id === "alliance") {
    s.chapter1!.complete = true;
    beginForestChapter(s);
  }
  if (id.startsWith("c1-")) finishForestScene(s, id as ForestSceneId);
  return id;
}
export function temporaryRuinsCells() {
  const result: number[] = [];
  for (let y = village.y; y < village.y + 3; y++)
    for (let x = village.x; x < village.x + 3; x++) result.push(key(x, y));
  return result;
}
export function chapterBeacon(s: Campaign, owner: 1 | 2) {
  return (
    !s.forestChapter &&
    !!s.chapter1?.completed.includes(("ruins-" + owner) as ChapterSceneId) &&
    !s.chapter1.complete
  );
}
export const ruinsCenter = { x: village.x + 1.5, y: village.y + 1.5 };

export function preparedExpeditions(s: Campaign): (1 | 2)[] {
  const result: (1 | 2)[] = [];
  for (const owner of [1, 2] as const) {
    const id = s.chapter1?.prepared?.[owner];
    const u = s.units.find(
      (u) =>
        u.id === id &&
        u.owner === owner &&
        u.hp > 0 &&
        u.leader &&
        !u.summonedBy,
    );
    if (u && distance(u, village.entry) <= 1) result.push(owner);
  }
  return result;
}
export function canPrepareEntry(s: Campaign, u: Unit) {
  return (
    chapterEnabled(s) &&
    s.phase === "battle" &&
    !s.scene &&
    s.merged &&
    !s.chapter1!.complete &&
    globalInitiative(s).queue[globalInitiative(s).index] === u.id &&
    u.owner === s.active &&
    u.hp > 0 &&
    u.leader &&
    !u.summonedBy &&
    distance(u, village.entry) <= 1 &&
    !preparedExpeditions(s).includes(u.owner as 1 | 2) &&
    !s.units.some(
      (t) => t.owner === 0 && t.hp > 0 && distance(t, village.entry) <= 5,
    )
  );
}
export function prepareEntry(s: Campaign, u: Unit) {
  if (!canPrepareEntry(s, u))
    throw Error("Le chef doit rejoindre l’entrée sécurisée des ruines.");
  s.chapter1!.prepared ??= {};
  s.chapter1!.prepared[u.owner as 1 | 2] = u.id;
  if (preparedExpeditions(s).length === 2) {
    if (!s.events.includes("victory")) s.events.push("victory");
    queueChapterScene(s, "alliance", u.owner as 1 | 2);
  }
}
