/** Terrain drafts only: no campaign events, enemies or save identifiers. */
export type TerrainDraft = {
  id: "castle-approach" | "supplies";
  title: string;
  atlas: "castle" | "wilds";
  width: number;
  height: number;
  tiles: number[];
  blocked: boolean[];
  start: [number, number];
  destination: [number, number];
};
export function futureTerrainMaps(): TerrainDraft[] {
  const make = (
    id: TerrainDraft["id"],
    title: string,
    atlas: TerrainDraft["atlas"],
  ): TerrainDraft => ({
    id,
    title,
    atlas,
    width: 36,
    height: 28,
    tiles: Array(36 * 28).fill(0),
    blocked: Array(36 * 28).fill(false),
    start: [3, 25],
    destination: [30, 3],
  });
  const castle = make(
      "castle-approach",
      "Chapitre III · Abords du château oublié",
      "castle",
    ),
    forest = make(
      "supplies",
      "Chapitre IV · Chemins du ravitaillement",
      "wilds",
    );
  castle.tiles.fill(16); // Grass shared with the forest atlas outside the courtyard.
  for (let y = 8; y <= 22; y++)
    for (let x = 9; x <= 28; x++) castle.tiles[y * 36 + x] = 0;
  const put = (
    m: TerrainDraft,
    x: number,
    y: number,
    tile: number,
    blocked = false,
  ) => {
    const k = y * m.width + x;
    m.tiles[k] = tile;
    m.blocked[k] = blocked;
  };
  // A staggered approach with two open accesses. The approved interior is kept separately.
  for (let y = 0; y < 28; y++)
    for (let x = 0; x < 36; x++) {
      if (x < 3 || x > 33 || y < 2) put(castle, x, y, 16);
      if ((x * 11 + y * 7) % 53 === 0 && x > 5 && y > 4)
        put(castle, x, y, 13, true);
    }
  for (let x = 8; x <= 31; x++)
    if (x !== 17 && x !== 18) put(castle, x, 7, 4, true);
  for (let y = 7; y < 23; y++)
    if (y !== 17 && y !== 18) put(castle, 8, y, 5, true);
  for (let y = 13; y < 24; y++)
    if (y !== 19 && y !== 20) put(castle, 29, y, 5, true);
  put(castle, 8, 7, 6, true);
  for (let y = 22; y < 28; y++) for (const x of [3, 4]) put(castle, x, y, 2);
  for (let x = 3; x < 19; x++) for (const y of [22, 23]) put(castle, x, y, 2);
  for (let y = 4; y < 24; y++) for (const x of [17, 18]) put(castle, x, y, 2);
  for (let x = 17; x <= 30; x++) for (const y of [3, 4]) put(castle, x, y, 3);
  for (const [x, y] of [
    [5, 6],
    [5, 13],
    [32, 10],
    [24, 25],
    [11, 3],
  ])
    put(castle, x, y, 14, true);
  // A stream with two crossings and winding lanes; supplies remain scenery.
  for (let y = 0; y < 28; y++) {
    const bank = y < 10 ? 15 : y < 19 ? 17 : 19;
    for (let x = bank; x < bank + 2; x++) put(forest, x, y, 3, true);
  }
  for (let y = 21; y <= 26; y++) for (const x of [3, 4]) put(forest, x, y, 1);
  for (let x = 3; x <= 27; x++) for (const y of [20, 21]) put(forest, x, y, 1);
  for (let y = 5; y <= 21; y++) for (const x of [26, 27]) put(forest, x, y, 1);
  for (let x = 10; x <= 27; x++) for (const y of [7, 8]) put(forest, x, y, 1);
  for (let y = 3; y <= 8; y++)
    for (let x = 26; x <= 30; x++) put(forest, x, y, 10);
  for (const y of [7, 8]) for (let x = 14; x <= 17; x++) put(forest, x, y, 8);
  for (const y of [20, 21]) for (let x = 18; x <= 21; x++) put(forest, x, y, 8);
  for (let y = 1; y < 27; y++)
    for (let x = 1; x < 35; x++) {
      const k = y * 36 + x;
      if (forest.tiles[k] !== 0 || (x < 6 && y > 21) || (x > 25 && y < 9))
        continue;
      const hash = (x * 37 + y * 61 + x * y * 7) % 41;
      if (hash < 4)
        put(forest, x, y, hash === 0 ? 7 : hash === 1 ? 4 : 5, true);
    }
  for (const [x, y, t] of [
    [28, 5, 12],
    [29, 5, 12],
    [28, 6, 13],
    [30, 6, 14],
    [10, 15, 6],
  ])
    put(forest, x, y, t, true);
  for (const m of [castle, forest])
    for (const [x, y] of [m.start, m.destination])
      m.blocked[y * 36 + x] = false;
  return [castle, forest];
}
