import { test } from "node:test";
import assert from "node:assert/strict";
import {
  recolorPixels,
  isTeamPixel,
  isTeamEdgePixel,
} from "../src/sprites/recolor";
test("les nuances roses voisines du masque sont recolorées sans toucher peau, bois ou alpha", () => {
  const colors = [
    [200, 0, 190, 255],
    [160, 85, 110, 253],
    [210, 160, 120, 255],
    [130, 90, 65, 220],
    [100, 105, 110, 200],
    [160, 85, 110, 253],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [160, 85, 110, 253],
  ];
  const src = new Uint8ClampedArray(colors.flat());
  assert.equal(isTeamPixel(160, 85, 110), false);
  assert.equal(isTeamEdgePixel(160, 85, 110), true);
  const out = recolorPixels(src.slice(), "blue", {
    width: 11,
    softEdges: true,
  });
  assert.ok(out[5] > out[4]);
  for (const i of [2, 3, 4, 5, 10])
    assert.deepEqual([...out.slice(i * 4, i * 4 + 4)], colors[i]);
  for (let i = 3; i < out.length; i += 4) assert.equal(out[i], src[i]);
  const original = recolorPixels(src.slice(), "blue");
  assert.deepEqual([...original.slice(4, 8)], colors[1]);
});
