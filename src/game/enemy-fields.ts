import { healingCells, healingActor } from "./tactical-fields";
import { effectiveMove } from "./enemy-activation";
import type { Campaign, Unit } from "./types";
import { key, map } from "./active-map";
import { seen } from "./vision";
import { reachable, attackCells } from "./pathfinding";
/** A player's estimate, using only their knowledge. Hidden units/obstacles never influence it. */
export function enemyFields(
  s: Campaign,
  viewer: 1 | 2,
  ids?: string[],
  inspection = false,
) {
  const visible = new Set(
    inspection ? map.map((_, i) => i) : s.players[viewer - 1].visible,
  );
  const known = new Set(
    inspection ? [...visible] : [...s.players[viewer - 1].explored, ...visible],
  );
  const sources = s.units.filter(
    (u) =>
      u.hp > 0 &&
      u.owner === 0 &&
      (inspection || seen(s, viewer, u)) &&
      (!ids || ids.includes(u.id)),
  );
  const units = s.units
    .filter(
      (u) =>
        u.hp > 0 && (inspection || u.owner === viewer || seen(s, viewer, u)),
    )
    .map((u) => ({
      ...u,
      owner: (u.owner === 0 ? viewer : 0) as Unit["owner"],
    }));
  const projected: Campaign = {
    ...s,
    units,
    merged: false,
    players: s.players.map((p, i) =>
      i === viewer - 1
        ? { ...p, visible: [...visible], explored: [...known] }
        : p,
    ) as Campaign["players"],
  };
  const moves = new Set<number>(),
    attacks = new Set<number>();
  for (const source of sources) {
    const ghost = { ...source, owner: viewer };
    const origins = reachable(projected, ghost, true);
    origins.set(key(ghost.x, ghost.y), {
      cost: 0,
      steps: [key(ghost.x, ghost.y)],
    });
    if (effectiveMove(source) > 0)
      for (const k of origins.keys()) if (visible.has(k)) moves.add(k);
    for (const k of attackCells(ghost, origins.keys(), known))
      if (visible.has(k)) attacks.add(k);
  }
  return { moves, attacks, ids: sources.map((u) => u.id) };
}

/** Read-only allied preview, restricted to the viewing player's knowledge. */
export function alliedFields(
  s: Campaign,
  viewer: 1 | 2,
  source: Unit,
  inspection = false,
) {
  const visible = new Set(
    inspection ? map.map((_, i) => i) : s.players[viewer - 1].visible,
  );
  const known = new Set(
    inspection ? [...visible] : [...visible, ...s.players[viewer - 1].explored],
  );
  const moves = new Set<number>(),
    attacks = new Set<number>(),
    heals = new Set<number>();
  if (
    !source.owner ||
    source.hp <= 0 ||
    (!inspection && !seen(s, viewer, source))
  )
    return { moves, attacks, heals };
  const projected: Campaign = {
    ...s,
    units: s.units
      .filter((u) => u.hp > 0 && (inspection || visible.has(key(u.x, u.y))))
      .map((u) => ({ ...u, owner: (u.owner ? viewer : 0) as Unit["owner"] })),
    players: s.players.map((p, i) =>
      i === viewer - 1
        ? { ...p, visible: [...visible], explored: [...known] }
        : p,
    ) as Campaign["players"],
  };
  const ghost = { ...source, owner: viewer };
  const origins =
    s.committedMove === source.id
      ? new Map<number, { cost: number; steps: number[] }>()
      : reachable(projected, ghost, true);
  origins.set(key(source.x, source.y), {
    cost: 0,
    steps: [key(source.x, source.y)],
  });
  for (const k of origins.keys()) if (visible.has(k)) moves.add(k);
  for (const k of attackCells(ghost, origins.keys(), known))
    if (visible.has(k)) attacks.add(k);
  for (const k of healingCells(healingActor(ghost), origins.keys(), known))
    if (visible.has(k)) heals.add(k);
  return { moves, attacks, heals };
}
