import { test } from "node:test";
import assert from "node:assert/strict";
import * as E from "../src/engine";
const refuge = () => {
  const s = E.createCampaign(["north", "knight"]);
  s.phase = "camp";
  s.scene = null;
  return s;
};
function mission(s: E.Campaign, id: string, choice?: string) {
  E.beginCampMission(s, id);
  E.exploreCampMission(s);
  const m = E.campMissions.find((m) => m.id === id)!;
  E.resolveCampMission(s, choice ?? m.choices[0].id);
  E.returnToCamp(s);
}
test("forêt dense traversable : coût 3, défense 3 et déplacement légal", () => {
  const s = E.createCampaign(["north", "knight"]),
    u = s.units[1];
  Object.assign(u, { x: 35, y: 12 });
  const c = E.cell(35, 13)!;
  assert.equal(c.terrain, "tree");
  assert.equal(c.walk, true);
  assert.equal(c.cost, 3);
  assert.equal(c.defense, 3);
  const p = E.path(s, u, 35, 13)!;
  assert.equal(p.cost, 3);
  E.move(s, u, 35, 13);
  E.validate(s);
});
test("raccourci de test localisé : refus au départ, fin normale près des ruines sans XP artificielle", () => {
  const s = E.createCampaign(["north", "knight"]);
  s.phase = "battle";
  s.scene = null;
  assert.equal(E.canFinishBattleForTest(s), false);
  assert.throws(() => E.finishBattleForTest(s));
  Object.assign(s.units[1], { x: 31, y: 20 });
  const xp = s.units.filter((u) => u.owner !== 0).map((u) => u.xp);
  assert.equal(E.canFinishBattleForTest(s), true);
  E.finishBattleForTest(s);
  assert.equal(s.scene, "ending");
  assert.ok(s.events.includes("battle-finished-test"));
  assert.ok(s.events.includes("victory"));
  assert.equal(E.alive(s).filter((u) => u.owner === 0).length, 0);
  assert.deepEqual(
    s.units.filter((u) => u.owner !== 0).map((u) => u.xp),
    xp,
  );
});
test("choisir une mission répare uniquement le bâtiment correspondant ; pas de double récompense", () => {
  const s = refuge();
  assert.equal(E.availableCampMissions(s).length, 3);
  assert.throws(() => E.beginCampMission(s, "forge"));
  E.beginCampMission(s, "herbs");
  assert.throws(() => E.beginCampMission(s, "convoy"));
  E.exploreCampMission(s);
  E.resolveCampMission(s, "edge");
  assert.deepEqual(E.ensureCamp(s).levels, {
    infirmary: 1,
    workshop: 0,
    palisade: 0,
  });
  const stock = E.campStock(s, "Plantes médicinales");
  assert.throws(() => E.resolveCampMission(s, "garden"));
  assert.equal(E.campStock(s, "Plantes médicinales"), stock);
  E.returnToCamp(s);
  assert.throws(() => E.beginCampMission(s, "herbs"));
  assert.ok(E.availableCampMissions(s).some((m) => m.id === "dispensary"));
});
test("sauvegarde au milieu d’une sortie, ancienne sauvegarde et restauration complète", () => {
  const s = refuge();
  E.beginCampMission(s, "convoy");
  E.exploreCampMission(s);
  const loaded = E.decode(E.encode(s));
  assert.equal(E.ensureCamp(loaded).active?.step, 1);
  E.resolveCampMission(loaded, "wood");
  E.returnToCamp(loaded);
  assert.equal(E.ensureCamp(loaded).levels.workshop, 1);
  mission(loaded, "forge", "plans");
  mission(loaded, "herbs", "edge");
  mission(loaded, "dispensary", "beds");
  mission(loaded, "woodcutters", "path");
  mission(loaded, "quarry", "cart");
  const final = E.decode(E.encode(loaded));
  assert.deepEqual(E.ensureCamp(final).levels, {
    infirmary: 2,
    workshop: 2,
    palisade: 2,
  });
  assert.equal(E.availableCampMissions(final).length, 0);
  const old = refuge();
  delete old.camp;
  assert.deepEqual(
    E.ensureCamp(E.decode(JSON.stringify(old))),
    E.createCampProgress(),
  );
});
test("services réels : soins, potions, force et consommation sans exploit", () => {
  const s = refuge(),
    u = s.units[0];
  u.hp = 10;
  u.potions = 0;
  assert.throws(() => E.restAtCamp(s));
  mission(s, "herbs", "edge");
  let food = E.campStock(s, "Vivres récupérés");
  E.restAtCamp(s);
  assert.equal(u.hp, 22);
  assert.equal(E.campStock(s, "Vivres récupérés"), food - 1);
  mission(s, "dispensary", "beds");
  E.restAtCamp(s);
  assert.equal(u.hp, u.maxHp);
  food = E.campStock(s, "Vivres récupérés");
  assert.throws(() => E.restAtCamp(s));
  assert.equal(E.campStock(s, "Vivres récupérés"), food);
  mission(s, "convoy", "wood");
  const herbs = E.campStock(s, "Plantes médicinales");
  E.prepareCampPotions(s);
  assert.equal(u.potions, 1);
  assert.equal(E.campStock(s, "Plantes médicinales"), herbs - 1);
  mission(s, "forge", "plans");
  const strength = u.strength;
  E.improveCampWeapons(s);
  assert.equal(u.strength, strength + 1);
  assert.throws(() => E.improveCampWeapons(s));
});
test("enceinte : risques réduits et bonus des sorties sécurisées", () => {
  const s = refuge();
  mission(s, "woodcutters", "path");
  const scout = s.units
      .filter((u) => u.owner !== 0)
      .sort((a, b) => b.agility - a.agility)[0],
    hp = scout.hp;
  mission(s, "convoy", "axle");
  assert.equal(scout.hp, hp - 2);
  mission(s, "quarry", "cart");
  const food = E.campStock(s, "Vivres récupérés");
  mission(s, "herbs", "edge");
  assert.equal(E.campStock(s, "Vivres récupérés"), food + 2);
  const battle = refuge();
  battle.phase = "battle";
  assert.throws(() => E.beginCampMission(battle, "herbs"));
  assert.throws(() => E.prepareCampPotions(battle));
});
