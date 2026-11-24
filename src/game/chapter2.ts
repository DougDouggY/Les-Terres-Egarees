import type { Campaign, Unit } from "./types";
import type { ChapterTwoSceneId } from "../data/chapter2";
import { forestScene } from "./forest-chapter";
import { ownerForFaction } from "./recruitment";
import { makeClassUnit } from "./units";
import { ensurePortraits } from "./portraits";
export type ChapterTwoProgress = {
  temporaryAlliance?: boolean;
  stage: "introduction" | "cave" | "visitors" | "departure" | "awaiting-battle";
  completed: ChapterTwoSceneId[];
  visitors: Unit[];
};
export function beginChapterTwo(s: Campaign) {
  if (s.chapter2) return false;
  s.chapter2 = { stage: "introduction", completed: [], visitors: [] };
  s.phase = "battle";
  for (const p of s.players) p.journal.push("Chapitre II — Un ennemi commun");
  forestScene(s, "c2-title");
  return true;
}
export function finishChapterTwoScene(s: Campaign, id: ChapterTwoSceneId) {
  const c = s.chapter2!;
  if (!c.completed.includes(id)) c.completed.push(id);
  if (id === "c2-title") {
    c.stage = "cave";
    forestScene(s, "c2-cave");
  } else if (id === "c2-cave") {
    const owner = ownerForFaction(s, "north");
    c.visitors = ["raider", "north_warrior", "hunter"].map((cls, i) => {
      const u = makeClassUnit(
        "c2-flayer-" + i,
        owner,
        owner,
        cls,
        "Écorcheur",
        0,
        0,
        "male",
      );
      u.hasPersonalName = i === 0;
      return u;
    });
    ensurePortraits(s);
    c.stage = "visitors";
    forestScene(s, "c2-visitors");
  } else if (id === "c2-visitors") {
    c.temporaryAlliance = true;
    c.stage = "departure";
    forestScene(s, "c2-depart");
  } else {
    c.stage = "awaiting-battle";
    s.phase = "summary";
  }
}
