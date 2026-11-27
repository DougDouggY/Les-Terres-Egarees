import { test, expect } from "@playwright/test";
for (const mobile of [false, true])
  test(`chapitres V–VI : ${mobile ? "téléphone" : "ordinateur"}, couches et portes`, async ({
    page,
  }) => {
    await page.setViewportSize(
      mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 },
    );
    await page.routeWebSocket(/.*/, () => {});
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/");
    await page.evaluate(() => localStorage.setItem("lte-save", "conservée"));
    await page
      .getByRole("button", { name: "Cartes suivantes · essais", exact: true })
      .click();
    const select = page.getByLabel("Terrain", { exact: true }),
      canvas = page.locator('canvas[aria-label="Terrain d’essai"]');
    await expect(canvas).toHaveAttribute("data-ready", "true");
    for (const [value, id] of [
      ["2", "convoy"],
      ["3", "fortress"],
    ]) {
      await select.selectOption(value);
      await expect(canvas).toHaveAttribute("data-map", id);
      await expect(
        page.getByRole("link", { name: "Portes PNG", exact: true }),
      ).toHaveAttribute("download", `${id}-portes.png`);
      await expect(
        page.getByRole("link", { name: "Objets PNG", exact: true }),
      ).toHaveAttribute("download", `${id}-objets.png`);
      await page.getByLabel("Décor mobile", { exact: true }).uncheck();
      await page
        .getByLabel("Intérieurs et portes ouverts", { exact: true })
        .check();
      await expect(
        page.getByRole("link", { name: "Portes PNG", exact: true }),
      ).toHaveAttribute("download", `${id}-portes-ouverts.png`);
      await page.getByRole("button", { name: "Zoomer", exact: true }).click();
      await page
        .getByRole("button", { name: "Vue entière", exact: true })
        .click();
      await page.screenshot({
        path: `/tmp/${id}-${mobile ? "mobile" : "desktop"}-open.png`,
      });
      await page
        .getByLabel("Intérieurs et portes ouverts", { exact: true })
        .uncheck();
      await page.getByLabel("Décor mobile", { exact: true }).check();
      await page.screenshot({
        path: `/tmp/${id}-${mobile ? "mobile" : "desktop"}.png`,
      });
    }
    expect(errors).toEqual([]);
    await page.getByRole("button", { name: "Retour", exact: true }).click();
    expect(await page.evaluate(() => localStorage.getItem("lte-save"))).toBe(
      "conservée",
    );
  });
test("chariots indépendants, structures fixes, alpha réel des objets", async ({
  page,
}) => {
  await page.goto("/");
  const report = await page.evaluate(async () => {
    const D = await import(String("/src/data/landscape-drafts.ts")),
      R = await import(String("/src/rendering/landscape-draft-renderer.ts"));
    const images = new Map<string, HTMLImageElement>();
    await Promise.all(
      Object.entries(D.LANDSCAPE_ASSETS).map(async ([k, p]) => {
        const i = new Image();
        i.src = "/" + p;
        await i.decode();
        images.set(k, i);
      }),
    );
    const hash = (c: HTMLCanvasElement) => {
      const p = c.getContext("2d")!.getImageData(0, 0, c.width, c.height).data;
      let h = 2166136261;
      for (let i = 0; i < p.length; i++) h = Math.imul(h ^ p[i], 16777619);
      return h >>> 0;
    };
    const map = D.campaignTerrainDrafts()[0],
      a = R.landscapeLayers(map, images, false);
    const groundHash = hash(a.ground),
      objectsHash = hash(a.objects);
    map.layout!.props[0].x += 3;
    const b = R.landscapeLayers(map, images, false);
    const fortress = D.campaignTerrainDrafts()[1],
      closed = R.landscapeLayers(fortress, images, false),
      open = R.landscapeLayers(fortress, images, true);
    const p = document.createElement("canvas");
    p.width = p.height = 1024;
    p.getContext("2d")!.drawImage(images.get("objects")!, 0, 0);
    const pixels = p.getContext("2d")!.getImageData(0, 0, 1024, 1024).data;
    return {
      groundSame: groundHash === hash(b.ground),
      objectsChanged: objectsHash !== hash(b.objects),
      structuresSame: hash(closed.structures) === hash(open.structures),
      roofsChanged: hash(closed.roofs) !== hash(open.roofs),
      doorsChanged: hash(closed.doors) !== hash(open.doors),
      transparent: pixels.some((v, i) => i % 4 === 3 && v === 0),
      opaque: pixels.some((v, i) => i % 4 === 3 && v === 255),
    };
  });
  expect(report).toEqual({
    groundSame: true,
    objectsChanged: true,
    structuresSame: true,
    roofsChanged: true,
    doorsChanged: true,
    transparent: true,
    opaque: true,
  });
});

test("catalogue de ressources : couches et seize objets téléchargeables", async ({
  page,
}) => {
  await page.goto("/assets/chapter-5-6/index.html");
  await expect(
    page.getByRole("heading", {
      name: "Chapitres V et VI — Ressources graphiques",
    }),
  ).toBeVisible();
  await expect(page.locator("a.object")).toHaveCount(16);
  const loaded = await page
    .locator("img")
    .evaluateAll((images) =>
      images.every(
        (i) =>
          (i as HTMLImageElement).complete &&
          (i as HTMLImageElement).naturalWidth > 0,
      ),
    );
  expect(loaded).toBe(true);
  const response = await page.request.get("/assets/chapter-5-6/resources.json");
  expect(response.ok()).toBe(true);
  const manifest = await response.json();
  expect(manifest.maps).toHaveLength(2);
  expect(manifest.objects).toHaveLength(16);
  await expect(
    page.getByRole("link", { name: "Portes ouvertes", exact: true }),
  ).toHaveCount(2);
});
