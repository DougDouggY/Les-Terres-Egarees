import { test, expect } from "@playwright/test";
for (const mobile of [false, true])
  test(`camp II militaire : comparaison, visites et caméra ${mobile ? "mobile" : "ordinateur"}`, async ({
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
      localStorage.setItem("lte-save", "camp-conservé"),
    );
    await page
      .getByRole("button", { name: "Carte du chapitre 2", exact: true })
      .click();
    const canvas = page.locator("[data-camp-canvas]"),
      versions = page.getByLabel("Version du camp", { exact: true });
    await expect(canvas).toHaveAttribute("data-ready", "true");
    await expect(canvas).toHaveAttribute("data-building-count", "4");
    await versions.selectOption("military");
    const military = page.locator("[data-camp-canvas]");
    await expect(military).toHaveAttribute("data-ready", "true");
    await expect(military).toHaveAttribute("data-map-width", "20");
    await expect(military).toHaveAttribute("data-map-height", "24");
    await expect(military).toHaveAttribute("data-building-count", "6");
    await page.getByLabel("Grille", { exact: true }).uncheck();
    await page.screenshot({
      path: `/tmp/camp-military-${mobile ? "mobile" : "desktop"}.png`,
    });
    const clickCell = async (x: number, y: number) => {
      const r = await military.boundingBox();
      const z = Number(await military.getAttribute("data-zoom")),
        cx = Number(await military.getAttribute("data-camera-x")),
        cy = Number(await military.getAttribute("data-camera-y"));
      await military.click({
        position: {
          x: r!.width / 2 + ((x + 0.5) * 32 - cx) * z,
          y: r!.height / 2 + ((y + 0.5) * 32 - cy) * z,
        },
      });
    };
    await clickCell(4, 5);
    await expect(military).toHaveAttribute("data-reachable", "true");
    await page
      .getByRole("button", { name: "Visiter · aperçu", exact: true })
      .click();
    await expect(page.getByRole("dialog")).toContainText("Grande caserne");
    await expect(page.getByRole("dialog")).toContainText(
      "sans entrer dans le bâtiment",
    );
    await page
      .getByRole("button", { name: "Retour à la carte", exact: true })
      .click();
    await expect(military).toHaveAttribute("data-open-houses", "0");
    await expect(
      page.getByRole("button", { name: "Ouvrir la porte", exact: true }),
    ).toHaveCount(0);
    const before = Number(await military.getAttribute("data-zoom"));
    await page.getByRole("button", { name: "Zoomer", exact: true }).click();
    expect(Number(await military.getAttribute("data-zoom"))).toBeGreaterThan(
      before,
    );
    if (mobile) {
      const r = (await military.boundingBox())!,
        mid = { x: r.x + r.width / 2, y: r.y + r.height / 2 },
        cdp = await page.context().newCDPSession(page);
      const z = Number(await military.getAttribute("data-zoom"));
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [
          { x: mid.x - 25, y: mid.y, id: 1 },
          { x: mid.x + 25, y: mid.y, id: 2 },
        ],
      });
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [
          { x: mid.x - 65, y: mid.y, id: 1 },
          { x: mid.x + 65, y: mid.y, id: 2 },
        ],
      });
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
      });
      expect(Number(await military.getAttribute("data-zoom"))).toBeGreaterThan(
        z,
      );
      expect(await page.evaluate(() => visualViewport!.scale)).toBe(1);
      await cdp.detach();
    }
    await page
      .getByRole("button", { name: "Voir les bâtiments", exact: true })
      .click();
    await expect(military).toHaveAttribute("data-zoom", "2");
    await page.screenshot({
      path: `/tmp/camp-military-detail-${mobile ? "mobile" : "desktop"}.png`,
    });
    await versions.selectOption("original");
    await expect(page.locator("[data-camp-canvas]")).toHaveAttribute(
      "data-ready",
      "true",
    );
    await expect(page.locator("[data-camp-canvas]")).toHaveAttribute(
      "data-building-count",
      "4",
    );
    await expect(
      page.getByRole("heading", { name: "Le petit campement", exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Retour", exact: true }).click();
    expect(await page.evaluate(() => localStorage.getItem("lte-save"))).toBe(
      "camp-conservé",
    );
    expect(errors).toEqual([]);
  });

test("murets : raccords continus et ouvertures conservées", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const D = await import(String("/src/data/kingdom-camp-military.ts")),
      R = await import(String("/src/rendering/camp-low-walls.ts"));
    const s = D.militaryCamp(),
      stone = new Image(),
      art = new Image();
    stone.src = "/assets/chapter-5-6/fortress-materials.png";
    art.src = "/assets/kingdom-camp/buildings-layered.png";
    await Promise.all([stone.decode(), art.decode()]);
    const walls = R.campLowWalls(s, stone, art),
      ctx = walls.getContext("2d")!;
    const alpha = (x: number, y: number) =>
      ctx.getImageData(x, y, 1, 1).data[3];
    let broken = 0;
    for (const w of s.walls) {
      if (
        s.walls.some(
          (n: any) =>
            n.material === w.material && n.x === w.x + 1 && n.y === w.y,
        ) &&
        alpha((w.x + 1) * 64, w.y * 64 + 32) < 250
      )
        broken++;
      if (
        s.walls.some(
          (n: any) =>
            n.material === w.material && n.x === w.x && n.y === w.y + 1,
        ) &&
        alpha(w.x * 64 + 32, (w.y + 1) * 64) < 250
      )
        broken++;
    }
    return {
      broken,
      gaps: [
        [4, 6],
        [14, 6],
        [7, 14],
        [18, 12],
      ].map(([x, y]) => alpha(x * 64 + 32, y * 64 + 32)),
      size: [walls.width, walls.height],
    };
  });
  expect(result.broken).toBe(0);
  expect(result.gaps).toEqual([0, 0, 0, 0]);
  expect(result.size).toEqual([1280, 1536]);
});
