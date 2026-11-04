import { test } from "node:test";
import assert from "node:assert/strict";
import {
  trialPose,
  trialEvents,
  trialDuration,
  defaultTrialGeometry as g,
} from "../src/ui/combat-trial";
test("deux frappes simples : exactement deux impacts, seconde au contact, retour sans frappe", () => {
  assert.equal(trialEvents("two-attacks").length, 2);
  assert.deepEqual(trialPose("two-attacks", 724).hp, [24, 24]);
  assert.deepEqual(trialPose("two-attacks", 725).hp, [24, 20]);
  assert.deepEqual(trialPose("two-attacks", 1240).hp, [24, 16]);
  assert.equal(trialPose("two-attacks", 1010).left.x, g.left + g.leftAdvance);
  for (let t = 1570; t < 1850; t += 10) {
    const p = trialPose("two-attacks", t);
    assert.equal(p.left.action, "combat_move");
    assert.ok(p.left.x >= g.left);
  }
  assert.equal(trialPose("two-attacks", 1850).left.x, g.left);
});
test("parade : zéro dégât, riposte au contact, retour adverse puis attaque à son tour", () => {
  assert.deepEqual(
    trialEvents("parry").map((e) => e.id),
    ["parry", "counter", "own-turn"],
  );
  assert.equal(trialPose("parry", 725).left.action, "block");
  assert.deepEqual(trialPose("parry", 725).hp, [24, 24]);
  assert.equal(trialPose("parry", 1140).left.action, "counter");
  assert.equal(trialPose("parry", 1140).right.x, g.right - g.rightAdvance);
  assert.deepEqual(trialPose("parry", 1140).hp, [24, 20]);
  for (let t = 1510; t < 1880; t += 10) {
    const p = trialPose("parry", t);
    assert.equal(p.left.action, "combat_idle");
    assert.equal(p.right.action, "combat_move");
  }
  assert.equal(trialPose("parry", 1900).right.x, g.right);
  assert.equal(trialPose("parry", 1900).phase, "turn-change");
  assert.equal(trialPose("parry", 2805).left.action, "attack");
  assert.deepEqual(trialPose("parry", 2805).hp, [24, 16]);
});
test("toutes les phases sont bornées ; garde finale, aucune boucle automatique", () => {
  for (const kind of ["two-attacks", "parry"] as const) {
    for (let t = 0; t <= trialDuration(kind) + 100; t += 5) {
      const p = trialPose(kind, t);
      for (const a of [p.left, p.right]) {
        assert.ok(Number.isFinite(a.x));
        assert.ok(a.frame >= 0 && a.frame < 8);
      }
    }
    const last = trialPose(kind, 99999);
    assert.equal(last.done, true);
    assert.equal(last.left.action, "combat_idle");
    assert.equal(last.right.action, "combat_idle");
    assert.equal(last.left.x, g.left);
    assert.equal(last.right.x, g.right);
  }
});

import { combatTiming, combatPose } from "../src/ui/combat-timeline";
test("la frame de contact déclarée pilote aussi l’impact dans la scène partagée", () => {
  for (const [frames, impactFrame] of [
    [8, 3],
    [6, 2],
  ]) {
    const timing = combatTiming(frames, 10, false, impactFrame);
    const pose = combatPose(
      timing.impact,
      frames,
      10,
      false,
      false,
      impactFrame,
    );
    assert.equal(pose.animation, "attack");
    assert.equal(pose.index, impactFrame);
  }
});
