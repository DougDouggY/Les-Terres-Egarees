import { test, expect } from "@playwright/test";
for (const width of [390, 1280])
  test(`Chevaliers évolués : apparences, états réels, filtres et zoom ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 844 });
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/validation/chevaliers-evolues/index.html");
    const before = await page.evaluate(() =>
      JSON.stringify({ ...localStorage }),
    );
    const manifest = await (
      await page.request.get("/validation/chevaliers-evolues/manifest.json")
    ).json();
    const rows = manifest.rows.filter((r: any) => !r.reference);
    expect(manifest.classes).toHaveLength(11);
    expect(rows).toHaveLength(32);
    expect(manifest.rows.filter((r: any) => r.reference)).toHaveLength(3);
    expect(
      rows
        .filter((r: any) => r.classId === "standard_bearer")
        .map((r: any) => [r.weapon, r.state]),
    ).toEqual([
      ["banner_lance", "carried"],
      ["banner_lance", "carried"],
      ["sword", "planted"],
      ["sword", "planted"],
    ]);
    expect(rows.filter((r: any) => r.state === "fortified")).toHaveLength(2);
    await expect(page.locator("[data-class]")).toHaveCount(11);
    await page.locator("#class-filter").selectOption("standard_bearer");
    await page.locator("#gender-filter").selectOption("female");
    await expect(page.locator("[data-class]:visible")).toHaveCount(1);
    await expect(page.locator("[data-class] .card:visible")).toHaveCount(2);
    await expect(
      page.locator(".card:visible").filter({ hasText: "bannière portée" }),
    ).toHaveCount(1);
    await expect(
      page.locator(".card:visible").filter({ hasText: "bannière plantée" }),
    ).toHaveCount(1);
    await page.locator(".zoom:visible").first().click();
    const dialog = page.getByRole("dialog", { name: "Sprite agrandi" });
    await expect(dialog).toBeVisible();
    await expect
      .poll(() =>
        dialog
          .locator("img")
          .evaluate((i: HTMLImageElement) => i.complete && i.naturalWidth > 0),
      )
      .toBe(true);
    await dialog.getByRole("button", { name: "Fermer ×" }).click();
    for (const row of manifest.rows)
      for (const key of ["map", "guard", "attack"]) {
        expect(row[key].file, `${row.id}/${key}`).toBeTruthy();
        expect(
          (
            await page.request.get(
              "/validation/chevaliers-evolues/" + row[key].file,
            )
          ).ok(),
        ).toBe(true);
      }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
    ).toBe(false);
    expect(await page.evaluate(() => JSON.stringify({ ...localStorage }))).toBe(
      before,
    );
    expect(errors).toEqual([]);
    if (width === 390)
      await page.screenshot({ path: "/tmp/knight-advanced-mobile.png" });
  });
