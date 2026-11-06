import type { Campaign, Unit } from "./types";
import { map, distance, village } from "./active-map";
import { alive } from "./queries";
import { reachable } from "./pathfinding";
import { canAttack } from "./combat";
import { los } from "./vision";
export function ai(
  s: Campaign,
  u: Unit,
): { x: number; y: number; target?: string } {
  const targets = alive(s).filter(
    (t) => t.owner !== 0 && (s.merged || t.front === u.front),
  );
  let locked = targets.find((t) => t.id === u.aiTargetId);
  if (!locked) {
    locked = targets
      .filter((t) => distance(u, t) <= u.vision && los(u, t))
      .sort((a, b) => distance(u, a) - distance(u, b))[0];
    u.aiTargetId = locked?.id;
  }
  const rally = !s.forestChapter && !locked && !!s.chapter1?.alerted;
  const candidates = locked ? [locked] : rally ? [] : targets;
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
      const score = -Math.abs(distance(c, village.entry) - 3) - move.cost * 0.1;
      if (score > best.score) best = { x: c.x, y: c.y, score };
    }
    for (const t of candidates) {
      const attack = !arriving && canAttack(ghost, t);
      const score =
        (attack ? 100 + (t.maxHp - t.hp) * 0.5 : 0) -
        distance(c, t) -
        move.cost * 0.1;
      if (score > best.score)
        best = { x: c.x, y: c.y, target: attack ? t.id : undefined, score };
    }
  }
  delete u.arriving;
  return best;
}
