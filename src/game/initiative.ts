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
  const rest = new Set([
    ...f.queue.slice(f.index + (preserveCurrent ? 1 : 0)),
    ...ids,
  ]);
  for (const id of prefix) rest.delete(id);
  f.queue = [
    ...prefix,
    ...initiativeOrder(s.units.filter((u) => rest.has(u.id))),
  ];
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
