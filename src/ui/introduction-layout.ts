/** Cover the viewport without stretching; focus selects which scenery to preserve. */
export function fittedBackdrop(
  w: number,
  h: number,
  viewW: number,
  viewH: number,
  focusX = 0.5,
) {
  const scale = Math.max(viewW / w, viewH / h);
  return {
    x: (viewW - w * scale) * focusX,
    y: (viewH - h * scale) / 2,
    w: w * scale,
    h: h * scale,
    scale,
  };
}
