import { test } from "node:test";
import assert from "node:assert/strict";
import * as E from "../src/engine";
const finish = (s: E.Campaign, reader?: 1 | 2) => {
  const id = s.chapter1!.pending!.id;
  for (let i = 0; i < 100 && s.chapter1?.pending?.id === id; i++) {
    const p = s.chapter1!.pending!;
    if (reader) {
      E.advanceChapterLine(s, reader, { id, page: p.page });
      E.advanceChapterLine(s, reader === 1 ? 2 : 1, { id, page: p.page });
    } else E.advanceChapterLine(s);
  }
  assert.notEqual(s.chapter1?.pending?.id, id);
};
function battle(choice: E.PatrolChoice = "storm", swapped = false) {
  const s = E.createCampaign(
    swapped ? ["knight", "north"] : ["north", "knight"],
  );
  E.beginForestChapter(s);
  finish(s);
  finish(s);
  E.votePatrol(s, 1, choice);
  E.votePatrol(s, 2, choice);
  finish(s);
  if (s.chapter1?.pending?.id === "c1-deploy") finish(s);
  return s;
}
test("Chapitre 1 : transition réelle, survivants conservés, morts non ressuscités, carte distincte sans brouillard", () => {
  const s = E.createCampaign(["north", "knight"]);
  const hero = s.units.find((u) => u.id === "p1a")!,
    dead = s.units.find((u) => u.id === "p1b")!;
  hero.hp = 1;
  hero.level = 4;
  hero.xp = 31;
  dead.hp = 0;
  const stats = {
    strength: hero.strength,
    accuracy: hero.accuracy,
    weapon: hero.activeWeaponId,
  };
  const original = JSON.stringify(E.map);
  E.prepareChapterOneTest(s);
  finish(s);
  assert.equal(s.mapId, "forest");
  assert.equal(s.chapter1?.complete, true);
  assert.equal(s.scene, "chapter1:c1-title");
  assert.equal(hero.level, 4);
  assert.equal(hero.xp, 31);
  assert.equal(hero.hp, hero.maxHp);
  assert.equal(dead.hp, 0);
  assert.deepEqual(
    {
      strength: hero.strength,
      accuracy: hero.accuracy,
      weapon: hero.activeWeaponId,
    },
    stats,
  );
  const witch = s.units.filter((u) => u.id === "story-witch");
  assert.equal(witch.length, 1);
  assert.equal(witch[0].owner, 2);
  assert.equal(witch[0].classId, "sorcerer");
  E.recruitWitch(s);
  assert.equal(s.units.filter((u) => u.id === "story-witch").length, 1);
  E.validate(s);
  assert.ok(E.map.every((c) => !c.prop && !c.villagePart));
  assert.ok(E.map.some((c) => c.terrain === "forest"));
  assert.ok(E.map.some((c) => c.terrain === "rock"));
  assert.equal(s.players[0].visible.length, E.W * E.H);
  assert.deepEqual(s.players[0].visible, s.players[1].visible);
  assert.ok(
    s.units
      .filter((u) => u.owner === 0)
      .every((u) => E.unitClass(u).faction === "knight"),
  );
  E.activateMap("prologue");
  assert.equal(JSON.stringify(E.map), original);
});
test("Choix coopératif : attente, votes différents, modification, double acquittement et sauvegarde", () => {
  const s = E.createCampaign(["knight", "north"]);
  E.beginForestChapter(s);
  const p = s.chapter1!.pending!;
  E.advanceChapterLine(s, 1, { id: p.id, page: 0 });
  assert.equal(s.scene, "chapter1:c1-title");
  E.advanceChapterLine(s, 1, { id: p.id, page: 0 });
  assert.equal(p.readBy?.length, 1);
  E.advanceChapterLine(s, 2, { id: p.id, page: 0 });
  assert.equal(s.scene, "chapter1:c1-warning");
  finish(s, 1);
  assert.equal(s.scene, "chapter1:c1-choice");
  E.advanceChapterLine(s);
  assert.equal(s.scene, "chapter1:c1-choice");
  assert.equal(E.votePatrol(s, 1, "storm"), false);
  assert.equal(E.votePatrol(s, 2, "travelers"), false);
  const back = E.decode(E.encode(s));
  assert.deepEqual(back.forestChapter?.votes, { 1: "storm", 2: "travelers" });
  assert.equal(E.votePatrol(back, 2, "storm"), true);
  assert.equal(back.scene, "chapter1:c1-storm");
  assert.equal(back.forestChapter?.choice, "storm");
  assert.throws(() => E.votePatrol(back, 1, "travelers"));
  const lines = E.chapterLines(back, "c1-storm");
  assert.ok(lines.some((l) => l.text.includes("hérétiques")));
});
test("Géraud : dialogue volontaire réservé aux Chevaliers et branche tempête, pas de recrutement automatique", () => {
  const s = battle(),
    g = s.units.find((u) => u.id === "geraud")!,
    k = s.units.find((u) => u.id === "p2a")!,
    v = s.units.find((u) => u.id === "p1a")!;
  k.x = g.x - 1;
  k.y = g.y;
  v.x = g.x;
  v.y = g.y + 1;
  s.common.queue = [k.id, v.id, g.id];
  s.common.index = 0;
  s.active = 2;
  E.visibility(s);
  E.encounter(s);
  assert.equal(s.scene, null);
  assert.equal(g.owner, 0);
  assert.equal(E.canTalkGeraud(s, k), true);
  assert.equal(E.canTalkGeraud(s, v), false);
  const no = battle("travelers");
  const ng = no.units.find((u) => u.id === "geraud")!,
    nk = no.units.find((u) => u.id === "p2a")!;
  nk.x = ng.x - 1;
  nk.y = ng.y;
  no.common.queue = [nk.id, ng.id];
  no.common.index = 0;
  assert.equal(E.canTalkGeraud(no, nk), false);
  assert.throws(() => E.talkGeraud(no, nk));
});
for (const spent of [false, true])
  test(`Géraud : conserve PV, état, case et initiative (${spent ? "déjà joué" : "tour à venir"}), faction inversée et sauvegarde`, () => {
    const s = battle("storm", true),
      g = s.units.find((u) => u.id === "geraud")!,
      k = s.units.find((u) => u.id === "p1a")!;
    k.x = g.x - 1;
    k.y = g.y;
    s.active = 1;
    g.hp = 7;
    g.fortified = true;
    s.common = {
      round: 3,
      index: spent ? 1 : 0,
      queue: spent
        ? [g.id, k.id, "valdren-captain"]
        : [k.id, "valdren-captain", g.id],
    };
    const queue = structuredClone(s.common),
      before = { hp: g.hp, x: g.x, y: g.y, fortified: g.fortified };
    E.talkGeraud(s, k);
    assert.equal(g.owner, 0);
    assert.equal(E.storyUnit(s, "knight-chief")?.id, k.id);
    const back = E.decode(E.encode(s));
    assert.equal(back.scene, "chapter1:c1-recruit");
    finish(back, 1);
    const recruited = back.units.find((u) => u.id === "geraud")!;
    assert.equal(recruited.owner, 1);
    assert.deepEqual(back.common, queue);
    assert.deepEqual(
      {
        hp: recruited.hp,
        x: recruited.x,
        y: recruited.y,
        fortified: recruited.fortified,
      },
      before,
    );
    assert.deepEqual(recruited.recruitChoices, ["man_at_arms", "spearman"]);
    assert.equal(E.canAttack(k, recruited), false);
    assert.equal(E.decode(E.encode(back)).forestChapter?.geraudRecruited, true);
    E.advance(back);
    assert.ok(
      back.common.queue.slice(back.common.index).includes(g.id) === !spent,
    );
  });
