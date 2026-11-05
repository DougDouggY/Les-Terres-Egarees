import layouts from "../assets/tactical/atlas-layout.json";
import { resolveClip, type SpriteProfile, type Clip } from "./catalog";
type Frame = {
  row: number;
  column: number;
  x: number;
  y: number;
  width: number;
  height: number;
  anchorX: number;
  ambiguous?: boolean;
  bodyHeight?: number;
  bodyGround?: number;
};
type Layout = {
  width: number;
  height: number;
  columns: number;
  rows: number;
  frames: Frame[];
};
const data = layouts as Record<string, Layout>;
export function resourceRect(c: Clip, index: number) {
  const i =
    c.loop === false
      ? Math.max(0, Math.min(c.frames.length - 1, index))
      : ((index % c.frames.length) + c.frames.length) % c.frames.length;
  return data[c.source]?.frames.find(
    (f) =>
      f.row === (c.cells?.[i]?.row ?? c.row) &&
      f.column === (c.cells?.[i]?.column ?? c.frames[i]),
  );
}
function referenceAt(
  p: SpriteProfile,
  c: Clip,
  index: number,
  reference: number,
) {
  if (c !== resolveClip(p, "transform")) return reference;
  const first = resourceRect(c, 0),
    last = resourceRect(c, c.frames.length - 1);
  if (!first?.bodyHeight || !last?.bodyHeight) return reference;
  const progress = Math.max(
    0,
    Math.min(1, index / Math.max(1, c.frames.length - 1)),
  );
  return first.bodyHeight + (last.bodyHeight - first.bodyHeight) * progress;
}
const metrics = new WeakMap<
  SpriteProfile,
  {
    references: Map<string, number>;
    width: number;
    height: number;
    below: number;
  }
>();
export function profileMetrics(p: SpriteProfile) {
  const saved = metrics.get(p);
  if (saved) return saved;
  const references = new Map<string, number>();
  // Prefer standing guard poses, not the dimensions of a raised weapon or a fall.
  for (const name of [
    "idle",
    "combat_idle",
    "attack",
    "counter",
    "block",
    "reload",
    "heal",
    "evade",
    "damage",
    "transform",
    ...Object.keys(p.clips),
  ]) {
    const c = resolveClip(p, name);
    if (!c || references.has(c.source)) continue;
    const last = [
      "attack",
      "counter",
      "block",
      "reload",
      "evade",
      "damage",
    ].includes(name);
    const r = resourceRect(c, last ? c.frames.length - 1 : 0);
    if (r) references.set(c.source, r.bodyHeight ?? r.height);
  }
  for (const [source, height] of Object.entries(p.referenceHeights ?? {}))
    if (height > 0) references.set(source, height);
  let half = 0,
    height = 0,
    below = 0;
  for (const name of Object.keys(p.clips)) {
    const c = resolveClip(p, name);
    if (!c) continue;
    const reference = references.get(c.source);
    if (!reference) continue;
    for (let i = 0; i < c.frames.length; i++) {
      const r = resourceRect(c, i);
      if (!r) continue;
      const measuredReference = referenceAt(p, c, i, reference);
      half = Math.max(
        half,
        Math.abs(r.x - r.anchorX) / measuredReference,
        Math.abs(r.x + r.width - r.anchorX) / measuredReference,
      );
      const ground = r.bodyGround ?? r.y + r.height;
      height = Math.max(height, (ground - r.y) / measuredReference);
      below = Math.max(below, (r.y + r.height - ground) / measuredReference);
    }
  }
  const result = {
    references,
    width: half * 2 + 0.05,
    height: height + 0.05,
    below: below + 0.02,
  };
  metrics.set(p, result);
  return result;
}
export function resourceScale(
  p: SpriteProfile,
  c: Clip,
  width: number,
  height: number,
  mode: "fit" | "world" = "fit",
  index = 0,
) {
  const m = profileMetrics(p),
    reference = m.references.get(c.source);
  if (!reference) {
    const l = data[c.source];
    return l
      ? Math.min(width / (l.width / c.columns), height / (l.height / c.rows))
      : 1;
  }
  // One anatomical size for all animations/sources of a class in battle.
  // Inspection fits the UNION of its poses, never each current frame separately.
  const body =
    mode === "world"
      ? width * 0.74
      : Math.min(
          width / m.width,
          (height * 0.9) / m.height,
          (height * 0.1) / m.below,
        );
  return body / referenceAt(p, c, index, reference);
}

/** Distance between body anchors at impact. The weapon reaches INTO the target's
 * near torso, rather than stopping at the end of its shield/weapon silhouette. */
export function meleeContactDistance(
  attacker: SpriteProfile | undefined,
  animation: string,
  size: number,
  impactIndex?: number,
) {
  if (!attacker) return size * 0.45;
  const c = resolveClip(attacker, animation);
  if (!c) return size * 0.45;
  const index = impactIndex ?? c.impactFrame ?? Math.floor(c.frames.length / 2);
  const r = resourceRect(c, index);
  if (!r) return size * 0.45;
  const reach =
    (r.x + r.width - r.anchorX) *
    resourceScale(attacker, c, size, size, "world", index);
  return Math.max(size * 0.28, Math.min(size * 1.6, reach + size * 0.04));
}
