import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import {
  buildSpriteCatalog,
  profileKey,
  resolveClip,
} from "../src/sprites/catalog";
import { buildCombatSkin } from "../src/sprites/combat-skin-core";
import { profileMetrics, resourceRect } from "../src/sprites/geometry";
import { capabilityFixture } from "../src/dev/capability-fixture";
import {
  toggleCompanion,
  companionRoster,
  validateCompanions,
} from "../src/data/companions";
import {
  colorForOwner,
  normalizeTeamColors,
  defaultTeamColors,
} from "../src/game/team-colors";
import * as E from "../src/engine";
const dir = "src/assets/tactical/",
  files = readdirSync(dir).sort(),
  json = (f: string) => JSON.parse(readFileSync(dir + f, "utf8"));
const catalog = buildSpriteCatalog(
  files.filter((f) => f.endsWith(".sprite.json")).map(json),
);
const replacements = new Map(
  files
    .filter((f) => f.endsWith(".combat.json"))
    .flatMap((f) => json(f).profiles)
    .map((p) => [profileKey(p), p]),
);
test("89 profils : registre sans collision, ressources et cellules accessibles, échelle unique par source", () => {
  assert.deepEqual(catalog.errors, []);
  assert.equal(catalog.profiles.length, 89);
  for (const p of catalog.profiles) {
    const skin = buildCombatSkin(p, replacements.get(profileKey(p)))!,
      refs = profileMetrics(skin.profile).references;
    for (const name of Object.keys(skin.profile.clips)) {
      const c = resolveClip(skin.profile, name)!;
      assert.ok(existsSync("src/assets/" + c.source), skin.id + ":" + c.source);
      assert.ok(refs.get(c.source)! > 0);
      for (let i = 0; i < c.frames.length; i++)
        assert.ok(resourceRect(c, i), `${skin.id}:${name}:${i}`);
    }
  }
});
test("toutes les variantes féminines jouables et les chasseurs masculins possèdent leurs propres poses", () => {
  const old = json("zz-v3.combat.json").profiles;
  for (const p of old) {
    if (p.gender !== "male") continue;
    assert.ok(
      catalog.profiles.some(
        (q) =>
          q.classId === p.classId &&
          q.gender === "female" &&
          q.equipment === p.equipment &&
          q.state === p.state,
      ),
      profileKey(p),
    );
  }
  for (const cls of ["shaman", "sorcerer", "hunter", "master_hunter"])
    for (const gender of ["male", "female"])
      assert.ok(
        catalog.profiles.some((p) => p.classId === cls && p.gender === gender),
      );
});
test("toutes les capacités : vraies opérations du moteur, variantes masculines et féminines", () => {
  let checks = 0;
  for (const p of catalog.profiles) {
    const c = E.classes[p.classId];
    if (!c) continue;
    const actions = c.skills.filter((s) =>
      [
        "heal",
        "bandage",
        "transform",
        "fortify",
        "summon",
        "buff",
        "banner",
      ].includes(s),
    );
    for (const action of actions) {
      if (action === "area" && p.equipment !== "spell") continue;
      if (
        (p.state === "bear" && action === "heal") ||
        (p.state === "planted" && action === "banner")
      )
        continue;
      const f = capabilityFixture(p, action);
      checks++;
      if (action === "heal" || action === "bandage") {
        assert.ok(f.details.restored > 0, profileKey(p));
        assert.equal(f.targetAfter.hp - f.targetBefore.hp, f.details.restored);
        if (action === "bandage")
          assert.equal(f.details.restored, E.rules.bandageHeal);
      }
      if (action === "transform")
        assert.equal(f.after.bearForm, p.state !== "bear");
      if (action === "fortify") {
        assert.equal(f.after.fortified, true);
        assert.ok(f.details.protectedDamage <= f.details.normalDamage);
        const moved = capabilityFixture(p, "fortify-move");
        assert.equal(moved.details.afterMove, false);
      }
      if (action === "summon") assert.ok(f.details.summoned);
    }
  }
  assert.ok(checks >= 30, String(checks));
});
test("compagnons FIFO, limites de faction, aucun Sorcier compagnon initial", () => {
  for (const faction of ["north", "knight"] as const) {
    const ids = companionRoster
      .filter((c) => c.faction === faction)
      .map((c) => c.id);
    let selected: string[] = [];
    for (const id of ids)
      selected = toggleCompanion(faction, selected, id, true);
    assert.deepEqual(selected, ids.slice(faction === "north" ? -2 : -1));
    validateCompanions(faction, selected);
  }
  assert.ok(
    companionRoster
      .filter((c) => c.faction === "knight")
      .every((c) => c.classId !== "sorcerer"),
  );
});
test("couleurs : ennemis invariants même dans une sauvegarde recolorée", () => {
  const c = {
    ...defaultTeamColors,
    player1: "green" as const,
    enemies: "blue" as const,
  };
  assert.equal(colorForOwner(c, 0), "pink");
  assert.equal(colorForOwner(c, 1), "green");
  assert.equal(normalizeTeamColors(c).enemies, "pink");
});
test("ours et Brise-fer : clips V3 validés conservés intégralement", () => {
  const old = json("zz-v3.combat.json").profiles,
    now = json("zz-v4.combat.json").profiles;
  for (const p of old.filter(
    (p: any) => p.state === "bear" || p.classId === "ironbreaker",
  ))
    assert.deepEqual(
      now.find((q: any) => profileKey(q) === profileKey(p)).clips,
      p.clips,
    );
});
test("Lancier monté : le changement d’atlas offensif conserve ses trois poses de galop", () => {
  const p = catalog.profiles.find((p) => p.classId === "mounted_spearman")!;
  const skin = buildCombatSkin(p, replacements.get(profileKey(p)))!;
  assert.equal(
    resolveClip(skin.profile, "move")!.source,
    "tactical/combat-v3-mounted.png",
  );
  assert.equal(resolveClip(skin.profile, "move")!.frames.length, 3);
});
test("forme animale commune : retour humain sans emprunter un personnage masculin", () => {
  const p = catalog.profiles.find((p) => p.state === "bear")!;
  const skin = buildCombatSkin(p, replacements.get(profileKey(p)))!;
  assert.equal(
    resolveClip(p, "transform")!.source,
    resolveClip(p, "idle")!.source,
  );
  assert.equal(
    resolveClip(skin.profile, "transform")!.source,
    resolveClip(skin.profile, "idle")!.source,
  );
  assert.equal(resolveClip(skin.profile, "transform")!.status, "provisional");
  const human = catalog.profiles.find(
    (p) =>
      p.classId === "hamrammr" &&
      p.gender === "female" &&
      p.state === "default",
  )!;
  const f = capabilityFixture(human, "transform");
  assert.equal(f.after.gender, "female");
  assert.equal(f.after.bearForm, true);
});
test("zone de l’Archimage et charge montée : résultats réellement calculés pour tous les skins concernés", () => {
  for (const p of catalog.profiles.filter(
    (p) =>
      (p.classId === "archmage" && p.equipment === "spell") ||
      p.classId === "mounted_spearman",
  )) {
    const action = p.classId === "archmage" ? "area" : "charge",
      f = capabilityFixture(p, action);
    assert.ok(f.strikes && f.strikes.length > 0, profileKey(p));
    assert.equal(f.details.events, f.strikes!.length);
    assert.equal(
      f.strikes!.filter((h) => h.defender === f.targetBefore.id).at(-1)!
        .hpAfter,
      f.targetAfter.hp,
    );
    if (action === "charge") {
      assert.equal(f.details.charge, E.rules.chargeDamage);
      assert.ok(f.details.movedDistance >= E.rules.chargeSteps);
    }
  }
});
