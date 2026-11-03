import type { Campaign } from "./types";
import { visibility } from "./vision";
import {
  cell,
  key,
  map,
  distance,
  refurbishedWalls,
  MAP_REVISION,
} from "./map";
export function encode(s: Campaign) {
  if (s.phase === "defeat")
    throw Error(
      "La dernière sauvegarde stable est conservée après une défaite",
    );
  if (s.scene || s.phase === "intro")
    throw Error("Sauvegarde indisponible pendant une cinématique");
  return JSON.stringify(s);
}
export function decode(raw: string): Campaign {
  const s = JSON.parse(raw);
  if (
    s.version !== 1 ||
    !Array.isArray(s.units) ||
    !Array.isArray(s.players) ||
    s.players.length !== 2 ||
    !Array.isArray(s.fronts)
  )
    throw Error("Sauvegarde incompatible");
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
          "La carte a été agrandie : les unités concernées ont été replacées au plus près, sans perte de PV ni de progression.",
        );
    s.mapRevision = MAP_REVISION;
  }
  validate(s);
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
