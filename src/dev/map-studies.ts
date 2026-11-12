/** Independent environment studies. No campaign state, units or save access. */
export const STUDY_TILE = 32;
export type StudyTile =
  | "wall"
  | "floor"
  | "rug"
  | "grass"
  | "path"
  | "water"
  | "deck"
  | "bridge"
  | "rail";
export type StudyMap = {
  id: "castle" | "boarding";
  name: string;
  width: number;
  height: number;
  tiles: StudyTile[];
  start: number;
};
const symbols: Record<string, StudyTile> = {
  "#": "wall",
  ".": "floor",
  r: "rug",
  g: "grass",
  p: "path",
  "~": "water",
  d: "deck",
  "=": "bridge",
  "|": "rail",
};
function parse(
  id: StudyMap["id"],
  name: string,
  rows: string[],
  start: [number, number],
): StudyMap {
  const width = rows[0].length;
  if (rows.some((row) => row.length !== width))
    throw Error("Nonrectangular map study");
  return {
    id,
    name,
    width,
    height: rows.length,
    tiles: rows.flatMap((row) => [...row].map((c) => symbols[c])),
    start: start[1] * width + start[0],
  };
}
export const castleStudy = parse(
  "castle",
  "Château abandonné",
  [
    "###############",
    "#.....#.......#",
    "#.....#..rrr..#",
    "#.....#..rrr..#",
    "#.....#..rrr..#",
    "#.....#.......#",
    "###..####..####",
    "#.............#",
    "#.............#",
    "######..#######",
    "ggggpppppppgggg",
    "ggggpppppppgggg",
  ],
  [6, 11],
);
export const boardingStudy = parse(
  "boarding",
  "Abordage naval",
  Array.from({ length: 15 }, (_, y) =>
    [2, 3, 7, 8, 12, 13].includes(y)
      ? "ddddddd======ddddddd"
      : "ddddddd|~~~~|ddddddd",
  ),
  [3, 7],
);
export const studies = { castle: castleStudy, boarding: boardingStudy };
export function studyWalkable(tile: StudyTile | undefined) {
  return !!tile && !["wall", "water", "rail"].includes(tile);
}
/** Uniform-cost orthogonal paths, deliberately independent of active campaign maps. */
export function studyPath(
  map: StudyMap,
  from: number,
  to: number,
): number[] | null {
  if (
    !Number.isInteger(from) ||
    !Number.isInteger(to) ||
    from < 0 ||
    to < 0 ||
    from >= map.tiles.length ||
    to >= map.tiles.length ||
    !studyWalkable(map.tiles[from]) ||
    !studyWalkable(map.tiles[to])
  )
    return null;
  const queue = [from],
    previous = new Map<number, number>([[from, -1]]);
  for (let i = 0; i < queue.length; i++) {
    const k = queue[i];
    if (k === to) {
      const result = [k];
      while (result[0] !== from) result.unshift(previous.get(result[0])!);
      return result;
    }
    const x = k % map.width,
      y = Math.floor(k / map.width);
    for (const [dx, dy] of [
      [1, 0],
      [0, 1],
      [-1, 0],
      [0, -1],
    ]) {
      const nx = x + dx,
        ny = y + dy,
        n = ny * map.width + nx;
      if (
        nx < 0 ||
        ny < 0 ||
        nx >= map.width ||
        ny >= map.height ||
        previous.has(n) ||
        !studyWalkable(map.tiles[n])
      )
        continue;
      previous.set(n, k);
      queue.push(n);
    }
  }
  return null;
}
