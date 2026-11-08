import { test } from "node:test";
import assert from "node:assert/strict";
import * as E from "../src/engine";
import { biography } from "../src/ui/character-sheet";
test("Géraud biography follows recruitment without exposing his memories as an enemy", () => {
  const s = E.createCampaign(["north", "knight"]);
  E.beginForestChapter(s);
  const g = s.units.find((u) => u.id === "geraud")!;
  assert.match(biography(g, s), /^Écuyer de Valdren/);
  assert.ok(!biography(g, s).includes("rouges"));
  g.owner = 2;
  assert.match(biography(g, s), /^Ancien écuyer/);
  assert.ok(biography(g, s).includes("tempêtes rouges"));
});
test("Maëlys only reveals the cave discoveries after the scene is completed, including after loading", () => {
  const s = E.createCampaign(["north", "knight"]);
  E.beginForestChapter(s);
  const witch = s.units.find((u) => u.id === "story-witch")!;
  assert.ok(biography(witch, s).includes("tempêtes rouges"));
  assert.ok(!biography(witch, s).includes("sœur"));
  s.forestChapter!.completed.push("c1-cave");
  assert.ok(biography(witch, s).includes("sœur"));
  assert.ok(biography(witch, s).includes("oubli"));
  const back = E.decode(E.encode(s));
  assert.equal(
    biography(
      back.units.find((u) => u.id === witch.id)!,
      back,
    ),
    biography(witch, s),
  );
});
