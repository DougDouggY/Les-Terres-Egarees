import type { CampProgress } from "./camp";
export type Faction = "north" | "knight";
export type Kind = "shield" | "bow" | "sword" | "crossbow" | "skeleton";
export type Terrain =
  | "grass"
  | "earth"
  | "road"
  | "sand"
  | "water"
  | "forest"
  | "tree"
  | "rock"
  | "wall"
  | "ruin"
  | "floor"
  | "debris"
  | "wagon"
  | "stairs"
  | "altar"
  | "arrival"
  | "hill"
  | "village";
export type Cell = {
  x: number;
  y: number;
  terrain: Terrain;
  cost: number;
  walk: boolean;
  defense: number;
  opaque: boolean;
  tile: number;
  base: "grass" | "sand";
  stairFacing?: "north" | "east" | "south" | "west";
  villagePart?: { dx: number; dy: number };
  prop?: { sector: 1 | 2; dx: number; dy: number };
  interactive?: string;
};
export type Unit = {
  id: string;
  owner: 0 | 1 | 2;
  front: 1 | 2;
  kind: Kind;
  name: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  strength: number;
  agility: number;
  initiative: number;
  defense: number;
  accuracy: number;
  move: number;
  vision: number;
  minRange: number;
  range: number;
  xp: number;
  level: number;
  potions: number;
  leader: boolean;
};
export type Front = { round: number; queue: string[]; index: number };
export type Perspective = {
  camera: { x: number; y: number };
  explored: number[];
  visible: number[];
  journal: string[];
  intro: number;
};
export type Campaign = {
  camp?: CampProgress;
  mapRevision?: number;
  version: 1;
  factions: [Faction, Faction];
  units: Unit[];
  players: [Perspective, Perspective];
  fronts: [Front, Front];
  common: Front;
  merged: boolean;
  events: string[];
  scene: string | null;
  scenePage: number;
  phase: "intro" | "battle" | "camp" | "defeat";
  active: 1 | 2;
  seed: number;
  inventory: { name: string; count: number }[];
  world: string[];
  history: string[];
};
