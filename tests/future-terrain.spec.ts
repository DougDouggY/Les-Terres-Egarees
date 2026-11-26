import { test, expect } from "@playwright/test";
for (const mobile of [false, true])
  test(`terrains suivants : ${mobile ? "mobile" : "ordinateur"}`, async ({
    page,
  }) => {
    await page.setViewportSize(
      mobile ? { width: 390, height: 844 } : { width: 1280, height: 900 },
    );
    await page.routeWebSocket(/.*/, () => {});
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/");
    await page.evaluate(() => localStorage.setItem("lte-save", "intacte"));
    await page
      .getByRole("button", { name: "Cartes suivantes · essais", exact: true })
      .click();
    const board = page.locator('canvas[aria-label="Terrain d’essai"]');
    await expect(board).toHaveAttribute("data-ready", "true");
    await expect(board).toHaveAttribute("data-map", "castle-approach");
    await page.screenshot({
      path: `/tmp/future-castle-${mobile ? "mobile" : "desktop"}.png`,
    });
    await page.getByLabel("Terrain", { exact: true }).selectOption("1");
    await expect(board).toHaveAttribute("data-map", "supplies");
    await page.getByLabel("Nuit", { exact: true }).check();
    await page.getByLabel("Grille", { exact: true }).check();
    const z = Number(await board.getAttribute("data-zoom"));
    await page.getByRole("button", { name: "Zoomer", exact: true }).click();
    expect(Number(await board.getAttribute("data-zoom"))).toBeGreaterThan(z);
    await page
      .getByRole("button", { name: "Vue entière", exact: true })
      .click();
    await expect(
      page.getByRole("link", { name: "Exporter la carte" }),
    ).toHaveAttribute("download", "supplies-nuit.png");
    const assets = await page.evaluate(async () =>
      Promise.all(
        ["camp", "castle", "wilds"].map(async (key) => {
          const i = new Image();
          i.src = `/assets/future-terrain/${key}.png`;
          await i.decode();
          return [i.width, i.height];
        }),
      ),
    );
    expect(assets).toEqual([
      [1024, 1024],
      [1024, 1024],
      [1024, 1024],
    ]);
    await page.screenshot({
      path: `/tmp/future-supplies-${mobile ? "mobile" : "desktop"}.png`,
    });
    if (!mobile) {
      await page
        .getByRole("button", { name: "Explorer le château validé" })
        .click();
      await expect(page.locator("#study-canvas")).toBeVisible();
      await page
        .getByRole("button", { name: "Retour aux tests", exact: true })
        .click();
      await expect(
        page.getByRole("heading", { name: "Les prochaines cartes" }),
      ).toBeVisible();
    }
    await page.getByRole("button", { name: "Retour", exact: true }).click();
    expect(await page.evaluate(() => localStorage.getItem("lte-save"))).toBe(
      "intacte",
    );
    expect(errors).toEqual([]);
  });
