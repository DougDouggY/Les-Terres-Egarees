import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildV2Timeline,
  sampleV2Timeline,
  type VisualStrike,
} from "../src/ui/combat-v2-timeline";
import {
  buildSpriteCatalog,
  profileKey,
  resolveClip,
} from "../src/sprites/catalog";
import { buildCombatSkin } from "../src/sprites/combat-skin-core";
import { readdirSync, readFileSync } from "node:fs";
const hit = (overrides: Partial<VisualStrike> = {}): VisualStrike => ({
  attacker: "a",
  defender: "b",
  hit: true,
  blocked: false,
  damage: 6,
  hpAfter: 94,
  ...overrides,
});
test("V2 : timings du kit, première frappe620ms et seconde500ms liée avec contact160ms", () => {
  const timeline = buildV2Timeline(
    [hit({ group: 0, weaponIndex: 0 }), hit({ group: 0, weaponIndex: 1 })],
    () => false,
  );
  assert.equal(timeline.duration, 1120);
  assert.equal(timeline.beats[0].at, 359.59999999999997);
  assert.equal(timeline.beats[1].at, 780);
  assert.equal(sampleV2Timeline(timeline, 620)!.travel, 1);
  for (let t = 0; t <= 1120; t += 5) {
    const p = sampleV2Timeline(timeline, t)!;
    assert.ok(p.travel >= 0 && p.travel <= 1, "aucun dépassement au contact");
  }
});
test("V2 : parade regroupe uniquement la riposte déjà autorisée, zéro dégât conservé", () => {
  const strikes = [
    hit({ blocked: true, damage: 0 }),
    hit({ attacker: "b", defender: "a", counter: true, parryCounter: true }),
  ];
  const timeline = buildV2Timeline(strikes, () => false);
  assert.equal(timeline.duration, 1550);
  assert.equal(timeline.beats.length, 2);
  assert.equal(timeline.beats[1].at, 1224.5);
  assert.equal(strikes[0].damage, 0);
  const noCounter = buildV2Timeline([strikes[0]], () => false);
  assert.equal(noCounter.beats.length, 1);
  assert.equal(noCounter.blocks[0].counterIndex, undefined);
});
test("V2 : agilité reste trois activations distinctes, deux armes restent deux blocs", () => {
  const t = buildV2Timeline(
    [
      hit(),
      hit({ attacker: "b", defender: "a", counter: true }),
      hit({ followUp: true }),
    ],
    () => false,
  );
  assert.equal(t.duration, 3750);
  assert.equal(t.blocks.length, 3);
  const four = buildV2Timeline(
    [
      hit({ group: 0, weaponIndex: 0 }),
      hit({ group: 0, weaponIndex: 1 }),
      hit({ group: 1, weaponIndex: 0 }),
      hit({ group: 1, weaponIndex: 1 }),
    ],
    () => false,
  );
  assert.equal(four.duration, 2240);
  assert.equal(four.beats.length, 4);
});
test("V2 : tir sans approche et événements conservés sans nouveaux résultats", () => {
  const input = [hit({ blocked: true, damage: 0 })],
    before = JSON.stringify(input),
    t = buildV2Timeline(input, () => true);
  assert.equal(t.duration, 1600);
  for (let x = 0; x < 1600; x += 10)
    assert.equal(sampleV2Timeline(t, x)!.travel, 0);
  assert.equal(JSON.stringify(input), before);
  assert.deepEqual(
    t.beats.map((b) => b.index),
    [0],
  );
});
test("tous les skins : identité stable, repos/attaque de même atlas, aucune pose pixel générique", () => {
  const dir = "src/assets/tactical/",
    files = readdirSync(dir).sort();
  const profiles = buildSpriteCatalog(
    files
      .filter((f) => f.endsWith(".sprite.json"))
      .map((f) => JSON.parse(readFileSync(dir + f, "utf8"))),
  ).profiles;
  const replacements = new Map(
    files
      .filter((f) => f.endsWith(".combat.json"))
      .flatMap((f) => JSON.parse(readFileSync(dir + f, "utf8")).profiles)
      .map((p) => [profileKey(p), p]),
  );
  assert.equal(profiles.length, 55);
  for (const p of profiles) {
    const skin = buildCombatSkin(p, replacements.get(profileKey(p)))!;
    assert.equal(skin.id, profileKey(p));
    const idle = resolveClip(skin.profile, "idle"),
      attack = resolveClip(skin.profile, "attack");
    if (idle && attack) assert.equal(idle.source, attack.source, skin.id);
    for (const n of Object.keys(skin.profile.clips))
      assert.notEqual(
        resolveClip(skin.profile, n)?.source,
        "assets/sprites.png",
      );
    if (skin.profile.equipment.includes("dual"))
      assert.ok(resolveClip(skin.profile, "attack_offhand"));
  }
});

test("riposte : maintien au contact après l’impact, puis seulement le recul", () => {
  const t = buildV2Timeline(
    [
      hit({ blocked: true, damage: 0 }),
      hit({ attacker: "b", defender: "a", counter: true, parryCounter: true }),
    ],
    () => false,
  );
  const contact = t.beats[1].at;
  assert.equal(sampleV2Timeline(t, contact)!.travel, 1);
  assert.equal(sampleV2Timeline(t, contact + 90)!.travel, 1);
  assert.ok(sampleV2Timeline(t, 1450)!.travel < 1);
});
test("arbalète : recharge visuelle après les événements sans frappe supplémentaire", () => {
  const t = buildV2Timeline(
    [hit()],
    () => true,
    () => true,
  );
  assert.equal(t.duration, 1770);
  assert.equal(t.beats.length, 1);
  assert.equal(t.beats[0].at, 725);
  assert.equal(sampleV2Timeline(t, 1300)!.p, 1);
  assert.ok(sampleV2Timeline(t, 1400)!.reloadPhase! > 0);
});

test('Porte-étendard : taille anatomique mesurée sous la pointe de la bannière',()=>{
 const layouts=JSON.parse(readFileSync('src/assets/tactical/atlas-layout.json','utf8'));
 for(const [source,row]of [['tactical/combat-v3-equipment.png',0],['tactical/combat-v3-motion2.png',1]] as const){
  const guard=layouts[source].frames.find((f:any)=>f.row===row&&f.column===0);
  assert.ok(guard.bodyHeight<guard.height*.8,'la hampe ne mesure pas la taille du personnage');
  assert.ok(guard.bodyHeight>guard.height*.6,'le corps entier reste pris en compte');
 }
});
