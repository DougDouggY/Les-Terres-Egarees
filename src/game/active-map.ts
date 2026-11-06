import * as prologue from "./map";
import { forestMap } from "../data/forest-map";
export * from "./map";
// The authored prologue module and its protected resources remain byte-for-byte intact.
// Keep array identity for legacy imports, save coordinates and tactical consumers.
const template = structuredClone(prologue.map);
const routes = structuredClone(prologue.roadRoutes);
export let roadRoutes = prologue.roadRoutes;
export type MapId = "prologue" | "forest";
export let currentMapId: MapId = "prologue";
export function activateMap(id: MapId = "prologue") {
  if (id === currentMapId) return;
  const board =
    id === "forest"
      ? forestMap(prologue.W, prologue.H)
      : { cells: structuredClone(template), routes: structuredClone(routes) };
  prologue.map.splice(0, prologue.map.length, ...board.cells);
  roadRoutes = board.routes;
  currentMapId = id;
}
