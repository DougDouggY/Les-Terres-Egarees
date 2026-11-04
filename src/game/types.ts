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
  originClassId?: string;
  individualVariation?: Record<string, number>;
  lastLevelGains?: import("./progression").StatGains;
  parryPoints?: number;
  parryBonusWon?: boolean;
  promoted?: boolean;
  bearForm?: boolean;
  bearTurns?: number;
  bearCooldown?: number;
  bearBase?: {
    maxHp: number;
    strength: number;
    defense: number;
    agility: number;
    move: number;
    weapon: string;
  };
  visualFallbackClassId?: string;
  buff?: { defense: number; turns: number };

  classId?: string;
  gender?: import("../data/classes").Gender;
  portraitAsset?: string;
  carriedWeapons?: string[];
  activeWeaponId?: string;
  recruitChoices?: [string, string];
  crossbowLoaded?: boolean;
  bandages?: number;
  bannerPlanted?: boolean;
  bannerUsed?: boolean;
  fortified?: boolean;
  movedDistance?: number;
  summonedBy?: string;
  summonTurns?: number;
  summonedAt?: number;
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
  initiativeVersion?: 2;
  committedMove?: string;
  encounterContinuation?: { actorId: string; targetId?: string };
  previousInitiative?: Front;
  sandbox?: boolean;
  sandboxFlat?: boolean;
  recruitmentClaims?: Record<string, 1 | 2>;
  chapterMode?: "cooperative" | "separate";
  teamColors?: import("./team-colors").TeamColors;
  discoveries?: {
    weaknesses?: string[];
    classes: string[];
    weapons: import("../data/classes").WeaponCategory[];
    skills: import("../data/classes").SkillId[];
  };
  banners?: {
    owner: 1 | 2;
    x: number;
    y: number;
    hp?: number;
    maxHp?: number;
  }[];
  activationSerial?: number;
  summonSerial?: number;
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
  phase: "intro" | "battle" | "camp" | "summary" | "defeat";
  active: 1 | 2;
  seed: number;
  inventory: { name: string; count: number }[];
  world: string[];
  history: string[];
};
