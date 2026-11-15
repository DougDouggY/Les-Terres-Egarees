/** Fit the full supplied painting: no stretching, cropping, or hidden shoreline. */
export function fittedBackdrop(
  w: number,
  h: number,
  viewW: number,
  viewH: number,
) {
  const scale = Math.min(viewW / w, viewH / h);
  return {
    x: (viewW - w * scale) / 2,
    y: (viewH - h * scale) / 2,
    w: w * scale,
    h: h * scale,
    scale,
  };
}
