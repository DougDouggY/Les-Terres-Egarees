/** Isolated, disposable story preview. Never reads or writes player saves. */
import { createCampaign, checkEnd } from "./campaign";
import {
  prepareChapterOneTest,
  votePatrol,
  confirmPatrol,
  talkGeraud,
  type PatrolChoice,
} from "./forest-chapter";
import { advanceChapterLine, storyUnit } from "./prologue";
import { map, distance } from "./active-map";
import type { Campaign } from "./types";

function finishScene(s: Campaign) {
  const id = s.chapter1?.pending?.id;
  if (!id || id === "c1-choice") throw Error("Scène de test inattendue");
  for (let i = 0; i < 200 && s.chapter1?.pending?.id === id; i++)
    advanceChapterLine(s);
  if (s.chapter1?.pending?.id === id)
    throw Error("La scène de préparation du test ne se termine pas");
}

export function createChapterTwoReview(choice: PatrolChoice): Campaign {
  const s = prepareChapterOneTest(createCampaign(["north", "knight"]));
  // Use official transitions, including the prologue finale and patrol staging.
  for (let i = 0; s.chapter1?.pending?.id !== "c1-choice"; i++) {
    if (i > 20) throw Error("Choix de patrouille inaccessible");
    finishScene(s);
  }
  votePatrol(s, 1, choice);
  votePatrol(s, 2, choice);
  confirmPatrol(s);
  for (let i = 0; s.chapter1?.pending; i++) {
    if (i > 20) throw Error("Bataille de patrouille inaccessible");
    finishScene(s);
  }
  if (choice === "storm") {
    const knight = storyUnit(s, "knight-chief")!;
    const geraud = s.units.find((u) => u.id === "geraud")!;
    const adjacent = map.find(
      (c) =>
        c.walk &&
        distance(c, geraud) === 1 &&
        !s.units.some((u) => u.hp > 0 && u.x === c.x && u.y === c.y),
    );
    if (!adjacent) throw Error("Géraud inaccessible pour le test");
    const position = { x: knight.x, y: knight.y };
    knight.x = adjacent.x;
    knight.y = adjacent.y;
    s.common.index = s.common.queue.indexOf(knight.id);
    talkGeraud(s, knight);
    finishScene(s);
    Object.assign(knight, position);
    delete s.committedMove;
    delete s.forestChapter!.talkActorId;
  }
  // Enter the ordinary post-victory event without changing combat rules.
  for (const u of s.units) if (u.owner === 0) u.hp = 0;
  checkEnd(s);
  if (s.chapter1?.pending?.id !== `c1-after-${choice}`)
    throw Error("Les dialogues de victoire sont inaccessibles");
  // Do not expose the unrelated chapter-I restart control in this preview.
  delete s.developmentTest;
  return s;
}
