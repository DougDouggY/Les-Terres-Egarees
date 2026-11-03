import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import * as E from "../src/engine";
import {
  buildSpriteCatalog,
  findProfile,
  resolveClip,
} from "../src/sprites/catalog";
const fresh = () => E.createCampaign(["north", "knight"]);
function unit(
  s: E.Campaign,
  id: string,
  cls: string,
  owner: 0 | 1 | 2 = 1,
  x = 30,
  y = 25,
) {
  const u = E.makeClassUnit(id, owner, owner === 2 ? 2 : 1, cls, id, x, y);
  s.units.push(u);
  return u;
}
function activate(s: E.Campaign, u: E.Unit) {
  s.phase = "battle";
  s.scene = null;
  s.active = u.owner as 1 | 2;
  s.fronts[u.owner - 1] = { round: 1, queue: [u.id], index: 0 };
  if (s.merged) s.common = { round: 1, queue: [u.id], index: 0 };
}
test("la base visuelle validée reste strictement identique", async () => {
  const expected = JSON.parse(
    await readFile("docs/baselines/validated-map.json", "utf8"),
  );
  for (const [file, hash] of Object.entries(expected))
    assert.equal(
      createHash("sha256")
        .update(await readFile(file))
        .digest("hex"),
      hash,
      file,
    );
  assert.equal(E.W, 60);
  assert.equal(E.H, 40);
});
test("catalogue exact, trois voies du Lancier, Chaman non inventé, recrues exclues", () => {
  assert.equal(Object.keys(E.classes).length, 32);
  assert.equal(E.baseClasses("north").length, 5);
  assert.equal(E.baseClasses("knight").length, 5);
  assert.equal(E.classes.spearman.promotions.length, 3);
  assert.deepEqual(E.classes.shaman.promotions, []);
  assert.equal(E.classes.shaman.pendingPromotions, 2);
  assert.ok(E.baseClasses("north").every((c) => c.stage === "base"));
  assert.ok(E.baseClasses("knight").every((c) => c.stage === "base"));
  for (const c of Object.values(E.classes))
    for (const id of c.promotions) {
      assert.equal(E.classes[id].stage, "advanced");
      assert.equal(E.classes[id].faction, c.faction);
    }
});
test("héros indépendants : factions, sexe, nom et classe ; classes illégales refusées", () => {
  for (const a of ["north", "knight"] as const)
    for (const b of ["north", "knight"] as const) {
      const heroes: [E.HeroConfig, E.HeroConfig] = [
        {
          faction: a,
          name: "Héros A",
          gender: "female",
          classId: E.baseClasses(a)[0].id,
        },
        {
          faction: b,
          name: "Héros B",
          gender: "male",
          classId: E.baseClasses(b)[0].id,
        },
      ];
      const s = E.createCampaign([a, b], heroes);
      assert.equal(s.units[0].name, "Héros A");
      assert.equal(s.units[0].gender, "female");
      assert.equal(s.units[2].classId, heroes[1].classId);
      E.validate(s);
    }
  assert.throws(() =>
    E.createCampaign(
      ["north", "knight"],
      [
        { faction: "north", name: "x", gender: "male", classId: "berserker" },
        { faction: "knight", name: "y", gender: "male", classId: "squire" },
      ],
    ),
  );
});
test("promotions à 20 et recrues à 10, niveau 1 et capacités immédiates", () => {
  const s = fresh(),
    u = unit(s, "promotion", "spearman");
  u.level = 19;
  u.xp = 99;
  E.applyXp(s, {
    strikes: [],
    xp: [{ id: u.id, amount: 1, level: true, before: 99 }],
  });
  assert.equal(u.level, 20);
  assert.equal(E.promotionOptions(u).length, 3);
  E.applyXp(s, {
    strikes: [],
    xp: [{ id: u.id, amount: 500, level: true, before: 0 }],
  });
  assert.equal(u.level, 20);
  E.promote(s, u, "standard_bearer");
  assert.equal(u.level, 1);
  assert.equal(u.xp, 0);
  assert.ok(E.hasSkill(u, "banner"));
  assert.throws(() => E.promote(s, u, "royal_guard"));
  assert.throws(() =>
    E.makeClassUnit("r", 1, 1, "young_viking", "recrue", 30, 25),
  );
  const r = E.makeClassUnit(
    "r",
    1,
    1,
    "young_viking",
    "recrue",
    30,
    25,
    "female",
    ["raider", "hunter"],
  );
  s.units.push(r);
  r.level = 10;
  assert.deepEqual(E.promotionOptions(r), ["raider", "hunter"]);
  E.promote(s, r, "hunter");
  assert.equal(r.level, 1);
  assert.equal(E.className(r), "Chasseur");
});
test("raretés des recrues et équipement transporté, aucune riposte avec une autre arme", () => {
  const s = fresh(),
    u = unit(s, "tracker", "tracker");
  activate(s, u);
  E.equipWeapon(s, u, "axe");
  assert.equal(u.range, 1);
  const enemy = unit(s, "e", "skeleton", 0, 32, 25);
  assert.equal(E.canAttack(u, enemy), false);
  assert.equal(E.activeWeapon(u).id, "axe");
  E.equipWeapon(s, u, "bow");
  assert.equal(u.range, 2);
  assert.equal(E.canAttack(u, { ...enemy, x: 31 }), false);
  assert.ok(E.canAttack(u, enemy));
  assert.throws(() => E.equipWeapon(s, u, "crossbow"));
  const r = E.makeClassUnit("r", 1, 1, "squire", "test", 30, 25, "male", [
    "man_at_arms",
    "spearman",
  ]);
  const original = E.weaponCatalog.sword.rarity;
  try {
    E.weaponCatalog.sword.rarity = "rare";
    assert.equal(E.compatibleWeapon(r, "sword"), false);
    E.weaponCatalog.sword.rarity = "legendary";
    assert.equal(E.compatibleWeapon(r, "sword"), false);
  } finally {
    E.weaponCatalog.sword.rarity = original;
  }
  const h = unit(s, "h", "master_hunter");
  assert.equal(h.minRange, 2);
  assert.equal(h.range, 3);
});
test("deux armes : quatre frappes possibles avec précision indépendante", () => {
  let independent = false;
  for (let seed = 0; seed < 20; seed++) {
    const s = fresh(),
      a = unit(s, "a", "berserker", 1, 30, 25),
      b = unit(s, "b", "skeleton", 0, 31, 25);
    a.agility = 20;
    a.accuracy = 60;
    b.hp = b.maxHp = 1000;
    a.hp = 1000;
    s.seed = seed;
    const battle = E.resolve(s, a, b),
      attacks = battle.strikes.filter((x) => x.attacker === a.id);
    assert.equal(attacks.length, 4);
    if (new Set(attacks.map((x) => x.hit)).size === 2) independent = true;
  }
  assert.ok(independent);
});
test("triangles, efficacités et pénétration utilisent les données de test", () => {
  const s = fresh(),
    sword = unit(s, "s", "swordsman"),
    axe = unit(s, "a", "north_warrior", 0, 31, 25),
    lance = unit(s, "l", "spearman", 0, 31, 25),
    bow = unit(s, "b", "hunter"),
    cross = unit(s, "c", "crossbowman", 0, 32, 25),
    mage = unit(s, "m", "sorcerer");
  assert.equal(E.triangle(sword, axe), 1);
  assert.equal(E.triangle(axe, lance), 1);
  assert.equal(E.triangle(lance, sword), 1);
  assert.equal(E.triangle(bow, cross), 1);
  assert.equal(E.triangle(cross, mage), 1);
  assert.equal(E.triangle(mage, bow), 1);
  const mounted = unit(s, "horse", "cavalry", 0, 31, 25);
  assert.equal(E.forecast(lance, mounted).effective, true);
  const iron = unit(s, "iron", "ironbreaker");
  assert.equal(
    E.forecast(iron, unit(s, "armor", "royal_guard", 0, 31, 25)).pierce,
    E.tuning.pierce,
  );
});
test("bannière : une pose, épée obligatoire ensuite, soutien à cinq cases", () => {
  const s = fresh(),
    u = unit(s, "banner", "standard_bearer");
  activate(s, u);
  assert.equal(E.visualState(u), "carried");
  E.plantBanner(s, u);
  assert.equal(E.visualState(u), "planted");
  assert.equal(E.activeWeapon(u).category, "sword");
  assert.throws(() => E.plantBanner(s, u));
  assert.throws(() => E.equipWeapon(s, u, "banner_lance"));
  const a = unit(s, "friend", "swordsman", 1, 35, 25),
    b = unit(s, "foe", "skeleton", 0, 36, 25);
  b.strength = 30;
  assert.ok(E.forecast(b, a, s).damage < E.forecast(b, a).damage);
  a.x = 36;
  b.x = 37;
  assert.equal(E.forecast(b, a, s).damage, E.forecast(b, a).damage);
});
test("pavois : protection personnelle à distance, tir/recharge conservés, mouvement annule", () => {
  const s = fresh(),
    u = unit(s, "pavise", "pavise_crossbowman"),
    a = unit(s, "archer", "hunter", 0, 32, 25),
    ally = unit(s, "ally", "swordsman", 1, 30, 26);
  activate(s, u);
  const normal = E.forecast(a, u, s).damage;
  E.fortify(s, u);
  assert.ok(E.forecast(a, u, s).damage < normal);
  assert.equal(E.forecast(a, ally, s).damage, E.forecast(a, ally).damage);
  E.resolve(s, u, a);
  assert.equal(u.fortified, true);
  assert.equal(u.crossbowLoaded, false);
  E.reloadWeapon(s, u);
  assert.equal(u.fortified, true);
  E.move(s, u, 29, 25);
  assert.equal(u.fortified, false);
});
test("Huscarl intercepte un allié adjacent, le pavois ne le fait pas", () => {
  const s = fresh(),
    a = unit(s, "a", "hunter", 0, 30, 20),
    b = unit(s, "b", "swordsman", 1, 32, 20),
    h = unit(s, "h", "huscarl", 1, 32, 21);
  const battle = E.resolve(s, a, b);
  assert.equal(battle.strikes[0].defender, h.id);
  assert.equal(battle.strikes[0].interceptedFor, b.id);
  h.hp = 0;
  unit(s, "p", "pavise_crossbowman", 1, 32, 21);
  const next = E.resolve(s, a, b);
  assert.equal(next.strikes[0].defender, b.id);
});
test("soins exclusivement pour Chaman, bandages non magiques et cibles alliées", () => {
  const s = fresh(),
    h = unit(s, "h", "shaman"),
    t = unit(s, "t", "raider", 1, 31, 25);
  t.hp = 5;
  activate(s, h);
  assert.equal(E.canAttack(h, t), false);
  assert.ok(E.canHealTarget(s, h, t));
  E.healTarget(s, h, t);
  assert.equal(t.hp, 17);
  const healer = unit(s, "clan", "clan_healer", 1, 31, 26);
  activate(s, healer);
  const n = healer.bandages!;
  E.healTarget(s, healer, t);
  assert.equal(healer.bandages, n - 1);
  assert.notEqual(E.activeWeapon(healer).category, "healing");
});
test("invocations limitées, temporaires même sans invocateur, et zone ennemie seule", () => {
  const s = fresh(),
    n = unit(s, "n", "necromancer");
  activate(s, n);
  const a = E.summon(s, n, 29, 25),
    b = E.summon(s, n, 30, 24);
  assert.throws(() => E.summon(s, n, 31, 25));
  n.hp = 0;
  for (let i = 0; i < E.tuning.summon.turns; i++) {
    activate(s, a);
    E.finishActivationSkills(s);
  }
  assert.equal(a.hp, 0);
  assert.ok(b.hp > 0);
  const m = unit(s, "mage", "archmage", 1, 30, 27),
    e = unit(s, "enemy", "skeleton", 0, 31, 27),
    friend = unit(s, "friend", "raider", 1, 31, 28);
  activate(s, m);
  const battle = E.resolveArea(s, m, e);
  assert.ok(battle.strikes.some((x) => x.defender === e.id));
  assert.ok(!battle.strikes.some((x) => x.defender === friend.id));
});
test("mobilité forestière, découverte progressive et migration du camp archivé", () => {
  const s = fresh(),
    u = unit(s, "ranger", "ranger", 1, 35, 12);
  const path = E.path(s, u, 35, 13)!;
  assert.equal(E.cell(35, 13)!.cost, 3);
  assert.equal(path.cost, 1);
  assert.ok(!E.discoveries(s).classes.includes("archmage"));
  assert.ok(!E.discoveries(s).skills.includes("area"));
  s.phase = "camp";
  s.camp = {
    levels: { infirmary: 1, workshop: 0, palisade: 0 },
    completed: ["herbs"],
    active: null,
    weaponsImproved: false,
  };
  const loaded = E.decode(JSON.stringify(s));
  assert.equal(loaded.phase, "summary");
  assert.deepEqual(loaded.camp, s.camp);
});
test("sprites réels et mutualisés : variantes exactes, frames valides et absence de remplacement", async () => {
  const data = JSON.parse(
      await readFile("src/assets/tactical/legacy.sprite.json", "utf8"),
    ),
    catalog = buildSpriteCatalog([data]);
  assert.equal(catalog.errors.length, 0);
  assert.equal(catalog.profiles.length, 5);
  const p = findProfile(
    catalog.profiles,
    "raider",
    "male",
    "axe-shield",
    "default",
  )!;
  assert.equal(resolveClip(p, "idle")!.source, "assets/sprites.png");
  assert.equal(resolveClip(p, "counter"), resolveClip(p, "attack"));
  assert.equal(
    findProfile(catalog.profiles, "raider", "female", "axe-shield", "default"),
    undefined,
  );
  assert.equal(
    findProfile(catalog.profiles, "berserker", "male", "dual-axes", "default"),
    undefined,
  );
  for (const p of catalog.profiles)
    for (const name of Object.keys(p.clips)) {
      const clip = resolveClip(p, name)!;
      const img = await readFile("public/" + clip.source);
      assert.equal(img.readUInt32BE(16) % clip.columns, 0);
      assert.equal(img.readUInt32BE(20) % clip.rows, 0);
    }
  const extended = buildSpriteCatalog([
    data,
    {
      profiles: [
        {
          ...p,
          clips: { new_animation: { ...resolveClip(p, "idle")!, frames: [1] } },
        },
      ],
    },
  ]);
  assert.ok(
    resolveClip(
      findProfile(extended.profiles, "raider", "male", "axe-shield", "default"),
      "new_animation",
    ),
  );
});

test("soins : progression du Chaman et révélation des faiblesses après observation", () => {
  const s = E.createCampaign(["north", "knight"]);
  const u = s.units[1];
  E.assignClass(u, "shaman");
  u.xp = 90;
  const t = s.units[0];
  t.x = u.x + 1;
  t.y = u.y;
  t.hp -= 10;
  E.healTarget(s, u, t);
  assert.equal(u.level, 2);
  assert.equal(u.xp, 15);
  E.assignClass(u, "spearman");
  const enemy = s.units.find((t) => t.owner === 0)!;
  E.assignClass(enemy, "cavalry");
  enemy.x = u.x + 1;
  enemy.y = u.y;
  enemy.hp = 100;
  E.resolve(s, u, enemy);
  assert.ok(E.discoveries(s).weaknesses?.includes("lance:cavalry"));
});
