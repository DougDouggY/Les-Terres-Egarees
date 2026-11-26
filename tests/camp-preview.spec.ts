import { test, expect } from "@playwright/test";
for (const mobile of [false, true])
  test(`carte naturelle : ${mobile ? "téléphone, pincement" : "ordinateur, molette"}, caméra et cases`, async ({
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
      .getByRole("button", { name: "Voir le village", exact: true })
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
    await clickCell(28, 7);
    await expect(canvas).toHaveAttribute("data-reachable", "false");
    await expect(page.locator("[data-camp-status]")).toContainText("Village");
    await clickCell(29, 9);
    await expect(canvas).toHaveAttribute("data-reachable", "true");
    await expect(canvas).toHaveAttribute(
      "data-selected",
      String(9 * 40 + 29 + 1),
    );
    await page.getByLabel("Grille", { exact: true }).uncheck();
    await expect(canvas).toHaveAttribute("data-grid", "false");
    await page.screenshot({
      path: `/tmp/natural-village-${mobile ? "mobile" : "desktop"}.png`,
    });
    await page
      .getByRole("button", { name: "Vue entière", exact: true })
      .click();
    await expect.poll(zoom).toBeLessThan(1);
    await page.screenshot({
      path: `/tmp/natural-map-${mobile ? "mobile" : "desktop"}.png`,
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
