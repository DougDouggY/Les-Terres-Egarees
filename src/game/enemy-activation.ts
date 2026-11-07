import type { Campaign, Unit } from "./types";
import { distance } from "./active-map";
import { los } from "./vision";
export type EnemyBehavior = {
  mode: "active" | "zone" | "boss" | "mission";
  group?: string;
  initialHp?: number;
  awakened?: boolean;
  mission?: string;
};
export type EnemyGroup = {
  active: boolean;
  zone: { x: number; y: number; w: number; h: number };
};
/** Called on actual HP application, including counters and area spells, never on forecast/miss. */
export function notifyEnemyDamage(s: Campaign, u: Unit, before: number) {
  if (u.owner !== 0 || u.hp >= before) return;
  if (u.enemyAI?.mode === "boss") u.enemyAI.awakened = true;
  const group = u.enemyAI?.group && s.enemyGroups?.[u.enemyAI.group];
  if (group) group.active = true;
}
export function enemyMayMove(s: Campaign, u: Unit) {
  const cfg = u.enemyAI;
  if (!cfg || cfg.mode === "active") return true; // old missions retain their validated behavior
  if (cfg.mode === "boss") {
    if (u.hp < (cfg.initialHp ?? u.maxHp)) cfg.awakened = true;
    return !!cfg.awakened;
  }
  if (cfg.mode === "mission") return false; // a registered mission planner owns the exception
  const group = cfg.group && s.enemyGroups?.[cfg.group];
  if (!group) return false;
  if (!group.active) {
    const heroes = s.units.filter((t) => t.hp > 0 && t.owner !== 0);
    const z = group.zone;
    group.active =
      heroes.some(
        (t) => t.x >= z.x && t.x < z.x + z.w && t.y >= z.y && t.y < z.y + z.h,
      ) ||
      s.units.some(
        (m) =>
          m.hp > 0 &&
          m.owner === 0 &&
          m.enemyAI?.group === cfg.group &&
          heroes.some(
            (t) =>
              distance(m, t) >= m.minRange &&
              distance(m, t) <= m.range &&
              los(m, t),
          ),
      );
  }
  return group.active;
}
/** Latch a confirmed turn's detections even if the group plays much later. */
export function activateDetectedGroups(s: Campaign) {
  for (const u of s.units)
    if (u.hp > 0 && u.owner === 0 && u.enemyAI?.mode === "zone")
      enemyMayMove(s, u);
}
