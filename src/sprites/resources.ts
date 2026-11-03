import { recoloredImage } from "./recolor";
import type { TeamColor } from "../game/team-colors";
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
  if (!classes[p.classId])
    spriteCatalog.errors.push(`Classe non configurée : ${p.classId}`);
spriteCatalog.profiles = spriteCatalog.profiles.filter(
  (p) => !!classes[p.classId],
);
export const looseSpriteFiles = import.meta.glob(
  "../assets/tactical/**/*.{png,webp}",
  { eager: true, query: "?url", import: "default" },
) as Record<string, string>;
export const unitSpriteProfile = (u: Unit) =>
  findProfile(
    spriteCatalog.profiles,
    unitClass(u).id,
    u.gender ?? "male",
    activeWeapon(u).visual,
    visualState(u),
  );
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
) {
  const c = resolveClip(p, animation);
  if (!c) return false;
  const img = spriteImage(c.source);
  if (!img.complete || !img.naturalWidth) return false;
  const sw = img.naturalWidth / c.columns,
    sh = img.naturalHeight / c.rows,
    column =
      c.frames[((index % c.frames.length) + c.frames.length) % c.frames.length],
    left = Math.round(column * sw),
    top = Math.round(c.row * sh),
    source =
      color && c.recolor === "magenta" ? recoloredImage(img, color) : img;
  ctx.save();
  ctx.imageSmoothingEnabled = !pixelArt;
  ctx.drawImage(
    source,
    left,
    top,
    Math.round((column + 1) * sw) - left,
    Math.round((c.row + 1) * sh) - top,
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
