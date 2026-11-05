import * as E from "../engine";
import { createSandbox, trainingUnit } from "../game/sandbox";
import { profileKey, type SpriteProfile } from "../sprites/catalog";
/** Actual engine operations in a disposable sandbox, never the player's campaign. */
export function capabilityFixture(p: SpriteProfile, action: string) {
  const s = createSandbox(),
    c = E.classes[p.classId];
  if (!c)
    throw Error("Cette entrée est un modèle visuel sans capacité tactique.");
  const a = trainingUnit(s, p.classId),
    ally = trainingUnit(s, "man_at_arms", 1, 1, 1);
  a.gender = p.gender === "female" ? "female" : "male";
  a.combatSkinId = profileKey(p);
  const weapon = Object.values(E.weaponCatalog).find(
    (w) => w.visual === p.equipment,
  );
  if (weapon) {
    a.activeWeaponId = weapon.id;
    a.carriedWeapons = Array.from(new Set([...a.carriedWeapons!, weapon.id]));
    E.syncWeapon(a);
  }
  a.bannerPlanted = p.state === "planted";
  a.fortified = false;
  if (p.state === "fortified" && ["fortify", "fortify-move"].includes(action))
    a.combatSkinId = profileKey({ ...p, state: "default" });
  Object.assign(ally, { x: a.x + 1, y: a.y, hp: Math.max(1, ally.maxHp - 20) });
  s.common = { round: 1, queue: [a.id], index: 0 };
  s.fronts[0] = s.common;
  s.active = 1;
  s.phase = "battle";
  s.scene = null;
  if (p.state === "bear") {
    a.activeWeaponId = c.starter[0];
    E.syncWeapon(a);
    E.transformBear(s, a);
  }
  // Valid clear ground for engine-driven offensive ability fixtures.
  if (["area", "charge"].includes(action)) {
    const steps = action === "charge" ? E.rules.chargeSteps : 0;
    const origin = E.map.find(
      (c) =>
        c.x > 5 &&
        c.y > 5 &&
        Array.from({ length: steps + 2 }, (_, i) => E.cell(c.x + i, c.y)).every(
          (c) => c?.walk && c.cost === 1,
        ),
    );
    if (!origin) throw Error("Terrain de démonstration indisponible");
    Object.assign(a, { x: origin.x, y: origin.y });
    Object.assign(ally, { x: origin.x + steps + 1, y: origin.y, owner: 0 });
    if (steps) E.move(s, a, origin.x + steps, origin.y);
  }
  const before = structuredClone(a),
    targetBefore = structuredClone(ally);
  let animation = action,
    details: any = {},
    resultTarget = ally;
  let strikes: E.Battle["strikes"] | undefined;
  if (action === "heal" || action === "bandage") {
    if (action === "heal" && !E.hasSkill(a, "bandage")) {
      const focus = a.carriedWeapons?.find(
        (id) => E.weaponCatalog[id].category === "healing",
      );
      if (focus) E.equipWeapon(s, a, focus);
    }
    const amount = E.healTarget(s, a, ally);
    details = { restored: amount, hpBefore: targetBefore.hp, hpAfter: ally.hp };
    animation = E.hasSkill(a, "bandage") ? "bandage" : "heal";
  } else if (action === "transform") {
    E.transformBear(s, a);
    details = {
      before: {
        hp: before.maxHp,
        strength: before.strength,
        defense: before.defense,
        move: before.move,
      },
      after: {
        hp: a.maxHp,
        strength: a.strength,
        defense: a.defense,
        move: a.move,
      },
      bear: a.bearForm,
    };
  } else if (action === "fortify" || action === "fortify-move") {
    const shooter = trainingUnit(s, "hunter", 1, 1, 0);
    Object.assign(shooter, { x: a.x + 2, y: a.y });
    const normal = E.forecast(shooter, a, s).damage;
    E.fortify(s, a);
    const protectedDamage = E.forecast(shooter, a, s).damage;
    details = { normalDamage: normal, protectedDamage, fortified: a.fortified };
    if (action === "fortify-move") {
      E.finishActivationSkills(s);
      const spot = E.map.find(
        (cell) =>
          cell.walk && E.distance(a, cell) === 1 && !E.at(s, cell.x, cell.y),
      );
      if (!spot) throw Error("Case de déplacement manquante dans la fixture");
      E.move(s, a, spot.x, spot.y);
      details.afterMove = a.fortified;
    }
    animation = "fortify";
  } else if (action === "banner") {
    E.plantBanner(s, a);
    details = {
      planted: a.bannerPlanted,
      weapon: a.activeWeaponId,
      banners: s.banners?.length,
    };
  } else if (action === "summon") {
    const spot = E.summonCells(s, a)[0];
    if (!spot) throw Error("Aucune case d’invocation");
    resultTarget = E.summon(s, a, spot.x, spot.y);
    details = {
      summoned: resultTarget.classId,
      turns: resultTarget.summonTurns,
    };
  } else if (action === "buff") {
    E.improveAlly(s, a, ally);
    details = { buff: ally.buff };
  } else if (action === "area" || action === "charge") {
    const forecast = E.forecast(a, ally, s);
    const battle =
      action === "area" ? E.resolveArea(s, a, ally) : E.resolve(s, a, ally);
    strikes = battle.strikes;
    for (const hit of strikes) E.applyStrike(s, hit);
    details = {
      ability: action,
      charge: forecast.charge,
      movedDistance: a.movedDistance ?? 0,
      radius: action === "area" ? E.rules.areaRadius : undefined,
      events: strikes.length,
      hpBefore: targetBefore.hp,
      hpAfter: ally.hp,
    };
  } else throw Error("Capacité non prise en charge");
  const after = structuredClone(a);
  delete after.combatSkinId;
  return {
    before,
    targetBefore,
    after,
    targetAfter: structuredClone(resultTarget),
    animation,
    details,
    strikes,
  };
}
