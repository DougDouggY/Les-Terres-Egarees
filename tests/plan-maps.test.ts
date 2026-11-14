import { test } from "node:test";
import assert from "node:assert/strict";
import {
  PLAN_SOURCE,
  buildPlan,
  castlePlan,
  boardingPlan,
  createPlanState,
  objectCells,
  doorAvailable,
  openPlanDoor,
  roofVisible,
  planWalkable,
  planPath,
} from "../src/data/plan-maps";
import { gridPath } from "../src/game/grid-path";

test("JSON dimensions and architecture are preserved; authored object footprints take priority", () => {
  for (const map of [castlePlan, boardingPlan]) {
    assert.equal(map.width, 42);
    assert.equal(map.height, 34);
    assert.equal(map.cells.length, 42 * 34);
  }
  const doors = castlePlan.doors;
  for (const d of doors)
    for (const k of objectCells(castlePlan, d))
      assert.equal(castlePlan.cells[k].interactive, `door:${d.id}`);
  assert.equal(doors.length, 7);
  assert.equal(
    objectCells(
      castlePlan,
      doors.find((d) => d.id === 16)!,
    ).length,
    3,
  );
  assert.equal(
    castlePlan.tiles[21 * 42 + 9],
    "floor",
    "Armoury door overrides missing raster door",
  );
  const overridden = new Set(
    castlePlan.objects
      .filter((o) => ["door", "carpet"].includes(o.type))
      .flatMap((o) => objectCells(castlePlan, o)),
  );
  for (let k = 0; k < castlePlan.tiles.length; k++)
    if (
      PLAN_SOURCE.maps.castle.tileGrid.tiles.flat()[k] === "wall" &&
      !overridden.has(k)
    )
      assert.equal(castlePlan.tiles[k], "wall");
  const carpets = castlePlan.objects
    .filter((o) => o.type === "carpet")
    .flatMap((o) => objectCells(castlePlan, o));
  assert.equal(
    castlePlan.tiles.filter((t) => t === "rug").length,
    carpets.length,
  );
  const furniture = new Set(
    castlePlan.objects
      .filter((o) => ["pillar", "throne", "chest"].includes(o.type))
      .flatMap((o) => objectCells(castlePlan, o)),
  );
  for (const k of carpets)
    if (!furniture.has(k)) {
      assert.equal(castlePlan.cells[k].walk, true);
      assert.equal(castlePlan.cells[k].cost, 1);
    }
});
test("all building cells are roofed initially, regardless of room.open; only entrance available", () => {
  const s = createPlanState(castlePlan);
  assert.equal(s.revealed.size, 0);
  for (const k of castlePlan.building) assert.equal(roofVisible(s, k), true);
  assert.deepEqual(
    castlePlan.doors.filter((o) => doorAvailable(s, o)).map((o) => o.id),
    [13],
  );
  assert.equal(openPlanDoor(s, 16, "key"), false);
  assert.equal(planPath(s, castlePlan.start, 20 + 20 * 42), null);
});
test("entrance reveals connected hall and corridors, leaves every closed room hidden", () => {
  const s = createPlanState(castlePlan);
  assert.equal(openPlanDoor(s, 13, "key"), true);
  for (const [x, y] of [
    [21, 22],
    [12, 20],
    [16, 8],
    [30, 22],
  ])
    assert.equal(roofVisible(s, y * 42 + x), false, `${x},${y}`);
  for (const [x, y] of [
    [4, 8],
    [3, 21],
    [7, 28],
    [31, 17],
    [31, 28],
    [30, 7],
  ])
    assert.equal(roofVisible(s, y * 42 + x), true, `${x},${y}`);
  assert.ok(planPath(s, castlePlan.start, 16 + 8 * 42));
  assert.equal(planPath(s, castlePlan.start, 4 + 8 * 42), null);
});
test("L-shaped canteen reveals both joined rectangles without introducing a partition", () => {
  const s = createPlanState(castlePlan);
  openPlanDoor(s, 13, "key");
  openPlanDoor(s, 10003, "key");
  assert.equal(roofVisible(s, 4 + 12 * 42), false);
  assert.equal(roofVisible(s, 15 + 2 * 42), false);
  assert.ok(planPath(s, 4 + 12 * 42, 15 + 2 * 42));
  assert.equal(roofVisible(s, 30 + 7 * 42), true);
});
test("key and destruction produce identical permanent, local revelation; reset restores doors and roofs", () => {
  const a = createPlanState(castlePlan),
    b = createPlanState(castlePlan);
  for (const id of [13, 10003, 14, 116, 15, 117, 16]) {
    const before = new Set(a.revealed);
    assert.equal(openPlanDoor(a, id, "key"), true);
    assert.equal(openPlanDoor(b, id, "destroy"), true);
    assert.deepEqual(a.revealed, b.revealed);
    for (const k of before) assert.ok(a.revealed.has(k));
    for (const k of objectCells(
      castlePlan,
      castlePlan.doors.find((o) => o.id === id)!,
    ))
      assert.equal(planWalkable(a, k), true);
  }
  for (const k of castlePlan.building) assert.equal(roofVisible(a, k), false);
  assert.equal(createPlanState(castlePlan).revealed.size, 0);
  assert.equal(createPlanState(castlePlan).opened.size, 0);
});
test("exactly two JSON gangways; all deck edge cells are solid rails except authorized openings", () => {
  const s = createPlanState(boardingPlan),
    gangways = boardingPlan.objects.filter((o) => o.type === "gangway");
  assert.equal(gangways.length, 2);
  for (const g of gangways)
    for (let y = g.y; y < g.y + g.h; y++) {
      assert.ok(planPath(s, y * 42 + 17, y * 42 + 24));
      for (let x = 18; x <= 23; x++)
        assert.equal(planWalkable(s, y * 42 + x), true);
    }
  for (let y = 0; y < 34; y++) {
    for (const x of [0, 19, 20, 21, 22, 41])
      if (
        !gangways.some(
          (g) => y >= g.y && y < g.y + g.h && x >= g.x && x < g.x + g.w,
        )
      )
        assert.equal(planWalkable(s, y * 42 + x), false);
    for (const x of [1, 18, 23, 40]) {
      const inner = x === 18 || x === 23,
        opening = inner && gangways.some((g) => y >= g.y && y < g.y + g.h);
      assert.equal(boardingPlan.tiles[y * 42 + x], opening ? "deck" : "rail");
      assert.equal(planWalkable(s, y * 42 + x), opening);
    }
  }
});
test("every solid authored obstacle blocks its full footprint; half masts stay at map edges", () => {
  for (const map of [castlePlan, boardingPlan]) {
    const s = createPlanState(map);
    for (const id of [13, 10003, 14, 116, 15, 117, 16])
      openPlanDoor(s, id, "key");
    for (const o of map.objects.filter((o) =>
      [
        "pillar",
        "chest",
        "throne",
        "mast",
        "half_mast_top",
        "half_mast_bottom",
        "barrel",
        "crate",
      ].includes(o.type),
    ))
      for (const k of objectCells(map, o))
        assert.equal(planWalkable(s, k), false, `${o.type} ${o.id}`);
  }
  const halves = boardingPlan.objects.filter((o) =>
    o.type.startsWith("half_mast"),
  );
  assert.equal(halves.length, 2);
  assert.equal(halves[0].y, 0);
  assert.equal(halves[1].y + halves[1].h, 34);
});
test("shared tactical pathfinder respects weighted costs, blockers and map edges", () => {
  assert.deepEqual(
    gridPath(3, 2, 0, 2, (k) => (k === 1 ? 9 : 1)),
    { cost: 4, steps: [0, 3, 4, 5, 2] },
  );
  assert.equal(
    gridPath(2, 2, 1, 2, (k) => ([0, 3].includes(k) ? null : 1)),
    null,
  );
  assert.equal(
    gridPath(2, 2, 0, 4, () => 1),
    null,
  );
  assert.deepEqual(buildPlan("boarding").objects, boardingPlan.objects);
});

