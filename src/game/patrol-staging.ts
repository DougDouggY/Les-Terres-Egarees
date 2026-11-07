import type { Campaign, Unit } from "./types";
import { path } from "./pathfinding";
import { map } from "./active-map";
export const PATROL_APPROACH_MS = 3400,
  PATROL_DEPLOY_MS = 6800;
export const legacyPatrolDeployment = [
  {
    id: "valdren-captain",
    cls: "man_at_arms",
    x: 40,
    y: 22,
    spawn: [27, 24],
    stop: [20, 24],
    group: "boss",
  },
  {
    id: "valdren-1",
    cls: "man_at_arms",
    x: 26,
    y: 24,
    spawn: [28, 25],
    stop: [21, 25],
    group: "vanguard",
  },
  {
    id: "valdren-2",
    cls: "spearman",
    x: 27,
    y: 25,
    spawn: [29, 24],
    stop: [22, 24],
    group: "vanguard",
  },
  {
    id: "geraud",
    cls: "squire",
    x: 25,
    y: 23,
    spawn: [44, 17],
    group: "vanguard",
  },
  {
    id: "valdren-5",
    cls: "man_at_arms",
    x: 31,
    y: 23,
    spawn: [46, 17],
    group: "middle",
  },
  {
    id: "valdren-3",
    cls: "spearman",
    x: 31,
    y: 25,
    spawn: [44, 29],
    group: "middle",
  },
  {
    id: "valdren-4",
    cls: "crossbowman",
    x: 33,
    y: 24,
    spawn: [46, 29],
    group: "middle",
  },
  {
    id: "valdren-6",
    cls: "man_at_arms",
    x: 35,
    y: 21,
    spawn: [48, 17],
    group: "rear",
  },
  {
    id: "valdren-7",
    cls: "man_at_arms",
    x: 37,
    y: 23,
    spawn: [45, 21],
    group: "rear",
  },
  {
    id: "valdren-8",
    cls: "spearman",
    x: 36,
    y: 25,
    spawn: [43, 29],
    group: "rear",
  },
  {
    id: "valdren-9",
    cls: "crossbowman",
    x: 38,
    y: 22,
    spawn: [47, 24],
    group: "rear",
  },
] as const;
export const COMPACT_APPROACH_MS = 2600,
  COMPACT_DEPLOY_MS = 4200;
export const patrolDeployment = [
  {
    id: "valdren-captain",
    cls: "man_at_arms",
    x: 31,
    y: 8,
    spawn: [17, 9],
    stop: [10, 9],
    group: "boss",
  },
  {
    id: "valdren-1",
    cls: "man_at_arms",
    x: 15,
    y: 9,
    spawn: [18, 10],
    stop: [11, 10],
    group: "vanguard",
  },
  {
    id: "valdren-2",
    cls: "spearman",
    x: 17,
    y: 10,
    spawn: [19, 9],
    stop: [12, 9],
    group: "vanguard",
  },
  {
    id: "geraud",
    cls: "squire",
    x: 23,
    y: 10,
    spawn: [33, 9],
    group: "middle",
  },
  {
    id: "valdren-5",
    cls: "man_at_arms",
    x: 21,
    y: 6,
    spawn: [32, 1],
    group: "middle",
  },
  {
    id: "valdren-3",
    cls: "spearman",
    x: 20,
    y: 12,
    spawn: [33, 18],
    group: "middle",
  },
  {
    id: "valdren-4",
    cls: "crossbowman",
    x: 24,
    y: 7,
    spawn: [33, 3],
    group: "middle",
  },
  {
    id: "valdren-6",
    cls: "man_at_arms",
    x: 24,
    y: 10,
    spawn: [33, 11],
    group: "rear",
  },
  {
    id: "valdren-7",
    cls: "man_at_arms",
    x: 13,
    y: 16,
    spawn: [16, 19],
    group: "vanguard",
  },
  {
    id: "valdren-8",
    cls: "spearman",
    x: 23,
    y: 16,
    spawn: [32, 19],
    group: "rear",
  },
  {
    id: "valdren-9",
    cls: "crossbowman",
    x: 27,
    y: 14,
    spawn: [33, 17],
    group: "rear",
  },
] as const;
export const deploymentFor = (s: Campaign) =>
  s.mapId === "forest-compact" ? patrolDeployment : legacyPatrolDeployment;
