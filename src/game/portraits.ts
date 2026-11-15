import { classes } from "../data/classes";
import {
  compatiblePortraits,
  portraitAsset,
  portraitDefinition,
  predefinedPortraits,
} from "../data/portraits";
import type { Campaign, Unit, Faction } from "./types";
export type PortraitState = {
  version: 1;
  assignments: Record<string, string | null>;
  issues: string[];
};
const hash = (value: string) =>
  Array.from(value).reduce(
    (a, c) => Math.imul(a ^ c.charCodeAt(0), 16777619) >>> 0,
    2166136261,
  );
export function reserveHeroPortraits(
  s: Campaign,
  choices: (string | undefined)[],
) {
  const state = (s.portraits ??= { version: 1, assignments: {}, issues: [] });
  choices.forEach((id, i) => {
    if (!id) return;
    const u = s.units.find((u) => u.id === `p${i + 1}a`)!;
    if (
      !compatiblePortraits(s.factions[i], u.gender ?? "male").some(
        (p) => p.id === id,
      )
    )
      throw Error("Portrait de héros incompatible");
    if (Object.values(state.assignments).includes(id))
      throw Error("Portrait déjà choisi par l’autre joueur");
    state.assignments[u.id] = id;
  });
}
function isNamed(u: Unit) {
  return (
    u.leader ||
    u.hasPersonalName ||
    (u.owner !== 0 && u.hasPersonalName !== false && !u.summonedBy) ||
    u.id === "valdren-captain"
  );
}
export function ensurePortraits(s: Campaign) {
  const state = (s.portraits ??= { version: 1, assignments: {}, issues: [] });
  // Validate persisted identities before assigning newcomers; departed units retain reservations.
  if (state.version !== 1 || !state.assignments || !Array.isArray(state.issues))
    throw Error("Registre de portraits invalide");
  const used = new Set<string>();
  for (const [unitId, id] of Object.entries(state.assignments)) {
    if (id === null) continue;
    if (!portraitDefinition(id)) throw Error(`Portrait inconnu : ${id}`);
    if (used.has(id)) throw Error("Portrait nommé attribué deux fois");
    used.add(id);
    const reserved = Object.values(predefinedPortraits).find(
      (p) => p.unitId === unitId,
    );
    if (reserved && reserved.portraitId !== id)
      throw Error("Portrait réservé incompatible");
    if (portraitDefinition(id)?.category === "reserved" && !reserved)
      throw Error("Portrait réservé à un personnage du scénario");
  }
  // Heroes are allocated before companions, even in legacy saves.
  for (const u of [...s.units].sort(
    (a, b) => Number(b.leader) - Number(a.leader),
  )) {
    const identity = u.portraitIdentity ?? u.id;
    const reserved = Object.values(predefinedPortraits).find(
      (p) => p.unitId === u.id,
    );
    if (reserved) {
      if (state.assignments[identity] === undefined) {
        state.assignments[identity] = reserved.portraitId;
        used.add(reserved.portraitId);
      }
    } else if (isNamed(u) && state.assignments[identity] === undefined) {
      // Preserve unrelated legacy custom art; it is never silently replaced.
      if (u.portraitAsset && !u.portraitAsset.startsWith("assets/portraits/"))
        continue;
      const nativeFaction = classes[u.classId ?? ""]?.faction;
      const faction: Faction =
        nativeFaction === "north" || nativeFaction === "knight"
          ? nativeFaction
          : u.owner
            ? s.factions[u.owner - 1]
            : "knight";
      const genericIds =
        u.owner === 0 &&
        (u.kind === "skeleton" || u.classId?.startsWith("sans_"))
          ? ["N05"]
          : u.owner === 0 && faction === "knight"
            ? u.id === "valdren-captain"
              ? ["N04", "N03"]
              : ["N03", "N04"]
            : undefined;
      const pool = genericIds
        ? genericIds.filter((id) => !used.has(id)).map((id) => ({ id }))
        : compatiblePortraits(faction, u.gender ?? "male", [...used]);
      const id = pool.length
        ? pool[
            u.id === "valdren-captain"
              ? 0
              : hash(`${s.seed}:${identity}`) % pool.length
          ].id
        : null;
      state.assignments[identity] = id;
      if (id) used.add(id);
      else
        state.issues.push(
          `Aucun portrait compatible disponible pour ${u.name} (${u.id}).`,
        );
    }
    const id = state.assignments[identity];
    if (id) {
      u.portraitId = id;
      u.portraitAsset = portraitAsset(id);
    } else if (id === null) {
      delete u.portraitId;
      delete u.portraitAsset;
    } else if (!u.portraitAsset || (!isNamed(u) && u.owner === 0)) {
      const generic =
        u.kind === "skeleton" || u.classId?.startsWith("sans_")
          ? "N05"
          : u.owner === 0
            ? state.assignments["valdren-captain"] === "N03"
              ? "N04"
              : "N03"
            : hash(u.id) % 2
              ? "N01"
              : "N02";
      u.portraitId = generic;
      u.portraitAsset = portraitAsset(generic);
    }
  }
}
export function unitPortrait(s: Campaign | undefined, u: Unit) {
  if (s) ensurePortraits(s);
  const reserved = Object.values(predefinedPortraits).find(
    (p) => p.unitId === u.id,
  );
  if (reserved) return portraitAsset(reserved.portraitId);
  if (u.portraitId && portraitDefinition(u.portraitId))
    return portraitAsset(u.portraitId);
  const known = u.portraitAsset?.match(
    /^assets\/portraits\/([CVRN]\d{2})\.png$/,
  )?.[1];
  if (known && portraitDefinition(known)) return portraitAsset(known);
  // A missing or legacy sprite path is never enlarged as a dialogue portrait.
  return portraitAsset(
    u.kind === "skeleton" || u.classId?.startsWith("sans_")
      ? "N05"
      : u.owner === 0
        ? "N03"
        : "N01",
  );
}

/** New parties allocate only confirmed recruits; existing save reservations stay untouched. */
export function reserveCompanionPortraits(s: Campaign) {
  ensurePortraits(s);
}

/** Same allocator and IDs as campaign creation, without constructing/changing a map. */
export function creationPortraits(
  heroes: [import("./classes").HeroConfig, import("./classes").HeroConfig],
  selected: [string[], string[]],
  roster: readonly {
    id: string;
    name: string;
    classId: string;
    gender: "male" | "female";
  }[],
): Record<string, string | undefined> {
  const units: Unit[] = [];
  heroes.forEach((h, i) => {
    const owner = (i + 1) as 1 | 2;
    units.push({
      id: `p${owner}a`,
      name: h.name,
      gender: h.gender,
      classId: h.classId,
      owner,
      leader: true,
    } as Unit);
    selected[i].forEach((id, j) => {
      const c = roster.find((c) => c.id === id)!;
      units.push({
        id: `p${owner}${j === 0 ? "b" : "c"}`,
        portraitIdentity: `companion:${id}`,
        name: c.name,
        gender: c.gender,
        classId: c.classId,
        owner,
        hasPersonalName: true,
      } as Unit);
    });
  });
  const s = {
    units,
    factions: heroes.map((h) => h.faction),
    seed: 92481,
  } as Campaign;
  reserveHeroPortraits(
    s,
    heroes.map((h) => h.portraitId),
  );
  reserveCompanionPortraits(s);
  ensurePortraits(s);
  return Object.fromEntries(units.map((u) => [u.id, u.portraitAsset]));
}
