import type { Campaign, Unit, Front } from "./types";

export const initiativeOrder = (units: Unit[]) =>
  units
    .filter((u) => u.hp > 0)
    .slice()
    .sort(
      (a, b) =>
        b.initiative - a.initiative || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
    )
    .map((u) => u.id);

/** One real queue. Legacy saves retain their current actor and already spent turns. */
export function globalInitiative(s: Campaign): Front {
  if (s.initiativeVersion === 2) return s.common;
  if (!s.merged && !s.sandbox) {
    const round = Math.max(...s.fronts.map((f) => f.round));
    const old = s.fronts[s.active - 1],
      current = old.queue[old.index];
    const spent = new Set(
      s.fronts.flatMap((f) =>
        f.round < round ? f.queue : f.queue.slice(0, f.index),
      ),
    );
    spent.delete(current);
    const prefix = [...spent];
    const rest = initiativeOrder(s.units).filter(
      (id) => !spent.has(id) && id !== current,
    );
    const hasCurrent = s.units.some((u) => u.id === current && u.hp > 0);
    s.common = {
      round,
      index: prefix.length,
      queue: [...prefix, ...(hasCurrent ? [current] : []), ...rest],
    };
  } else if (!s.common.queue.length) s.common.queue = initiativeOrder(s.units);
  s.initiativeVersion = 2;
  return s.common;
}
/** New arrivals are inserted after the current actor, never before spent turns. */
export function insertInitiative(
  s: Campaign,
  ids: string[],
  preserveCurrent = true,
) {
  const f = globalInitiative(s),
    prefix = f.queue.slice(0, f.index + (preserveCurrent ? 1 : 0));
  const remaining = f.queue.slice(prefix.length);
  const known = new Set([...prefix, ...remaining]);
  const arrivals = initiativeOrder(
    s.units.filter((u) => ids.includes(u.id) && !known.has(u.id)),
  );
  // Preserve every existing relative position, even after a level/stat change.
  for (const id of arrivals) {
    const u = s.units.find((u) => u.id === id)!;
    const at = remaining.findIndex((other) => {
      const t = s.units.find((u) => u.id === other)!;
      return (
        t &&
        (u.initiative > t.initiative ||
          (u.initiative === t.initiative && u.id < t.id))
      );
    });
    remaining.splice(at < 0 ? remaining.length : at, 0, id);
  }
  f.queue = [...prefix, ...remaining];
}
export function stepInitiative(s: Campaign) {
  const f = globalInitiative(s);
  do {
    f.index++;
  } while (
    f.index < f.queue.length &&
    !s.units.some((u) => u.id === f.queue[f.index] && u.hp > 0)
  );
  if (f.index >= f.queue.length) {
    s.previousInitiative = { ...f, queue: [...f.queue] };
    f.round++;
    f.index = 0;
    f.queue = initiativeOrder(s.units);
  }
}
