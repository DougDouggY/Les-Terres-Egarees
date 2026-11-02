import { test } from "node:test";
import assert from "node:assert/strict";
import * as E from "../src/engine";
const fresh = (f: [E.Faction, E.Faction] = ["north", "knight"]) => {
  const s = E.createCampaign(f);
  s.scene = null;
  s.phase = "battle";
  return s;
};
for (const a of ["north", "knight"] as const)
  for (const b of ["north", "knight"] as const) {
    test(`factions ${a}/${b} : positions, chemins de toutes classes et sauvegarde`, () => {
      const s = fresh([a, b]);
      E.validate(s);
      assert.equal(s.units.filter((u) => u.owner !== 0).length, 4);
      for (const u of s.units.filter((u) => u.owner !== 0)) {
        const p = E.path(s, u, 16, 10, true);
        assert.ok(p, `${u.name} doit rejoindre le sanctuaire`);
        for (const k of p.steps) assert.equal(E.map[k].walk, true);
      }
      const clone = E.decode(E.encode(s));
      assert.deepEqual(clone, s);
      assert.equal(clone.factions[0], a);
    });
  }
test("carte : 600 cellules régulières, correspondance terrain/visuel et connexité", () => {
  assert.equal(E.map.length, E.W * E.H);
  for (const [i, c] of E.map.entries()) {
    assert.equal(c.x, i % E.W);
    assert.equal(c.y, Math.floor(i / E.W));
    assert.ok(c.tile >= 0 && c.tile < 32);
    assert.ok(c.cost > 0);
  }
  const s = fresh(),
    u = s.units[0];
  for (const c of E.map.filter((c) => c.walk))
    assert.ok(E.path(s, u, c.x, c.y, true), `case inaccessible ${c.x},${c.y}`);
});
test("déplacement : terrain, occupation, coût et chemin affiché", () => {
  const s = fresh();
  for (const u of s.units) {
    const r = E.reachable(s, u);
    for (const [k, p] of r) {
      assert.ok(p.cost <= u.move);
      assert.equal(p.steps.at(-1), k);
      let sum = 0;
      for (let i = 1; i < p.steps.length; i++) {
        const c = E.map[p.steps[i]],
          prev = E.map[p.steps[i - 1]];
        assert.equal(E.distance(c, prev), 1);
        assert.ok(c.walk);
        const occupant = E.at(s, c.x, c.y);
        assert.ok(
          !occupant || E.allied(s, u, occupant),
          "un chemin ne traverse que des alliés",
        );
        if (i === p.steps.length - 1)
          assert.ok(
            !occupant || occupant.id === u.id,
            "pas d’arrêt sur une unité",
          );
        sum += c.cost;
      }
      assert.equal(sum, p.cost);
    }
  }
  assert.equal(E.path(s, s.units[0], 0, 0), null);
  assert.equal(E.path(s, s.units[0], s.units[1].x, s.units[1].y), null);
  assert.throws(() => E.move(s, s.units[0], 0, 0));
});
test("validation rejette obstacles, hors-grille, superposition et doublons", () => {
  for (const change of [
    (s: E.Campaign) => (s.units[0].x = -1),
    (s: E.Campaign) => {
      s.units[0].x = 0;
      s.units[0].y = 0;
    },
    (s: E.Campaign) =>
      Object.assign(s.units[0], { x: s.units[1].x, y: s.units[1].y }),
    (s: E.Campaign) => (s.units[0].id = s.units[1].id),
  ]) {
    const s = fresh();
    change(s);
    assert.throws(() => E.validate(s));
  }
});
test("visibilité indépendante, mémoire et mur opaque", () => {
  const s = fresh();
  assert.ok(s.players[0].visible.includes(E.key(5, 5)));
  assert.ok(!s.players[1].visible.includes(E.key(5, 5)));
  assert.ok(!E.seen(s, 1, s.units[2]));
  assert.equal(E.los({ x: 16, y: 5 }, { x: 16, y: 7 }), false);
  const old = [...s.players[0].visible];
  s.units[0].x = 13;
  s.units[0].y = 9;
  E.visibility(s);
  assert.ok(old.every((k) => s.players[0].explored.includes(k)));
});
test("rencontre fondée sur la vue puis fusion unique et nouveau round", () => {
  const s = fresh();
  s.units[0].x = 14;
  s.units[0].y = 12;
  s.units[2].x = 18;
  s.units[2].y = 12;
  s.fronts[0].index = 1;
  assert.ok(E.encounter(s));
  assert.equal(s.scene, "meeting");
  E.merge(s);
  assert.ok(s.merged);
  assert.equal(s.common.index, 0);
  assert.equal(s.common.round, 1);
  assert.equal(new Set(s.common.queue).size, E.alive(s).length);
  assert.deepEqual(s.players[0].visible, s.players[1].visible);
  assert.deepEqual(s.players[0].explored, s.players[1].explored);
  assert.ok(
    s.players[0].explored.includes(E.key(26, 16)),
    "les découvertes historiques de l’autre expédition doivent être partagées",
  );
  const old = JSON.stringify(s.common);
  E.merge(s);
  assert.equal(JSON.stringify(s.common), old);
  assert.equal(s.events.filter((e) => e === "meeting").length, 1);
});
test("initiative stable, mort avant activation et événements uniques", () => {
  const s = fresh();
  const queue = s.fronts[0].queue;
  for (let i = 1; i < queue.length; i++) {
    const a = s.units.find((u) => u.id === queue[i - 1])!,
      b = s.units.find((u) => u.id === queue[i])!;
    assert.ok(a.initiative >= b.initiative);
  }
  s.units.find((u) => u.id === queue[1])!.hp = 0;
  E.advance(s);
  assert.notEqual(E.current(s)?.hp, 0);
  for (let i = 0; i < 30; i++) {
    s.scene = null;
    E.advance(s);
  }
  assert.equal(s.events.filter((e) => e === "storm").length, 1);
  assert.equal(s.events.filter((e) => e === "horde").length, 1);
  assert.equal(s.units.filter((u) => u.id === "e5").length, 1);
});
test("combat : prévision, portée, contre-attaque, double frappe et mort", () => {
  const s = fresh(),
    a = s.units[0],
    b = s.units[4];
  Object.assign(a, { x: 12, y: 9, agility: 15, accuracy: 100 });
  Object.assign(b, { x: 13, y: 9, hp: 1 });
  const f = E.forecast(a, b);
  assert.equal(f.strikes, 2);
  const result = E.resolve(s, a, b);
  assert.equal(b.hp, 1, "résolution sans dégâts anticipés");
  assert.ok(result.strikes.length >= 1);
  for (const st of result.strikes) E.applyStrike(s, st);
  if (Number(b.hp) === 0)
    assert.equal(result.strikes.filter((st) => st.attacker === b.id).length, 0);
  assert.equal(
    E.canAttack({ ...a, range: 1, minRange: 1 }, { ...b, x: 16 }),
    false,
  );
  assert.equal(E.canAttack({ ...a, minRange: 2, range: 3 }, b), false);
});
test("progression déterministe et potions persistantes", () => {
  const s = fresh(),
    a = s.units[0];
  a.xp = 90;
  a.hp = 10;
  const max = a.maxHp,
    str = a.strength;
  E.applyXp(s, {
    strikes: [],
    xp: [{ id: a.id, amount: 25, before: 90, level: true }],
  });
  assert.equal(a.level, 2);
  assert.equal(a.xp, 15);
  assert.equal(a.maxHp, max + 3);
  assert.equal(a.strength, str + 1);
  E.heal(s, a);
  assert.equal(a.potions, 1);
  assert.equal(E.decode(E.encode(s)).units[0].potions, 1);
  s.scene = "meeting";
  assert.throws(() => E.encode(s));
});
test("IA : déplacements légaux et cibles à portée", () => {
  const s = fresh();
  for (const u of s.units.filter((u) => u.owner === 0)) {
    const p = E.ai(s, u);
    const route = E.path(s, u, p.x, p.y);
    assert.ok(route && route.cost <= u.move);
    if (p.target)
      assert.ok(
        E.canAttack(
          { ...u, x: p.x, y: p.y },
          s.units.find((u) => u.id === p.target)!,
        ),
      );
  }
});
test("victoire, camp narratif et défaite", () => {
  const s = fresh();
  E.merge(s);
  s.units.filter((u) => u.owner === 0).forEach((u) => (u.hp = 0));
  E.checkEnd(s);
  assert.equal(s.scene, "ending");
  s.units.filter((u) => u.leader).forEach((u) => (u.hp = 0));
  E.checkEnd(s);
  assert.equal(s.phase, "defeat");
  assert.throws(
    () => E.encode(s),
    "une défaite ne doit pas écraser le dernier point de reprise",
  );
});

