import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import * as E from "../src/engine";
import { createSandbox, trainingUnit } from "../src/game/sandbox";
import {
  globalInitiative,
  insertInitiative,
  stepInitiative,
  initiativeOrder,
} from "../src/game/initiative";
import {
  buildSpriteCatalog,
  resolveClip,
  profileKey,
  damageFrame,
} from "../src/sprites/catalog";
import { buildCombatSkin } from "../src/sprites/combat-skin-core";
import { xpSegments } from "../src/ui/value-animation";
const folder = "src/assets/tactical/",
  files = fs.readdirSync(folder).sort(),
  read = (f: string) => JSON.parse(fs.readFileSync(folder + f, "utf8")),
  catalog = buildSpriteCatalog(
    files.filter((f) => f.endsWith(".sprite.json")).map(read),
  ).profiles,
  replacements = new Map(
    files
      .filter((f) => f.endsWith(".combat.json"))
      .flatMap((f) => read(f).profiles)
      .map((p) => [profileKey(p), p]),
  );
test("V5 vraie séquence : parade → riposte immédiate → réponse normale → seconde activation agile", () => {
  let found = false;
  for (let seed = 1; seed < 2000 && !found; seed++) {
    const s = createSandbox(seed),
      a = trainingUnit(s, "man_at_arms"),
      b = trainingUnit(s, "raider", 1, 1, 0);
    b.x = a.x + 1;
    a.hp = b.hp = a.maxHp = b.maxHp = 1000;
    a.accuracy = b.accuracy = 100;
    a.agility = b.agility + 4;
    a.parryPoints = 0;
    const r = E.resolve(s, a, b);
    if (!r.strikes[0].blocked || r.strikes[0].critical) continue;
    found = true;
    assert.equal(r.strikes[0].damage, 0);
    assert.equal(r.strikes[1].attacker, b.id);
    assert.equal(r.strikes[1].parryCounter, true);
    const normal = r.strikes.findIndex(
      (h, i) => i > 1 && h.attacker === b.id && !h.parryCounter,
    );
    assert.ok(normal > 1);
    assert.ok(
      r.strikes.findIndex((h) => h.attacker === a.id && h.followUp) > normal,
    );
    assert.ok(r.strikes.length <= 8, "aucune récursion de parades");
  }
  assert.ok(found);
});
test("V5 initiative : niveau et arrivée ne reclassent pas les unités restantes, cycle suivant recalculé", () => {
  const s = createSandbox(),
    a = trainingUnit(s, "man_at_arms"),
    b = trainingUnit(s, "sorcerer", 1, 1, 2),
    c = trainingUnit(s, "raider", 1, 1, 0);
  a.initiative = 9;
  b.initiative = 7;
  c.initiative = 5;
  s.common = { round: 1, index: 0, queue: [a.id, b.id, c.id] };
  const old = [...s.common.queue];
  c.initiative = 20;
  assert.deepEqual(globalInitiative(s).queue, old);
  const n = trainingUnit(s, "skeleton", 1, 1, 0);
  n.initiative = 8;
  s.common.queue = s.common.queue.filter((id) => id !== n.id);
  insertInitiative(s, [n.id]);
  assert.ok(s.common.queue.indexOf(b.id) < s.common.queue.indexOf(c.id));
  while (s.common.round === 1) stepInitiative(s);
  assert.deepEqual(s.common.queue, initiativeOrder(s.units));
  assert.equal(s.common.queue[0], c.id);
  const tied = s.units.map((u) => ({ ...u, initiative: 6 }));
  assert.deepEqual(initiativeOrder(tied), tied.map((u) => u.id).sort());
});
test("V5 blessures : les 89 profils utilisent un dessin distinct de leur garde, pas une translation", () => {
  assert.equal(catalog.length, 89);
  const cell = (c: any, i: number) =>
    [
      c.source,
      c.cells?.[i]?.row ?? c.row,
      c.cells?.[i]?.column ?? c.frames[i],
    ].join(":");
  for (const p of catalog) {
    const skin = buildCombatSkin(p, replacements.get(profileKey(p)))!,
      i = resolveClip(skin.profile, "idle")!,
      d = resolveClip(skin.profile, "damage")!;
    assert.ok(d, skin.id);
    assert.notEqual(cell(d, damageFrame(d)), cell(i, 0), skin.id);
  }
});
test("V5 XP : atteint 100, affiche le niveau suivant, puis le reliquat", () => {
  assert.deepEqual(
    xpSegments({ before: 90, after: 15, levelBefore: 1, levelAfter: 2 }),
    [
      { from: 90, to: 100, level: 1 },
      { from: 0, to: 15, level: 2 },
    ],
  );
  assert.deepEqual(
    xpSegments({ before: 30, after: 50, levelBefore: 1, levelAfter: 1 }),
    [{ from: 30, to: 50, level: 1 }],
  );
});
test("V5 soins réels : XP, montée de niveau, auto-bandages autorisés et aucun XP dans le vide", () => {
  for (const cls of ["shaman", "sorcerer", "clan_healer"])
    for (const gender of ["male", "female"] as const) {
      const s = createSandbox(),
        a = trainingUnit(s, cls),
        b = trainingUnit(s, "man_at_arms");
      a.gender = gender;
      b.x = a.x + 1;
      b.hp = b.maxHp - 10;
      a.xp = 95;
      const focus = a.carriedWeapons?.find(
        (id) => E.weaponCatalog[id].category === "healing",
      );
      if (focus) E.equipWeapon(s, a, focus);
      assert.ok(E.healTarget(s, a, b) > 0);
      assert.equal(a.level, 2);
      assert.equal(a.xp, 95 + E.tuning.healingXp - 100);
      b.hp = b.maxHp;
      const xp = a.xp;
      assert.throws(() => E.healTarget(s, a, b));
      assert.equal(a.xp, xp);
      if (cls === "clan_healer") {
        a.hp = a.maxHp - 3;
        assert.equal(E.healTarget(s, a, a), 3);
      } else assert.equal(E.canHealTarget(s, a, a), false);
    }
});
test("V5 Traqueur : arc à distance, hache adjacente et armes transportées conservées", () => {
  for (const gender of ["male", "female"] as const) {
    const s = createSandbox(),
      a = trainingUnit(s, "tracker"),
      b = trainingUnit(s, "raider", 1, 1, 0);
    a.gender = gender;
    b.x = a.x + 1;
    assert.equal(E.canAttack(a, b), false);
    E.equipWeapon(s, a, "axe");
    assert.equal(E.canAttack(a, b), true);
    b.x = a.x + 2;
    assert.equal(E.canAttack(a, b), false);
    E.equipWeapon(s, a, "bow");
    assert.equal(E.canAttack(a, b), true);
  }
});

