import { test } from "node:test";
import assert from "node:assert/strict";
import * as E from "../src/engine";
import {
  sheetPortraitPlacement,
  opaquePortraitBounds,
} from "../src/ui/portrait-layout";
import { portraitBackdropMask } from "../src/ui/portrait-mask";
import {
  tacticalIdleSway,
  idleAnimationFrame,
} from "../src/sprites/display-scale";
import audit from "../docs/idle-pose-audit.json";
test("départ : exactement deux bandages par équipe, deux porteurs distincts et anciennes réserves conservées au chargement", () => {
  for (const factions of [
    ["north", "knight"],
    ["knight", "north"],
  ] as const) {
    const s = E.createCampaign([...factions]);
    for (const owner of [1, 2]) {
      const team = s.units.filter((u) => u.owner === owner);
      assert.equal(
        team.reduce((n, u) => n + u.potions, 0),
        2,
      );
      assert.equal(team.filter((u) => u.potions === 1).length, 2);
      if (factions[owner - 1] === "knight")
        assert.ok(team.every((u) => u.potions === 1));
    }
    s.units[0].potions = 7;
    assert.equal(E.decode(E.encode(s)).units[0].potions, 7);
  }
});
test("bandages : soi ou allié adjacent blessé, consommation unique, soin plafonné et cibles invalides refusées", () => {
  const s = E.createCampaign(["north", "knight"]),
    u = s.units.find((u) => u.id === "p1a")!,
    ally = s.units.find((u) => u.id === "p1b")!,
    foe = s.units.find((u) => u.owner === 0)!;
  u.x = 10;
  u.y = 10;
  u.potions = 2;
  u.hp = u.maxHp;
  ally.x = 11;
  ally.y = 10;
  ally.hp = ally.maxHp - 1;
  assert.ok(E.bandageTargets(s, u).includes(ally));
  assert.ok(!E.bandageTargets(s, u).includes(u));
  assert.equal(E.heal(s, u, ally), 1);
  assert.equal(ally.hp, ally.maxHp);
  assert.equal(u.potions, 1);
  assert.throws(() => E.heal(s, u, ally));
  assert.equal(u.potions, 1);
  u.hp--;
  assert.equal(E.heal(s, u), 1);
  assert.equal(u.potions, 0);
  ally.hp--;
  assert.throws(() => E.heal(s, u, ally));
  u.potions = 1;
  ally.x = 12;
  assert.throws(() => E.heal(s, u, ally));
  ally.x = 11;
  ally.y = 11;
  assert.throws(() => E.heal(s, u, ally));
  foe.x = 11;
  foe.y = 10;
  foe.hp--;
  assert.throws(() => E.heal(s, u, foe));
  ally.y = 10;
  ally.hp = 0;
  assert.throws(() => E.heal(s, u, ally));
});
test("IA prologue : tous les Sans-Repos initiaux contournent les murs et convergent ou atteignent un allié", () => {
  const s = E.createCampaign(["north", "knight"]);
  s.chapter1!.alerted = true;
  s.merged = true;
  for (const u of s.units.filter((u) => u.owner !== 0)) {
    const c = E.map.find(
      (c) =>
        c.walk &&
        E.distance(c, E.village.entry) <= 4 &&
        !s.units.some((t) => t !== u && t.hp > 0 && t.x === c.x && t.y === c.y),
    );
    if (c) {
      u.x = c.x;
      u.y = c.y;
    }
  }
  for (const u of s.units.filter((u) => u.owner === 0)) {
    let reached = false,
      moved = false;
    for (let n = 0; n < 45; n++) {
      const p = E.ai(s, u);
      moved ||= p.x !== u.x || p.y !== u.y;
      u.x = p.x;
      u.y = p.y;
      if (p.target || E.distance(u, E.village.entry) <= 4) {
        reached = true;
        break;
      }
    }
    assert.ok(moved, u.id);
    assert.ok(reached, u.id);
  }
});
test("attente : audit de 89 profils, deux poses réellement distinctes ou respiration de pose unique", () => {
  assert.equal(audit.length, 89);
  assert.equal(audit.filter((p) => p.unique === 1).length, 37);
  for (const p of audit) {
    assert.ok(p.frames.length);
    assert.equal(p.unique, p.frames.length);
    assert.equal(
      tacticalIdleSway("any", "male", "idle", 1, p.frames.length) !== 0,
      p.unique === 1,
    );
    assert.equal(
      tacticalIdleSway("any", "female", "move", 1, p.frames.length),
      0,
    );
    assert.equal(
      tacticalIdleSway("any", "female", "attack", 1, p.frames.length),
      0,
    );
  }
});
test("fiches : hauteur de tête comparable, proportions conservées et fonds transparents recadrés", () => {
  const pixels = new Uint8ClampedArray(20 * 20 * 4);
  for (let y = 2; y < 18; y++)
    for (let x = 4; x < 16; x++) pixels[(y * 20 + x) * 4 + 3] = 255;
  assert.deepEqual(opaquePortraitBounds(pixels, 20, 20), {
    x: 4,
    y: 2,
    width: 12,
    height: 16,
  });
  const a = sheetPortraitPlacement("V09", {
      x: 0,
      y: 0,
      width: 445,
      height: 290,
    }),
    b = sheetPortraitPlacement("N05", { x: 0, y: 0, width: 350, height: 400 });
  assert.ok(Math.abs(a.headHeight - b.headHeight) < 3);
  assert.ok(Math.abs(a.width / a.height - 445 / 290) < 0.001);
  assert.ok(Math.abs(b.width / b.height - 350 / 400) < 0.001);
});

