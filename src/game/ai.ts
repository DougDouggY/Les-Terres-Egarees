import { enemyMayMove } from "./enemy-activation";
import type { Campaign, Unit } from "./types";
import { map, distance, village, W, H, key } from "./active-map";
import { alive } from "./queries";
import { reachable } from "./pathfinding";
import { canAttack } from "./combat";
import { los } from "./vision";
export type EnemyPlan = { x: number; y: number; target?: string };
const missionPlanners = new Map<string, (s: Campaign, u: Unit) => EnemyPlan>();
export function registerEnemyMission(
  id: string,
  planner: (s: Campaign, u: Unit) => EnemyPlan,
) {
  missionPlanners.set(id, planner);
  return () => missionPlanners.delete(id);
}
/** True route costs avoid a greedy Manhattan dead-end behind castle walls. */
function approachCosts(goals: { x: number; y: number }[]) {
  const costs = new Float64Array(map.length);
  costs.fill(Infinity);
  const queue: number[] = [];
  for (const g of goals) {
    const k = key(g.x, g.y);
    if (map[k]?.walk && costs[k] !== 0) {
      costs[k] = 0;
      queue.push(k);
    }
  }
  for (let i = 0; i < queue.length; i++) {
    const k = queue[i],
      c = map[k];
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const x = c.x + dx,
        y = c.y + dy;
      if (x < 0 || y < 0 || x >= W || y >= H) continue;
      const nk = key(x, y),
        n = map[nk];
      if (!n.walk) continue;
      const next = costs[k] + c.cost;
      if (next < costs[nk]) {
        costs[nk] = next;
        queue.push(nk);
      }
    }
  }
  return costs;
}
export function ai(
  s: Campaign,
  u: Unit,
): { x: number; y: number; target?: string } {
  if (u.enemyAI?.mode === "mission")
    return (
      missionPlanners.get(u.enemyAI.mission ?? "")?.(s, u) ?? { x: u.x, y: u.y }
    );
  const mobile = enemyMayMove(s, u);
  const targets = alive(s).filter(
    (t) => t.owner !== 0 && (s.merged || t.front === u.front),
  );
  if (!mobile) {
    const target = targets
      .filter((t) => canAttack(u, t))
      .sort((a, b) => a.hp - b.hp)[0];
    return { x: u.x, y: u.y, target: target?.id };
  }
  let locked = targets.find((t) => t.id === u.aiTargetId);
  const targetRoutes = (list: Unit[]) =>
    approachCosts(
      map.filter(
        (c) =>
          c.walk &&
          list.some(
            (t) =>
              distance(c, t) >= u.minRange &&
              distance(c, t) <= u.range &&
              los(c, t),
          ),
      ),
    );
  let lockedRoute: Float64Array | undefined;
  if (
    locked &&
    !s.forestChapter &&
    s.chapter1?.alerted &&
    !canAttack(u, locked)
  ) {
    lockedRoute = targetRoutes([locked]);
    if (!Number.isFinite(lockedRoute[key(u.x, u.y)])) {
      delete u.aiTargetId;
      locked = undefined;
      lockedRoute = undefined;
    }
  }
  if (!locked) {
    locked = targets
      .filter((t) => distance(u, t) <= u.vision && los(u, t))
      .sort((a, b) => distance(u, a) - distance(u, b))[0];
    u.aiTargetId = locked?.id;
  }
  const rally = !s.forestChapter && !locked && !!s.chapter1?.alerted;
  const candidates = locked ? [locked] : rally ? [] : targets;
  const route =
    !s.forestChapter && !s.sandbox
      ? (lockedRoute ??
        (rally
          ? approachCosts(
              map.filter((c) => c.walk && distance(c, village.entry) <= 3),
            )
          : targetRoutes(candidates)))
      : undefined;
  const moves = reachable(s, u);
  let best: { x: number; y: number; target?: string; score: number } = {
    x: u.x,
    y: u.y,
    score: -Infinity,
  };
  const arriving = !!u.arriving;
  for (const [k, move] of moves) {
    const c = map[k],
      ghost = { ...u, x: c.x, y: c.y };
    if (rally) {
      const score =
        -(route?.[k] ?? Math.abs(distance(c, village.entry) - 3)) -
        move.cost * 0.1;
      if (score > best.score) best = { x: c.x, y: c.y, score };
    }
    for (const t of candidates) {
      const attack = !arriving && canAttack(ghost, t);
      const score =
        (attack ? 100 + (t.maxHp - t.hp) * 0.5 : 0) -
        (route && !attack
          ? route[k]
          : u.enemyAI && u.range > 1
            ? Math.abs(distance(c, t) - u.range)
            : distance(c, t)) -
        move.cost * 0.1;
      if (score > best.score)
        best = { x: c.x, y: c.y, target: attack ? t.id : undefined, score };
    }
  }
  delete u.arriving;
  return best;
}
