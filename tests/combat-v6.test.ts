import { test } from "node:test";
import assert from "node:assert/strict";
import * as E from "../src/engine";
import { createSandbox, trainingUnit } from "../src/game/sandbox";
import fs from "node:fs";
test("V6 défenseur sans riposte : XP unique, uniquement pour les participants réels", () => {
  const s = createSandbox(),
    a = trainingUnit(s, "raider", 1, 1, 0),
    b = trainingUnit(s, "hunter"),
    spectator = trainingUnit(s, "man_at_arms");
  b.x = a.x + 1;
  const r = E.resolve(s, a, b);
  assert.ok(!r.strikes.some((h) => h.attacker === b.id));
  assert.deepEqual(
    r.xp.map((x) => x.id),
    [b.id],
  );
  assert.equal(r.xp[0].amount, 25);
  assert.ok(!r.xp.some((x) => x.id === spectator.id));
  E.applyXp(s, r);
  assert.equal(b.xp, 25);
});
test("V6 attaque et ripostes : un seul crédit au participant allié", () => {
  const s = createSandbox(),
    a = trainingUnit(s, "man_at_arms"),
    b = trainingUnit(s, "raider", 1, 1, 0);
  s.merged = false;
  b.x = a.x + 1;
  a.hp = b.hp = a.maxHp = b.maxHp = 1000;
  const r = E.resolve(s, a, b);
  assert.deepEqual(
    r.xp.map((e) => e.id),
    [a.id],
  );
  assert.equal(new Set(r.xp.map((e) => e.id)).size, r.xp.length);
  assert.ok(r.xp.every((e) => e.amount === 25));
});
test("V6 conservation exacte des appels d’éclair V4 et de leur trajectoire", () => {
  const old = fs.readFileSync("tests/fixtures/v4-lightning.txt", "utf8"),
    now = fs.readFileSync("src/ui/combat-effects.ts", "utf8");
  const bolt = (s: string) =>
    s
      .slice(
        s.indexOf('  if (kind === "lightning" && t >= -80'),
        s.indexOf("  if (t >= 0 && t < 280)"),
      )
      .split("// Exact V4")[0]
      .trim();
  assert.equal(bolt(now), old.trim());
});

test("V6 défenseur tombé : aucune montée de niveau ne le ramène en vie", () => {
  const s = createSandbox(),
    a = trainingUnit(s, "raider", 1, 1, 0),
    b = trainingUnit(s, "hunter");
  b.x = a.x + 1;
  b.hp = 1;
  b.xp = 95;
  a.strength = 100;
  a.accuracy = 1000;
  const r = E.resolve(s, a, b);
  assert.equal(r.strikes[0].hpAfter, 0);
  assert.ok(!r.xp.some((e) => e.id === b.id));
  for (const h of r.strikes) E.applyStrike(s, h);
  E.applyXp(s, r);
  assert.equal(b.hp, 0);
  assert.equal(b.level, 1);
});
