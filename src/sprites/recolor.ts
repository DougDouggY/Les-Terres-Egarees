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
export function recolorPixels(data: Uint8ClampedArray, color: TeamColor) {
  const target = teamPalette[color].rgb;
  for (let i = 0; i < data.length; i += 4) {
    if (!data[i + 3] || !isTeamPixel(data[i], data[i + 1], data[i + 2]))
      continue;
    const shade = Math.max(data[i], data[i + 2]) / 255;
    for (let channel = 0; channel < 3; channel++)
      data[i + channel] = Math.round(target[channel] * Math.max(0.18, shade));
  }
  return data;
}
const cache = new WeakMap<
  HTMLImageElement,
  Map<TeamColor, HTMLCanvasElement>
>();
export function recoloredImage(image: HTMLImageElement, color: TeamColor) {
  let colors = cache.get(image);
  if (!colors) {
    colors = new Map();
    cache.set(image, colors);
  }
  let canvas = colors.get(color);
  if (canvas) return canvas;
  canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext("2d")!;
  context.drawImage(image, 0, 0);
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
  recolorPixels(pixels.data, color);
  context.putImageData(pixels, 0, 0);
  colors.set(color, canvas);
  return canvas;
}
