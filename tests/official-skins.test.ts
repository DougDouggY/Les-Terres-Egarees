import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import {
  buildSpriteCatalog,
  profileKey,
  resolveClip,
} from "../src/sprites/catalog";
import { buildCombatSkin } from "../src/sprites/combat-skin-core";
import { resourceRect } from "../src/sprites/geometry";
const dir = "src/assets/tactical/",
  files = readdirSync(dir).sort(),
  read = (f: string) => JSON.parse(readFileSync(dir + f, "utf8"));
const library = buildSpriteCatalog(
  files.filter((f) => f.endsWith(".sprite.json")).map(read),
);
const replacements = new Map(
  files
    .filter((f) => f.endsWith(".combat.json"))
    .flatMap((f) => read(f).profiles)
    .map((p) => [profileKey(p), p]),
);
test("21 apparences évoluées officielles : carte, garde combat et anciens identifiants", () => {
  const entries = read(
    "zzzzzzzzzzzzzzzz-official-advanced.sprite.json",
  ).profiles;
  assert.equal(entries.length, 21);
  assert.deepEqual(library.errors, []);
  for (const entry of entries) {
    const p = library.profiles.find(
      (p) => profileKey(p) === profileKey(entry),
    )!;
    assert.ok(p);
    assert.equal(p.gender, entry.gender);
    const skin = buildCombatSkin(p, replacements.get(profileKey(p)))!.profile;
    const idle = resolveClip(p, "idle")!,
      combat = resolveClip(skin, "idle")!,
      attack = (resolveClip(skin, "attack") ?? resolveClip(skin, "heal"))!;
    assert.equal(idle.source, combat.source);
    assert.ok(idle.source.startsWith("tactical/combat-v4-official-advanced-"));
    assert.ok(existsSync("src/assets/" + idle.source));
    const png = readFileSync("src/assets/" + idle.source),
      layout = read("official-advanced-layouts.json").layouts[idle.source];
    assert.equal(png.readUInt32BE(16), layout.width);
    assert.equal(png.readUInt32BE(20), layout.height);
    assert.equal(idle.columns, 1);
    assert.equal(idle.rows, 1);
    const r = resourceRect(idle, 0)!;
    assert.ok(
      r.x > 0 &&
        r.y > 0 &&
        r.x + r.width < layout.width &&
        r.y + r.height < layout.height,
      "marges transparentes conservées",
    );

    assert.ok(resourceRect(idle, 0));
    assert.equal(
      attack.source.startsWith("tactical/combat-v4-official-advanced-"),
      false,
      "les attaques avancées non terminées restent les précédentes",
    );
    assert.ok(resolveClip(skin, "move"));
    assert.ok(resolveClip(skin, "death"));
    assert.ok(resolveClip(skin, "damage"));
  }
});
test("unités de base : aucune nouvelle planche évoluée ne remplace une animation déjà active", () => {
  for (const p of library.profiles.filter((p) =>
    [
      "raider",
      "north_warrior",
      "nordic_blade",
      "hunter",
      "shaman",
      "man_at_arms",
      "spearman",
      "crossbowman",
      "swordsman",
      "sorcerer",
    ].includes(p.classId),
  )) {
    const skin = buildCombatSkin(p, replacements.get(profileKey(p)))!.profile;
    for (const name of [
      "idle",
      "move",
      resolveClip(skin, "attack") ? "attack" : "heal",
      "evade",
      "damage",
      "death",
    ]) {
      const c = resolveClip(skin, name);
      assert.ok(c, profileKey(p) + ":" + name);
      assert.equal(c!.source.includes("official-advanced"), false);
    }
  }
});
