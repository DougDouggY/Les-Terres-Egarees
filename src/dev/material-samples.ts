import { gridPath } from "../game/grid-path";
export const SAMPLE_TILE = 32;
export type Material =
  | "floor"
  | "warm"
  | "wallH"
  | "wallV"
  | "corner"
  | "grass"
  | "wood"
  | "water"
  | "rail"
  | "plank"
  | "pillar"
  | "door"
  | "chest"
  | "rug"
  | "mast"
  | "crate"
  | "barrel";
export type MaterialSample = {
  id: "castle" | "boarding";
  width: number;
  height: number;
  tiles: Material[];
  start: number;
  doorOpen?: boolean;
};
export function materialSample(id: MaterialSample["id"]): MaterialSample {
  const width = 10,
    height = 8,
    tiles: Material[] = [];
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      let t: Material;
      if (id === "castle")
        t =
          x === 9 || y === 7
            ? "grass"
            : x === 8 && y === 6
              ? "corner"
              : x === 8
                ? "wallV"
                : y === 6
                  ? "wallH"
                  : "floor";
      else t = x >= 7 ? "water" : x === 6 ? "rail" : "wood";
      if (id === "boarding" && y >= 3 && y <= 4 && x >= 5) t = "plank";
      if (id === "boarding" && x >= 2 && x <= 3 && y >= 1 && y <= 2) t = "mast";
      if (id === "boarding" && x === 1 && y === 6) t = "crate";
      if (id === "boarding" && x === 5 && y === 0) t = "barrel";
      if (id === "castle" && y === 2 && x < 8) t = x === 3 ? "door" : "wallH";
      if (id === "castle" && x === 6 && y === 1) t = "chest";
      if (id === "castle" && x >= 2 && x <= 4 && y >= 4 && y <= 5) t = "rug";
      if (id === "castle" && x === 5 && y === 3) t = "pillar";
      tiles.push(t);
    }
  return {
    id,
    width,
    height,
    tiles,
    start: id === "castle" ? 4 * width + 1 : 4 * width + 2,
    doorOpen: id === "castle",
  };
}
export const materialWalkable = (t: Material | undefined, doorOpen = false) =>
  !!t &&
  (["floor", "warm", "grass", "wood", "plank", "rug"].includes(t) ||
    (t === "door" && doorOpen));
export function materialPath(
  map: MaterialSample,
  from: number,
  to: number,
  hidden: (k: number) => boolean = () => false,
) {
  if (
    hidden(from) ||
    hidden(to) ||
    !materialWalkable(map.tiles[from], map.doorOpen) ||
    !materialWalkable(map.tiles[to], map.doorOpen)
  )
    return null;
  return (
    gridPath(map.width, map.height, from, to, (k) =>
      !hidden(k) && materialWalkable(map.tiles[k], map.doorOpen) ? 1 : null,
    )?.steps ?? null
  );
}
