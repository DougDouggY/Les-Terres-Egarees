import { test, expect } from "@playwright/test";
test("carte bord à bord : écran large, faible hauteur et mobile, cases carrées", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.evaluate(async () => {
    const E = await import("/src/engine.ts" as string),
      s = E.createCampaign(["north", "knight"]);
    s.phase = "battle";
    s.scene = null;
    localStorage.setItem("lte-save", E.encode(s));
  });
  await page.reload();
  await page.getByRole("button", { name: /Continuer/ }).click();
  await page
    .getByRole("button", { name: "Retirer la brume (test)", exact: true })
    .click();
  for (const [width, height] of [
    [1907, 882],
    [1280, 600],
    [1024, 450],
    [390, 844],
  ]) {
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(250);
    const c = await page.locator("#map").evaluate((c: HTMLCanvasElement) => {
      const r = c.getBoundingClientRect();
      return {
        x: r.x,
        y: r.y,
        w: r.width,
        h: r.height,
        cols: Number(c.dataset.viewCols),
        rows: Number(c.dataset.viewRows),
        bw: c.width,
        bh: c.height,
      };
    });
    expect(c.x).toBeCloseTo(0);
    expect(c.y).toBeCloseTo(0);
    expect(c.w).toBeGreaterThanOrEqual(width * 0.99);
    expect(c.h).toBeGreaterThanOrEqual(height * 0.99);
    expect(Math.abs(c.w / c.cols - c.h / c.rows)).toBeLessThan(0.01);
    expect(Math.abs(c.bw / c.bh - width / height)).toBeLessThan(0.01);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollHeight <= innerHeight + 1,
      ),
    ).toBe(true);
    await expect(
      page.getByRole("button", { name: "Recentrer", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Sauvegarder", exact: true }),
    ).toBeVisible();
    if (width === 1907) {
      await page
        .getByRole("button", { name: "Observation côte à côte", exact: true })
        .click();
      await page.waitForTimeout(250);
      for (const id of ["#map", "#map2"]) {
        const r = (await page.locator(id).boundingBox())!;
        expect(r.width).toBeCloseTo(width / 2);
        expect(r.height).toBeCloseTo(height);
        const square = await page
          .locator(id)
          .evaluate((c: HTMLCanvasElement) => {
            const r = c.getBoundingClientRect();
            return Math.abs(
              r.width / Number(c.dataset.viewCols) -
                r.height / Number(c.dataset.viewRows),
            );
          });
        expect(square).toBeLessThan(0.01);
      }
      await page
        .getByRole("button", { name: "Observation côte à côte", exact: true })
        .click();
      await page.waitForTimeout(250);
    }
    if (width === 1907 || width === 1280)
      await page.screenshot({ path: `artifacts/fullscreen-${width}.png` });
  }
  expect(errors).toEqual([]);
});
