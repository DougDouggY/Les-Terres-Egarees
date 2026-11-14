import { test, expect } from "@playwright/test";

test("nouvel abordage : ancien conservé, traversée, eau, export carré", async ({
  page,
}) => {
  test.setTimeout(60000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Tests de combat", exact: true })
    .click();
  await page.getByRole("button", { name: "Explorer les deux cartes" }).click();
  const canvas = page.locator("#study-canvas");
  await expect(canvas).toHaveAttribute("data-ready", "true");
  await expect(page.locator("[data-study]")).toHaveCount(4);
  await page.getByRole("button", { name: /03 · Abordage naval/ }).click();
  const old = await canvas.evaluate((c) =>
    (c as HTMLCanvasElement).toDataURL(),
  );
  await page.getByRole("button", { name: /04 · Abordage/ }).click();
  await expect(canvas).toHaveAttribute("data-skin", "boarding-new");
  expect(
    await canvas.evaluate((c) => (c as HTMLCanvasElement).toDataURL()),
  ).not.toBe(old);
  await page.getByRole("button", { name: /03 · Abordage naval/ }).click();
  expect(
    await canvas.evaluate((c) => (c as HTMLCanvasElement).toDataURL()),
  ).toBe(old);
  await page.getByRole("button", { name: /04 · Abordage/ }).click();
  await expect(canvas).toHaveAttribute("data-skin", "boarding-new");
  await canvas.scrollIntoViewIfNeeded();
  const box = (await canvas.boundingBox())!,
    z = Number(await page.getByLabel("Zoom", { exact: true }).inputValue());
  const point = (x: number, y: number) => ({
    x: box.x + (box.width - 34 * 32 * z) / 2 + (x + 0.5) * 32 * z,
    y: box.y + (box.height - 30 * 32 * z) / 2 + (y + 0.5) * 32 * z,
  });
  const water = point(3, 14);
  await page.mouse.click(water.x, water.y);
  await expect(page.locator(".study-status")).toContainText("inaccessible");
  await expect(canvas).toHaveAttribute("data-character", /:183$/);
  const target = point(13, 18);
  await page.mouse.click(target.x, target.y);
  await expect(canvas).toHaveAttribute("data-character", /:625$/, {
    timeout: 15000,
  });
  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exporter le PNG" }).click();
  const download = await downloadEvent;
  expect(download.suggestedFilename()).toBe("plan-abordage-fantome-34x30.png");
  const { readFile } = await import("node:fs/promises");
  const png = await readFile((await download.path())!);
  expect(png.readUInt32BE(16)).toBe(34 * 96);
  expect(png.readUInt32BE(20)).toBe(30 * 96);
  await page
    .getByRole("button", { name: "Réinitialiser", exact: true })
    .click();
  await expect(canvas).toHaveAttribute("data-character", /:183$/);
  expect(errors).toEqual([]);
});

test("nouvel abordage : téléphone, cadrage complet et export", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Tests de combat", exact: true })
    .click();
  await page.getByRole("button", { name: "Explorer les deux cartes" }).click();
  await expect(page.locator("#study-canvas")).toHaveAttribute(
    "data-ready",
    "true",
  );
  await page.getByRole("button", { name: /04 · Abordage/ }).click();
  await expect(page.locator("#study-canvas")).toHaveAttribute(
    "data-skin",
    "boarding-new",
  );
  await page.getByRole("button", { name: "Cadrer la carte" }).click();
  const zoom = Number(
    await page.getByLabel("Zoom", { exact: true }).inputValue(),
  );
  const size = await page.locator("#study-canvas").evaluate((c) => ({
    w: (c as HTMLCanvasElement).width,
    h: (c as HTMLCanvasElement).height,
  }));
  expect(34 * 32 * zoom).toBeLessThanOrEqual(size.w);
  expect(30 * 32 * zoom).toBeLessThanOrEqual(size.h);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("rendu : sprites carrés transparents sans étirement et matériaux des deux navires distincts", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    // @ts-expect-error Browser module.
    const r = await import("/src/rendering/boarding-experiment.ts");
    // @ts-expect-error Browser module.
    const m = await import("/src/data/boarding-experiment.ts");
    // @ts-expect-error Browser module.
    const old = await import("/src/rendering/plan-renderer.ts");
    const art = await r.loadBoardingArtwork(),
      base = r.renderBoardingExperiment(
        m.boardingExperimentPlan,
        await old.loadPlanArtwork(),
        art,
      );
    const sizes = [];
    let edgesClear = true;
    for (let i = 0; i < 16; i++) {
      const sprite = r.boardingSprite(art, i);
      sizes.push([sprite.width, sprite.height]);
      const d = sprite.getContext("2d").getImageData(0, 0, 96, 96).data;
      for (let y = 0; y < 96; y++)
        for (let x = 0; x < 96; x++)
          if (
            (x < 2 || y < 2 || x >= 94 || y >= 94) &&
            d[(y * 96 + x) * 4 + 3] > 1
          )
            edgesClear = false;
    }
    const c = base.getContext("2d"),
      n = c.getImageData(5 * 96, 5 * 96, 96, 96).data,
      g = c.getImageData(5 * 96, 21 * 96, 96, 96).data;
    let warm = 0,
      cold = 0;
    for (let i = 0; i < n.length; i += 4) {
      warm += n[i] - n[i + 2];
      cold += g[i] - g[i + 2];
    }
    const mast = r.boardingSprite(art, 4),
      d = mast.getContext("2d").getImageData(0, 0, 96, 96).data;
    let l = 96,
      t = 96,
      rr = 0,
      b = 0;
    for (let y = 0; y < 96; y++)
      for (let x = 0; x < 96; x++)
        if (d[(y * 96 + x) * 4 + 3] > 24) {
          l = Math.min(l, x);
          rr = Math.max(rr, x);
          t = Math.min(t, y);
          b = Math.max(b, y);
        }
    return {
      square: sizes.every(([w, h]) => w === 96 && h === 96),
      edgesClear,
      distinct: warm > cold,
      tallMast: b - t > rr - l,
    };
  });
  expect(result).toEqual({
    square: true,
    edgesClear: true,
    distinct: true,
    tallMast: true,
  });
});
