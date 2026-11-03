import { test, expect } from "@playwright/test";

test("prototype en ligne : galerie ouverte, neuf couleurs immédiates, comparaisons et préférences", async ({
  page,
}) => {
  await page.goto("http://127.0.0.1:4174/Les-Terres-Egarees/");
  await page
    .getByRole("button", { name: "Galerie des sprites", exact: true })
    .click();
  await expect(page.locator("#sprite-color option")).toHaveCount(9);
  await page.locator("[data-play]").click();
  const fingerprints = [];
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
    await page.waitForTimeout(100);
    fingerprints.push(
      await page
        .locator("#sprite-canvas")
        .evaluate((c: HTMLCanvasElement) => c.toDataURL()),
    );
  }
  expect(new Set(fingerprints).size).toBe(9);
  await page.locator("[data-three-teams]").click();
  await expect(page.locator(".sprite-compare article")).toHaveCount(3);
  await expect(page.locator(".sprite-compare")).toContainText("Bleu");
  await expect(page.locator(".sprite-compare")).toContainText("Jaune");
  await expect(page.locator(".sprite-compare")).toContainText("Rouge");
  await page.locator("details summary").click();
  await page.locator('[data-team-color="player1"]').selectOption("orange");
  await page.locator("details summary").click();
  await page.locator('[data-team-color="player2"]').selectOption("orange");
  await expect(page.locator("#gallery-color-error")).toContainText(
    "distinctes",
  );
  await page.reload();
  await page
    .getByRole("button", { name: "Galerie des sprites", exact: true })
    .click();
  await expect(page.locator("#sprite-color")).toHaveValue("orange");
  await page.locator('[data-gallery-class="man_at_arms"]').click();
  await page.locator("#sprite-gender").selectOption("female");
  await page.locator("[data-three-teams]").click();
  await page.screenshot({
    path: "artifacts/team-color-gallery.png",
    fullPage: true,
  });
  await page.locator("#gallery-faction").selectOption("north");
  await page.locator("#gallery-stage").selectOption("advanced");
  await expect(page.locator('[data-gallery-class="berserker"]')).toBeVisible();
  await expect(page.locator('[data-gallery-class="man_at_arms"]')).toHaveCount(
    0,
  );
});

test("masque réel : neuf palettes, aucun pixel naturel ou alpha modifié, cache partagé", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const { spriteImage } = await import("/src/sprites/resources.ts" as string);
    const { recoloredImage, isTeamPixel } = await import(
      "/src/sprites/recolor.ts" as string
    );
    const { teamPalette } = await import("/src/game/team-colors.ts" as string);
    const image = spriteImage("tactical/team-sample.png");
    await image.decode();
    const c = document.createElement("canvas");
    c.width = image.width;
    c.height = image.height;
    const ctx = c.getContext("2d")!;
    ctx.drawImage(image, 0, 0);
    const original = ctx.getImageData(0, 0, c.width, c.height).data;
    let changed = 0,
      natural = 0,
      errors = 0,
      cached = true;
    for (const color of Object.keys(teamPalette)) {
      const out = recoloredImage(image, color);
      cached &&= out === recoloredImage(image, color);
      const pixels = out
        .getContext("2d")!
        .getImageData(0, 0, c.width, c.height).data;
      for (let i = 0; i < original.length; i += 4) {
        if (original[i + 3] !== pixels[i + 3]) errors++;
        if (
          original[i + 3] > 0 &&
          !isTeamPixel(original[i], original[i + 1], original[i + 2])
        ) {
          natural++;
          if (
            original[i] !== pixels[i] ||
            original[i + 1] !== pixels[i + 1] ||
            original[i + 2] !== pixels[i + 2]
          )
            errors++;
        }
        if (
          original[i + 3] > 0 &&
          isTeamPixel(original[i], original[i + 1], original[i + 2]) &&
          original[i] !== pixels[i]
        )
          changed++;
      }
    }
    return { changed, natural, errors, cached };
  });
  expect(result.changed).toBeGreaterThan(10000);
  expect(result.natural).toBeGreaterThan(10000);
  expect(result.errors).toBe(0);
  expect(result.cached).toBe(true);
});

test("couleurs en partie : choix indépendants de faction, sauvegarde et chargement", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Nouvelle aventure/ }).click();
  await page
    .getByRole("button", { name: "Couleurs des équipes", exact: true })
    .click();
  await page.locator("#team-player1").selectOption("purple");
  await page.locator("#team-player2").selectOption("white");
  await page.locator("#team-enemies").selectOption("green");
  await page.getByRole("button", { name: "Appliquer", exact: true }).click();
  await page.getByRole("button", { name: /Déployer les expéditions/ }).click();
  await page.getByRole("button", { name: "Sauvegarder", exact: true }).click();
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("lte-save")!).teamColors,
    ),
  ).toEqual({ player1: "purple", player2: "white", enemies: "green" });
  await page.reload();
  await page.getByRole("button", { name: /Continuer/ }).click();
  await page.keyboard.press("Escape");
  await page
    .getByRole("button", { name: "Couleurs des équipes", exact: true })
    .click();
  await expect(page.locator("#team-player1")).toHaveValue("purple");
  await expect(page.locator("#team-enemies")).toHaveValue("green");
});
