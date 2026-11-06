import { steelWeaponSource } from "./weapon-material";
import { resourceScale } from "./geometry";
import atlasLayouts from "../assets/tactical/atlas-layout.json";
import combatAnchors from "../assets/tactical/combat-anchors.json";
import { visualClasses } from "./visual-classes";
import { recoloredImage } from "./recolor";
import {
  colorForOwner,
  type TeamColor,
  type TeamColors,
} from "../game/team-colors";
import type { Unit } from "../game/types";
import { unitClass, activeWeapon, visualState, classes } from "../game/classes";
import {
  buildSpriteCatalog,
  findProfile,
  profileKey,
  resolveClip,
  type Clip,
  type SpriteProfile,
} from "./catalog";
// Adding a *.sprite.json descriptor registers its clips for both the game and the gallery.
const descriptions = import.meta.glob("../assets/tactical/**/*.sprite.json", {
  eager: true,
  import: "default",
});
export const spriteCatalog = buildSpriteCatalog(Object.values(descriptions));
for (const p of spriteCatalog.profiles)
  if (!visualClasses[p.classId])
    spriteCatalog.errors.push(`Classe non configurée : ${p.classId}`);
spriteCatalog.profiles = spriteCatalog.profiles.filter(
  (p) => !!visualClasses[p.classId],
);
export const looseSpriteFiles = import.meta.glob(
  "../assets/tactical/**/*.{png,webp}",
  { eager: true, query: "?url", import: "default" },
) as Record<string, string>;
export function unitSpriteProfile(u: Unit) {
  // Explicit visual-only enemy skins retain their identity on map and in battle.
  // A change of equipment/state invalidates a stale binding rather than showing
  // an old weapon or human form on a transformed actor.
  const bound =
    u.combatSkinId &&
    spriteCatalog.profiles.find((p) => profileKey(p) === u.combatSkinId);
  if (
    bound &&
    bound.equipment === activeWeapon(u).visual &&
    bound.state === visualState(u)
  )
    return bound;
  const exact = findProfile(
    spriteCatalog.profiles,
    unitClass(u).id,
    u.gender ?? "male",
    activeWeapon(u).visual,
    visualState(u),
  );
  if (exact) return exact;
}
export function unitVisualNote(u: Unit) {
  const p = unitSpriteProfile(u);
  if (!p) return "Sprite indisponible";
  if (u.combatSkinId === profileKey(p)) return "";
  return p.classId !== u.classId
    ? `Sprite ${u.bearForm ? "ours" : unitClass(u).name} manquant · aucune substitution de personnage`
    : "";
}
const images = new Map<string, HTMLImageElement>();
export function spriteImage(source: string) {
  let img = images.get(source);
  if (!img) {
    img = new Image();
    img.src =
      looseSpriteFiles["../assets/" + source] ??
      import.meta.env.BASE_URL + source.replace(/^\//, "");
    images.set(source, img);
  }
  return img;
}
const maskedFrames = new WeakMap<object, Map<string, HTMLCanvasElement>>();
function extractedFrame(
  source: HTMLImageElement | HTMLCanvasElement,
  rect: { x: number; y: number; width: number; height: number },
  runs: number[][],
) {
  let cache = maskedFrames.get(source as object);
  if (!cache) {
    cache = new Map();
    maskedFrames.set(source as object, cache);
  }
  const key = [rect.x, rect.y, rect.width, rect.height].join(":");
  let canvas = cache.get(key);
  if (canvas) return canvas;
  canvas = document.createElement("canvas");
  canvas.width = rect.width;
  canvas.height = rect.height;
  const c = canvas.getContext("2d")!;
  c.beginPath();
  for (const [x, y, w] of runs) c.rect(x - rect.x, y - rect.y, w, 1);
  c.clip();
  c.drawImage(
    source,
    rect.x,
    rect.y,
    rect.width,
    rect.height,
    0,
    0,
    rect.width,
    rect.height,
  );
  cache.set(key, canvas);
  return canvas;
}
/** A battle keeps this prepared image alive until its scene ends, even if
 * gallery/map activity evicts the global recoloration LRU in the meantime. */
export function prepareSpriteSource(c: Clip, color?: TeamColor) {
  const img = spriteImage(c.source);
  if (!img.complete || !img.naturalWidth) return undefined;
  let source: HTMLImageElement | HTMLCanvasElement = img;
  if (color && c.recolor) {
    try {
      source = recoloredImage(
        img,
        color,
        c.recolorEdges,
        c.recolor === "blue" ? 215 : undefined,
      );
    } catch (error) {
      console.warn(
        "Recoloration indisponible, source du même skin conservée",
        c.source,
        error,
      );
    }
  }
  return steelWeaponSource(source, c.source);
}
export function drawResourceFrame(
  ctx: CanvasRenderingContext2D,
  p: SpriteProfile | undefined,
  animation: string,
  index: number,
  x: number,
  y: number,
  width: number,
  height: number,
  pixelArt = false,
  color?: TeamColor,
  scaleMode: "fit" | "world" = "fit",
  placement?: {
    anchorX?: number;
    ground?: number;
    scale?: number;
    maskRuns?: number[][];
    preparedImage?: HTMLImageElement | HTMLCanvasElement;
  },
) {
  const c = resolveClip(p, animation);
  if (!c) return false;
  const img = spriteImage(c.source);
  if (!img.complete || !img.naturalWidth) return false;
  const sw = img.naturalWidth / c.columns,
    sh = img.naturalHeight / c.rows,
    indexInClip =
      c.loop === false
        ? Math.max(0, Math.min(c.frames.length - 1, index))
        : ((index % c.frames.length) + c.frames.length) % c.frames.length,
    column = c.cells?.[indexInClip]?.column ?? c.frames[indexInClip],
    left = Math.round(column * sw),
    sourceRow = c.cells?.[indexInClip]?.row ?? c.row,
    top = Math.round(sourceRow * sh);
  const source = placement?.preparedImage ?? prepareSpriteSource(c, color);
  if (!source) return false;
  ctx.save();
  ctx.imageSmoothingEnabled = !pixelArt;
  const layout = (
    atlasLayouts as Record<
      string,
      {
        frames: {
          row: number;
          column: number;
          x: number;
          y: number;
          width: number;
          height: number;
          ground: number;
          anchorX: number;
          bodyGround?: number;
        }[];
      }
    >
  )[c.source];
  const rect = layout?.frames.find(
    (f) => f.row === sourceRow && f.column === column,
  );
  if (rect) {
    const scale =
      placement?.scale ??
      resourceScale(p!, c, width, height, scaleMode, indexInClip);
    const dx =
        x + width / 2 + (rect.x - (placement?.anchorX ?? rect.anchorX)) * scale,
      dy =
        y +
        height * (scaleMode === "world" ? 0.96 : 0.9) +
        (rect.y -
          (placement?.ground ?? rect.bodyGround ?? rect.y + rect.height)) *
          scale;
    // The same isolated silhouette is used in combat, gallery and map previews.
    // V3 source atlases can contain faint matte noise outside the actual figure.
    const runs =
      placement?.maskRuns ??
      (/^tactical\/combat-v[34]-/.test(c.source)
        ? (
            combatAnchors as Record<
              string,
              Record<string, { maskRuns?: number[][] }>
            >
          )[c.source]?.[`${sourceRow}:${column}`]?.maskRuns
        : undefined);
    const masked = runs?.length
      ? extractedFrame(source, rect, runs)
      : undefined;
    ctx.drawImage(
      masked ?? source,
      masked ? 0 : rect.x,
      masked ? 0 : rect.y,
      rect.width,
      rect.height,
      dx,
      dy,
      rect.width * scale,
      rect.height * scale,
    );
  } else
    ctx.drawImage(
      source,
      left,
      top,
      Math.round((column + 1) * sw) - left,
      Math.round((sourceRow + 1) * sh) - top,
      x,
      y,
      width,
      height,
    );
  ctx.restore();
  return true;
}
export function resourceStatus(
  p: SpriteProfile | undefined,
  animation: string,
) {
  const c = resolveClip(p, animation);
  if (!c) return "missing";
  const img = spriteImage(c.source);
  return img.complete ? (img.naturalWidth ? "ready" : "broken") : "loading";
}

/** Decode and recolor before starting a one-shot timeline, so first use cannot skip poses. */
export async function warmSprites(
  units: Unit[],
  colors: TeamColors | undefined,
  animations: string[],
) {
  const requests = units.map((unit) => ({
    unit,
    profile: unitSpriteProfile(unit),
  }));
  const sources = new Set<string>();
  for (const { profile } of requests)
    for (const name of animations) {
      const c = resolveClip(profile, name);
      if (c) sources.add(c.source);
    }
  await Promise.all(
    Array.from(sources).map((source) =>
      spriteImage(source)
        .decode()
        .catch(() => {}),
    ),
  );
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext("2d")!;
  for (const { unit, profile } of requests)
    for (const name of animations)
      drawResourceFrame(
        ctx,
        profile,
        name,
        0,
        0,
        0,
        64,
        64,
        true,
        colorForOwner(colors, unit.owner),
        "world",
      );
}
