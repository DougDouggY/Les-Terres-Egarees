/** Source cells are 128 px; each game cell remains exactly 32 px. */
export const campTileset = {
  source: "assets/kingdom-camp/tileset.png",
  cell: 128,
  columns: 8,
  rows: 7,
  village: { x: 1, y: 4, w: 3, h: 3 },
  water: { x: 4, y: 0 },
  mountain: { x: 7, y: 0 },
  palisade: {
    horizontal: [4, 4],
    vertical: [5, 4],
    westSouth: [6, 4],
    eastSouth: [7, 4],
    westNorth: [4, 5],
    eastNorth: [5, 5],
    west: [6, 5],
    east: [7, 5],
    north: [4, 6],
    south: [5, 6],
  },
} as const;
