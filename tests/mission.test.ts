import { test } from "node:test";
import assert from "node:assert/strict";
import * as E from "../src/engine";
for (const f of [
  ["north", "north"],
  ["north", "knight"],
  ["knight", "north"],
  ["knight", "knight"],
] as [E.Faction, E.Faction][]) {
  test(`mission complète ${f.join("/")} sans téléportation`, () => {
    const s = E.createCampaign(f);
    s.phase = "battle";
    s.scene = null;
    let actions = 0,
      met = false,
      commonStrikes = 0;
    for (; actions < 300; actions++) {
      if (s.scene === "meeting") {
        E.merge(s);
        met = true;
      }
      if (s.scene === "ending") break;
      s.scene = null;
      assert.notEqual(s.phase, "defeat");
      let u = E.current(s);
      if (!u || u.hp <= 0) {
        E.advance(s);
        continue;
      }
      if (u.owner === 0) {
        const p = E.ai(s, u);
        E.move(s, u, p.x, p.y);
        const t = s.units.find((t) => t.id === p.target);
        if (t && E.canAttack(u, t)) {
          const battle = E.resolve(s, u, t);
          if (s.merged) commonStrikes += battle.strikes.length;
          battle.strikes.forEach((st) => E.applyStrike(s, st));
          E.applyXp(s, battle);
        }
      } else {
        if (u.owner !== s.active) {
          s.active = u.owner;
        }
        if (E.activeWeapon(u).reload && u.crossbowLoaded === false)
          E.reloadWeapon(s, u);
        if (u.hp <= 12 && u.potions) {
          E.heal(s, u);
        } else {
          const reachable = E.reachable(s, u);
          let best = {
            k: E.key(u.x, u.y),
            score: -Infinity,
            target: undefined as E.Unit | undefined,
          };
          for (const k of reachable.keys()) {
            if (!s.players[u.owner - 1].visible.includes(k)) continue;
            const c = E.map[k],
              ghost = { ...u, x: c.x, y: c.y };
            const targets = E.alive(s).filter(
              (t) => t.owner === 0 && E.seen(s, u!.owner as 1 | 2, t),
            );
            const target = targets
              .filter((t) => E.canAttack(ghost, t))
              .sort((a, b) => a.hp - b.hp)[0];
            const objective = s.merged
              ? (targets.sort(
                  (a, b) => E.distance(a, ghost) - E.distance(b, ghost),
                )[0] ?? { x: 31, y: 20 })
              : { x: u.owner === 1 ? 29 : 33, y: 20 };
            const score =
              (target ? 100 + 30 - target.hp : 0) -
              E.distance(c, objective) -
              reachable.get(k)!.cost * 0.01;
            if (score > best.score) best = { k, score, target };
          }
          const c = E.map[best.k];
          E.move(s, u, c.x, c.y);
          if (best.target && E.canAttack(u, best.target)) {
            const battle = E.resolve(s, u, best.target);
            if (s.merged) commonStrikes += battle.strikes.length;
            battle.strikes.forEach((st) => E.applyStrike(s, st));
            E.applyXp(s, battle);
          }
        }
      }
      E.visibility(s);
      E.validate(s);
      if (E.encounter(s)) continue;
      E.advance(s);
      if (!s.merged && s.scene === null) s.active = (3 - s.active) as 1 | 2;
    }
    assert.ok(met, "les fronts doivent se rencontrer");
    assert.ok(
      commonStrikes > 0,
      "un véritable combat doit avoir lieu après la fusion",
    );
    assert.equal(
      s.scene,
      "ending",
      `mission non gagnée après ${actions} activations`,
    );
    assert.ok(actions < 150);
    assert.equal(E.alive(s).filter((u) => u.owner === 0).length, 0);
    assert.ok(s.events.includes("storm"));
    assert.ok(s.events.includes("horde"));
    assert.equal(new Set(s.units.map((u) => u.id)).size, s.units.length);
    console.log(
      `  ${f.join("/")} : victoire en ${actions} activations, ${E.alive(s).filter((u) => u.owner !== 0).length} survivants`,
    );
  });
}
