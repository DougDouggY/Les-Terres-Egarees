import { test } from "node:test";
import assert from "node:assert/strict";
import {
  recolorPixels,
  isTeamPixel,
  isTeamEdgePixel,
  rgbToHsv,
  recolorSettings,
  setRecolorSettings,
  defaultRecolorSettings,
} from "../src/sprites/recolor";
import { teamPalette, type TeamColor } from "../src/game/team-colors";

test("HSV : nuances sombres et claires, contours proches seulement, peau et métal préservés", () => {
  const colors = [
    [200, 0, 190, 255],
    [190, 140, 175, 253],
    [210, 160, 120, 255],
    [130, 90, 65, 220],
    [100, 105, 110, 200],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [190, 140, 175, 253],
  ];
  const src = new Uint8ClampedArray(colors.flat());
  assert.equal(isTeamPixel(190, 140, 175), false);
  assert.equal(isTeamEdgePixel(190, 140, 175), true);
  assert.equal(isTeamPixel(45, 12, 36), true);
  assert.equal(isTeamPixel(240, 95, 225), true);
  const out = recolorPixels(src.slice(), "blue", { width: 11 });
  assert.ok(out[6] > out[4]);
  for (const i of [2, 3, 4, 10])
    assert.deepEqual([...out.slice(i * 4, i * 4 + 4)], colors[i]);
  for (let i = 3; i < out.length; i += 4) assert.equal(out[i], src[i]);
  assert.deepEqual([...src], colors.flat());
  assert.deepEqual(
    [
      ...recolorPixels(src.slice(), "blue", {
        width: 11,
        softEdges: false,
      }).slice(4, 8),
    ],
    colors[1],
  );
});

test("les neuf palettes conservent l'ordre des ombres et lumières sans modifier les couleurs naturelles", () => {
  const natural = [
    [230, 190, 160, 255],
    [155, 108, 49, 255],
    [105, 112, 125, 255],
    [230, 225, 210, 255],
  ];
  for (const color of Object.keys(teamPalette) as TeamColor[]) {
    const src = new Uint8ClampedArray(
      [
        [45, 0, 40, 255],
        [130, 0, 115, 255],
        [240, 0, 220, 255],
        ...natural,
      ].flat(),
    );
    const out = recolorPixels(src.slice(), color);
    const values = [0, 4, 8].map(
      (i) => rgbToHsv(out[i], out[i + 1], out[i + 2]).v,
    );
    assert.ok(values[0] < values[1] && values[1] < values[2], color);
    assert.deepEqual([...out.slice(12)], natural.flat());
  }
});

test("réglages bornés, non-finis ignorés, restauration exacte des valeurs par défaut", () => {
  try {
    setRecolorSettings({
      hue: -45,
      hueTolerance: 100,
      saturation: -1,
      edgeDistance: 30,
    });
    assert.equal(recolorSettings().hue, 315);
    assert.equal(recolorSettings().hueTolerance, 70);
    assert.equal(recolorSettings().saturation, 0);
    assert.equal(recolorSettings().edgeDistance, 12);
    const valid = recolorSettings();
    setRecolorSettings({ hue: NaN, value: Infinity });
    assert.deepEqual(recolorSettings(), valid);
    setRecolorSettings({ ...defaultRecolorSettings, hueTolerance: 0 });
    assert.equal(isTeamPixel(200, 0, 190), false);
  } finally {
    setRecolorSettings(defaultRecolorSettings);
  }
});
