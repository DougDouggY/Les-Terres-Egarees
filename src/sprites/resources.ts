import { resourceScale } from "./geometry";
import atlasLayouts from "../assets/tactical/atlas-layout.json";
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
  const exact = findProfile(
    spriteCatalog.profiles,
    unitClass(u).id,
    u.gender ?? "male",
    activeWeapon(u).visual,
    visualState(u),
  );
  if (exact) return exact;
  // Preserve a real prior-class resource for promotions awaiting art; never claim it depicts a bear.
  const prior =
    u.visualFallbackClassId ??
    (["hamrammr", "volva"].includes(u.classId ?? "") ? "shaman" : undefined);
  if (prior)
    return spriteCatalog.profiles.find(
      (p) =>
        p.classId === prior && (p.gender === u.gender || p.gender === "any"),
    );
}
export function unitVisualNote(u: Unit) {
  const p = unitSpriteProfile(u);
  if (!p) return "Sprite indisponible";
  return p.classId !== u.classId
    ? `Sprite ${u.bearForm ? "ours" : unitClass(u).name} manquant · silhouette de classe précédente conservée`
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
    top = Math.round(sourceRow * sh),
    source =
      color && c.recolor === "magenta"
        ? recoloredImage(img, color, c.recolorEdges)
        : img;
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
    const scale = resourceScale(p!, c, width, height, scaleMode, indexInClip);
    const dx = x + width / 2 + (rect.x - rect.anchorX) * scale,
      dy =
        y +
        height * (scaleMode === "world" ? 0.96 : 0.9) +
        (rect.y - (rect.bodyGround ?? rect.y + rect.height)) * scale;
    ctx.drawImage(
      source,
      rect.x,
      rect.y,
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
