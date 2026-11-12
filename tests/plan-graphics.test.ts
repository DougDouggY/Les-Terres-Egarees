import { test } from "node:test";
import assert from "node:assert/strict";
import {
  castlePlan,
  boardingPlan,
  objectCells,
  PLAN_SOURCE,
} from "../src/data/plan-maps";
import {
  wallJunction,
  planDoorAxis,
  carpetVisualBounds,
  storageSprites,
} from "../src/rendering/plan-geometry";

test("crossings preserve a continuous vertical spine; north and south corners have distinct joins", () => {
  const map = {
    ...castlePlan,
    width: 3,
    height: 3,
    doors: [],
    tiles: [
      "floor",
      "wall",
      "floor",
      "wall",
      "wall",
      "wall",
      "floor",
      "wall",
      "floor",
    ] as typeof castlePlan.tiles,
  };
  const cross = wallJunction(map, 1, 1, new Set());
  assert.equal(cross.axis, "vertical");
  assert.ok(cross.n && cross.s && cross.w && cross.e);
  map.tiles[7] = "floor";
  const north = wallJunction(map, 1, 1, new Set());
  assert.equal(north.axis, "horizontal");
  assert.equal(north.northJoin, true);
  map.tiles[1] = "floor";
  map.tiles[7] = "wall";
  const south = wallJunction(map, 1, 1, new Set());
  assert.equal(south.axis, "vertical");
  assert.equal(south.northJoin, false);
  let intersections = 0;
  for (let y = 0; y < castlePlan.height; y++)
    for (let x = 0; x < castlePlan.width; x++)
      if (castlePlan.tiles[y * castlePlan.width + x] === "wall") {
        const j = wallJunction(castlePlan, x, y, new Set());
        if (j.n && j.s) {
          assert.equal(j.axis, "vertical");
          if (j.e || j.w) intersections++;
        }
      }
  assert.ok(intersections > 0);
});
test("real vertical openings have end faces at north/south walls, horizontal openings get east/west terminations", () => {
  const opened = new Set(castlePlan.doors.map((o) => o.id));
  for (const id of [14, 16, 10003]) {
    const d = castlePlan.doors.find((o) => o.id === id)!;
    assert.equal(planDoorAxis(castlePlan, d), "vertical");
    assert.ok(wallJunction(castlePlan, d.x, d.y - 1, opened).openS);
    assert.ok(wallJunction(castlePlan, d.x, d.y + d.h, opened).openN);
  }
  const d = castlePlan.doors.find((o) => o.id === 13)!;
  assert.equal(planDoorAxis(castlePlan, d), "horizontal");
  assert.ok(wallJunction(castlePlan, d.x - 1, d.y, opened).openE);
  assert.ok(wallJunction(castlePlan, d.x + d.w, d.y, opened).openW);
});
test("throne rug rotates visually around its authored center, hall rug and JSON remain unchanged", () => {
  const before = JSON.stringify(PLAN_SOURCE),
    rug = castlePlan.objects.find((o) => o.id === 10002)!,
    r = carpetVisualBounds(castlePlan, rug);
  assert.deepEqual([r.x, r.y, r.w, r.h], [29, 7, 8, 2]);
  assert.equal(r.x + r.w / 2, rug.x + rug.w / 2);
  assert.equal(r.y + r.h / 2, rug.y + rug.h / 2);
  const hall = castlePlan.objects.find((o) => o.id === 10001)!;
  assert.deepEqual(carpetVisualBounds(castlePlan, hall), hall);
  assert.equal(JSON.stringify(PLAN_SOURCE), before);
});
test("large crates preserve their whole authored footprint instead of splitting into small props", () => {
  let barrels = 0,
    crates = 0;
  for (const o of boardingPlan.objects.filter((o) => o.type === "crate")) {
    const props = storageSprites(o),
      expected = objectCells(boardingPlan, o).sort((a, b) => a - b),
      actual = props
        .flatMap((p) => objectCells(boardingPlan, p))
        .sort((a, b) => a - b);
    assert.deepEqual(actual, expected);
    assert.equal(new Set(actual).size, actual.length);
    for (const p of props) {
      assert.ok([p.x, p.y, p.w, p.h].every(Number.isInteger));
      assert.equal(p.w, o.w);
      assert.equal(p.h, o.h);
      for (const k of objectCells(boardingPlan, p))
        assert.equal(boardingPlan.cells[k].walk, false);
      p.type === "barrel" ? barrels++ : crates++;
    }
  }
  assert.equal(barrels, 0);
  assert.equal(crates, 6);
});

test("vertical walls above permanent doorless gaps use the same full end face as opened doors", () => {
  const map = {
    ...castlePlan,
    width: 3,
    height: 3,
    doors: [],
    tiles: [
      "floor",
      "wall",
      "floor",
      "floor",
      "wall",
      "floor",
      "floor",
      "floor",
      "floor",
    ] as typeof castlePlan.tiles,
  };
  const end = wallJunction(map, 1, 1, new Set());
  assert.equal(end.axis, "vertical");
  assert.equal(end.openS, true);
});