test("ruines : les trois cases de devant permettent au chef vivant de se préparer, sans autoriser un compagnon", () => {
  const s = E.createCampaign(["north", "knight"]);
  s.chapter1!.started = true;
  s.merged = true;
  s.units.filter((u) => u.owner === 0).forEach((u) => (u.hp = 0));
  const u = s.units.find((u) => u.id === "p1a")!;
  s.common.queue = [u.id];
  s.common.index = 0;
  s.active = 1;
  for (const dx of [-1, 0, 1]) {
    u.x = E.village.entry.x + dx;
    u.y = E.village.entry.y + 1;
    assert.ok(E.canPrepareEntry(s, u), String(dx));
  }
  u.y += 1;
  assert.equal(E.canPrepareEntry(s, u), false);
  u.y--;
  u.leader = false;
  assert.equal(E.canPrepareEntry(s, u), false);
});
test("dialogues : aucun mort ne parle, les rôles sont confiés aux survivants sans modifier leurs identités", () => {
  const s = E.createCampaign(["north", "knight"]);
  const chief = s.units.find((u) => u.id === "p1a")!;
  chief.hp = 0;
  const survivor = E.storyUnit(s, "north-chief")!;
  assert.notEqual(survivor.id, chief.id);
  assert.ok(survivor.hp > 0);
  const lines = E.chapterLines(s, "meeting");
  for (const l of lines) {
    const u = E.storyUnit(s, l.speaker);
    if (u) assert.ok(u.hp > 0);
  }
});

test("alerte des ruines : une cible inaccessible ne bloque pas les Sans-Repos ; une poursuite accessible reste engagée", () => {
  const s = E.createCampaign(["north", "knight"]);
  s.chapter1!.alerted = true;
  s.merged = true;
  const u = s.units.find((u) => u.id === "e2")!,
    target = s.units.find((u) => u.id === "p1b")!;
  const walls = E.map
    .filter((c) => E.distance(c, target) === 1)
    .map((c) => ({ c, walk: c.walk }));
  try {
    for (const { c } of walls) c.walk = false;
    u.aiTargetId = target.id;
    const p = E.ai(s, u);
    assert.equal(u.aiTargetId, undefined);
    assert.ok(p.x !== u.x || p.y !== u.y);
    assert.equal(p.target, undefined);
  } finally {
    for (const { c, walk } of walls) c.walk = walk;
  }
});
