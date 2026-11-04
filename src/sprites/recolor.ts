import { teamPalette, type TeamColor } from "../game/team-colors";
/** Only the reserved magenta material IDs are replaced; alpha and natural materials are untouched. */
export function isTeamPixel(r: number, g: number, b: number) {
  return (
    r > 35 &&
    b > 30 &&
    Math.min(r, b) > g * 1.65 &&
    Math.abs(r - b) < Math.max(r, b) * 0.52
  );
}
/** Soft magenta at cloth/skin boundaries must be connected to the reserved material. */
export function isTeamEdgePixel(r: number, g: number, b: number) {
  return r > g * 1.3 && b > g + 12 && b > r * 0.32;
}
export function recolorPixels(
  data: Uint8ClampedArray,
  color: TeamColor,
  options: { width?: number; softEdges?: boolean } = {},
) {
  const mask = new Uint8Array(data.length / 4);
  for (let i = 0; i < data.length; i += 4)
    if (data[i + 3] && isTeamPixel(data[i], data[i + 1], data[i + 2]))
      mask[i / 4] = 1;
  const width = options.width ?? 0;
  if (options.softEdges && width > 0) {
    const material = mask.slice();
    const height = mask.length / width;
    for (let pixel = 0; pixel < mask.length; pixel++) {
      const i = pixel * 4;
      if (
        mask[pixel] ||
        !data[i + 3] ||
        !isTeamEdgePixel(data[i], data[i + 1], data[i + 2])
      )
        continue;
      const x = pixel % width,
        y = Math.floor(pixel / width);
      let found = false;
      for (let dy = -4; dy <= 4 && !found; dy++)
        for (let dx = -4; dx <= 4; dx++) {
          if (
            Math.abs(dx) + Math.abs(dy) > 4 ||
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
  const target = teamPalette[color].rgb;
  for (let i = 0; i < data.length; i += 4) {
    if (!mask[i / 4]) continue;
    const shade = Math.max(data[i], data[i + 2]) / 255;
    for (let channel = 0; channel < 3; channel++)
      data[i + channel] = Math.round(target[channel] * Math.max(0.18, shade));
  }
  return data;
}
const cache = new WeakMap<HTMLImageElement, Map<string, HTMLCanvasElement>>();
export function recoloredImage(
  image: HTMLImageElement,
  color: TeamColor,
  softEdges = false,
) {
  let colors = cache.get(image);
  if (!colors) {
    colors = new Map();
    cache.set(image, colors);
  }
  const key = `${color}:${softEdges}`;
  let canvas = colors.get(key);
  if (canvas) return canvas;
  canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext("2d")!;
  context.drawImage(image, 0, 0);
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
  recolorPixels(pixels.data, color, { width: canvas.width, softEdges });
  context.putImageData(pixels, 0, 0);
  colors.set(key, canvas);
  return canvas;
}
