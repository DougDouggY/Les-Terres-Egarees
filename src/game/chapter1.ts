import type { Campaign, Unit } from "./types";
import { village, key } from "./map";
import {
  arrivalNorth,
  arrivalKnight,
  ruinsNorth,
  ruinsKnight,
  meeting,
  alliance,
  type ChapterSceneId,
  type Speaker,
} from "../data/chapter1";
export type Chapter1Progress = {
  started: boolean;
  completed: ChapterSceneId[];
  pending?: { id: ChapterSceneId; owner: 1 | 2; page: number };
  allied?: boolean;
  guideMet?: boolean;
  complete?: boolean;
};
export const chapterScenes: ChapterSceneId[] = [
  "arrival-1",
  "arrival-2",
  "ruins-1",
  "ruins-2",
  "meeting",
  "alliance",
];
export const chapterEnabled = (s: Campaign) =>
  !!s.chapter1?.started && !s.sandbox;
export function chapterOwnerForFaction(
  s: Campaign,
  faction: "north" | "knight",
): 1 | 2 {
  return (s.factions.indexOf(faction) + 1) as 1 | 2;
}
export function storyUnit(s: Campaign, speaker: Speaker): Unit | undefined {
  const faction = speaker.startsWith("north") ? "north" : "knight",
    owner = chapterOwnerForFaction(s, faction);
  const group = s.units.filter(
    (u) => u.owner === owner && u.hp > 0 && !u.summonedBy,
  );
  return speaker.endsWith("companion")
    ? (group.find((u) => !u.leader) ?? group[0])
    : (group.find((u) => u.leader) ?? group[0]);
}
export function chapterLines(s: Campaign, id: ChapterSceneId) {
  if (id === "meeting") return meeting;
  if (id === "alliance") return alliance;
  const owner = Number(id.at(-1)) as 1 | 2,
    north = s.factions[owner - 1] === "north";
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
  return queueChapterScene(s, "arrival-1", 1);
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
  return false;
}
export function advanceChapterLine(s: Campaign): ChapterSceneId | undefined {
  const p = s.chapter1?.pending;
  if (!p) return;
  const lines = chapterLines(s, p.id),
    current = lines[p.page];
  if (current?.milestone === "alliance") s.chapter1!.allied = true;
  if (current?.speaker === "witch") s.chapter1!.guideMet = true;
  p.page++;
  s.scenePage = p.page;
  if (p.page < lines.length) return;
  const id = p.id;
  s.chapter1!.completed.push(id);
  delete s.chapter1!.pending;
  s.scene = null;
  s.scenePage = 0;
  if (id === "arrival-1") queueChapterScene(s, "arrival-2", 2);
  if (id === "alliance") {
    s.chapter1!.complete = true;
    s.phase = "summary";
  }
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
    !!s.chapter1?.completed.includes(("ruins-" + owner) as ChapterSceneId) &&
    !s.chapter1.complete
  );
}
export const ruinsCenter = { x: village.x + 1.5, y: village.y + 1.5 };