export const patrolDuration = (
  s: Campaign,
  stage: "approach" | "deployment",
) =>
  s.mapId === "forest-compact"
    ? stage === "approach"
      ? COMPACT_APPROACH_MS
      : COMPACT_DEPLOY_MS
    : stage === "approach"
      ? PATROL_APPROACH_MS
      : PATROL_DEPLOY_MS;
export function commitPatrol(s: Campaign, stage: "approach" | "deployment") {
  if (!s.forestChapter?.stagingVersion) return;
  for (const d of deploymentFor(s)) {
    const u = s.units.find((t) => t.id === d.id);
    if (!u) continue;
    const dest =
      stage === "approach" ? ("stop" in d ? d.stop : undefined) : [d.x, d.y];
    if (dest) {
      u.x = dest[0];
      u.y = dest[1];
    }
  }
}
export type ScriptedActor = {
  unit: Unit;
  x: number;
  y: number;
  animation: string;
  frame: number;
  flip?: boolean;
};
/** Animation is presentational. Only the scene's committed endpoint changes the real grid. */
const routeCache = new WeakMap<
  Campaign,
  { signature: string; routes: Map<string, number[]> }
>();
export class PatrolStaging {
  private routes = new Map<string, number[]>();
  constructor(private s: Campaign) {
    const signature =
      s.mapId + s.units.map((u) => u.id + ":" + u.classId).join(",");
    const cached = routeCache.get(s);
    if (cached?.signature === signature) {
      this.routes = cached.routes;
      return;
    }
    for (const d of deploymentFor(s)) {
      const u = s.units.find((t) => t.id === d.id);
      if (!u) continue;
      for (const stage of ["approach", "deployment"] as const) {
        const start =
          stage === "approach" ? d.spawn : "stop" in d ? d.stop : d.spawn;
        const end =
          stage === "approach" ? ("stop" in d ? d.stop : d.spawn) : [d.x, d.y];
        const route = path(
          s,
          { ...u, x: start[0], y: start[1] },
          end[0],
          end[1],
          true,
        );
        if (!route) throw Error("Trajet de patrouille bloqué : " + d.id);
        this.routes.set(stage + u.id, route.steps);
      }
    }
    routeCache.set(s, { signature, routes: this.routes });
  }
  actors(stage: "approach" | "deployment", elapsed: number): ScriptedActor[] {
    const actors: ScriptedActor[] = this.s.units
      .filter((u) => u.owner !== 0 && u.hp > 0 && !u.summonedBy)
      .map((unit) => ({
        unit,
        x: unit.x,
        y: unit.y,
        animation: "idle",
        frame: 0,
        flip: false,
      }));
    const duration = patrolDuration(this.s, stage);
    for (const [i, d] of deploymentFor(this.s).entries()) {
      if (stage === "approach" && !("stop" in d)) continue;
      const unit = this.s.units.find((u) => u.id === d.id);
      if (!unit || unit.hp <= 0) continue;
      const route = this.routes.get(stage + unit.id)!;
      const delay =
        this.s.mapId === "forest-compact"
          ? stage === "deployment"
            ? i < 3
              ? i * 50
              : 180 + i * 20
            : i * 100
          : stage === "deployment"
            ? i < 3
              ? i * 140
              : 600 + i * 65
            : i * 150;
      const progress =
        Math.max(0, Math.min(1, (elapsed - delay) / (duration - delay - 300))) *
        (route.length - 1);
      const at = Math.floor(progress),
        a = map[route[at]],
        b = map[route[Math.min(route.length - 1, at + 1)]],
        t = progress - at;
      actors.push({
        unit,
        x: a.x + (b.x - a.x) * t,
        y: a.y + (b.y - a.y) * t,
        animation: progress > 0 && at < route.length - 1 ? "move" : "idle",
        frame: Number.isFinite(elapsed) ? Math.floor(elapsed / 150) : 0,
        flip: b.x < a.x || stage === "approach",
      });
    }
    return actors;
  }
}
