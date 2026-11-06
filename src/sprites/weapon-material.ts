/** Material correction on the existing squire's blade only; no new art or pose substitution.
 * Segments are normalized in their own atlas cell. Skin, hilt, clothes and alpha stay untouched.
 */
type Segment = [number, number, number, number, number];
const blades: Record<
  string,
  { columns: number; rows: number; bands: Record<number, Segment[]> }
> = {
  "tactical/lot4-recruits.png": {
    columns: 4,
    rows: 6,
    bands: {
      2: [
        [0.36, 0.56, 0.574, 0.754, 0.05],
        [0.348, 0.551, 0.558, 0.734, 0.05],
        [0.363, 0.559, 0.582, 0.75, 0.05],
        [0.527, 0.566, 0.75, 0.735, 0.05],
      ],
      3: [
        [0.34, 0.18, 0.48, 0.06, 0.045],
        [0.55, 0.38, 0.83, 0.34, 0.045],
        [0.35, 0.59, 0.58, 0.77, 0.05],
        [0.56, 0.9, 0.78, 0.93, 0.045],
      ],
    },
  },
  "tactical/combat-v3-swordsb.png": {
    columns: 8,
    rows: 6,
    bands: {
      4: [
        [0.43, 0.65, 0.72, 0.75, 0.045],
        [0.36, 0.53, 0.64, 0.69, 0.045],
        [0.48, 0.22, 0.65, 0.12, 0.05],
        [0.64, 0.56, 0.94, 0.79, 0.05],
        [0.64, 0.67, 0.93, 0.91, 0.05],
        [0.65, 0.7, 0.94, 0.94, 0.05],
        [0.61, 0.68, 0.84, 0.53, 0.045],
        [0.49, 0.68, 0.85, 0.72, 0.045],
      ],
    },
  },
  "tactical/combat-v4-mixed.png": {
    columns: 8,
    rows: 6,
    bands: {
      2: [
        [0.44, 0.73, 0.66, 0.91, 0.05],
        [0.48, 0.7, 0.66, 0.88, 0.05],
        [0, 0, 0, 0, 0],
        [0.3, 0.33, 0.57, 0.2, 0.05],
        [0.43, 0.66, 0.76, 0.81, 0.05],
        [0.39, 0.7, 0.72, 0.81, 0.05],
        [0.5, 0.62, 0.74, 0.45, 0.05],
        [0.57, 0.91, 0.85, 0.93, 0.04],
      ],
    },
  },
  "tactical/combat-v3-motion8.png": {
    columns: 4,
    rows: 6,
    bands: {
      1: [
        [0.48, 0.57, 0.63, 0.74, 0.045],
        [0.58, 0.43, 0.78, 0.31, 0.045],
        [0.56, 0.5, 0.76, 0.35, 0.045],
        [0.57, 0.47, 0.78, 0.39, 0.045],
      ],
    },
  },
  "tactical/combat-v2-states.png": {
    columns: 8,
    rows: 4,
    bands: {
      3: [
        [0.31, 0.65, 0.54, 0.84, 0.045],
        [0.56, 0.42, 0.77, 0.24, 0.045],
        [0.63, 0.4, 0.92, 0.33, 0.045],
        [0.55, 0.58, 0.82, 0.38, 0.045],
        [0.37, 0.66, 0.61, 0.81, 0.045],
        [0.47, 0.65, 0.77, 0.76, 0.045],
        [0.57, 0.85, 0.88, 0.9, 0.04],
        [0.51, 0.92, 0.92, 0.93, 0.035],
      ],
    },
  },
};
export function steelBladePixels(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  source: string,
) {
  const atlas = blades[source];
  if (!atlas) return 0;
  let changed = 0;
  const cw = width / atlas.columns,
    ch = height / atlas.rows;
  for (const [rowText, bands] of Object.entries(atlas.bands)) {
    const row = Number(rowText);
    bands.forEach(([ax, ay, bx, by, radius], column) => {
      if (!radius) return;
      const dx = bx - ax,
        dy = by - ay,
        len = dx * dx + dy * dy;
      for (
        let y = Math.max(0, Math.floor((row + Math.min(ay, by) - radius) * ch));
        y < Math.min(height, (row + Math.max(ay, by) + radius) * ch);
        y++
      )
        for (
          let x = Math.max(
            0,
            Math.floor((column + Math.min(ax, bx) - radius) * cw),
          );
          x < Math.min(width, (column + Math.max(ax, bx) + radius) * cw);
          x++
        ) {
          const px = x / cw - column,
            py = y / ch - row,
            t = Math.max(
              0,
              Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len),
            );
          if (
            (px - ax - t * dx) ** 2 + (py - ay - t * dy) ** 2 >
            radius * radius
          )
            continue;
          const i = (y * width + x) * 4,
            [r, g, b, a] = data.slice(i, i + 4);
          if (!a || r < g * 1.08 || g < b * 1.1 || r - b < 22) continue;
          const value = Math.round(0.3 * r + 0.59 * g + 0.11 * b);
          data[i] = Math.min(255, value + 7);
          data[i + 1] = Math.min(255, value + 12);
          data[i + 2] = Math.min(255, value + 20);
          changed++;
        }
    });
  }
  return changed;
}
const cache = new WeakMap<object, Map<string, HTMLCanvasElement>>();
export function steelWeaponSource(
  source: HTMLImageElement | HTMLCanvasElement,
  id: string,
) {
  if (!blades[id]) return source;
  let entries = cache.get(source);
  if (!entries) {
    entries = new Map();
    cache.set(source, entries);
  }
  if (entries.has(id)) return entries.get(id)!;
  const c = document.createElement("canvas");
  c.width = source.width;
  c.height = source.height;
  const ctx = c.getContext("2d")!;
  ctx.drawImage(source, 0, 0);
  const image = ctx.getImageData(0, 0, c.width, c.height);
  steelBladePixels(image.data, c.width, c.height, id);
  ctx.putImageData(image, 0, 0);
  entries.set(id, c);
  return c;
}
