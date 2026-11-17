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
