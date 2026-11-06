import { chapterScenes, chapterLines, upgradeChapter1 } from "./chapter1";
import { globalInitiative } from "./initiative";
import { normalizeTeamColors } from "./team-colors";
import {
  classes,
  hydrateClass,
  discoverUnit,
  revealPromotionOptions,
  validateRecruit,
} from "./classes";
import type { Campaign } from "./types";
import { visibility } from "./vision";
import {
  cell,
  key,
  map,
  distance,
  refurbishedWalls,
  MAP_REVISION,
  activateMap,
} from "./active-map";
export function encode(s: Campaign) {
  if (s.phase === "defeat")
    throw Error(
      "La dernière sauvegarde stable est conservée après une défaite",
    );
  if ((s.scene && !s.scene.startsWith("chapter1:")) || s.phase === "intro")
    throw Error("Sauvegarde indisponible pendant une cinématique");
  return JSON.stringify(s);
}
export function decode(raw: string): Campaign {
  const s = JSON.parse(raw);
  s.teamColors = normalizeTeamColors(s.teamColors);
  if (
    s.version !== 1 ||
    !Array.isArray(s.units) ||
    !Array.isArray(s.players) ||
    s.players.length !== 2 ||
    !Array.isArray(s.fronts)
  )
    throw Error("Sauvegarde incompatible");
  if (s.mapId !== undefined && !["prologue", "forest"].includes(s.mapId))
    throw Error("Carte inconnue");
  activateMap(s.mapId ?? "prologue");
  if (s.forestChapter) {
    const f = s.forestChapter;
    if (
      s.mapId !== "forest" ||
      ![
        "introduction",
        "choice",
        "battle",
        "recruitment",
        "cave",
        "complete",
      ].includes(f.stage) ||
      !f.votes ||
      !Array.isArray(f.completed) ||
      Object.entries(f.votes).some(
        ([owner, choice]) =>
          !["1", "2"].includes(owner) ||
          !["travelers", "storm"].includes(choice as string),
      ) ||
      (f.choice !== undefined && !["travelers", "storm"].includes(f.choice))
    )
      throw Error("Progression du chapitre invalide");
  } else if (s.mapId === "forest") throw Error("Chapitre absent");
  // Convert positions and exploration indices before applying revision-5 collisions.
  if ((s.mapRevision ?? 1) < 5) {
    for (const u of s.units) {
      u.x *= 2;
      u.y *= 2;
    }
    for (const p of s.players) {
      const expand = (indices: number[]) =>
        indices.flatMap((k) => {
          const x = (k % 30) * 2,
            y = Math.floor(k / 30) * 2;
          return [key(x, y), key(x + 1, y), key(x, y + 1), key(x + 1, y + 1)];
        });
      p.explored = expand(p.explored);
      p.visible = [];
      p.camera = { x: 0, y: 0 };
    }
  }
  const updatedMap = (s.mapRevision ?? 1) < MAP_REVISION;
  if (updatedMap) {
    const occupied = new Set<number>(
      s.units.filter((u: any) => u.hp > 0).map((u: any) => key(u.x, u.y)),
    );
    let relocated = 0;
    for (const u of s.units)
      if (refurbishedWalls.has(key(u.x, u.y)) && !cell(u.x, u.y)?.walk) {
        const destination = map
          .filter((c) => c.walk && !occupied.has(key(c.x, c.y)))
          .sort(
            (a, b) =>
              distance(a, u) - distance(b, u) || key(a.x, a.y) - key(b.x, b.y),
          )[0];
        if (!destination) throw Error("Mise à jour de carte impossible");
        occupied.delete(key(u.x, u.y));
        u.x = destination.x;
        u.y = destination.y;
        if (u.hp > 0) occupied.add(key(u.x, u.y));
        relocated++;
      }
    if (relocated)
      for (const p of s.players)
        p.journal.push(
          "Le terrain a été réaménagé : les unités concernées ont été replacées au plus près, sans perte de PV ni de progression.",
        );
    s.mapRevision = MAP_REVISION;
  }
  for (const u of s.units) {
    hydrateClass(u);
    validateRecruit(u);
    if (u.owner !== 0) {
      discoverUnit(s, u, true);
      revealPromotionOptions(s, u);
    }
  }
  if (
    !s.sandbox &&
    s.phase === "battle" &&
    s.chapter1?.started &&
    s.chapter1RulesVersion === undefined
  ) {
    // Existing chapter saves retain their roster, positions and wounds; no surprise spawns on load.
    for (const u of s.units)
      if (u.owner === 0 && /^(e\d+|sanctuary-[01])$/.test(u.id)) {
        const ratio = u.maxHp > 0 ? u.hp / u.maxHp : 0;
        u.maxHp = Math.min(u.maxHp, 18);
        u.hp = Math.min(u.maxHp, Math.ceil(u.maxHp * ratio));
        u.strength = Math.min(u.strength, 5);
        u.defense = Math.min(u.defense, 1);
        u.agility = Math.min(u.agility, 3);
        u.initiative = Math.min(u.initiative, 4);
        u.move = Math.min(u.move, 3);
      }
    s.chapter1RulesVersion = 2;
  }
  if (!s.sandbox && s.chapter1?.started && s.chapter1RulesVersion !== 3) {
    for (const u of s.units)
      if (u.owner === 0 && /^(e\d+|sanctuary-[01])$/.test(u.id)) {
        const replacement = (
          {
            raider: "sans_axe",
            spearman: "sans_spear",
            hunter: "sans_archer",
          } as Record<string, string>
        )[u.classId ?? ""];
        if (replacement) {
          u.classId = replacement;
          u.kind = "skeleton";
          u.name = classes[replacement].name;
          u.carriedWeapons = [...classes[replacement].starter];
          u.activeWeaponId = u.carriedWeapons[0];
          delete u.combatSkinId;
          delete u.visualFallbackClassId;
          hydrateClass(u);
        }
      }
    s.chapter1RulesVersion = 3;
  }
  for (const u of s.units)
    if (/^p[12][bc]$/.test(u.id) && u.name === "Alix" && u.gender === "male")
      u.name = "Armand";
  if (s.phase === "camp") s.phase = "summary";
  if (s.phase === "intro") s.phase = "battle";
  if (s.scene?.startsWith("chapter1:")) {
    const p = s.chapter1?.pending;
    if (
      !p ||
      !chapterScenes.includes(p.id) ||
      s.scene !== "chapter1:" + p.id ||
      !Number.isInteger(p.page) ||
      p.page < 0 ||
      p.page >= chapterLines(s, p.id).length ||
      ![1, 2].includes(p.owner) ||
      (p.readBy !== undefined &&
        (!Array.isArray(p.readBy) ||
          p.readBy.some((id: unknown) => id !== 1 && id !== 2) ||
          new Set(p.readBy).size !== p.readBy.length))
    )
      throw Error("Scène de chapitre invalide");
  } else if (s.scene && s.scene !== "meeting" && s.scene !== "ending")
    s.scene = null;
  upgradeChapter1(s);
  validate(s);
  globalInitiative(s);
  if (updatedMap) visibility(s);
  return s;
}
export function validate(s: Campaign) {
  const occupied = new Set<number>(),
    ids = new Set<string>();
  for (const u of s.units) {
    if (ids.has(u.id)) throw Error("Identifiant dupliqué");
    ids.add(u.id);
    if (
      !Number.isInteger(u.x) ||
      !Number.isInteger(u.y) ||
      !cell(u.x, u.y)?.walk
    )
      throw Error("Unité hors grille ou sur obstacle");
    if (u.hp > 0) {
      const k = key(u.x, u.y);
      if (occupied.has(k)) throw Error("Unités superposées");
      occupied.add(k);
    }
  }
}
