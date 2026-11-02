import type { Campaign, Unit } from "./types";
import { map, distance } from "./map";
import { alive } from "./queries";
import { reachable } from "./pathfinding";
import { canAttack } from "./combat";
export function ai(
  s: Campaign,
  u: Unit,
): { x: number; y: number; target?: string } {
  const targets = alive(s).filter(
    (t) => t.owner !== 0 && (s.merged || t.front === u.front),
  );
  const moves = reachable(s, u);
  let best: { x: number; y: number; target?: string; score: number } = {
    x: u.x,
    y: u.y,
    score: -Infinity,
  };
  for (const k of moves.keys()) {
    const c = map[k],
      ghost = { ...u, x: c.x, y: c.y };
    for (const t of targets) {
      const attack = canAttack(ghost, t),
        score =
          (attack ? 100 + (t.maxHp - t.hp) * 0.5 : 0) -
          distance(c, t) -
          moves.get(k)!.cost * 0.1;
      if (score > best.score)
        best = { x: c.x, y: c.y, target: attack ? t.id : undefined, score };
    }
  }
  return best;
}
