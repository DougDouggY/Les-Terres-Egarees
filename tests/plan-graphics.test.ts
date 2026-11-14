import { test } from "node:test";
import assert from "node:assert/strict";
import {
  castlePlan,
  createPlanState,
  openPlanDoor,
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

test("marked corner tops follow progressive exposure without uncovering closed rooms", async () => {
  const { castleCornerCaps, exposedCornerCap, sideDoorHiddenSide } =
    await import("../src/rendering/plan-geometry");
  const { createPlanState, openPlanDoor, roofVisible } =
    await import("../src/data/plan-maps");
  const s = createPlanState(castlePlan);
  for (const [x, y] of castleCornerCaps)
    assert.equal(
      castlePlan.tiles[y * 42 + x],
      "wall",
      `reference mark ${x},${y}`,
    );
  for (const [x, y] of [
    [20, 0],
    [38, 14],
    [4, 24],
    [14, 26],
    [27, 26],
  ])
    assert.ok(exposedCornerCap(s, x, y), `exterior ${x},${y}`);
  assert.equal(exposedCornerCap(s, 9, 4), false);
  openPlanDoor(s, 13, "key");
  for (const [x, y] of castleCornerCaps) assert.ok(exposedCornerCap(s, x, y));
  for (const id of [14, 10003])
    assert.equal(
      sideDoorHiddenSide(
        s,
        castlePlan.doors.find((d) => d.id === id)!,
      ),
      "left",
    );
  assert.equal(
    sideDoorHiddenSide(
      s,
      castlePlan.doors.find((d) => d.id === 16)!,
    ),
    "right",
  );
  for (const [x, y] of [
    [3, 21],
    [7, 28],
    [31, 17],
    [4, 12],
    [30, 8],
  ])
    assert.ok(roofVisible(s, y * 42 + x), `closed room ${x},${y}`);
});

test("armory junction becomes a front facade; exterior height avoids every stair cell", async () => {
  const { exposedCornerCap, exteriorFacadeCells } =
    await import("../src/rendering/plan-geometry");
  const { createPlanState, openPlanDoor } =
    await import("../src/data/plan-maps");
  const s = createPlanState(castlePlan);
  openPlanDoor(s, 13, "key");
  assert.equal(exposedCornerCap(s, 9, 24), true);
  openPlanDoor(s, 14, "key");
  assert.equal(exposedCornerCap(s, 9, 24), false);
  assert.equal(wallJunction(castlePlan, 9, 24, s.opened).axis, "horizontal");
  const faces = exteriorFacadeCells(castlePlan);
  for (const [x, y] of [
    [0, 24],
    [3, 24],
    [15, 26],
    [17, 26],
    [24, 26],
    [26, 26],
    [4, 31],
    [14, 31],
    [27, 31],
    [38, 31],
    [39, 14],
    [41, 14],
  ])
    assert.ok(faces.includes(y * 42 + x), `red facade ${x},${y}`);
  for (const k of faces)
    assert.equal(castlePlan.cells[k + 42].terrain, "grass");
  for (const x of [18, 19, 20, 21, 22, 23])
    assert.ok(!faces.includes(26 * 42 + x));
  assert.deepEqual(exteriorFacadeCells(boardingPlan), []);
});

test("nouveau décor : sols par pièce et piliers tournés vers les portes de face", async () => {
  const { castleFloor, castleDoorFrames } =
    await import("../src/rendering/castle-experiment-layout");
  assert.equal(castleFloor(castlePlan, 3, 8), "wood");
  assert.equal(castleFloor(castlePlan, 30, 28), "wood");

  const frames = castleDoorFrames(castlePlan);
  const entrance = frames.filter((f) => f.door.id === 13);
  assert.deepEqual(
    entrance.map((f) => [f.x, f.pillar]),
    [
      [19, "right"],
      [22, "left"],
    ],
  );
  for (const f of frames) {
    assert.equal(planDoorAxis(castlePlan, f.door), "horizontal");
    assert.equal(castlePlan.tiles[f.y * castlePlan.width + f.x], "wall");
    assert.equal(f.pillar, f.x < f.door.x ? "right" : "left");
  }
});

test("nouveau set : sol validé et décorations limitées aux emplacements prévus", async () => {
  const { castleFloor, castleWallDecor, castleRugStyle, castleTallWalls } =
    await import("../src/rendering/castle-experiment-layout");
  const seen = new Set<string>();
  for (let y = 15; y < 24; y++)
    for (let x = 15; x < 27; x++) {
      const material = castleFloor(castlePlan, x, y);
      seen.add(material);
      assert.equal(material, castleFloor(castlePlan, x, y));
    }
  assert.deepEqual([...seen], ["approved"]);
  const exterior = castleTallWalls(castlePlan);
  let outsideBanners = 0,
    insideBanners = 0;
  for (let y = 0; y < castlePlan.height; y++)
    for (let x = 0; x < castlePlan.width; x++) {
      const decor = castleWallDecor(x, y);
      if (decor === "window")
        assert.ok(
          y === 0 ||
            [629, 1011, 1309, 1315, 1332, 1339].includes(y * 42 + x + 1),
        );
      if (decor === "banner") {
        if (exterior.has(y * castlePlan.width + x)) {
          outsideBanners++;
          assert.equal(y, 26);
          assert.ok([17, 24].includes(x));
        } else insideBanners++;
      }
    }
  assert.equal(outsideBanners, 2);
  assert.equal(insideBanners, 2);
  for (const id of [10001, 10002])
    assert.ok([0, 1, 2].includes(castleRugStyle(id)));
});

test("nouveau château : passages latéraux et variantes hautes sans le deuxième modèle", async () => {
  const { castleTallVariant, castlePassageFace, castleFloor } =
    await import("../src/rendering/castle-experiment-layout");
  const counts = [0, 0, 0, 0];
  for (let y = 0; y < 34; y++)
    for (let x = 0; x < 42; x++) counts[castleTallVariant(x, y)]++;
  assert.equal(counts[1], 0);
  assert.ok(counts[0] > counts[2] * 3);
  assert.ok(counts[3] > counts[2] * 3);
  const s = createPlanState(castlePlan);
  openPlanDoor(s, 13, "key");
  assert.equal(castlePassageFace(s, 14, 20), true);
  assert.equal(castlePassageFace(s, 27, 21), true);
  assert.equal(castlePassageFace(s, 14, 19), false);
  assert.equal(castlePassageFace(s, 27, 20), false);
  assert.equal(castlePassageFace(s, 9, 20), false);
  openPlanDoor(s, 14, "key");
  assert.equal(castlePassageFace(s, 9, 20), true);
  assert.equal(castleFloor(castlePlan, 16, 18), "approved");
});

test("repères utilisateur : pourtour, toits 21/1018, plafonds et fenêtres", async () => {
  const {
    castleRoofCovered,
    CASTLE_COPING_CELLS,
    CASTLE_EXTRA_WINDOWS,
    castleWallDecor,
    castleExteriorWall,
    castleHiddenBorder,
  } = await import("../src/rendering/castle-experiment-layout");
  const s = createPlanState(castlePlan);
  for (const id of [null, 13, 14]) {
    if (id) openPlanDoor(s, id, "key");
    for (const n of CASTLE_COPING_CELLS)
      assert.equal(
        castleRoofCovered(s, n - 1),
        castleHiddenBorder(castlePlan, n - 1)
          ? (await import("../src/data/plan-maps")).roofVisible(s, n - 1)
          : false,
        `plafond ${n} après ${id}`,
      );
    for (const n of [21, 1018])
      assert.equal(castleRoofCovered(s, n - 1), true, `toit ${n} après ${id}`);
    for (let k = 0; k < castlePlan.tiles.length; k++)
      if (
        castleExteriorWall(castlePlan, k) &&
        ![21, 1018].includes(k + 1) &&
        !castleHiddenBorder(castlePlan, k)
      )
        assert.equal(castleRoofCovered(s, k), false, `périmètre ${k + 1}`);
  }
  for (const n of CASTLE_EXTRA_WINDOWS)
    assert.equal(
      castleWallDecor((n - 1) % 42, Math.floor((n - 1) / 42)),
      "window",
    );
});

test("mobilier : rayonnages et tables bloquent seulement la variante", async () => {
  const { buildCastleExperimentPlan, castleCarpetBounds } =
    await import("../src/rendering/castle-experiment-layout");
  const { planPath, planWalkable } = await import("../src/data/plan-maps");
  const map = buildCastleExperimentPlan(),
    s = createPlanState(map);
  for (let pass = 0; pass < 8; pass++)
    for (const d of map.doors) openPlanDoor(s, d.id, "key");
  const shelves = map.objects.filter((o) => o.type.startsWith("bookcase"));
  assert.equal(shelves.length, 3);
  for (const o of shelves) {
    assert.equal(o.w, o.type === "bookcase" ? 3 : 2);
    assert.equal(o.h, o.type === "bookcase" ? 2 : 3);
    for (const k of objectCells(map, o)) {
      assert.equal(planWalkable(s, k), false);
      assert.equal(castlePlan.cells[k].walk, true);
    }
  }
  assert.ok(planPath(s, map.start, 30 * 42 + 35));
  assert.ok(planPath(s, map.start, 16 * 42 + 7));
  const tables = map.objects.filter((o) => o.type === "table-benches");
  assert.equal(tables.length, 4);
  for (const table of tables) {
    assert.equal(table.w, 4);
    assert.equal(table.h, 1);
    for (const k of objectCells(map, table)) {
      assert.equal(planWalkable(s, k), false);
      assert.equal(castlePlan.cells[k].walk, true);
    }
  }
  for (const x of [29, 30, 31, 32, 33, 34, 35])
    assert.equal(planWalkable(s, 27 * 42 + x), true);
  assert.deepEqual(map.doors, castlePlan.doors);
  assert.equal(map.tiles[398], castlePlan.tiles[398]);
  const carpet = map.objects.find((o) => o.id === 10002)!;
  const b = castleCarpetBounds(map, carpet);
  assert.equal(b.x, 21);
  assert.equal(b.x + b.w, 37);
});

test("bordures : top, ouest et est restent sous toiture jusqu’à la pièce correspondante", async () => {
  const { buildCastleExperimentPlan, castleRoofCovered, castleHiddenBorder } =
    await import("../src/rendering/castle-experiment-layout");
  const { roofVisible } = await import("../src/data/plan-maps");
  const s = createPlanState(buildCastleExperimentPlan()),
    border = s.map.tiles.flatMap((_, k) =>
      castleHiddenBorder(s.map, k) ? [k] : [],
    );
  for (const k of border)
    assert.equal(castleRoofCovered(s, k), true, `initial ${k + 1}`);
  openPlanDoor(s, 13, "key");
  for (const n of [178, 589, 616])
    assert.equal(castleRoofCovered(s, n - 1), false);
  for (const k of border)
    if (k !== 588)
      assert.equal(
        castleRoofCovered(s, k),
        roofVisible(s, k),
        `entrée ${k + 1}`,
      );
  openPlanDoor(s, 14, "key");
  assert.equal(castleRoofCovered(s, 882), false);
  assert.equal(castleRoofCovered(s, 0), true);
  openPlanDoor(s, 10003, "key");
  assert.equal(castleRoofCovered(s, 0), false);
  assert.equal(castleRoofCovered(s, 41), true);
  openPlanDoor(s, 16, "key");
  assert.equal(castleRoofCovered(s, 41), false);
  assert.equal(castleRoofCovered(s, 587), false);
});
