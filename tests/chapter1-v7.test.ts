import { test } from "node:test";
import assert from "node:assert/strict";
import * as E from "../src/engine";
import {
  chapterLines,
  beginChapter1,
  advanceChapterLine,
  chapterEncounter,
  temporaryRuinsCells,
  chapterBeacon,
  upgradeChapter1,
} from "../src/game/chapter1";
function finish(s: E.Campaign) {
  const id = s.chapter1!.pending!.id;
  while (s.chapter1?.pending?.id === id) advanceChapterLine(s);
  return id;
}
function arrivals() {
  const s = E.createCampaign(["north", "knight"]);
  beginChapter1(s);
  finish(s);
  finish(s);
  return s;
}
function place(s: E.Campaign, owner: number, x: number, y: number) {
  const u = s.units.find((u) => u.owner === owner)!;
  Object.assign(u, { x, y });
  return u;
}
test("V7 début : trois Vikings et deux Chevaliers, dialogues distincts et initiative intacte", () => {
  const s = E.createCampaign(["knight", "north"]),
    queue = structuredClone(s.common),
    units = structuredClone(s.units);
  assert.equal(s.units.filter((u) => u.owner === 1).length, 2);
  assert.equal(s.units.filter((u) => u.owner === 2).length, 3);
  assert.ok(beginChapter1(s));
  assert.equal(s.scene, "chapter1:arrival-1");
  assert.match(chapterLines(s, "arrival-1")[0].text, /convoi/);
  finish(s);
  assert.equal(s.scene, "chapter1:arrival-2");
  assert.match(chapterLines(s, "arrival-2")[0].text, /drakkar/);
  finish(s);
  assert.deepEqual(s.common, queue);
  assert.deepEqual(s.units, units);
  assert.equal(s.active, 1);
  assert.equal(beginChapter1(s), false);
  assert.equal(s.scene, null);
});
test("V7 découvertes indépendantes : neuf cases de présentation, aucune exploration logique", () => {
  const s = arrivals(),
    seen = structuredClone(
      s.players.map((p) => ({ visible: p.visible, explored: p.explored })),
    ),
    queue = structuredClone(s.common);
  place(s, 1, 20, 15);
  s.active = 1;
  assert.ok(chapterEncounter(s));
  assert.equal(s.scene, "chapter1:ruins-1");
  assert.equal(temporaryRuinsCells().length, 9);
  finish(s);
  assert.ok(chapterBeacon(s, 1));
  assert.equal(chapterBeacon(s, 2), false);
  assert.deepEqual(
    s.players.map((p) => ({ visible: p.visible, explored: p.explored })),
    seen,
  );
  s.active = 2;
  assert.equal(chapterEncounter(s), false);
  place(s, 2, 39, 20);
  assert.ok(chapterEncounter(s));
  finish(s);
  assert.ok(chapterBeacon(s, 2));
  assert.deepEqual(s.common, queue);
});
test("V7 rencontre : attendre les deux groupes près du sanctuaire, puis préserver les règles de fusion", () => {
  const s = arrivals();
  place(s, 1, 29, 20);
  s.active = 1;
  chapterEncounter(s);
  finish(s);
  assert.equal(chapterEncounter(s), true);
  assert.equal(s.scene, "chapter1:waiting-1");
  finish(s);
  assert.equal(chapterEncounter(s), false);
  place(s, 2, 34, 20);
  s.active = 2;
  chapterEncounter(s);
  finish(s);
  assert.ok(chapterEncounter(s));
  assert.equal(s.scene, "chapter1:meeting");
  const before = structuredClone(s.common),
    units = structuredClone(s.units);
  finish(s);
  assert.deepEqual(s.units, units);
  E.merge(s);
  assert.ok(s.merged);
  assert.deepEqual(
    s.common.queue.slice(0, before.index + 1),
    before.queue.slice(0, before.index + 1),
  );
  assert.equal(s.common.round, before.round);
  assert.equal(s.units.filter((u) => u.id.startsWith("sanctuary-")).length, 2);
  const n = s.units.length;
  E.merge(s);
  assert.equal(s.units.length, n);
  assert.equal(chapterEncounter(s), false);
});
test("V7 victoire : alliance, sorcière puis départ, sans recrutement ni chapitre 2", () => {
  const s = arrivals();
  s.merged = true;
  s.chapter1!.completed.push("ruins-1", "ruins-2", "meeting");
  for (const u of s.units) if (u.owner === 0) u.hp = 0;
  E.checkEnd(s);
  assert.equal(s.scene, null);
  const a = place(s, 1, 31, 19),
    b = place(s, 2, 31, 18);
  s.common.queue = [a.id, b.id];
  s.common.index = 0;
  s.active = 1;
  E.prepareEntry(s, a);
  s.common.index = 1;
  s.active = 2;
  E.prepareEntry(s, b);
  const units = structuredClone(s.units),
    queue = structuredClone(s.common);
  assert.equal(s.scene, "chapter1:alliance");
  assert.equal(chapterLines(s, "alliance")[6].speaker, "unknown");
  while (s.chapter1!.pending!.page < 6) advanceChapterLine(s);
  assert.ok(s.chapter1!.allied);
  assert.equal(s.chapter1!.guideMet, undefined);
  finish(s);
  assert.ok(s.chapter1!.complete);
  assert.ok(s.chapter1!.guideMet);
  assert.equal(s.phase, "summary");
  assert.equal(s.scene, null);
  assert.deepEqual(s.units, units);
  assert.deepEqual(s.common, queue);
  E.checkEnd(s);
  assert.equal(s.scene, null);
  assert.ok(s.units.every((u) => !u.id.includes("witch")));
});
test("V7 sauvegarde : reprise de la réplique et conservation des positions, brumes et activation", () => {
  const s = arrivals();
  place(s, 1, 20, 15);
  s.active = 1;
  chapterEncounter(s);
  advanceChapterLine(s);
  s.committedMove = E.current(s)!.id;
  const back = E.decode(E.encode(s));
  assert.equal(back.chapter1!.pending!.page, 1);
  assert.equal(back.scene, "chapter1:ruins-1");
  assert.deepEqual(back.players, s.players);
  assert.deepEqual(back.common, s.common);
  assert.equal(back.committedMove, s.committedMove);
  back.chapter1!.pending!.page = 999;
  assert.throws(() => E.decode(E.encode(back)), /Scène/);
});
test("V7 anciennes sauvegardes : adopter le stade courant sans réinitialiser une partie finie", () => {
  const s = E.createCampaign(["north", "knight"]);
  delete s.chapter1;
  s.merged = true;
  const u = structuredClone(s.units),
    q = structuredClone(s.common);
  upgradeChapter1(s);
  assert.ok(s.chapter1!.completed.includes("meeting"));
  assert.deepEqual(s.units, u);
  assert.deepEqual(s.common, q);
  const done = E.createCampaign(["north", "knight"]);
  delete done.chapter1;
  done.phase = "summary";
  upgradeChapter1(done);
  assert.equal(done.chapter1, undefined);
});
