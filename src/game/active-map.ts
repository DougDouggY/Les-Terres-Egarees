import { compactForestMap } from "../data/compact-forest-map";
import * as prologue from "./map";
import { forestMap } from "../data/forest-map";
export * from "./map";
// The authored prologue module and its protected resources remain byte-for-byte intact.
// Keep array identity for legacy imports, save coordinates and tactical consumers.
const template = structuredClone(prologue.map);
const routes = structuredClone(prologue.roadRoutes);
export let roadRoutes = prologue.roadRoutes;
export type MapId = "prologue" | "forest" | "forest-compact";
export let W = prologue.W,
  H = prologue.H;
export const key = (x: number, y: number) => y * W + x;
export const cell = (x: number, y: number) =>
  x >= 0 && y >= 0 && x < W && y < H ? prologue.map[key(x, y)] : undefined;
export const isForestMap = (id: MapId | undefined) =>
  id === "forest" || id === "forest-compact";
export let currentMapId: MapId = "prologue";
export function activateMap(id: MapId = "prologue") {
  if (id === currentMapId) return;
  const board =
    id === "forest-compact"
      ? compactForestMap()
      : id === "forest"
        ? forestMap(prologue.W, prologue.H)
        : { cells: structuredClone(template), routes: structuredClone(routes) };
  W = id === "forest-compact" ? 34 : prologue.W;
  H = id === "forest-compact" ? 20 : prologue.H;
  prologue.map.splice(0, prologue.map.length, ...board.cells);
  roadRoutes = board.routes;
  currentMapId = id;
}
