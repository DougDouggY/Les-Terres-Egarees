import { test, expect } from "@playwright/test";
for (const mobile of [false, true])
  test(`campement : ${mobile ? "téléphone, pincement" : "ordinateur, molette"}, caméra et cases`, async ({
    page,
  }) => {
    await page.setViewportSize(
      mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 },
    );
    await page.routeWebSocket(/.*/, () => {});
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/");
    await page.evaluate(() =>
      localStorage.setItem("lte-save", "sauvegarde à conserver"),
    );
    await page
      .getByRole("button", { name: "Carte du chapitre 2", exact: true })
      .click();
    const canvas = page.locator("[data-camp-canvas]");
    await expect(canvas).toHaveAttribute("data-ready", "true", {
      timeout: 30000,
    });
    await expect(canvas).toHaveAttribute("data-zoom", "2");
    await expect(canvas).toHaveAttribute("data-cell-size", "64");
    await expect(page.locator(".camp-preview")).not.toContainText(
      /Cour centrale|Passage secondaire|Baraquement|Repères/,
    );
    const zoom = async () => Number(await canvas.getAttribute("data-zoom"));
    const camera = async () => ({
      x: Number(await canvas.getAttribute("data-camera-x")),
      y: Number(await canvas.getAttribute("data-camera-y")),
    });
    const bounds = await canvas.boundingBox(),
      mid = {
        x: bounds!.x + bounds!.width / 2,
        y: bounds!.y + bounds!.height / 2,
      };
    if (mobile) {
      const cdp = await page.context().newCDPSession(page);
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [
          { x: mid.x - 35, y: mid.y, id: 1 },
          { x: mid.x + 35, y: mid.y, id: 2 },
        ],
      });
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [
          { x: mid.x - 80, y: mid.y, id: 1 },
          { x: mid.x + 80, y: mid.y, id: 2 },
        ],
      });
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
      });
      await expect.poll(zoom).toBeGreaterThan(3);
      expect(await page.evaluate(() => visualViewport!.scale)).toBe(1);
      const before = await camera();
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [{ x: mid.x, y: mid.y, id: 1 }],
      });
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x: mid.x - 70, y: mid.y + 35, id: 1 }],
      });
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
      });
      expect((await camera()).x).toBeGreaterThan(before.x);
      await cdp.detach();
    } else {
      const before = await camera();
      await page.mouse.move(mid.x, mid.y);
      await page.mouse.wheel(0, -400);
      await expect.poll(zoom).toBeGreaterThan(3);
      const after = await camera();
      expect(after.x).toBeCloseTo(before.x, 3);
      expect(after.y).toBeCloseTo(before.y, 3);
      const chosen = await canvas.getAttribute("data-selected");
      await page.mouse.move(mid.x, mid.y);
      await page.mouse.down();
      await page.mouse.move(mid.x - 90, mid.y + 40, { steps: 8 });
      await page.mouse.up();
      expect((await camera()).x).toBeGreaterThan(after.x);
      await expect(canvas).toHaveAttribute("data-selected", chosen!);
    }
    const savedZoom = await zoom();
    await page.setViewportSize(
      mobile ? { width: 410, height: 830 } : { width: 1280, height: 900 },
    );
    await expect.poll(zoom).toBeCloseTo(savedZoom, 5);
    await page
      .getByRole("button", { name: "Voir les bâtiments", exact: true })
      .click();
    const clickCell = async (x: number, y: number) => {
      const r = await canvas.boundingBox(),
        c = await camera(),
        z = await zoom();
      await canvas.click({
        position: {
          x: r!.width / 2 + ((x + 0.5) * 32 - c.x) * z,
          y: r!.height / 2 + ((y + 0.5) * 32 - c.y) * z,
        },
      });
    };
    await expect(page.locator("h1")).toHaveText("Le petit campement");
    await expect(canvas).toHaveAttribute(
      "data-scale",
      "camp-layered-buildings",
    );
    await expect(canvas).toHaveAttribute("data-building-count", "4");
    const assets = await page.evaluate(async () => {
      const image = new Image();
      image.src = "/assets/kingdom-camp/buildings-layered.png";
      await image.decode();
      const c = document.createElement("canvas");
      c.width = 1152;
      c.height = 1024;
      const t = c.getContext("2d")!;
      t.drawImage(image, 0, 0);
      const alpha = t.getImageData(4 * 64, 12 * 64, 64, 64).data;
      return {
        w: image.width,
        h: image.height,
        transparent: alpha.some((v, k) => k % 4 === 3 && v === 0),
        opaque: alpha.some((v, k) => k % 4 === 3 && v > 200),
      };
    });
    expect(assets).toEqual({
      w: 1152,
      h: 1024,
      transparent: true,
      opaque: true,
    });
    await clickCell(6, 12);
    await expect(canvas).toHaveAttribute("data-reachable", "false");
    await expect(page.locator("[data-camp-status]")).toContainText(
      "Petite maison",
    );
    await page
      .getByRole("button", { name: "Ouvrir la porte", exact: true })
      .click();
    await expect(canvas).toHaveAttribute("data-open-houses", "1");
    await expect(canvas).toHaveAttribute("data-reachable", "true");
    await clickCell(6, 11);
    await expect(canvas).toHaveAttribute("data-reachable", "true");
    await expect(canvas).toHaveAttribute(
      "data-selected",
      String(11 * 32 + 6 + 1),
    );
    await page.screenshot({
      path: `/tmp/streets-interior-${mobile ? "mobile" : "desktop"}.png`,
    });
    await page
      .getByRole("button", { name: "Fermer la porte", exact: true })
      .click();
    await expect(canvas).toHaveAttribute("data-open-houses", "0");
    await expect(canvas).toHaveAttribute("data-reachable", "false");
    await page.getByLabel("Grille", { exact: true }).uncheck();
    await expect(canvas).toHaveAttribute("data-grid", "false");
    await page.screenshot({
      path: `/tmp/streets-house-${mobile ? "mobile" : "desktop"}.png`,
    });
    await page
      .getByRole("button", { name: "Vue entière", exact: true })
      .click();
    await expect.poll(zoom).toBeLessThan(1);
    await page.screenshot({
      path: `/tmp/streets-map-${mobile ? "mobile" : "desktop"}.png`,
    });
    await page.getByRole("button", { name: "Zoomer", exact: true }).click();
    const plus = await zoom();
    await page.getByRole("button", { name: "Dézoomer", exact: true }).click();
    expect(await zoom()).toBeLessThan(plus);
    expect(await page.evaluate(() => localStorage.getItem("lte-save"))).toBe(
      "sauvegarde à conserver",
    );
    expect(errors).toEqual([]);
    await page.getByRole("button", { name: "Retour", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Nouvelle partie" }),
    ).toBeVisible();
  });

