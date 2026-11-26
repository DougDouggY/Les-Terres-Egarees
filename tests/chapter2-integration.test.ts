import { test } from "node:test";
import assert from "node:assert/strict";
import * as E from "../src/engine";
import { dialogueCast } from "../src/ui/dialogue-presentation";
const finish = (s: E.Campaign, cooperative = false) => {
  const id = s.chapter1!.pending!.id;
  for (let n = 0; n < 90 && s.chapter1?.pending?.id === id; n++) {
    const page = s.chapter1!.pending!.page;
    if (cooperative) {
      E.advanceChapterLine(s, 1, { id, page });
      assert.equal(s.chapter1?.pending?.id, id);
      assert.equal(s.chapter1?.pending?.page, page);
      E.advanceChapterLine(s, 2, { id, page });
    } else E.advanceChapterLine(s);
  }
  assert.notEqual(s.chapter1?.pending?.id, id);
};
function setup(choice: E.PatrolChoice, swap = false) {
  const s = E.createCampaign(swap ? ["knight", "north"] : ["north", "knight"]);
  E.beginForestChapter(s);
  while (s.chapter1?.pending?.id !== "c1-choice") finish(s);
  E.votePatrol(s, 1, choice);
  E.votePatrol(s, 2, choice);
  E.confirmPatrol(s);
  return s;
}
for (const swap of [false, true])
  for (const choice of ["travelers", "storm"] as const)
    test(`chapitres I/II : ${choice}, factions ${swap ? "inversées" : "normales"}, sauvegardes et progression`, () => {
      let s = setup(choice, swap);
      const seed = s.seed,
        witch = s.units.find((u) => u.id === "story-witch")!,
        guard = s.units.find((u) => u.id === "valdren-1")!;
      const witchBefore = { hp: witch.hp, xp: witch.xp, level: witch.level };
      assert.equal(
        E.chapterLines(s, "c1-travelers").some((l) =>
          /tempêtes? rouges?/i.test(l.text),
        ),
        false,
      );
      finish(s, true);
      if (choice === "travelers") {
        assert.equal(s.chapter1?.pending?.id, "c1-ambush");
        const a = E.maelysAmbush(s);
        assert.equal(a.strikes[0].hit, false);
        assert.equal(a.strikes[1].critical, true);
        assert.equal(a.strikes[1].hpAfter, 0);
        assert.equal(guard.hp > 0, true);
        const page = s.chapter1!.pending!.page;
        E.advanceChapterLine(s, 1, { id: "c1-ambush", page });
        assert.equal(guard.hp > 0, true);
        s = E.decode(E.encode(s));
        E.advanceChapterLine(s, 2, { id: "c1-ambush", page });
        assert.equal(s.units.find((u) => u.id === guard.id)!.hp, 0);
        assert.equal(s.common.queue.includes(guard.id), false);
        assert.equal(s.forestChapter?.ambushResolved, true);
      } else assert.equal(s.chapter1?.pending?.id, "c1-deploy");
      finish(s, true);
      assert.equal(s.forestChapter?.stage, "battle");
      assert.equal(s.seed, seed);
      const w = s.units.find((u) => u.id === "story-witch")!;
      assert.deepEqual({ hp: w.hp, xp: w.xp, level: w.level }, witchBefore);
      const g = s.units.find((u) => u.id === "geraud")!,
        k = E.storyUnit(s, "knight-chief")!;
      const adjacent = E.map.find(
        (c) =>
          c.walk &&
          E.distance(c, g) === 1 &&
          !s.units.some((u) => u.hp > 0 && u.x === c.x && u.y === c.y),
      )!;
      k.x = adjacent.x;
      k.y = adjacent.y;
      s.active = k.owner as 1 | 2;
      s.common = {
        round: 2,
        index: 0,
        queue: [
          k.id,
          ...s.units.filter((u) => u.id !== k.id && u.hp > 0).map((u) => u.id),
        ],
      };
      assert.equal(E.canTalkGeraud(s, k), choice === "storm");
      if (choice === "storm") {
        E.talkGeraud(s, k);
        finish(s, true);
        assert.equal(g.owner, k.owner);
      }
      k.name = "Éloïse-du-Nord";
      k.level = 4;
      k.xp = 37;
      k.hp = Math.max(1, k.maxHp - 3);
      const before = JSON.stringify(s.units.filter((u) => u.owner !== 0));
      for (const u of s.units) if (u.owner === 0) u.hp = 0;
      E.checkEnd(s);
      assert.equal(
        s.chapter1?.pending?.id,
        choice === "storm" ? "c1-after-storm" : "c1-after-travelers",
      );
      assert.equal(
        E.chapterLines(s, s.chapter1!.pending!.id).some(
          (l) => l.speaker === "geraud",
        ),
        false,
      );
      finish(s, true);
      assert.equal(s.chapter1?.pending?.id, "c2-title");
      assert.equal(s.chapter2?.stage, "introduction");
      finish(s, true);
      assert.equal(s.chapter1?.pending?.id, "c2-cave");
      const lines = E.chapterLines(s, "c2-cave");
      assert.ok(lines.some((l) => l.text.includes("environ six mois")));
      const cast = dialogueCast(
        s,
        lines,
        lines.findIndex((l) => l.speaker === "knight-chief"),
      );
      assert.ok(cast.some((p) => p.name === k.name));
      finish(s, true);
      assert.equal(s.chapter2?.visitors.length, 3);
      assert.equal(
        s.units.some((u) => u.id.startsWith("c2-flayer-")),
        false,
      );
      const visitor = E.storyUnit(s, "flayer")!;
      const portrait = visitor.portraitId;
      assert.ok(portrait);
      const text = E.chapterLines(s, "c2-visitors")
        .map((l) => l.text)
        .join("\n");
      assert.ok(text.includes("C’était vous"));
      assert.equal(/soigner|blessé|partage|compatriote/i.test(text), false);
      s = E.decode(E.encode(s));
      assert.equal(E.storyUnit(s, "flayer")!.portraitId, portrait);
      while (s.chapter1?.pending) finish(s, true);
      assert.equal(s.phase, "summary");
      assert.equal(s.chapter2?.stage, "awaiting-battle");
      assert.equal(s.mapId, "forest-compact");
      assert.equal(
        JSON.stringify(s.units.filter((u) => u.owner !== 0)),
        before,
      );
      E.validate(s);
      const saved = E.decode(E.encode(s));
      assert.equal(saved.chapter2?.stage, "awaiting-battle");
      assert.deepEqual(saved.chapter2?.visitors, s.chapter2?.visitors);
    });
