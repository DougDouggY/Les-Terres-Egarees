import { forestMap } from "./forest-map";
export const FOREST_CROP = { left: 10, top: 15, width: 34, height: 20 };
/** Crop the authored terrain; only road cells and their connections are repainted. */
export function compactForestMap() {
  const source = forestMap(60, 40).cells,
    { left, top, width, height } = FOREST_CROP;
  const cells = Array.from({ length: width * height }, (_, i) => {
    const x = i % width,
      y = Math.floor(i / width),
      c = { ...source[(y + top) * 60 + x + left], x, y };
    if (c.terrain === "road")
      Object.assign(c, {
        terrain: "grass",
        cost: 1,
        walk: true,
        defense: 0,
        opaque: false,
        tile: 0,
      });
    return c;
  });
  const road = (x: number, y: number) => {
    const c =
      x >= 0 && y >= 0 && x < width && y < height
        ? cells[y * width + x]
        : undefined;
    if (c)
      Object.assign(c, {
        terrain: "road",
        cost: 0.75,
        walk: true,
        defense: 0,
        opaque: false,
        tile: 2,
      });
  };
  for (let x = 0; x < width; x++) for (const y of [9, 10]) road(x, y);
  for (let y = 0; y <= 9; y++) for (const x of [9, 10]) road(x, y);
  // Adapt the southern loop, keeping the yellow junction a north-facing T.
  for (let y = 10; y <= 14; y++) for (const x of [14, 25]) road(x, y);
  for (let x = 14; x <= 25; x++) road(x, 14);
  return {
    cells,
    routes: [
      [
        [0, 9],
        [33, 9],
      ],
      [
        [9, 0],
        [9, 9],
      ],
      [
        [14, 10],
        [14, 14],
        [25, 14],
        [25, 10],
      ],
    ],
    width,
    height,
  };
}
