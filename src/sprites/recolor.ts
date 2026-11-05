import { teamPalette, type TeamColor } from "../game/team-colors";
export type RecolorSettings = {
  hue: number;
  hueTolerance: number;
  saturation: number;
  value: number;
  edgeHueTolerance: number;
  edgeSaturation: number;
  edgeDistance: number;
};
export const defaultRecolorSettings: Readonly<RecolorSettings> = {
  hue: 315,
  hueTolerance: 35,
  saturation: 0.4,
  value: 0.07,
  edgeHueTolerance: 42,
  edgeSaturation: 0.12,
  edgeDistance: 4,
};
let currentSettings: RecolorSettings = { ...defaultRecolorSettings };
export const recolorSettings = () => ({ ...currentSettings });
export function setRecolorSettings(patch: Partial<RecolorSettings>) {
  for (const key of Object.keys(
    defaultRecolorSettings,
  ) as (keyof RecolorSettings)[]) {
    const value = patch[key];
    if (typeof value === "number" && Number.isFinite(value))
      currentSettings[key] = value;
  }
  currentSettings.hue = ((currentSettings.hue % 360) + 360) % 360;
  for (const key of ["hueTolerance", "edgeHueTolerance"] as const)
    currentSettings[key] = Math.max(0, Math.min(70, currentSettings[key]));
  for (const key of ["saturation", "edgeSaturation", "value"] as const)
    currentSettings[key] = Math.max(0, Math.min(1, currentSettings[key]));
  currentSettings.edgeDistance = Math.max(
    0,
    Math.min(12, Math.floor(currentSettings.edgeDistance)),
  );
  return recolorSettings();
}
export function rgbToHsv(r: number, g: number, b: number) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b),
    delta = max - min;
  const hue =
    delta === 0
      ? 0
      : max === r
        ? 60 * (((g - b) / delta) % 6)
        : max === g
          ? 60 * ((b - r) / delta + 2)
          : 60 * ((r - g) / delta + 4);
  return {
    h: ((hue % 360) + 360) % 360,
    s: max === 0 ? 0 : delta / max,
    v: max,
  };
}
function hsvToRgb(h: number, s: number, v: number) {
  const c = v * s,
    x = c * (1 - Math.abs(((h / 60) % 2) - 1)),
    m = v - c;
  const [r, g, b] =
    h < 60
      ? [c, x, 0]
      : h < 120
        ? [x, c, 0]
        : h < 180
          ? [0, c, x]
          : h < 240
            ? [0, x, c]
            : h < 300
              ? [x, 0, c]
              : [c, 0, x];
  return [r, g, b].map((n) => Math.round((n + m) * 255));
}
const hueDistance = (a: number, b: number) =>
  Math.min(Math.abs(a - b), 360 - Math.abs(a - b));
export function isTeamPixel(
  r: number,
  g: number,
  b: number,
  settings: RecolorSettings = currentSettings,
) {
  const p = rgbToHsv(r, g, b);
  return (
    p.v >= settings.value &&
    p.s >= settings.saturation &&
    hueDistance(p.h, settings.hue) <= settings.hueTolerance
  );
}
export function isTeamEdgePixel(
  r: number,
  g: number,
  b: number,
  settings: RecolorSettings = currentSettings,
) {
  const p = rgbToHsv(r, g, b);
  return (
    p.v >= settings.value &&
    p.s >= settings.edgeSaturation &&
    hueDistance(p.h, settings.hue) <= settings.edgeHueTolerance
  );
}
/** HSV material range plus local low-saturation highlights. Original pixels and alpha remain untouched. */
export function recolorPixels(
  data: Uint8ClampedArray,
  color: TeamColor,
  options: {
    width?: number;
    softEdges?: boolean;
    settings?: RecolorSettings;
  } = {},
) {
  const settings = options.settings ?? currentSettings,
    mask = new Uint8Array(data.length / 4);
  for (let i = 0; i < data.length; i += 4)
    if (data[i + 3] && isTeamPixel(data[i], data[i + 1], data[i + 2], settings))
      mask[i / 4] = 1;
  const width = options.width ?? 0;
  if (options.softEdges !== false && width > 0) {
    const material = mask.slice(),
      height = mask.length / width,
      distance = settings.edgeDistance;
    for (let pixel = 0; pixel < mask.length; pixel++) {
      const i = pixel * 4;
      if (
        mask[pixel] ||
        !data[i + 3] ||
        !isTeamEdgePixel(data[i], data[i + 1], data[i + 2], settings)
      )
        continue;
      const x = pixel % width,
        y = Math.floor(pixel / width);
      let found = false;
      for (let dy = -distance; dy <= distance && !found; dy++)
        for (let dx = -distance; dx <= distance; dx++) {
          if (
            Math.abs(dx) + Math.abs(dy) > distance ||
            x + dx < 0 ||
            x + dx >= width ||
            y + dy < 0 ||
            y + dy >= height
          )
            continue;
          if (material[(y + dy) * width + x + dx]) {
            found = true;
            break;
          }
        }
      if (found) mask[pixel] = 1;
    }
  }
  const [r, g, b] = teamPalette[color].rgb;
  const target = rgbToHsv(r, g, b);
  for (let i = 0; i < data.length; i += 4) {
    if (!mask[i / 4]) continue;
    const source = rgbToHsv(data[i], data[i + 1], data[i + 2]),
      rgb = hsvToRgb(
        target.h,
        target.s * Math.min(1, source.s / 0.75),
        target.v * source.v,
      );
    for (let c = 0; c < 3; c++) data[i + c] = rgb[c];
  }
  return data;
}
const cache = new WeakMap<HTMLImageElement, Map<string, HTMLCanvasElement>>();
// Gallery calibration can produce many palettes of a large atlas. Bound total
// cached pixel memory across sources, rather than retaining every setting forever.
const recent = new Map<
  HTMLCanvasElement,
  { colors: Map<string, HTMLCanvasElement>; key: string; bytes: number }
>();
const cacheLimit = 64 * 1024 * 1024;
let cachedBytes = 0;
export function recoloredImage(
  image: HTMLImageElement,
  color: TeamColor,
  softEdges = true,
  sourceHue?: number,
) {
  let colors = cache.get(image);
  if (!colors) {
    colors = new Map();
    cache.set(image, colors);
  }
  // Source material palettes are explicit: old atlases use magenta, V3 blue.
  // Preserve gallery calibration as a relative offset, without mutating globals.
  const settings =
    sourceHue === undefined
      ? currentSettings
      : {
          ...currentSettings,
          hue:
            (sourceHue +
              currentSettings.hue -
              defaultRecolorSettings.hue +
              360) %
            360,
        };
  const key = `${color}:${softEdges}:${JSON.stringify(settings)}`;
  let canvas = colors.get(key);
  if (canvas) {
    const entry = recent.get(canvas)!;
    recent.delete(canvas);
    recent.set(canvas, entry);
    return canvas;
  }
  canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(image, 0, 0);
  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
  recolorPixels(pixels.data, color, {
    width: canvas.width,
    softEdges,
    settings,
  });
  ctx.putImageData(pixels, 0, 0);
  colors.set(key, canvas);
  const bytes = canvas.width * canvas.height * 4;
  cachedBytes += bytes;
  recent.set(canvas, { colors, key, bytes });
  while (cachedBytes > cacheLimit && recent.size > 1) {
    const [old, entry] = recent.entries().next().value!;
    recent.delete(old);
    entry.colors.delete(entry.key);
    cachedBytes -= entry.bytes;
  }
  return canvas;
}
