/** Close tactical scale: one source cell (128 px) is one 32 px world cell. */
export const villageTileset = {
  source: "assets/kingdom-camp/streets-tileset.png",
  cell: 128,
  columns: 20,
  rows: 6,
  houses: [
    { x: 0, y: 0, w: 5, h: 5 },
    { x: 5, y: 0, w: 5, h: 5 },
    { x: 10, y: 0, w: 5, h: 5 },
    { x: 15, y: 0, w: 5, h: 5 },
  ],
  props: {
    bush: [0, 5],
    well: [1, 5],
    crate: [2, 5],
    barrel: [3, 5],
    tree: [4, 5],
    garden: [5, 5],
    floor: [6, 5],
    path: [7, 5],
    fence: [8, 5],
  },
} as const;
export type VillageProp = keyof typeof villageTileset.props;
