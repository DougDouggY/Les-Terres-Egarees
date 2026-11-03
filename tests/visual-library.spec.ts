import { test, expect } from "@playwright/test";
test("lot 1 : galerie, états, couleurs et inspection sur carte sans lancer de partie", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Galerie des sprites", exact: true })
    .click();
  for (const id of [
    "cavalry",
    "mounted_spearman",
    "sans_rider",
    "standard_bearer",
    "pavise_crossbowman",
    "ironbreaker",
    "executioner",
    "berserker",
    "drengr",
  ]) {
    await page.locator(`[data-gallery-class="${id}"]`).click();
    await expect(page.locator("#sprite-canvas")).toBeVisible();
    await expect(page.locator("#visual-map")).toBeVisible();
    await page.locator("#sprite-color").selectOption("pink");
    await page.waitForTimeout(80);
  }
  await page.locator('[data-gallery-class="standard_bearer"]').click();
  await page.locator("#sprite-animation").selectOption("banner");
  await expect(page.locator("#sprite-canvas")).toBeVisible();
  await page.locator("#sprite-state").selectOption("planted");
  await page.locator("#sprite-equipment").selectOption("sword");
  await page.locator("#sprite-animation").selectOption("idle");
  await expect(page.locator("#sprite-canvas")).toBeVisible();
  await page.locator('[data-gallery-class="pavise_crossbowman"]').click();
  await page.locator("#sprite-state").selectOption("fortified");
  await page.locator("#sprite-animation").selectOption("reload");
  await expect(page.locator("#sprite-canvas")).toBeVisible();
  await page.locator("#sprite-animation").selectOption("death");
  await expect(page.locator("#sprite-animation option:checked")).toContainText(
    "Fonctionnelle",
  );
  await page.locator('[data-gallery-class="ironbreaker"]').click();
  await page.locator("#sprite-animation").selectOption("move");
  await expect(page.locator("#sprite-animation option:checked")).toContainText(
    "Provisoire",
  );
  expect(
    await page.evaluate(() => localStorage.getItem("lte-save")),
  ).toBeNull();
  await expect(page.locator("#map,.combat-screen")).toHaveCount(0);
  await page.screenshot({ path: "artifacts/visual-lot1.png", fullPage: true });
});

test("parcours visuel de toutes les ressources enregistrées, sans partie", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Galerie des sprites", exact: true })
    .click();
  const ids = await page.evaluate(async () => {
    const { spriteCatalog } = await import(
      "/src/sprites/resources.ts" as string
    );
    return [
      ...new Set(spriteCatalog.profiles.map((p: any) => p.classId)),
    ] as string[];
  });
  for (const id of ids) {
    await page.locator(`[data-gallery-class="${id}"]`).click();
    await expect(page.locator("#sprite-canvas")).toBeVisible();
    await page.waitForTimeout(45);
  }
  expect(
    await page.evaluate(() => localStorage.getItem("lte-save")),
  ).toBeNull();
  await expect(page.locator(".battle-screen,.combat-screen")).toHaveCount(0);
});

test("neuf palettes sur montures, états et Sans-Repos ; mort à deux poses puis maintien final", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Galerie des sprites", exact: true })
    .click();
  await page.locator("[data-play]").click();
  for (const id of [
    "cavalry",
    "standard_bearer",
    "pavise_crossbowman",
    "skeleton",
    "archmage",
  ]) {
    await page.locator(`[data-gallery-class="${id}"]`).click();
    const views = [];
    for (const color of [
      "blue",
      "red",
      "yellow",
      "green",
      "purple",
      "orange",
      "pink",
      "black",
      "white",
    ]) {
      await page.locator("#sprite-color").selectOption(color);
      await page.waitForTimeout(45);
      views.push(
        await page
          .locator("#sprite-canvas")
          .evaluate((c: HTMLCanvasElement) => c.toDataURL()),
      );
    }
    expect(new Set(views).size).toBe(9);
  }
  await page.locator('[data-gallery-class="cavalry"]').click();
  await page.locator("#sprite-animation").selectOption("death");
  await page.locator("[data-replay]").click();
  await page.waitForTimeout(850);
  const end = await page
    .locator("#sprite-canvas")
    .evaluate((c: HTMLCanvasElement) => c.toDataURL());
  await page.waitForTimeout(400);
  expect(
    await page
      .locator("#sprite-canvas")
      .evaluate((c: HTMLCanvasElement) => c.toDataURL()),
  ).toBe(end);
  await expect(page.locator("#sprite-frame")).toContainText("2 / 2");
  await page.locator("[data-replay]").click();
  await page.waitForTimeout(40);
  expect(
    await page
      .locator("#sprite-canvas")
      .evaluate((c: HTMLCanvasElement) => c.toDataURL()),
  ).not.toBe(end);
  expect(
    await page.evaluate(() => localStorage.getItem("lte-save")),
  ).toBeNull();
});

test("couleurs : rose exclu des joueurs en partie, libre en galerie, aucun combat lancé", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Options/ }).click();
  await page
    .getByRole("button", { name: "Couleurs des équipes", exact: true })
    .click();
  await expect(page.locator('#team-player1 option[value="pink"]')).toHaveCount(
    0,
  );
  await expect(page.locator('#team-player2 option[value="pink"]')).toHaveCount(
    0,
  );
  await expect(page.locator("#team-enemies")).toHaveValue("pink");
  await page.reload();
  await page
    .getByRole("button", { name: "Galerie des sprites", exact: true })
    .click();
  await page.locator("details summary").click();
  await page.locator('[data-team-color="player1"]').selectOption("pink");
  await page.reload();
  await page
    .getByRole("button", { name: "Galerie des sprites", exact: true })
    .click();
  await expect(page.locator("#sprite-color")).toHaveValue("pink");
  expect(
    await page.evaluate(() => localStorage.getItem("lte-save")),
  ).toBeNull();
  await expect(page.locator(".battle-screen,.combat-screen")).toHaveCount(0);
});