test("Victoire, grotte, deux lecteurs et fin propre sans chapitre 2 ; défaite de toute une équipe", () => {
  const s = battle("travelers");
  for (const u of s.units) if (u.owner === 0) u.hp = 0;
  E.checkEnd(s);
  assert.equal(s.scene, "chapter1:c1-cave");
  const lines = E.chapterLines(s, "c1-cave");
  assert.ok(lines.some((l) => l.text.includes("six mois")));
  assert.ok(!lines.some((l) => l.text.includes("sert désormais")));
  const back = E.decode(E.encode(s));
  finish(back, 1);
  assert.equal(back.phase, "summary");
  assert.equal(back.forestChapter?.stage, "complete");
  assert.equal(back.scene, null);
  assert.ok(
    back.units
      .filter((u) => u.owner !== 0 && u.hp > 0)
      .every((u) => u.hp === u.maxHp),
  );
  const lost = battle();
  for (const u of lost.units) if (u.owner === 1) u.hp = 0;
  E.checkEnd(lost);
  assert.equal(lost.phase, "defeat");
});
test("Écuyer : épée légère existante et deux promotions ; aucune progression tactique à la scène de test", () => {
  const s = E.prepareChapterOneTest(E.createCampaign(["north", "knight"]));
  assert.equal(s.developmentTest, "chapter-one");
  assert.equal(s.scene, "chapter1:alliance");
  const u = E.makeClassUnit("s", 2, 2, "squire", "Géraud", 1, 1, "male", [
    "man_at_arms",
    "spearman",
  ]);
  assert.equal(E.weaponName(u), "Épée légère");
  u.level = 10;
  assert.deepEqual(E.promotionOptions(u), ["man_at_arms", "spearman"]);
});
test("Matériau de l’épée : lame froide, alpha et peau hors masque préservés, ressources existantes couvertes", async () => {
  const { steelBladePixels } = await import("../src/sprites/weapon-material");
  const data = new Uint8ClampedArray(400 * 600 * 4);
  const put = (x: number, y: number) =>
    data.set([180, 130, 75, 199], (y * 400 + x) * 4);
  put(46, 265);
  put(42, 220);
  const face = Array.from(
    data.slice((220 * 400 + 42) * 4, (220 * 400 + 42) * 4 + 4),
  );
  assert.ok(steelBladePixels(data, 400, 600, "tactical/lot4-recruits.png") > 0);
  const blade = data.slice((265 * 400 + 46) * 4, (265 * 400 + 46) * 4 + 4);
  assert.ok(blade[2] > blade[0]);
  assert.equal(blade[3], 199);
  assert.deepEqual(
    Array.from(data.slice((220 * 400 + 42) * 4, (220 * 400 + 42) * 4 + 4)),
    face,
  );
  assert.equal(steelBladePixels(data, 400, 600, "another-class.png"), 0);
  for (const source of [
    "tactical/combat-v3-swordsb.png",
    "tactical/combat-v3-motion8.png",
    "tactical/combat-v2-states.png",
    "tactical/combat-v4-mixed.png",
  ]) {
    const pixels = new Uint8ClampedArray(400 * 600 * 4);
    for (let i = 0; i < pixels.length; i += 4)
      pixels.set([180, 130, 75, 199], i);
    assert.ok(steelBladePixels(pixels, 400, 600, source) > 0, source);
    assert.deepEqual(Array.from(pixels.slice(0, 4)), [180, 130, 75, 199]);
  }
});