test("zones d’attaque : portées, murs et origines de déplacement", () => {
  const s = fresh();
  for (const u of s.units) {
    const attack = E.attackCells(u);
    for (const k of attack) {
      const c = E.map[k];
      assert.ok(c.walk);
      assert.ok(E.distance(u, c) >= u.minRange && E.distance(u, c) <= u.range);
      assert.ok(E.los(u, c));
    }
    for (const v of s.units.filter((v) => E.canAttack(u, v)))
      assert.ok(attack.has(E.key(v.x, v.y)));
  }
  assert.equal(
    E.los({ x: 15, y: 5 }, { x: 17, y: 7 }),
    false,
    "pas de tir en diagonale à travers un angle opaque",
  );
});
test("atlas : dimensions alignées et variantes de tuiles valides", async () => {
  const { readFile } = await import("node:fs/promises");
  for (const [name, width, height] of [
    ["tiles", 1024, 512],
    ["attacks", 1024, 640],
    ["arrivals", 192, 128],
    ["sprites", 1024, 640],
    ["roads", 512, 1024],
  ] as const) {
    const png = await readFile(
      new URL(`../public/assets/${name}.png`, import.meta.url),
    );
    assert.equal(png.readUInt32BE(16), width);
    assert.equal(png.readUInt32BE(20), height);
  }
  for (const c of E.map) {
    const index = E.tileIndex(c);
    assert.ok(Number.isInteger(index) && index >= 0 && index < 32);
    if (
      ["water", "tree", "rock", "wall", "wagon", "altar", "arrival"].includes(
        c.terrain,
      )
    )
      assert.equal(c.walk, false);
  }
});

