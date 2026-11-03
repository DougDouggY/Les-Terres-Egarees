import { test } from "node:test";
import assert from "node:assert/strict";
import * as E from "../src/engine";
import { recolorPixels, isTeamPixel } from "../src/sprites/recolor";
import {
  buildSpriteCatalog,
  findProfile,
  resolveClip,
} from "../src/sprites/catalog";
import { readFile } from "node:fs/promises";

test("neuf couleurs libres, joueurs distincts, ennemis indépendants et sauvegarde compatible", () => {
  assert.equal(Object.keys(E.teamPalette).length, 9);
  const s = E.createCampaign(["north", "north"]);
  assert.deepEqual(s.teamColors, {
    player1: "blue",
    player2: "yellow",
    enemies: "red",
  });
  E.setTeamColors(s, { player1: "black", player2: "white", enemies: "pink" });
  assert.deepEqual(E.decode(E.encode(s)).teamColors, s.teamColors);
  assert.throws(() =>
    E.setTeamColors(s, { player1: "green", player2: "green", enemies: "red" }),
  );
  const old = JSON.parse(E.encode(s));
  delete old.teamColors;
  assert.deepEqual(
    E.decode(JSON.stringify(old)).teamColors,
    E.defaultTeamColors,
  );
  for (const color of Object.keys(E.teamPalette) as E.TeamColor[]) {
    const party = {
      player1: color,
      player2: color === "blue" ? "yellow" : "blue",
      enemies: color,
    } as E.TeamColors;
    E.setTeamColors(s, party);
    assert.equal(E.colorForOwner(s.teamColors, 0), color);
  }
});

test("masque de matière : peau, cheveux, métal, bois, transparence conservés dans les neuf palettes", () => {
  const source = new Uint8ClampedArray([
    200, 0, 190, 255, 130, 90, 65, 255, 210, 160, 120, 200, 120, 125, 130, 255,
    30, 24, 18, 255, 255, 0, 255, 0,
  ]);
  assert.equal(isTeamPixel(200, 0, 190), true);
  assert.equal(isTeamPixel(210, 160, 120), false);
  for (const color of Object.keys(E.teamPalette) as E.TeamColor[]) {
    const out = recolorPixels(source.slice(), color);
    assert.notDeepEqual([...out.slice(0, 3)], [...source.slice(0, 3)]);
    assert.equal(out[3], 255);
    assert.deepEqual([...out.slice(4)], [...source.slice(4)]);
  }
});

test("échantillon mutualisé : priorité explicite, deux sexes, repos et marche réels, animations historiques conservées", async () => {
  const legacy = JSON.parse(
    await readFile("src/assets/tactical/legacy.sprite.json", "utf8"),
  );
  const sample = JSON.parse(
    await readFile("src/assets/tactical/team-sample.sprite.json", "utf8"),
  );
  const registry = buildSpriteCatalog([legacy, sample]);
  assert.deepEqual(registry.errors, []);
  for (const id of ["raider", "man_at_arms"])
    for (const gender of ["male", "female"]) {
      const profile = findProfile(
        registry.profiles,
        id,
        gender,
        id === "raider" ? "axe-shield" : "sword-shield",
        "default",
      )!;
      assert.equal(resolveClip(profile, "idle")!.recolor, "magenta");
      assert.deepEqual(resolveClip(profile, "move")!.frames, [2, 3]);
    }
  assert.equal(
    resolveClip(
      findProfile(registry.profiles, "raider", "male", "axe-shield", "default"),
      "evade",
    )!.source,
    "assets/sprites.png",
  );
});