test("couches réelles : quatre murs permanents, aucun plancher sous leur emprise et chemins raccordés", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Carte du chapitre 2", exact: true })
    .click();
  await expect(page.locator("[data-camp-canvas]")).toHaveAttribute(
    "data-ready",
    "true",
  );
  const results = await page.evaluate(async () => {
    const D = await import(String("/src/data/kingdom-camp-map.ts")),
      R = await import(String("/src/ui/kingdom-camp-renderer.ts")),
      T = await import(String("/src/data/village-tileset.ts"));
    const ground = new Image(),
      art = new Image(),
      castle = new Image();
    ground.src = "/assets/regional-tiles.png";
    art.src = "/" + T.villageTileset.source;
    castle.src = "/assets/material-tests/castle-atlas.png";
    await Promise.all([ground.decode(), art.decode(), castle.decode()]);
    const renderer = new R.CampTerrainRenderer(ground, art, castle);
    const buildings = D.campBuildings.map((b: any) => {
      const a = renderer.buildingLayers(b, false),
        o = renderer.buildingLayers(b, true);
      const floor = o.floor
        .getContext("2d")!
        .getImageData(0, 0, o.floor.width, o.floor.height).data;
      const closed = a.walls
        .getContext("2d")!
        .getImageData(0, 0, a.walls.width, a.walls.height).data;
      const opened = o.walls
        .getContext("2d")!
        .getImageData(0, 0, o.walls.width, o.walls.height).data;
      let floorUnderWalls = 0,
        changedWalls = 0,
        minWallCoverage = 1;
      for (let y = 0; y < b.h; y++)
        for (let x = 0; x < b.w; x++) {
          if (
            D.isCampInterior(b, b.x + x, b.y + y) ||
            (b.x + x === b.entry.x && b.y + y === b.entry.y)
          )
            continue;
          let opaque = 0;
          for (let py = 0; py < 64; py++)
            for (let px = 0; px < 64; px++) {
              const i = ((y * 64 + py) * o.floor.width + x * 64 + px) * 4;
              if (floor[i + 3]) floorUnderWalls++;
              if (opened[i + 3] > 200) opaque++;
              for (let k = 0; k < 4; k++)
                if (closed[i + k] !== opened[i + k]) changedWalls++;
            }
          minWallCoverage = Math.min(minWallCoverage, opaque / 4096);
        }
      let gapsAtJambs = 0,
        unequalSideCaps = 0;
      const doorX = (b.entry.x - b.x) * 64;
      for (let py = (b.h - 1) * 64; py < b.h * 64; py++)
        for (const dx of [0, 1, 2, 3, 60, 61, 62, 63]) {
          const i = (py * o.walls.width + doorX + dx) * 4 + 3;
          if (opened[i] !== 255 || closed[i] !== 255) gapsAtJambs++;
        }
      // Both full side columns, including all four corners, use matching caps.
      for (let py = 0; py < b.h * 64; py++)
        for (let px = 0; px < 64; px++)
          for (let k = 0; k < 4; k++) {
            const left = (py * o.walls.width + px) * 4 + k;
            const right = (py * o.walls.width + (b.w - 1) * 64 + px) * 4 + k;
            if (opened[left] !== opened[right]) unequalSideCaps++;
          }
      const roofPixels = a.roof
        .getContext("2d")!
        .getImageData(0, 0, a.roof.width, (b.h - 1) * 64).data;
      let uncoveredRoofPixels = 0;
      for (let i = 3; i < roofPixels.length; i += 4)
        if (roofPixels[i] !== 255) uncoveredRoofPixels++;
      const alpha = (c: HTMLCanvasElement) =>
        c
          .getContext("2d")!
          .getImageData(0, 0, c.width, c.height)
          .data.some((v, i) => i % 4 === 3 && v > 0);
      return {
        id: b.id,
        floorUnderWalls,
        changedWalls,
        minWallCoverage,
        gapsAtJambs,
        unequalSideCaps,
        uncoveredRoofPixels,
        closedRoof: alpha(a.roof),
        openRoof: alpha(o.roof),
      };
    });
    const mask = R.campRoadMask(),
      c = mask.getContext("2d")!;
    const a = (x: number, y: number) => c.getImageData(x, y, 1, 1).data[3];
    return {
      buildings,
      road: {
        inside: a(17 * 64 + 32, 18 * 64 + 32),
        edge: a(17 * 64, 18 * 64 + 32),
        outside: a(17 * 64 - 32, 18 * 64 + 32),
      },
    };
  });
  expect(results.buildings).toHaveLength(4);
  for (const b of results.buildings) {
    expect(b.floorUnderWalls, b.id).toBe(0);
    expect(b.changedWalls, b.id).toBe(0);
    expect(b.minWallCoverage, b.id).toBeGreaterThan(0.7);
    expect(b.gapsAtJambs, b.id).toBe(0);
    expect(b.unequalSideCaps, b.id).toBe(0);
    expect(b.uncoveredRoofPixels, b.id).toBe(0);
    expect(b.closedRoof, b.id).toBe(true);
    expect(b.openRoof, b.id).toBe(false);
  }
  expect(results.road.inside).toBe(255);
  expect(results.road.outside).toBe(0);
  expect(results.road.edge).toBeGreaterThan(0);
  expect(results.road.edge).toBeLessThan(255);
});
