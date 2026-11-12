import { test } from "node:test";
import assert from "node:assert/strict";
import {
  castleStudy,
  boardingStudy,
  studyPath,
  studyWalkable,
  STUDY_TILE,
} from "../src/dev/map-studies";

test("studies: exact 32 px grid, dimensions, all walkable cells connected", () => {
  assert.equal(STUDY_TILE, 32);
  for (const [map, w, h] of [
    [castleStudy, 15, 12],
    [boardingStudy, 20, 15],
  ] as const) {
    assert.equal(map.width, w);
    assert.equal(map.height, h);
    assert.equal(map.tiles.length, w * h);
    for (let k = 0; k < map.tiles.length; k++) {
      const path = studyPath(map, map.start, k);
      if (studyWalkable(map.tiles[k])) {
        assert.ok(path, `Unreachable ${map.id} tile ${k}`);
        for (let i = 1; i < path.length; i++)
          assert.equal(
            Math.abs((path[i] % w) - (path[i - 1] % w)) +
              Math.abs(Math.floor(path[i] / w) - Math.floor(path[i - 1] / w)),
            1,
          );
      } else assert.equal(path, null);
    }
  }
});
test("castle: two rooms reached only through open doorways, no wall crossing", () => {
  const route = studyPath(castleStudy, 2 + 2 * 15, 10 + 2 * 15)!;
  assert.ok(route);
  assert.ok(route.some((k) => Math.floor(k / 15) === 7));
  assert.equal(studyPath(castleStudy, castleStudy.start, 6 + 2 * 15), null);
});
test("boarding: each of the three crossings independently traversable, sea and rails blocked", () => {
  for (const y of [2, 7, 12]) {
    assert.deepEqual(
      studyPath(boardingStudy, y * 20 + 5, y * 20 + 14),
      Array.from({ length: 10 }, (_, i) => y * 20 + 5 + i),
    );
  }
  for (const y of [0, 5, 10, 14])
    for (const x of [7, 8, 9, 10, 11, 12]) {
      assert.equal(
        studyPath(boardingStudy, boardingStudy.start, y * 20 + x),
        null,
      );
    }
  for (const x of [0, 19])
    for (let y = 0; y < 15; y++)
      assert.equal(boardingStudy.tiles[y * 20 + x], "deck");
  // Removing each individual bridge forces the route to a different crossing.
  for (const y of [2, 7, 12]) {
    const tiles = [...boardingStudy.tiles];
    for (let yy = y; yy < y + 2; yy++)
      for (let x = 7; x <= 12; x++) tiles[yy * 20 + x] = "water";
    const path = studyPath(
      { ...boardingStudy, tiles },
      y * 20 + 5,
      y * 20 + 14,
    )!;
    assert.ok(path);
    assert.ok(path.some((k) => Math.floor(k / 20) !== y));
  }
});
test("study paths reject out-of-bounds endpoints and row wrapping", () => {
  for (const k of [-1, castleStudy.tiles.length, 0.5, NaN])
    assert.equal(studyPath(castleStudy, castleStudy.start, k), null);
  const tiny = {
    ...boardingStudy,
    width: 2,
    height: 2,
    tiles: ["water", "deck", "deck", "water"] as typeof boardingStudy.tiles,
  };
  assert.equal(studyPath(tiny, 1, 2), null);
});
