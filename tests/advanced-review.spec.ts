import { test, expect } from "@playwright/test";
for (const width of [390, 1280])
  test(`comparaison Vikings évolués : filtres, images et agrandissement à ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 844 });
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/validation/vikings-evolues/index.html");
    const manifest = await (
      await page.request.get("/validation/vikings-evolues/manifest.json")
    ).json();
    expect(manifest.classes).toHaveLength(10);
    expect(manifest.rows.filter((r: any) => !r.reference)).toHaveLength(30);
    expect(manifest.rows.filter((r: any) => r.reference)).toHaveLength(3);
    await expect(page.locator("[data-class]")).toHaveCount(10);
    await page.locator("#class-filter").selectOption("huscarl");
    await expect(page.locator("[data-class]:visible")).toHaveCount(1);
    await expect(page.locator("[data-class] .card:visible")).toHaveCount(4);
    await page.locator("#gender-filter").selectOption("female");
    await expect(page.locator("[data-class] .card:visible")).toHaveCount(2);
    const fresh = page.locator(".new-review-canvas:visible");
    if (await fresh.count()) {
      await fresh.first().click();
      const dialog = page.getByRole("dialog", {
        name: "Nouvelle animation agrandie",
      });
      await expect(dialog).toBeVisible();
      await expect(dialog.locator("canvas")).toHaveAttribute(
        "data-ready",
        "true",
      );
      await dialog.getByRole("button", { name: "Fermer ×" }).click();
      await expect(dialog).not.toBeVisible();
    } else {
      await page.locator(".zoom:visible").first().click();
      const dialog = page.getByRole("dialog", { name: "Sprite agrandi" });
      await expect(dialog).toBeVisible();
      await expect
        .poll(() =>
          dialog
            .locator("img")
            .evaluate(
              (i: HTMLImageElement) => i.complete && i.naturalWidth > 0,
            ),
        )
        .toBe(true);
      await dialog.getByRole("button", { name: "Fermer ×" }).click();
      await expect(dialog).not.toBeVisible();
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
    ).toBe(false);
    for (const row of manifest.rows)
      for (const key of ["map", "guard", "attack"]) {
        expect(row[key].file, `${row.id} ${key}`).toBeTruthy();
        expect(
          (
            await page.request.get(
              `/validation/vikings-evolues/${row[key].file}`,
            )
          ).ok(),
        ).toBe(true);
      }
    if (width === 390)
      await page.screenshot({
        path: "/tmp/vikings-evolues-mobile.png",
        fullPage: true,
      });
    expect(errors).toEqual([]);
  });
