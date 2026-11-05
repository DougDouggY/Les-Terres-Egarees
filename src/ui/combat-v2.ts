import type { Unit } from "../game/types";
import { activeWeapon } from "../game/classes";
import type { TeamColors } from "../game/team-colors";
import { colorForOwner } from "../game/team-colors";
import {
  drawResourceFrame,
  spriteCatalog,
  unitSpriteProfile,
  spriteImage,
  prepareSpriteSource,
} from "../sprites/resources";
import {
  combatSkin,
  skinForUnit,
  type CombatSkin,
} from "../sprites/combat-skins";
import { damageFrame, resolveClip, type Clip } from "../sprites/catalog";
import { profileMetrics, resourceRect } from "../sprites/geometry";
import anchors from "../assets/tactical/combat-anchors.json";
import {
  buildV2Timeline,
  sampleV2Timeline,
  type VisualStrike,
} from "./combat-v2-timeline";
import {
  attackEffect,
  drawSpell,
  drawArrow,
  drawHealing,
  preloadEffects,
} from "./combat-effects";
type Anchor = {
  feetX: number;
  feetY: number;
  weaponTip: { x: number; y: number };
  bodyHeight: number;
  maskRuns?: number[][];
};
const annotations = anchors as Record<string, Record<string, Anchor>>;
export type CombatActor = {
  unit: Unit;
  skin?: CombatSkin;
  scaleBySource: Map<string, number>;
  preparedSources: Map<string, HTMLImageElement | HTMLCanvasElement>;
  height: number;
  side: number;
};
const clamp = (n: number) => Math.max(0, Math.min(1, n));
function anchor(c: Clip, index: number) {
  const i = Math.max(0, Math.min(c.frames.length - 1, index)),
    cell = c.cells?.[i] ?? { row: c.row, column: c.frames[i] };
  return annotations[c.source]?.[`${cell.row}:${cell.column}`];
}
function attackName(u: Unit, hit: VisualStrike) {
  return hit.weaponIndex === 1
    ? "attack_offhand"
    : hit.followUp
      ? "attack_again"
      : hit.counter
        ? "counter"
        : "attack";
}
/** Immutable appearances, deterministic playback. Every HP event is consumed exactly once.
 * Renderer never calls resolve/random/advance and never infers an extra counter. */
