/** Temporary playable review; uses the authored prologue and ordinary battle rules. */
import { createSandbox } from "./sandbox";
import { activateMap, map, MAP_REVISION, key, distance } from "./active-map";
import { baseClasses, syncWeapon, discoverUnit } from "./classes";
import { weaponCatalog } from "../data/weapons";
import { makeClassUnit } from "./units";
import { generateStatistics } from "./progression";
import { initiativeOrder } from "./initiative";
import { visibility } from "./vision";
import type { Campaign, Faction } from "./types";

export function createUnitReview(faction: Faction = "north"): Campaign {
  activateMap("prologue");
  const s = createSandbox(20261121);
  s.unitReview = { faction };
  s.mapId = "prologue";
  s.mapRevision = MAP_REVISION;
  s.sandboxFlat = false;
  s.factions = [faction, faction === "north" ? "knight" : "north"];
  const used = new Set<number>();
  for (const side of [faction, s.factions[1]]) {
    const owned = side === faction;
    let index = 0;
    for (const cls of baseClasses(side))
      for (const weapon of cls.starter) {
        if (
          cls.weapons.includes("magic") &&
          weaponCatalog[weapon].category === "healing"
        )
          continue;
        for (const gender of ["male", "female"] as const) {
          const desired = {
            x: (owned ? 24 : 32) + (index % 2) * 2,
            y: 15 + Math.floor(index / 2) * 2,
          };
          const candidates = map.filter(
            (c) =>
              c.walk &&
              !c.opaque &&
              !c.interactive &&
              !used.has(key(c.x, c.y)) &&
              ["grass", "earth", "road"].includes(c.terrain),
          );
          const cell = candidates.sort(
            (a, b) =>
              distance(a, desired) - distance(b, desired) ||
              key(a.x, a.y) - key(b.x, b.y),
          )[0];
          if (!cell) throw Error("Pas de case disponible pour l’essai.");
          used.add(key(cell.x, cell.y));
          const name = `${cls.name}${cls.id === "raider" ? (weapon === "sword_shield" ? " épée" : " hache") : ""} · ${gender === "female" ? "F" : "H"}`;
          const u = makeClassUnit(
            `review-${side}-${cls.id}-${weapon}-${gender}`,
            owned ? 1 : 0,
            1,
            cls.id,
            name,
            cell.x,
            cell.y,
            gender,
          );
          u.activeWeaponId = weapon;
          syncWeapon(u);
          generateStatistics(u, {
            role: owned ? "principal" : "ordinary",
            level: 1,
          });
          u.hasPersonalName = false;
          u.potions = 0;
          if (!owned) u.enemyAI = { mode: "active" };
          s.units.push(u);
          index++;
        }
      }
  }
  s.units
    .filter((u) => u.owner === 1)
    .slice(0, 2)
    .forEach((u) => (u.potions = 1));
  const order = initiativeOrder(s.units);
  const first = order.findIndex((id) =>
    s.units.some((u) => u.id === id && u.owner === 1),
  );
  s.common.queue = [...order.slice(first), ...order.slice(0, first)];
  for (const p of s.players) p.camera = { x: 20, y: 12 };
  for (const u of s.units) discoverUnit(s, u, true);
  visibility(s);
  return s;
}
