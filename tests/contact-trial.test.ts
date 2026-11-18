import { test } from "node:test";
import assert from "node:assert/strict";
import {
  contactScenarios,
  contactSample,
  contactDuration,
  contactPositions,
  type ContactScenario,
} from "../src/ui/contact-trial-model";
test("essai au contact : les quatre échanges imposés conservent ordre, parades, esquives et PV", () => {
  const expectations = {
    critical: [24, 16],
    agility: [20, 16],
    parry: [24, 16],
    "double-parry": [24, 12],
    dodges: [24, 0],
  };
  for (const id of Object.keys(expectations) as ContactScenario[]) {
    const s = contactSample(id, contactDuration(id));
    assert.deepEqual(s.hp, expectations[id]);
    assert.equal(s.applied.length, contactScenarios[id].events.length);
    assert.equal(s.done, true);
    assert.equal(contactSample(id, 0).approach, 0);
    assert.deepEqual(contactSample(id, 0).hp, [24, 24]);
  }
  assert.deepEqual(
    contactScenarios["double-parry"].events.map((e) => [e.side, e.outcome]),
    [
      [1, "block"],
      [0, "hit"],
      [0, "hit"],
      [1, "block"],
      [0, "hit"],
    ],
  );
  assert.deepEqual(
    contactScenarios.dodges.events.map((e) => e.outcome),
    ["evade", "evade", "hit"],
  );
});

test("approche : mêlée au centre, attaquant seul contre une cible à distance, aucun mouvement pour un tir", () => {
  assert.deepEqual(contactPositions(0, 100, 0), [270, 690]);
  assert.deepEqual(contactPositions(1, 100, 0), [430, 530]);
  assert.deepEqual(contactPositions(1, 100, 1), [430, 530]);
  assert.deepEqual(contactPositions(1, 100, 0, false, true), [590, 690]);
  assert.deepEqual(contactPositions(1, 100, 1, false, true), [270, 370]);
  assert.deepEqual(contactPositions(1, 100, 0, true, false), [270, 690]);
});

test("course du Pillard : les quatre ancrages suivent les repères de pieds, sans alternance de 100 pixels", async () => {
  const { readFile } = await import("node:fs/promises");
  const layouts = JSON.parse(
    await readFile("src/assets/tactical/atlas-layout.json", "utf8"),
  );
  const anchors = JSON.parse(
    await readFile("src/assets/tactical/combat-anchors.json", "utf8"),
  );
  const key = "tactical/combat-v3-motion1.png";
  const frames = layouts[key].frames.filter((f: any) => f.row === 0);
  assert.equal(frames.length, 4);
  const local = frames.map((f: any) => {
    assert.equal(f.anchorX, anchors[key][`0:${f.column}`].feetX);
    return f.anchorX - (f.column * layouts[key].width) / layouts[key].columns;
  });
  assert.ok(Math.max(...local) - Math.min(...local) < 15);
});

test("pas rapides et esquive : poses basses, échelle constante et critique sans dessin supplémentaire", async () => {
  const { readFile } = await import("node:fs/promises");
  const data = JSON.parse(
    await readFile("src/assets/tactical/zz-v5.combat.json", "utf8"),
  );
  const profile = data.profiles.find(
    (p: any) =>
      p.classId === "raider" &&
      p.gender === "male" &&
      p.equipment === "axe-shield",
  );
  const move = profile.clips.move,
    evade = profile.clips.evade;
  assert.equal(move.frames.length, 4);
  assert.equal(move.fps, 6);
  assert.deepEqual(move.cells, [
    { row: 0, column: 0 },
    { row: 0, column: 1 },
    { row: 1, column: 0 },
    { row: 1, column: 1 },
  ]);
  assert.deepEqual(evade.frames, [0, 1, 3]);
  assert.equal(move.source, evade.source);
  const { buildCombatSkin } = await import("../src/sprites/combat-skin-core");
  const { resolveClip } = await import("../src/sprites/catalog");
  const skin = buildCombatSkin(profile, profile)!;
  assert.equal(resolveClip(skin.profile, "move")!.source, move.source);
  assert.equal(resolveClip(skin.profile, "evade")!.source, evade.source);
  assert.equal(profile.referenceHeights[move.source], 282);
  assert.equal(contactScenarios.dodges.events.at(-1)?.critical, true);
});

test("critique partagé : flash et secousse bornés, mouvement réduit respecté", async () => {
  const { criticalImpact } = await import("../src/ui/critical-impact");
  assert.equal(criticalImpact(-1).active, false);
  assert.equal(criticalImpact(500).flash, 0);
  assert.ok(criticalImpact(30).flash > 0);
  assert.equal(criticalImpact(350).active, true);
  assert.equal(criticalImpact(500).active, false);
  assert.notEqual(criticalImpact(30).shakeX, 0);
  const reduced = criticalImpact(30, true);
  assert.equal(reduced.shakeX, 0);
  assert.equal(reduced.shakeY, 0);
  assert.ok(reduced.flash < 0.12);
});

test("critique validé : deux griffures, flash et aucune particule triangulaire", async () => {
  const { drawCriticalImpact } = await import("../src/ui/critical-impact");
  let quadratics = 0,
    lines = 0,
    rectangles = 0;
  const ctx = {
    save() {},
    restore() {},
    fillRect() {
      rectangles++;
    },
    translate() {},
    rotate() {},
    scale() {},
    beginPath() {},
    moveTo() {},
    quadraticCurveTo() {
      quadratics++;
    },
    lineTo() {
      lines++;
    },
    closePath() {},
    fill() {},
    strokeText() {},
    fillText() {},
    getTransform() {
      return { a: 1 };
    },
  };
  drawCriticalImpact(
    ctx as unknown as CanvasRenderingContext2D,
    20,
    480,
    280,
    960,
    480,
  );
  assert.equal(quadratics, 16); // two slashes, four visual layers, two curves per layer
  assert.equal(lines, 0); // no straight-edged triangular particles
  assert.equal(rectangles, 2); // contrast and the single flash
});
