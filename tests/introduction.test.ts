import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import * as E from "../src/engine";
import { ensurePortraits } from "../src/game/portraits";
import { compatiblePortraits } from "../src/data/portraits";
import { fittedBackdrop } from "../src/ui/introduction-layout";
test("introduction : prénom capitalisé sans altérer les autres caractères ou noms composés", () => {
  for (const [value, want] of [
    ["élise de Brume", "Élise de Brume"],
    ["jean-luc", "Jean-luc"],
    ["éLISE", "ÉLISE"],
    ["  athéna-rose", "  Athéna-rose"],
    ["d’Artagnan", "D’Artagnan"],
    ["", ""],
  ])
    assert.equal(E.capitaliseGivenName(value), want);
});
test("introduction : fichiers fournis RRR et RRTT conservés octet pour octet au format PNG", () => {
  for (const [file, width, height, hash] of [
    [
      "knight-clearing-rrr.png",
      1374,
      1145,
      "f1145599e439ee7ebe30b12e35043d978bf68e6c64d5a0ef8035cc26742c53c7",
    ],
    [
      "viking-drakkar-rrtt.png",
      1536,
      1024,
      "e66cf2e731b79496254ef3a5a5e660d492ea035288fe858bd397b0d52ad923d8",
    ],
  ] as const) {
    const bytes = readFileSync(`public/assets/introduction/${file}`);
    assert.equal(bytes.readUInt32BE(16), width);
    assert.equal(bytes.readUInt32BE(20), height);
    assert.equal(createHash("sha256").update(bytes).digest("hex"), hash);
  }
});
test("introduction : cadrage cover sans bordures et proportions préservées sur bureau et téléphone", () => {
  for (const [w, h] of [
    [1374, 1145],
    [1536, 1024],
  ])
    for (const [vw, vh] of [
      [1280, 800],
      [390, 844],
      [844, 390],
    ]) {
      const fit = fittedBackdrop(w, h, vw, vh);
      assert.ok(fit.x <= 0.001 && fit.y <= 0.001);
      assert.ok(fit.x + fit.w >= vw - 0.001);
      assert.ok(fit.y + fit.h >= vh - 0.001);
      assert.ok(Math.abs(fit.w / fit.h - w / h) < 0.00001);
    }
});
test("introduction : seuls les compagnons confirmés reçoivent une identité, les autres restent libres", () => {
  const s = E.createCampaign(["north", "knight"]);
  const assigned = Object.keys(s.portraits!.assignments).filter((id) =>
    id.startsWith("companion:"),
  );
  assert.deepEqual(assigned.sort(), [
    "companion:astrid",
    "companion:gaspard",
    "companion:solveig",
  ]);
  assert.ok(!s.units.some((u) => u.id.startsWith("creation-")));
  assert.equal(s.portraits!.assignments["companion:runa"], undefined);
  const u = E.makeClassUnit(
    "later-runa",
    1,
    1,
    "nordic_blade",
    "Runa",
    12,
    12,
    "female",
  );
  u.portraitIdentity = "companion:runa";
  u.hasPersonalName = true;
  const before = structuredClone(s.portraits!.assignments);
  s.units.push(u);
  ensurePortraits(s);
  assert.ok(u.portraitId);
  assert.ok(!Object.values(before).includes(u.portraitId!));
  for (const [id, portrait] of Object.entries(before))
    assert.equal(s.portraits!.assignments[id], portrait);
});
test("introduction : anciennes réservations de portraits conservées même pour un compagnon absent", () => {
  const s = E.createCampaign(["north", "knight"]);
  const unused = compatiblePortraits(
    "knight",
    "male",
    Object.values(s.portraits!.assignments).filter((x): x is string => !!x),
  )[0].id;
  s.portraits!.assignments["companion:amaury"] = unused;
  const loaded = E.decode(E.encode(s));
  assert.equal(loaded.portraits!.assignments["companion:amaury"], unused);
});
