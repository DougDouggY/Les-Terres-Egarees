import { test } from "node:test";
import assert from "node:assert/strict";
import {
  trialPose,
  trialEvents,
  trialDuration,
  defaultTrialGeometry as g,
} from "../src/ui/combat-trial";
import {
  combatTiming,
  combatPose,
  linkedStrikes,
} from "../src/ui/combat-timeline";
test("arme simple : attaque, retour, riposte adverse, retour, seconde attaque par agilité", () => {
  assert.deepEqual(
    trialEvents("two-attacks").map((e) => e.id),
    ["first", "enemy-reply", "second"],
  );
  assert.deepEqual(trialPose("two-attacks", 725).hp, [24, 20]);
  assert.deepEqual(trialPose("two-attacks", 2175).hp, [20, 20]);
  assert.deepEqual(trialPose("two-attacks", 3625).hp, [20, 16]);
  for (const t of [1300, 1400, 2750, 2850]) {
    const p = trialPose("two-attacks", t);
    assert.equal(p.left.x, g.left);
    assert.equal(p.right.x, g.right);
  }
  assert.equal(trialPose("two-attacks", 1600).left.action, "combat_idle");
  assert.equal(trialPose("two-attacks", 1600).right.action, "combat_move");
  assert.equal(trialPose("two-attacks", 3625).left.action, "attack");
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
test("frame de contact déclarée synchronisée à l’impact", () => {
  for (const [frames, impactFrame] of [
    [8, 3],
    [6, 2],
  ]) {
    const timing = combatTiming(frames, 10, false, impactFrame);
    assert.equal(
      combatPose(timing.impact, frames, 10, false, false, impactFrame).index,
      impactFrame,
    );
  }
});
test("doubles armes : le même groupe garde le contact ; l’agilité ouvre un nouveau passage", () => {
  assert.equal(
    linkedStrikes({ attacker: "a", group: 0 }, { attacker: "a", group: 0 }),
    true,
  );
  assert.equal(
    linkedStrikes({ attacker: "a", group: 0 }, { attacker: "a", group: 2 }),
    false,
  );
  const first = combatPose(99999, 8, 10, false, false, 3, {
    linkedAfter: true,
  });
  assert.equal(first.travel, 1);
  assert.equal(first.animation, "idle");
  const second = combatPose(0, 8, 10, false, false, 3, { linkedBefore: true });
  assert.equal(second.travel, 1);
  assert.equal(second.animation, "attack");
});
