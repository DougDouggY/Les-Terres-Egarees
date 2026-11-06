/** UI action fields share the engine's actual capabilities and ranges. */
import type { Campaign, Unit } from "./types";
import { activeWeapon, hasSkill, syncWeapon, weaponCatalog } from "./classes";
import { rules } from "../data/balance";
import { alive } from "./queries";
import { canHealTarget } from "./skills";
import { cell, key, map } from "./active-map";
import { los } from "./vision";
export function healingActor(u: Unit) {
  const actor = structuredClone(u);
  const focus = u.carriedWeapons?.find(
    (id) => weaponCatalog[id]?.category === "healing",
  );
  if (hasSkill(u, "heal") && !u.bearForm && focus) {
    actor.activeWeaponId = focus;
    syncWeapon(actor);
  }
  return actor;
}
export function healingTargets(s: Campaign, u: Unit) {
  const actor = healingActor(u),
    visible = u.owner ? new Set(s.players[u.owner - 1].visible) : undefined;
  return alive(s).filter(
    (t) =>
      (!visible || visible.has(key(t.x, t.y))) && canHealTarget(s, actor, t),
  );
}
export function healingCells(
  u: Unit,
  origins: Iterable<number>,
  known?: Set<number>,
) {
  const magic =
    hasSkill(u, "heal") &&
    !u.bearForm &&
    activeWeapon(u).category === "healing";
  const bandage = hasSkill(u, "bandage");
  const out = new Set<number>();
  if (!magic && !bandage) return out;
  const range = magic ? rules.healRange : 1,
    min = magic ? 1 : 0;
  for (const k of origins) {
    const from = map[k];
    for (let dy = -range; dy <= range; dy++)
      for (let dx = -range; dx <= range; dx++) {
        const d = Math.abs(dx) + Math.abs(dy),
          target = cell(from.x + dx, from.y + dy);
        if (!target || d < min || d > range) continue;
        const tk = key(target.x, target.y);
        if (
          (known?.has(tk) !== false && !target.walk) ||
          !los(from, target, known)
        )
          continue;
        out.add(tk);
      }
  }
  return out;
}