test("annulation restaurée, perspective sans transfert de propriété et RNG reproductible", () => {
  const s = fresh(),
    u = s.units[1],
    start = { x: u.x, y: u.y };
  E.move(s, u, 7, 6);
  Object.assign(u, start);
  E.visibility(s);
  assert.equal(u.x, 6);
  assert.equal(u.y, 6);
  const snapshots = s.players.map((p) => JSON.stringify(p));
  s.active = 2;
  assert.equal(u.owner, 1);
  s.active = 1;
  assert.deepEqual(
    s.players.map((p) => JSON.stringify(p)),
    snapshots,
  );
  const a = s.units[0],
    b = s.units[4];
  Object.assign(a, { x: 12, y: 9 });
  Object.assign(b, { x: 13, y: 9 });
  const clone = E.decode(E.encode(s));
  assert.deepEqual(
    E.resolve(s, a, b),
    E.resolve(clone, clone.units[0], clone.units[4]),
  );
});

test("empreinte des décors : collisions et visibilité de toutes les cases occupées", () => {
  for (const f of E.arrivalFootprints)
    for (let dy = 0; dy < f.h; dy++)
      for (let dx = 0; dx < f.w; dx++) {
        const c = E.cell(f.x + dx, f.y + dy)!;
        assert.ok(c);
        assert.equal(c.walk, false);
        assert.equal(c.opaque, true);
        assert.deepEqual(c.prop, { sector: f.sector, dx, dy });
      }
});

