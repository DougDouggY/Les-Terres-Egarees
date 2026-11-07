import { test } from "node:test";
import assert from "node:assert/strict";
import { makeClassUnit } from "../src/game/units";
import {
  generateStatistics,
  gainLevel,
  growingStats,
} from "../src/game/progression";
import { hashSeed } from "../src/game/rng";
const unit = (id: string) =>
  makeClassUnit(id, 0, 1, "man_at_arms", "Soldat", 1, 1);
test("deterministic individuals preserve structural class rules and have weaker ordinary averages", () => {
  const ordinary: number[] = [];
  const principal: number[] = [];
  const signatures = new Set<string>();
  for (let i = 0; i < 100; i++) {
    const a = generateStatistics(unit("soldier" + i), { role: "ordinary" });
    const b = generateStatistics(unit("soldier" + i), { role: "principal" });
    const again = generateStatistics(unit("soldier" + i), { role: "ordinary" });
    assert.deepEqual(a, again);
    for (const stat of ["move", "vision", "range", "minRange"] as const)
      assert.equal(a[stat], b[stat]);
    signatures.add(growingStats.map((k) => a[k]).join(","));
    ordinary.push(a.maxHp + a.strength + a.defense);
    principal.push(b.maxHp + b.strength + b.defense);
  }
  assert.ok(signatures.size > 10);
  assert.ok(
    ordinary.reduce((a, b) => a + b) < principal.reduce((a, b) => a + b),
  );
});
test("level four reuses exactly three existing level-up rolls; recruitable profile stays normal", () => {
  const a = generateStatistics(unit("geraud"), {
    role: "recruitable",
    level: 4,
  });
  const b = generateStatistics(unit("geraud"), { role: "principal" });
  const rng = { seed: hashSeed(`growth:${b.statSeed}`) };
  for (let i = 0; i < 3; i++) gainLevel(rng, b);
  for (const k of growingStats) assert.equal(a[k], b[k]);
  const stats = growingStats.map((k) => a[k]);
  a.owner = 2;
  assert.deepEqual(
    growingStats.map((k) => a[k]),
    stats,
  );
  assert.deepEqual(JSON.parse(JSON.stringify(a)), a);
});
test("chapter creation uses class profiles, preserves existing heroes and recruited statistics through saves", async () => {
  const E = await import("../src/engine");
  const s = E.createCampaign(["north", "knight"]);
  const hero = s.units.find((u) => u.owner === 1)!;
  hero.strength = 17;
  hero.hp = Math.min(hero.hp, hero.maxHp);
  E.beginForestChapter(s);
  assert.equal(hero.strength, 17);
  const g = s.units.find((u) => u.id === "geraud")!;
  assert.equal(g.statRole, "recruitable");
  const restored = E.decode(E.encode(s));
  for (const u of s.units) {
    const b = restored.units.find((v) => v.id === u.id)!;
    for (const stat of growingStats) assert.equal(b[stat], u[stat]);
  }
  const soldiers = s.units.filter(
    (u) => u.owner === 0 && u.statRole === "ordinary",
  );
  assert.ok(new Set(soldiers.map((u) => u.initiative)).size > 1);
  assert.equal(s.units.find((u) => u.id === "valdren-captain")!.level, 3);
});
