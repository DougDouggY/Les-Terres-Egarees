import { test, expect } from "@playwright/test";
for (const width of [390, 1280])
  test(`nouvelles variantes : avant/après, animations et zoom ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 844 });
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/validation/vikings-evolues/index.html");
    await expect(page.locator(".new-review")).toHaveCount(15);
    await page.locator("#class-filter").selectOption("huscarl");
    await page.locator("#gender-filter").selectOption("female");
    const review = page.locator(".new-review:visible").first(),
      canvas = review.locator("canvas");
    await expect(canvas).toHaveAttribute("data-ready", "true");
    const initial = await canvas.getAttribute("data-frame");
    await review.getByLabel("Animation", { exact: true }).selectOption("move");
    await expect(canvas).toHaveAttribute("data-animation", "move");
    await expect
      .poll(() => canvas.getAttribute("data-frame"))
      .not.toBe(initial);
    await review.getByRole("button", { name: "Pause", exact: true }).click();
    const frame = await canvas.getAttribute("data-frame");
    await page.waitForTimeout(220);
    await expect(canvas).toHaveAttribute("data-frame", frame!);
    await review.getByLabel("Vitesse", { exact: true }).selectOption("0.25");
    await canvas.click();
    const modal = page.getByRole("dialog", {
      name: "Nouvelle animation agrandie",
    });
    await expect(modal).toBeVisible();
    await expect(modal.locator("canvas")).toHaveAttribute("data-ready", "true");
    await modal.getByRole("button", { name: "Fermer ×" }).click();
    if (width === 390)
      await page.screenshot({
        path: "/tmp/advanced-new-mobile.png",
        fullPage: true,
      });
    await page.locator("#class-filter").selectOption("berserker");
    await page.locator("#gender-filter").selectOption("all");
    const berserker = page.locator(".new-review:visible").first();
    expect(
      await berserker
        .getByLabel("Animation", { exact: true })
        .locator('option[value="block"]')
        .count(),
    ).toBe(0);
    await page.locator("#class-filter").selectOption("clan_healer");
    expect(
      await page
        .locator(".new-review:visible")
        .first()
        .getByLabel("Animation", { exact: true })
        .locator('option[value="bandage"]')
        .count(),
    ).toBe(1);
    await page.locator("#class-filter").selectOption("master_hunter");
    expect(await page.locator(".new-review:visible").count()).toBe(0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
    ).toBe(false);
    expect(errors).toEqual([]);
  });

test("quinze nouvelles variantes : toutes les séquences dessinent une figure sans toucher aux sauvegardes", async ({
  page,
}) => {
  await page.goto("/validation/vikings-evolues/index.html");
  await expect(page.locator(".new-review")).toHaveCount(15);
  const before = await page.evaluate(() => JSON.stringify({ ...localStorage }));
  const { profiles } = await (
    await page.request.get("/validation/vikings-evolues/reprises/manifest.json")
  ).json();
  for (const p of profiles) {
    await page.locator("#class-filter").selectOption(p.id.split("-")[0]);
    await page
      .locator("#gender-filter")
      .selectOption(p.id.endsWith("female") ? "female" : "male");
    const review = page.locator(`[data-variant="${p.id}"] .new-review`),
      canvas = review.locator("canvas");
    await review.scrollIntoViewIfNeeded();
    await expect(canvas).toHaveAttribute("data-ready", "true");
    for (const clip of Object.keys(p.clips)) {
      await review.getByLabel("Animation", { exact: true }).selectOption(clip);
      await expect(canvas).toHaveAttribute("data-animation", clip);
      const visible = await canvas.evaluate((c: HTMLCanvasElement) => {
        const d = c
          .getContext("2d")!
          .getImageData(0, 0, c.width, c.height).data;
        let n = 0;
        for (let i = 3; i < d.length; i += 4) if (d[i] > 64) n++;
        return n;
      });
      expect(visible, `${p.id}/${clip}`).toBeGreaterThan(1000);
    }
  }
  expect(await page.evaluate(() => JSON.stringify({ ...localStorage }))).toBe(
    before,
  );
});
