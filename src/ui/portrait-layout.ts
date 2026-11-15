export type PortraitBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};
export function opaquePortraitBounds(
  pixels: Uint8ClampedArray,
  w: number,
  h: number,
): PortraitBounds {
  let left = w,
    top = h,
    right = -1,
    bottom = -1;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (pixels[(y * w + x) * 4 + 3] > 32) {
        left = Math.min(left, x);
        top = Math.min(top, y);
        right = Math.max(right, x);
        bottom = Math.max(bottom, y);
      }
  return right < left
    ? { x: 0, y: 0, width: w, height: h }
    : { x: left, y: top, width: right - left + 1, height: bottom - top + 1 };
}
/** Unit sheets use a head-height reference; narrative frames retain their existing height. */
export function sheetPortraitPlacement(
  id: string,
  b: PortraitBounds,
  w = 512,
  h = 384,
) {
  const headFraction = id.startsWith("V")
    ? 0.65
    : id === "R03"
      ? 0.55
      : id.startsWith("R")
        ? 0.65
        : 0.56;
  const scale = Math.min(
    (h * 0.56) / (b.height * headFraction),
    w / b.width,
    h / b.height,
  );
  return {
    x: (w - b.width * scale) / 2,
    y: 0,
    width: b.width * scale,
    height: b.height * scale,
    headHeight: b.height * headFraction * scale,
  };
}
