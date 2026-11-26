import { test, expect } from "@playwright/test";
for (const mobile of [false, true])
  test(`version publiée : carte actuelle et essais répétés ${mobile ? "téléphone" : "ordinateur"}`, async ({
    page,
  }) => {
    if (mobile) await page.setViewportSize({ width: 390, height: 844 });
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("./");
    await page.evaluate(() =>
      localStorage.setItem("lte-save", "sauvegarde à conserver"),
    );
    await expect(page.locator(".title-version")).toContainText(
      "quatre bâtiments",
    );
    for (let i = 0; i < 2; i++) {
      await page
        .getByRole("button", { name: "Carte du chapitre 2", exact: true })
        .click();
      await expect(page.locator("[data-camp-canvas]")).toHaveAttribute(
        "data-ready",
        "true",
      );
      await expect(page.locator("[data-camp-canvas]")).toHaveAttribute(
        "data-building-count",
        "4",
      );
      await expect(page.locator("h1")).toHaveText("Le petit campement");
      await page.getByRole("button", { name: "Retour", exact: true }).click();
    }
    for (let i = 0; i < 2; i++) {
      await page
        .getByRole("button", {
          name: "Essai sur carte · temporaire",
          exact: true,
        })
        .click();
      await expect(page.locator('[data-unit-review="north"]')).toBeVisible();
      await expect(page.locator("#map")).toBeVisible();
      await page.keyboard.press("Escape");
      await page
        .getByRole("button", { name: "Menu principal", exact: true })
        .click();
    }
    await page
      .locator('[data-action="chapter-two-review"]')
      .dispatchEvent("click");
    await page
      .locator('[data-action="chapter-two-review"]')
      .dispatchEvent("click");
    await expect(
      page.getByRole("dialog", { name: "Tester chapitre 2" }),
    ).toHaveCount(1);
    await page.getByRole("button", { name: "Vagabonds", exact: true }).click();
    await expect(
      page.locator('[data-story-scene="c1-after-travelers"]'),
    ).toHaveCount(1);
    expect(await page.evaluate(() => localStorage.getItem("lte-save"))).toBe(
      "sauvegarde à conserver",
    );
    expect(errors).toEqual([]);
  });

test("chargement lent : retour visible et clics simultanés bloqués", async ({
  page,
}) => {
  let release!: () => void;
  const wait = new Promise<void>((r) => (release = r));
  await page.route(/\/assets\/kingdom-camp-.*\.js$/, async (route) => {
    await wait;
    await route.continue();
  });
  await page.goto("./");
  await page.locator('[data-action="kingdom-camp"]').click();
  await expect(page.locator('[data-action="kingdom-camp"]')).toBeDisabled();
  await expect(page.locator('[data-action="kingdom-camp"]')).toHaveText(
    "Chargement…",
  );
  await expect(page.locator('[data-action="unit-review"]')).toBeDisabled();
  release();
  await expect(page.locator("[data-camp-canvas]")).toHaveAttribute(
    "data-ready",
    "true",
  );
});

test("échec de module : erreur visible, actualisation puis nouvel essai", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  let fail = true;
  await page.route(/\/assets\/kingdom-camp-.*\.js$/, (route) =>
    fail ? route.abort() : route.continue(),
  );
  await page.goto("./");
  await page.evaluate(() =>
    localStorage.setItem("lte-save", "ne pas modifier"),
  );
  await page
    .getByRole("button", { name: "Carte du chapitre 2", exact: true })
    .click();
  await expect(page.locator(".release-update")).toBeVisible();
  await expect(page.locator('[data-action="kingdom-camp"]')).toBeEnabled();
  fail = false;
  await page
    .getByRole("button", { name: "Actualiser le jeu", exact: true })
    .click();
  await page.waitForURL((url) => url.searchParams.has("v"));
  await page
    .getByRole("button", { name: "Carte du chapitre 2", exact: true })
    .click();
  await expect(page.locator("[data-camp-canvas]")).toHaveAttribute(
    "data-ready",
    "true",
  );
  expect(await page.evaluate(() => localStorage.getItem("lte-save"))).toBe(
    "ne pas modifier",
  );
  expect(errors).toEqual([]);
});

test("nouveau déploiement : actualisation de l’accueil sans supprimer les sauvegardes", async ({
  page,
}) => {
  await page.route(/release\.json\?check=/, (route) =>
    route.fulfill({
      json: { revision: "nouvelle-version", edition: "village-streets" },
    }),
  );
  await page.goto("./");
  await page.evaluate(() =>
    localStorage.setItem("lte-save", "partie conservée"),
  );
  await expect(page.locator(".release-update")).toContainText(
    "nouvelle version",
  );
  await page
    .getByRole("button", { name: "Actualiser le jeu", exact: true })
    .click();
  await page.waitForURL(
    (url) => url.searchParams.get("v") === "nouvelle-version",
  );
  expect(await page.evaluate(() => localStorage.getItem("lte-save"))).toBe(
    "partie conservée",
  );
});

test("mise à jour pendant un essai : pas de rechargement d’une partie non sauvegardée", async ({
  page,
}) => {
  let newer = false;
  await page.route(/release\.json\?check=/, async (route) =>
    newer
      ? route.fulfill({ json: { revision: "prochaine-version" } })
      : route.continue(),
  );
  await page.goto("./");
  await page
    .getByRole("button", { name: "Essai sur carte · temporaire", exact: true })
    .click();
  await expect(page.locator('[data-unit-review="north"]')).toBeVisible();
  newer = true;
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(page.locator(".release-update")).toBeVisible();
  await page
    .getByRole("button", { name: "Actualiser le jeu", exact: true })
    .click();
  await expect(page.locator(".release-update")).toContainText(
    "Sauvegardez votre partie",
  );
  await expect(page.locator('[data-unit-review="north"]')).toBeVisible();
  expect(new URL(page.url()).searchParams.has("v")).toBe(false);
});
