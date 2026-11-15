import { test, expect } from "@playwright/test";
test("sauvegardes : créer, charger, tester sans enregistrer, rouvrir, renommer, écraser et supprimer", async ({
  page,
}) => {
  await page.goto("/");
  // Use the actual chapter state and engine, then enter through the supported legacy loader.
  await page.evaluate(async () => {
    const E = await import(String("/src/engine.ts"));
    const s = E.prepareChapterOneTest(E.createCampaign(["north", "knight"]));
    localStorage.setItem("lte-save", E.encode(s));
  });
  await page
    .getByRole("button", { name: "Charger une partie", exact: true })
    .click();
  await page.locator('[data-slot-legacy="lte-save"]').click();
  // Chapter introduction is a stable narrative checkpoint with its manual Save control.
  await page.locator('[data-action="story-save"]').click({ timeout: 15000 });
  await page
    .getByLabel("Nom de la sauvegarde", { exact: true })
    .fill("Officielle");
  await page
    .getByRole("button", { name: "Créer une sauvegarde", exact: true })
    .click();
  await page.getByLabel("Nom de la sauvegarde", { exact: true }).fill("Essai");
  await page
    .getByRole("button", { name: "Créer une sauvegarde", exact: true })
    .click();
  const baseline = await page.evaluate(() =>
    localStorage.getItem("lte-manual-saves-v1"),
  );
  const legacy = await page.evaluate(() => localStorage.getItem("lte-save"));
  await page.getByRole("button", { name: "Fermer les sauvegardes" }).click();
  // Advance real chapter dialogue state. Reload discards those unsaved changes.
  await page.keyboard.press("Enter");
  await page.keyboard.press("Enter");
  const context = page.context();
  await page.close();
  page = await context.newPage();
  await page.goto("/");
  expect(
    await page.evaluate(() => localStorage.getItem("lte-manual-saves-v1")),
  ).toBe(baseline);
  await page
    .getByRole("button", { name: "Charger une partie", exact: true })
    .click();
  let first = page.locator("[data-slot]").first();
  await first.getByRole("button", { name: "Renommer", exact: true }).click();
  await first.getByLabel("Nouveau nom").fill("Officielle — validée");
  await first.getByRole("button", { name: "Enregistrer le nom" }).click();
  await first.getByRole("button", { name: "Charger", exact: true }).click();
  await page.locator('[data-action="story-save"]').click();
  first = page.locator("[data-slot]").first();
  await first.getByRole("button", { name: "Écraser", exact: true }).click();
  await first.getByRole("button", { name: "Annuler", exact: true }).click();
  expect(
    JSON.parse(
      (await page.evaluate(() => localStorage.getItem("lte-manual-saves-v1")))!,
    ).slots[0].payload,
  ).toBe(JSON.parse(baseline!).slots[0].payload);
  await first.getByRole("button", { name: "Écraser", exact: true }).click();
  await first.getByRole("button", { name: "Confirmer", exact: true }).click();
  const second = page.locator("[data-slot]").nth(1);
  await second.locator("[data-slot-delete]").click();
  await second.getByRole("button", { name: "Confirmer", exact: true }).click();
  await expect(page.locator("[data-slot]")).toHaveCount(1);
  expect(await page.evaluate(() => localStorage.getItem("lte-save"))).toBe(
    legacy,
  );
  await page.reload();
  await page
    .getByRole("button", { name: "Charger une partie", exact: true })
    .click();
  await expect(page.locator("[data-slot] strong")).toHaveText(
    "Officielle — validée",
  );
});
test("interfaces : modes, factions, paramètres sans défilement sur trois résolutions", async ({
  page,
}) => {
  for (const viewport of [
    { width: 1280, height: 800 },
    { width: 390, height: 844 },
    { width: 844, height: 390 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await page.getByRole("button", { name: /Nouvelle partie/ }).click();
    await expect(
      page.getByRole("button", { name: "Jouer avec un ami" }),
    ).toBeDisabled();
    await page.getByRole("button", { name: "Jouer solo", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Couleurs des équipes" }),
    ).toHaveCount(0);
    const boxes = await page.locator(".creator-party").evaluateAll((es) =>
      es.map((e) => ({
        x: e.getBoundingClientRect().x,
        w: e.getBoundingClientRect().width,
      })),
    );
    expect(boxes[1].x).toBeGreaterThan(boxes[0].x);
    expect(Math.abs(boxes[1].w - boxes[0].w)).toBeLessThan(2);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollHeight <= innerHeight,
      ),
    ).toBe(true);
    await page.getByRole("button", { name: /Créer nos personnages/ }).click();
    await expect(
      page.getByRole("button", { name: "Couleurs des équipes", exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollHeight <= innerHeight,
      ),
    ).toBe(true);
    for (const button of await page
      .getByRole("button", { name: "Continuer", exact: true })
      .all()) {
      const b = (await button.boundingBox())!;
      expect(b.y + b.height).toBeLessThanOrEqual(viewport.height);
    }
    await page.screenshot({ path: `/tmp/creation-${viewport.width}.png` });
  }
});