test("visibilité cohérente d’un décor à plusieurs cases sans révéler au-delà du rayon", () => {
  const s = fresh();
  for (const owner of [1, 2] as const) {
    const visible = s.players[owner - 1].visible;
    const f = E.arrivalFootprints[owner - 1];
    for (let dy = 0; dy < f.h; dy++)
      for (let dx = 0; dx < f.w; dx++)
        assert.ok(visible.includes(E.key(f.x + dx, f.y + dy)));
    for (const k of visible)
      assert.ok(
        s.units
          .filter((u) => u.owner === owner)
          .some((u) => E.distance(u, E.map[k]) <= u.vision),
      );
  }
});

test("enceinte : quatre portes doubles praticables, mur continu et angles cohérents", () => {
  for (const [x, y] of [
    [12, 9],
    [12, 10],
    [22, 9],
    [22, 10],
    [17, 6],
    [18, 6],
    [17, 14],
    [18, 14],
  ])
    assert.ok(E.cell(x, y)?.walk);
  for (const [x, y] of [
    [12, 6],
    [22, 6],
    [12, 14],
    [22, 14],
  ]) {
    const c = E.cell(x, y)!;
    assert.equal(c.walk, false);
    assert.equal(E.wallVariant(c).tile, 25);
  }
});
test("ancienne sauvegarde : repositionnement limité aux murs ajoutés, sans perdre la progression", () => {
  const s = fresh();
  delete s.mapRevision;
  const u = s.units[0];
  u.x = 12;
  u.y = 8;
  u.hp = 22;
  u.xp = 80;
  u.potions = 1;
  s.fronts[0].round = 4;
  const loaded = E.decode(JSON.stringify(s));
  assert.equal(loaded.mapRevision, E.MAP_REVISION);
  E.validate(loaded);
  assert.notDeepEqual(
    { x: loaded.units[0].x, y: loaded.units[0].y },
    { x: 12, y: 8 },
  );
  assert.equal(loaded.units[0].hp, 22);
  assert.equal(loaded.units[0].xp, 80);
  assert.equal(loaded.units[0].potions, 1);
  assert.equal(loaded.fronts[0].round, 4);
  const invalid = fresh();
  invalid.units[0].x = 0;
  invalid.units[0].y = 0;
  assert.throws(() => E.decode(JSON.stringify(invalid)));
});

test("traverser un allié, jamais finir sur lui ; ennemis et autres fronts restent bloquants", () => {
  const s = fresh(),
    u = s.units[1],
    friend = s.units[0];
  Object.assign(u, { x: 6, y: 5 });
  Object.assign(friend, { x: 7, y: 5 });
  const route = E.path(s, u, 8, 5)!;
  assert.ok(route);
  assert.equal(route.cost, 2);
  assert.ok(route.steps.includes(E.key(7, 5)));
  assert.equal(E.path(s, u, 7, 5), null);
  assert.equal(E.reachable(s, u).has(E.key(7, 5)), false);
  assert.ok(E.reachable(s, u).has(E.key(8, 5)));
  E.move(s, u, 8, 5);
  assert.equal(friend.x, 7);
  E.validate(s);
  Object.assign(u, { x: 6, y: 5 });
  friend.owner = 2;
  assert.ok(!E.path(s, u, 8, 5)!.steps.includes(E.key(7, 5)));
  s.merged = true;
  assert.ok(E.path(s, u, 8, 5)!.steps.includes(E.key(7, 5)));
  friend.owner = 0;
  assert.ok(!E.path(s, u, 8, 5)!.steps.includes(E.key(7, 5)));
});