test("V5 montée de niveau réelle pendant le cycle : la queue reste gelée", () => {
  let checked = false;
  for (let seed = 1; seed < 100 && !checked; seed++) {
    const s = createSandbox(seed),
      a = trainingUnit(s, "man_at_arms"),
      b = trainingUnit(s, "sorcerer", 1, 1, 2);
    a.xp = 99;
    const before = [...s.common.queue],
      init = a.initiative;
    E.applyXp(s, {
      strikes: [],
      xp: [{ id: a.id, amount: 25, before: a.xp, level: true }],
    });
    if (a.initiative === init) continue;
    checked = true;
    assert.equal(a.level, 2);
    assert.deepEqual(globalInitiative(s).queue, before);
    stepInitiative(s);
    stepInitiative(s);
    assert.deepEqual(s.common.queue, initiativeOrder([a, b]));
  }
  assert.ok(checked);
});
test("V5 animations approuvées : ours, Berserker et Brise-fer inchangés", () => {
  const previous = read("zz-v4.combat.json").profiles;
  for (const p of previous.filter(
    (p: any) =>
      p.state === "bear" || ["berserker", "ironbreaker"].includes(p.classId),
  )) {
    const n = replacements.get(profileKey(p))!;
    for (const name of ["move", "attack", "attack_again", "attack_offhand"])
      assert.deepEqual(
        n.clips[name],
        p.clips[name],
        profileKey(p) + ":" + name,
      );
  }
});

test("V5 revue des boucliers : vraie pose de choc distincte de la garde et de la parade", () => {
  for (const p of replacements.values()) {
    const d = resolveClip(p, "damage");
    if (
      !d ||
      ![
        "tactical/combat-v2-shields-a.png",
        "tactical/combat-v2-shields-b.png",
      ].includes(d.source!)
    )
      continue;
    assert.equal(d.frames[damageFrame(d)], 5, profileKey(p));
    const b = resolveClip(p, "block")!;
    assert.ok(!b.frames.includes(5), profileKey(p));
  }
  for (const p of replacements.values())
    if (p.classId === "archmage" && p.gender === "male") {
      assert.equal(
        resolveClip(p, "heal")!.source,
        "tactical/complete-lot3-mages.png",
      );
    }
});
test("V10 Sorcière : indisponible pour le héros initial, classe conservée pour le recrutement ultérieur", () => {
  assert.throws(
    () =>
      E.createCampaign(
        ["knight", "north"],
        [
          {
            faction: "knight",
            name: "Iseult",
            gender: "female",
            classId: "sorcerer",
          },
          {
            faction: "north",
            name: "Eirik",
            gender: "male",
            classId: "raider",
          },
        ],
        [["gaspard"], ["astrid", "solveig"]],
      ),
    /Héros invalide/,
  );
  const unit = E.makeClassUnit(
    "later",
    2,
    2,
    "sorcerer",
    "Iseult",
    30,
    20,
    "female",
  );
  assert.equal(unit.classId, "sorcerer");
});