test("revealed corridors expose partition walls while closed room floors and untouched corners stay roofed", () => {
  const s = createPlanState(castlePlan);
  openPlanDoor(s, 13, "key");
  // Regression: these partitions were hidden by roofs until BOTH rooms opened.
  for (const [x, y] of [
    [9, 18],
    [9, 19],
    [10, 24],
  ]) {
    assert.equal(castlePlan.tiles[y * 42 + x], "wall");
    assert.equal(
      roofVisible(s, y * 42 + x),
      false,
      `visible partition ${x},${y}`,
    );
  }
  for (const [x, y] of [
    [9, 24],
    [38, 14],
    [28, 14],
  ])
    assert.equal(
      roofVisible(s, y * 42 + x),
      true,
      `untouched corner ${x},${y}`,
    );
  for (const [x, y] of [
    [3, 21],
    [7, 28],
    [31, 17],
    [4, 12],
  ])
    assert.equal(roofVisible(s, y * 42 + x), true, `closed floor ${x},${y}`);
  openPlanDoor(s, 14, "key");
  assert.equal(roofVisible(s, 9 + 24 * 42), true, "guards remain closed");
  openPlanDoor(s, 116, "key");
  assert.equal(roofVisible(s, 9 + 24 * 42), false);
});

test("nouvel abordage : rotation des emprises et sept passages fins irréguliers", async () => {
  const { buildBoardingExperiment, BOARDING_CROSSINGS } =
    await import("../src/data/boarding-experiment");
  const snapshot = JSON.stringify(PLAN_SOURCE.maps.ship),
    map = buildBoardingExperiment(),
    state = createPlanState(map);
  assert.equal(map.width, 34);
  assert.equal(map.height, 42);
  assert.deepEqual(
    map.objects
      .filter((o) => o.type === "deck1" || o.type === "deck2")
      .map((o) => [o.w, o.h, o.y]),
    [
      [34, 18, 1],
      [34, 18, 23],
    ],
  );
  const bridges = map.objects.filter((o) => o.type === "gangway");
  assert.equal(bridges.length, 7);
  assert.deepEqual(
    bridges.map((o) => o.x),
    [...BOARDING_CROSSINGS],
  );
  assert.ok(
    new Set(bridges.slice(1).map((o, i) => o.x - bridges[i].x)).size > 2,
  );
  for (const b of bridges) {
    assert.equal(b.w, 1);
    assert.equal(b.h, 4);
    const path: number[] = planPath(
      state,
      17 * map.width + b.x,
      24 * map.width + b.x,
    )!;
    assert.equal(path.length, 8);
    assert.ok(path.every((k) => k % map.width === b.x));
  }
  for (let y = 19; y <= 22; y++)
    for (let x = 0; x < 34; x++)
      assert.equal(
        planWalkable(state, y * 34 + x),
        (BOARDING_CROSSINGS as readonly number[]).includes(x),
      );
  for (const p of map.objects.filter(
    (o) => !["deck1", "deck2", "gangway"].includes(o.type),
  )) {
    assert.equal(p.w, 1);
    assert.equal(p.h, 1);
  }
  assert.equal(JSON.stringify(PLAN_SOURCE.maps.ship), snapshot);
  assert.equal(boardingPlan.width, 42);
  assert.equal(
    boardingPlan.objects.filter((o) => o.type === "gangway").length,
    2,
  );
});

test("nouvel abordage : chaque case praticable est accessible, obstacles et eau restent bloqués", async () => {
  const { buildBoardingExperiment } =
    await import("../src/data/boarding-experiment");
  const map = buildBoardingExperiment(),
    state = createPlanState(map),
    seen = new Set([map.start]),
    queue = [map.start];
  for (let i = 0; i < queue.length; i++) {
    const k = queue[i],
      x = k % map.width,
      y = Math.floor(k / map.width);
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const xx = x + dx,
        yy = y + dy,
        n = yy * map.width + xx;
      if (
        xx >= 0 &&
        yy >= 0 &&
        xx < map.width &&
        yy < map.height &&
        !seen.has(n) &&
        planWalkable(state, n)
      ) {
        seen.add(n);
        queue.push(n);
      }
    }
  }
  assert.equal(seen.size, map.cells.filter((c) => c.walk).length);
  for (const o of map.objects.filter((o) =>
    ["mast", "crate", "barrel", "brazier"].includes(o.type),
  ))
    assert.equal(planWalkable(state, o.y * map.width + o.x), false);
  assert.equal(planPath(state, map.start, 20 * 34 + 3), null);
});
