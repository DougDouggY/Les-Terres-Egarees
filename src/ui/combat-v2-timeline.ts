/** Adapted from Kit V2 battle-scene.js: 58% contact, sine approach,
 * 620/500 ms linked weapons, non-linear 32% secondary contact, 1550 ms parry.
 * This module accepts resolved strikes only. It cannot roll combat or add hits. */
export type VisualStrike = {
  attacker: string;
  defender: string;
  damage: number;
  hpAfter: number;
  hit: boolean;
  blocked: boolean;
  counter?: boolean;
  parryCounter?: boolean;
  critical?: boolean;
  group?: number;
  weaponIndex?: number;
  followUp?: boolean;
};
export type Beat = { index: number; at: number };
export type V2Block = {
  start: number;
  duration: number;
  actionDuration: number;
  approachExtra: number;
  reloadDuration: number;
  index: number;
  counterIndex?: number;
  ranged: boolean;
  hold: boolean;
  linked: boolean;
  beats: Beat[];
};
export const sameWeaponBlock = (
  a: VisualStrike | undefined,
  b: VisualStrike | undefined,
) =>
  !!a &&
  !!b &&
  a.attacker === b.attacker &&
  a.group !== undefined &&
  a.group === b.group;
export function buildV2Timeline(
  strikes: readonly VisualStrike[],
  ranged: (id: string) => boolean,
  reload: (id: string) => boolean = () => false,
  slowApproach: (id: string) => boolean = () => false,
) {
  const blocks: V2Block[] = [];
  let start = 0;
  for (let i = 0; i < strikes.length; i++) {
    const hit = strikes[i],
      range = ranged(hit.attacker),
      next = strikes[i + 1];
    const counter =
      hit.blocked &&
      !range &&
      next?.parryCounter &&
      next.attacker === hit.defender &&
      next.defender === hit.attacker
        ? i + 1
        : undefined;
    const linked = sameWeaponBlock(strikes[i - 1], hit),
      hold = sameWeaponBlock(hit, next),
      second = linked && hit.weaponIndex === 1;
    const duration = hit.blocked
      ? range
        ? 1600
        : 1550
      : second
        ? 500
        : hold
          ? 620
          : 1250;
    const approachExtra =
      !range && !linked && slowApproach(hit.attacker) ? (hold ? 80 : 120) : 0;
    const beats = [
      {
        index: i,
        at: start + approachExtra + duration * (second ? 0.32 : 0.58),
      },
    ];
    if (counter !== undefined)
      beats.push({
        index: counter,
        at: start + approachExtra + duration * 0.79,
      });
    blocks.push({
      start,
      duration:
        duration + approachExtra + (reload(hit.attacker) && !hold ? 520 : 0),
      actionDuration: duration + approachExtra,
      approachExtra,
      reloadDuration: reload(hit.attacker) && !hold ? 520 : 0,
      index: i,
      counterIndex: counter,
      ranged: range,
      hold,
      linked,
      beats,
    });
    start += blocks.at(-1)!.duration;
    if (counter !== undefined) i++;
  }
  return { blocks, duration: start, beats: blocks.flatMap((b) => b.beats) };
}
export function sampleV2Timeline(
  timeline: ReturnType<typeof buildV2Timeline>,
  elapsed: number,
) {
  const t = Math.max(0, elapsed),
    block =
      timeline.blocks.find((b) => t < b.start + b.duration) ??
      timeline.blocks.at(-1);
  if (!block) return;
  const local = t - block.start,
    base = block.actionDuration - block.approachExtra,
    run = base * 0.35;
  const actionTime =
    local < run + block.approachExtra
      ? (local * run) / (run + block.approachExtra)
      : local - block.approachExtra;
  const elapsedFraction = Math.min(1, actionTime / base);
  const p =
    block.linked && !block.ranged
      ? elapsedFraction < 0.32
        ? (elapsedFraction / 0.32) * 0.58
        : 0.58 + ((elapsedFraction - 0.32) / 0.68) * 0.42
      : elapsedFraction;
  // A parry reply lands at 79%; hold both bodies through its reaction.
  const retreatAt = block.counterIndex !== undefined ? 0.88 : 0.78;
  const travel = block.ranged
    ? 0
    : p < 0.58
      ? block.linked
        ? 1
        : Math.sin((Math.min(1, p / 0.58) * Math.PI) / 2)
      : block.hold
        ? 1
        : Math.max(0, Math.min(1, 1 - (p - retreatAt) / (1 - retreatAt)));
  return {
    block,
    p,
    travel,
    elapsedFraction,
    reloadPhase:
      block.reloadDuration && t >= block.start + block.actionDuration
        ? Math.min(
            1,
            (t - block.start - block.actionDuration) / block.reloadDuration,
          )
        : undefined,
    done: t >= timeline.duration,
  };
}