test("anciens bilans de chapitre I : reprise sans reconstruire l’équipe", () => {
  const s = setup("storm");
  while (s.chapter1?.pending) finish(s);
  s.forestChapter!.stage = "complete";
  s.phase = "summary";
  const back = E.decode(E.encode(s)),
    before = JSON.stringify(back.units);
  assert.equal(E.beginChapterTwo(back), true);
  assert.equal(E.beginChapterTwo(back), false);
  assert.equal(JSON.stringify(back.units), before);
});

test("attaque scénarisée : résultat indépendant des statistiques, sans XP ni tirage", () => {
  const s = setup("travelers");
  finish(s);
  const g = s.units.find((u) => u.id === s.forestChapter!.ambushGuardId)!,
    w = s.units.find((u) => u.id === "story-witch")!;
  g.hp = g.maxHp = 9999;
  g.defense = g.accuracy = g.agility = 9999;
  w.hp = 1;
  w.strength = w.accuracy = w.agility = 0;
  const before = { seed: s.seed, hp: w.hp, xp: w.xp, level: w.level };
  const first = E.maelysAmbush(s);
  assert.equal(first.strikes[0].hit, false);
  assert.equal(first.strikes[1].critical, true);
  assert.equal(first.strikes[1].damage, 9999);
  assert.deepEqual(E.maelysAmbush(s).strikes, first.strikes);
  assert.equal(g.hp, 9999);
  finish(s, true);
  assert.equal(g.hp, 0);
  assert.deepEqual(
    { seed: s.seed, hp: w.hp, xp: w.xp, level: w.level },
    before,
  );
});

for (const choice of ["storm", "travelers"] as const)
  test(`raccourci accueil : fin de bataille ${choice}, puis chapitre II entier`, async () => {
    const { createChapterTwoReview } =
      await import("../src/game/chapter-two-review");
    let s = createChapterTwoReview(choice);
    assert.equal(s.chapter1?.pending?.id, `c1-after-${choice}`);
    assert.equal(s.chapter1?.pending?.page, 0);
    assert.equal(s.chapter2, undefined);
    assert.equal(s.developmentTest, undefined);
    assert.equal(s.forestChapter?.choice, choice);
    assert.ok(s.units.filter((u) => u.owner === 0).every((u) => u.hp === 0));
    assert.equal(s.forestChapter?.geraudRecruited === true, choice === "storm");
    assert.equal(
      s.units.find((u) => u.id === "geraud")!.owner !== 0,
      choice === "storm",
    );
    const roster = JSON.stringify(s.units.filter((u) => u.owner !== 0));
    s = E.decode(E.encode(s));
    const scenes: string[] = [];
    for (let i = 0; s.chapter1?.pending && i < 12; i++) {
      scenes.push(s.chapter1.pending.id);
      finish(s);
    }
    assert.deepEqual(scenes, [
      `c1-after-${choice}`,
      "c2-title",
      "c2-cave",
      "c2-visitors",
      "c2-depart",
    ]);
    assert.equal(s.phase, "summary");
    assert.equal(s.chapter2?.stage, "awaiting-battle");
    assert.equal(JSON.stringify(s.units.filter((u) => u.owner !== 0)), roster);
    assert.equal(E.decode(E.encode(s)).chapter2?.stage, "awaiting-battle");
  });