export class CombatSceneV2 {
  readonly actors: CombatActor[];
  readonly strikes: readonly VisualStrike[];
  readonly timeline: ReturnType<typeof buildV2Timeline>;
  readonly missing = new Set<string>();
  lastFrames: Record<string, unknown>[] = [];
  private applied = new Set<number>();
  private finished = false;
  private initialHp = new Map<string, number>();
  private deathAt = new Map<string, number>();
  private colors?: TeamColors;
  previewResult?: { scene: CombatSceneV2; at: number; duration: number };
  groundedStage = false;
  mirror = false;
  diagnostic = false;
  preview?: {
    actorId: string;
    animation: string;
    duration: number;
    targetId?: string;
  };
  constructor(
    units: Unit[],
    strikes: readonly VisualStrike[],
    colors?: TeamColors,
  ) {
    this.strikes = structuredClone(strikes);
    this.colors = colors;
    this.actors = units.map((u) => {
      const unit = structuredClone(u),
        skin = u.combatSkinId
          ? skinForUnit(u, spriteCatalog.profiles)
          : combatSkin(unitSpriteProfile(u));
      const height = skin?.mounted
        ? 190.4
        : u.bearForm || skin?.profile.state === "bear"
          ? 148
          : 136;
      const scaleBySource = new Map<string, number>();
      if (skin)
        for (const [source, ref] of profileMetrics(skin.profile).references)
          scaleBySource.set(source, height / ref);
      return {
        unit,
        skin,
        scaleBySource,
        preparedSources: new Map<
          string,
          HTMLImageElement | HTMLCanvasElement
        >(),
        height,
        side: (u.owner === 0) === (units[0].owner === 0) ? 0 : 1,
      };
    });
    for (const actor of this.actors)
      this.initialHp.set(actor.unit.id, actor.unit.hp);
    this.timeline = buildV2Timeline(
      this.strikes,
      (id) => this.ranged(id),
      (id) =>
        !!activeWeapon(this.actors.find((a) => a.unit.id === id)!.unit).reload,
      (id) => {
        const a = this.actors.find((a) => a.unit.id === id)!;
        return (
          !a.skin?.mounted &&
          !a.unit.bearForm &&
          a.skin?.profile.state !== "bear"
        );
      },
    );
  }
  resetPresentation() {
    this.applied.clear();
    this.finished = false;
    this.deathAt.clear();
    for (const actor of this.actors)
      actor.unit.hp = this.initialHp.get(actor.unit.id) ?? actor.unit.hp;
  }
  ranged(id: string) {
    const u = this.actors.find((a) => a.unit.id === id)?.unit;
    return (
      !!u && ["bow", "crossbow", "magic"].includes(activeWeapon(u).category)
    );
  }
  async prepare() {
    const sources = new Set(
      this.actors.flatMap((a) =>
        a.skin
          ? Object.keys(a.skin.profile.clips)
              .map((n) => resolveClip(a.skin!.profile, n)?.source)
              .filter((s): s is string => !!s)
          : [],
      ),
    );
    await Promise.all(
      [...sources].map(async (source) => {
        try {
          await spriteImage(source).decode();
        } catch {
          this.missing.add(`Source inaccessible : ${source}`);
        }
      }),
    );
    // Precompute recoloration before the first windup (no lost first frames).
    const canvas = document.createElement("canvas");
    canvas.width = 32;
    canvas.height = 32;
    for (const actor of this.actors)
      if (actor.skin)
        for (const name of Object.keys(actor.skin.profile.clips)) {
          const c = resolveClip(actor.skin.profile, name)!;
          if (!actor.preparedSources.has(c.source)) {
            const image = prepareSpriteSource(
              c,
              colorForOwner(this.colors, actor.unit.owner),
            );
            if (image) actor.preparedSources.set(c.source, image);
          }
          for (let frame = 0; frame < c.frames.length; frame++) {
            const a = anchor(c, frame);
            drawResourceFrame(
              canvas.getContext("2d")!,
              actor.skin.profile,
              name,
              frame,
              0,
              0,
              32,
              32,
              true,
              colorForOwner(this.colors, actor.unit.owner),
              "world",
              {
                preparedImage: actor.preparedSources.get(c.source),
                anchorX: a?.feetX,
                ground: a?.feetY,
                scale: actor.scaleBySource.get(c.source),
                maskRuns: a?.maskRuns,
              },
            );
          }
        }
    await preloadEffects();
  }
  private pose(actor: CombatActor, name: string, index: number) {
    const p = actor.skin?.profile;
    const c = resolveClip(p, name);
    if (c)
      return {
        clip: c,
        name,
        index: Math.min(c.frames.length - 1, Math.max(0, index)),
      };
    this.missing.add(`${actor.skin?.id ?? actor.unit.classId} / ${name}`);
    return { clip: resolveClip(p, "idle"), name: "idle", index: 0 };
  }
  private frame(actor: CombatActor, name: string, phase: number) {
    const c = resolveClip(actor.skin?.profile, name);
    // Damage clips commonly start/end in guard. Show the flinch immediately
    // at contact, rather than spending the impact pause on the guard drawing.
    if (name === "damage" && (c?.frames.length ?? 0) > 1)
      return phase < 0.7 ? damageFrame(c!) : c!.frames.length - 1;
    return Math.min(
      (c?.frames.length ?? 1) - 1,
      Math.floor(clamp(phase) * (c?.frames.length ?? 1)),
    );
  }
  private attackPose(
    actor: CombatActor,
    hit: VisualStrike,
    p: number,
    linked = false,
  ) {
    const name = attackName(actor.unit, hit),
      c =
        resolveClip(actor.skin?.profile, name) ??
        (hit.followUp ? resolveClip(actor.skin?.profile, "attack") : undefined);
    // A second one-weapon activation may reuse its actual attack; a missing
    // second-hand drawing NEVER becomes a block or a copied main-hand hit.
    const action =
      hit.followUp && !resolveClip(actor.skin?.profile, name) ? "attack" : name;
    const count = c?.frames.length ?? 1,
      impact = c?.impactFrame ?? Math.floor(count / 2);
    if (p < 0.2 && linked)
      return { name: action, index: Math.max(0, impact - 1) };
    if (p < 0.2 || p >= 0.92) return { name: "idle", index: 0 };
    const release = this.ranged(actor.unit.id) ? 0.4 : 0.57;
    if (p < release)
      return {
        name: action,
        index: Math.min(
          Math.max(0, impact - 1),
          Math.max(
            linked ? 1 : 0,
            Math.floor(((p - 0.2) / (release - 0.2)) * Math.max(1, impact)),
          ),
        ),
      };
    if (p < 0.72) return { name: action, index: impact };
    return {
      name: action,
      index: Math.min(
        count - 1,
        impact +
          1 +
          Math.floor(((p - 0.72) / 0.2) * Math.max(1, count - impact - 1)),
      ),
    };
  }
  private front(actor: CombatActor, name: string, index: number) {
    const q = this.pose(actor, name, index),
      c = q.clip;
    if (!c) return actor.height * 0.2;
    const r = resourceRect(c, q.index),
      a = anchor(c, q.index);
    if (!r) return actor.height * 0.2;
    return Math.max(
      actor.height * 0.12,
      ((a?.weaponTip.x ?? r.x + r.width) - (a?.feetX ?? r.anchorX)) *
        (actor.scaleBySource.get(c.source) ?? 1),
    );
  }
  private contact(a: CombatActor, d: CombatActor, hit: VisualStrike) {
    const name = attackName(a.unit, hit),
      c =
        resolveClip(a.skin?.profile, name) ??
        resolveClip(a.skin?.profile, "attack");
    const reach = this.front(
      a,
      name,
      c?.impactFrame ?? Math.floor((c?.frames.length ?? 1) / 2),
    );
    const defence = hit.blocked
      ? this.front(
          d,
          "block",
          Math.floor(
            (resolveClip(d.skin?.profile, "block")?.frames.length ?? 1) / 2,
          ),
        )
      : d.height * 0.19;
    // Keep torso/horse volumes apart while allowing the weapon to meet shield/body.
    return Math.max(
      reach + defence - 7,
      this.front(a, "idle", 0) * 0.72 + d.height * 0.19 + 12,
    );
  }
  draw(
    ctx: CanvasRenderingContext2D,
    elapsed: number,
    onImpact?: (index: number) => void,
    onDone?: () => void,
  ) {
    if (this.previewResult && elapsed >= this.previewResult.at) {
      this.previewResult.scene.mirror = this.mirror;
      this.previewResult.scene.draw(ctx, elapsed - this.previewResult.at);
      this.lastFrames = this.previewResult.scene.lastFrames;
      if (elapsed >= this.previewResult.duration && !this.finished) {
        this.finished = true;
        onDone?.();
      }
      return;
    }
    const sample = sampleV2Timeline(this.timeline, elapsed);
    for (const beat of this.timeline.beats)
      if (elapsed >= beat.at && !this.applied.has(beat.index)) {
        this.applied.add(beat.index);
        const hit = this.strikes[beat.index],
          def = this.actors.find((a) => a.unit.id === hit.defender);
        if (def) {
          def.unit.hp = hit.hpAfter;
          if (hit.hpAfter <= 0) this.deathAt.set(def.unit.id, beat.at);
        }
        onImpact?.(beat.index);
      }
    this.lastFrames = [];
    ctx.save();
    ctx.scale(ctx.canvas.width / 960, ctx.canvas.height / 600);
    if (this.mirror) {
      ctx.translate(960, 0);
      ctx.scale(-1, 1);
    }
    const homes = [250, 710],
      ground = 475;
    const visible = sample
      ? this.actors.filter((a) =>
          [
            this.strikes[sample.block.index].attacker,
            this.strikes[sample.block.index].defender,
          ].includes(a.unit.id),
        )
      : this.actors.slice(0, 2);
    let flash: { x: number; y: number; strength: number } | undefined;
    const placements = visible.map((a) => ({
      actor: a,
      x: homes[a.side],
      name: a.unit.hp <= 0 ? "death" : "idle",
      index: a.unit.hp <= 0 ? 999 : 0,
      side: a.side,
    }));
    if (sample) {
      const { block, p, travel } = sample,
        hit = this.strikes[block.index],
        a = placements.find((a) => a.actor.unit.id === hit.attacker)!,
        d = placements.find((a) => a.actor.unit.id === hit.defender)!;
      const linkedHit = block.hold
        ? this.strikes[block.index + 1]
        : block.linked
          ? this.strikes[block.index - 1]
          : undefined;
      const gap = linkedHit
          ? Math.min(
              this.contact(a.actor, d.actor, hit),
              this.contact(a.actor, d.actor, linkedHit),
            )
          : this.contact(a.actor, d.actor, hit),
        direction = a.side === 0 ? 1 : -1,
        advance = Math.max(0, 460 - gap);
      const keepMotion =
        ["ironbreaker", "berserker"].includes(a.actor.unit.classId ?? "") ||
        a.actor.skin?.profile.state === "bear";
      const approach =
        !keepMotion && !block.ranged && !block.linked && p < 0.58
          ? Math.sin((Math.min(1, p / 0.35) * Math.PI) / 2)
          : travel;
      a.x += direction * approach * advance;
      Object.assign(a, this.attackPose(a.actor, hit, p, block.linked));
      const retreatAt = block.counterIndex !== undefined ? 0.88 : 0.78;
      if (
        !block.ranged &&
        ((!block.linked && p < 0.35) || (!block.hold && p > retreatAt && p < 1))
      ) {
        const move = resolveClip(a.actor.skin?.profile, "move");
        if (move && move.frames.length > 1) {
          a.name = "move";
          const phase =
            Math.floor(elapsed / (1000 / move.fps)) % move.frames.length;
          a.index = p > retreatAt ? move.frames.length - 1 - phase : phase;
        }
      }
      if (block.hold && p >= 0.78) {
        const next = this.strikes[block.index + 1],
          name = attackName(a.actor.unit, next),
          c = resolveClip(a.actor.skin?.profile, name);
        a.name = name;
        a.index = Math.max(0, (c?.impactFrame ?? 2) - 1);
      }
      if (!hit.hit && p >= 0.46 && p < 0.86) {
        d.name = "evade";
        d.index = this.frame(d.actor, "evade", (p - 0.46) / 0.4);
        d.x -=
          direction *
          Math.sin(((p - 0.46) / 0.4) * Math.PI) *
          d.actor.height *
          0.28;
      } else if (hit.blocked && p >= 0.48) {
        d.name = "block";
        d.index = this.frame(
          d.actor,
          "block",
          p < 0.58
            ? resolveClip(d.actor.skin?.profile, "block")?.status ===
              "provisional"
              ? 0
              : ((p - 0.48) / 0.1) * 0.5
            : 0.5 + Math.min(0.49, (p - 0.58) / 0.25),
        );
      } else if (hit.hit && p >= 0.58 && p < 0.82) {
        d.name = d.actor.unit.hp <= 0 ? "death" : "damage";
        d.index = this.frame(d.actor, d.name, (p - 0.58) / 0.24);
      }
      if (block.counterIndex !== undefined) {
        const counter = this.strikes[block.counterIndex],
          replyStart = 0.69;
        if (p >= replyStart && p < 0.98) {
          const replyGap = this.contact(d.actor, a.actor, counter),
            currentGap = Math.abs(a.x - d.x),
            extra = Math.max(0, currentGap - replyGap),
            flow =
              p < 0.77
                ? Math.sin((clamp((p - 0.69) / 0.08) * Math.PI) / 2)
                : p < 0.86
                  ? 1
                  : Math.max(0, 1 - (p - 0.86) / 0.12);
          d.x -= direction * extra * flow;
          const q =
            p < 0.79
              ? 0.2 + ((p - 0.69) / 0.1) * 0.37
              : p < 0.85
                ? 0.58
                : 0.72 + ((p - 0.85) / 0.13) * 0.2;
          Object.assign(d, this.attackPose(d.actor, counter, q));
          if (p >= 0.79) {
            a.name = counter.hit ? "damage" : "evade";
            a.index = this.frame(a.actor, a.name, (p - 0.79) / 0.19);
          }
        }
      }
      const c = resolveClip(
        a.actor.skin?.profile,
        attackName(a.actor.unit, hit),
      );
      const origin = this.weaponPoint(
        a.actor,
        attackName(a.actor.unit, hit),
        c?.impactFrame ?? 0,
        a.x,
        ground,
        direction,
      );
      const target = {
        x: d.x - direction * d.actor.height * 0.18,
        y: ground - d.actor.height * 0.56,
      };
      const impact = block.beats[0].at;
      if (hit.hit && p >= 0.58 && p < 0.69)
        flash = { ...target, strength: 1 - (p - 0.58) / 0.11 };
      if (
        block.counterIndex !== undefined &&
        p >= 0.79 &&
        p < 0.88 &&
        this.strikes[block.counterIndex].hit
      )
        flash = {
          x: a.x + direction * a.actor.height * 0.18,
          y: ground - a.actor.height * 0.56,
          strength: 1 - (p - 0.79) / 0.09,
        };
      if (block.ranged) {
        const magic = attackEffect(a.actor.unit);
        if (magic) drawSpell(ctx, magic, elapsed - impact, origin, target, 100);
        else if (p >= 0.4 && p < 0.58) {
          const f = (p - 0.4) / 0.18;
          drawArrow(ctx, -100 + f * 100, origin, target);
        } else if (hit.blocked && p >= 0.58 && p < 0.88) {
          ctx.strokeStyle = "#bca772";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(target.x - direction * 25, target.y);
          ctx.lineTo(target.x, target.y);
          ctx.stroke();
        }
      }
      if (sample.reloadPhase !== undefined) {
        a.name = "reload";
        a.index = this.frame(a.actor, "reload", sample.reloadPhase);
      }
      ctx.canvas.dataset.phase =
        sample.reloadPhase !== undefined
          ? "reload"
          : p < 0.2
            ? "idle"
            : p < 0.57
              ? "prepare"
              : p < 0.72
                ? "impact"
                : p < 0.92
                  ? "recover"
                  : "idle";
      ctx.canvas.dataset.skinIds = this.actors
        .map((a) => a.skin?.id ?? "missing")
        .join("|");
      ctx.canvas.dataset.contactGap = String(Math.abs(a.x - d.x));
      ctx.canvas.dataset.elapsed = String(elapsed);
      ctx.canvas.dataset.duration = String(this.timeline.duration);
    }
    if (this.preview) {
      const v = placements.find(
        (v) => v.actor.unit.id === this.preview!.actorId,
      );
      if (v) {
        v.name = this.preview.animation;
        v.index = this.frame(v.actor, v.name, elapsed / this.preview.duration);
        if (v.name === "evade")
          v.x -=
            (v.side === 0 ? 1 : -1) *
            Math.sin(Math.PI * clamp(elapsed / this.preview.duration)) *
            v.actor.height *
            0.28;
      }
    }
    if (this.groundedStage)
      for (const v of placements) {
        ctx.save();
        ctx.translate(v.x, ground + 2);
        ctx.scale(1, 0.18);
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, v.actor.height * 0.4);
        g.addColorStop(0, "#0d1813bb");
        g.addColorStop(1, "#0d181300");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(0, 0, v.actor.height * 0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    // Draw actors after projectile logic so source anchors and body layering remain stable.
    for (const v of placements) {
      if (v.actor.unit.hp <= 0) {
        v.name = "death";
        v.index = this.frame(
          v.actor,
          "death",
          (elapsed - (this.deathAt.get(v.actor.unit.id) ?? 0)) / 900,
        );
      }
      const pose = this.pose(v.actor, v.name, v.index),
        c = pose.clip;
      if (!c || !v.actor.skin) {
        this.missing.add(`${v.actor.unit.classId} / skin`);
        continue;
      }
      const a = anchor(c, pose.index),
        r = resourceRect(c, pose.index),
        scale = v.actor.scaleBySource.get(c.source) ?? 1;
      if (r) {
        const local = (r.x - (a?.feetX ?? r.anchorX)) * scale,
          width = r.width * scale,
          left = v.side === 1 ? v.x - local - width : v.x + local;
        this.lastFrames.push({
          skinId: v.actor.skin.id,
          actorId: v.actor.unit.id,
          animation: pose.name,
          index: pose.index,
          source: c.source,
          scale,
          x: this.mirror ? 960 - left - width : left,
          y:
            ground +
            (r.y - (a?.feetY ?? r.bodyGround ?? r.y + r.height)) * scale,
          width,
          height: r.height * scale,
          feetX: v.x,
          feetY: ground,
        });
      }
      ctx.save();
      ctx.translate(v.x, ground);
      if (v.side === 1) ctx.scale(-1, 1);
      drawResourceFrame(
        ctx,
        v.actor.skin.profile,
        pose.name,
        pose.index,
        -80,
        -153.6,
        160,
        160,
        true,
        colorForOwner(this.colors, v.actor.unit.owner),
        "world",
        {
          anchorX: a?.feetX,
          ground: a?.feetY,
          scale,
          maskRuns: a?.maskRuns,
          preparedImage: c && v.actor.preparedSources.get(c.source),
        },
      );
      if (this.diagnostic && r) {
        ctx.strokeStyle = "#6bffba";
        ctx.lineWidth = 1;
        ctx.strokeRect(
          (r.x - (a?.feetX ?? r.anchorX)) * scale,
          (r.y - (a?.feetY ?? r.bodyGround ?? r.y + r.height)) * scale,
          r.width * scale,
          r.height * scale,
        );
        ctx.strokeStyle = "#ffcc60";
        ctx.beginPath();
        ctx.moveTo(-9, 0);
        ctx.lineTo(9, 0);
        ctx.moveTo(0, -9);
        ctx.lineTo(0, 9);
        ctx.stroke();
        if (a) {
          ctx.fillStyle = "#ff8b73";
          ctx.beginPath();
          ctx.arc(
            (a.weaponTip.x - a.feetX) * scale,
            (a.weaponTip.y - a.feetY) * scale,
            3,
            0,
            Math.PI * 2,
          );
          ctx.fill();
        }
      }
      ctx.restore();
    }
    if (flash) {
      ctx.strokeStyle = "#ffe7a5";
      ctx.lineWidth = 2;
      for (let i = 0; i < 8; i++) {
        const angle = (i * Math.PI) / 4;
        ctx.beginPath();
        ctx.moveTo(flash.x, flash.y);
        ctx.lineTo(
          flash.x + Math.cos(angle) * 24 * flash.strength,
          flash.y + Math.sin(angle) * 24 * flash.strength,
        );
        ctx.stroke();
      }
    }
    if (this.diagnostic) {
      ctx.strokeStyle = "#d5c7a988";
      ctx.beginPath();
      ctx.moveTo(0, ground);
      ctx.lineTo(960, ground);
      ctx.stroke();
    }
    if (
      this.preview &&
      ["heal", "bandage"].includes(this.preview.animation) &&
      elapsed < this.preview.duration
    ) {
      const v = placements.find(
        (v) =>
          v.actor.unit.id === (this.preview!.targetId ?? this.preview!.actorId),
      );
      if (v && this.preview?.animation === "heal")
        drawHealing(ctx, elapsed, v.x, ground, 180);
    }
    ctx.restore();
    if (
      elapsed >= (this.preview?.duration ?? this.timeline.duration) &&
      !this.finished
    ) {
      this.finished = true;
      onDone?.();
    }
  }
  weaponPoint(
    actor: CombatActor,
    name: string,
    index: number,
    x: number,
    ground: number,
    direction: number,
  ) {
    const c = resolveClip(actor.skin?.profile, name),
      a = c && anchor(c, index),
      scale = c ? (actor.scaleBySource.get(c.source) ?? 1) : 1;
    return a
      ? {
          x: x + direction * (a.weaponTip.x - a.feetX) * scale,
          y: ground + (a.weaponTip.y - a.feetY) * scale,
        }
      : {
          x: x + direction * actor.height * 0.25,
          y: ground - actor.height * 0.6,
        };
  }
  diagnosticJSON() {
    return {
      actors: this.actors.map((a) => ({
        id: a.unit.id,
        skinId: a.skin?.id,
        classId: a.unit.classId,
        height: a.height,
        scaleBySource: Object.fromEntries(a.scaleBySource),
        issues: a.skin?.issues,
      })),
      frames: this.lastFrames,
      timeline: this.timeline,
      strikes: this.strikes,
      missing: [...this.missing],
    };
  }
}
