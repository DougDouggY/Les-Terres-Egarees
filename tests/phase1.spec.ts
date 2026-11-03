import { test, expect } from "@playwright/test";

test("galerie : ressources exactes, lecture, variantes manquantes, comparaison et signalement", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page
    .getByRole("button", { name: "Galerie des sprites", exact: true })
    .click();
  await expect(page.locator("#sprite-canvas")).toBeVisible();
  await page.locator("#sprite-animation").selectOption("attack");
  await expect(page.locator("#sprite-frame")).toContainText("8");
  await page.locator("[data-play]").click();
  const frame = await page.locator("#sprite-frame").textContent();
  await page.waitForTimeout(300);
  expect(await page.locator("#sprite-frame").textContent()).toBe(frame);
  await page.locator("[data-next]").click();
  expect(await page.locator("#sprite-frame").textContent()).not.toBe(frame);
  expect(
    await page
      .locator("#sprite-canvas")
      .evaluate(
        (c: HTMLCanvasElement) => c.getContext("2d")!.imageSmoothingEnabled,
      ),
  ).toBe(false);
  await page.locator("[data-pin]").click();
  await page.locator("#sprite-status").selectOption("À corriger");
  await page.locator("#sprite-comment").fill("Vérifier la silhouette");
  const download = page.waitForEvent("download");
  await page.locator("[data-export]").click();
  expect((await download).suggestedFilename()).toMatch(/json$/);
  await page.locator("#sprite-gender").selectOption("female");
  await expect(page.locator("[data-main-stage]")).toContainText(
    "Sprite manquant",
  );
  await expect(page.locator("#sprite-canvas")).toHaveCount(0);
  await page.locator('[data-gallery-class="berserker"]').click();
  await page.locator("[data-pin]").click();
  await expect(page.locator(".sprite-compare article")).toHaveCount(2);
  await expect(page.locator(".sprite-compare article").nth(1)).toContainText(
    "Ressource manquante",
  );
  await page.locator('[data-gallery-class="standard_bearer"]').click();
  await expect(page.locator("#sprite-state option")).toHaveCount(2);
  await page.locator("#sprite-state").selectOption("planted");
  await expect(page.locator("[data-main-stage]")).toContainText(
    "Sprite manquant",
  );
  await page.locator('[data-gallery-class="man_at_arms"]').click();
  await page.locator("#sprite-gender").selectOption("female");
  await expect(page.locator("#sprite-canvas")).toBeVisible();
  await page.screenshot({
    path: "artifacts/sprite-gallery.png",
    fullPage: true,
  });
  await page.reload();
  await page
    .getByRole("button", { name: "Galerie des sprites", exact: true })
    .click();
  await page.locator("#sprite-animation").selectOption("attack");
  await expect(page.locator("#sprite-status")).toHaveValue("À corriger");
  await expect(page.locator("#sprite-comment")).toHaveValue(
    "Vérifier la silhouette",
  );
  expect(errors).toEqual([]);
});

test("création et catalogue de développement : classes de base seulement, promotions distinctes", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Classes et systèmes", exact: true })
    .click();
  await page.locator('[data-class="spearman"]').click();
  await expect(page.locator(".dev-layout section")).toContainText(
    "Porte-étendard",
  );
  await page.locator('[data-class="shaman"]').click();
  await expect(page.locator(".dev-screen")).toContainText(
    "ne sont pas définies",
  );
  await page.locator("[data-dev-back]").click();
  await page.getByRole("button", { name: /Nouvelle aventure/ }).click();
  await expect(page.locator('select option[value="berserker"]')).toHaveCount(0);
  await expect(page.locator('select option[value="squire"]')).toHaveCount(0);
  await page.getByRole("button", { name: /Déployer les expéditions/ }).click();
  await expect(page.locator("#map")).toBeVisible();
});

test("version publique : aucun outil de développement, même via URL", async ({
  page,
}) => {
  await page.goto(
    "http://127.0.0.1:4173/Les-Terres-Egarees/?dev=1#sprite-gallery",
  );
  await expect(
    page.getByRole("button", { name: "Galerie des sprites", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Classes et systèmes", exact: true }),
  ).toHaveCount(0);
  await expect(page.locator(".dev-screen")).toHaveCount(0);
  await page.getByRole("button", { name: /Nouvelle aventure/ }).click();
  await page.getByRole("button", { name: /Déployer les expéditions/ }).click();
  await expect(page.locator("#map")).toBeVisible();
});

test("menu contextuel : arme active, portée recalculée et cases adjacentes libres", async ({
  page,
}) => {
  const { clickMap, mapPoint } = await import("./map-helpers");
  await page.goto("/");
  await page.evaluate(async () => {
    const E = await import("/src/engine.ts" as string),
      s = E.createCampaign(["north", "knight"]);
    const u = s.units[1];
    E.assignClass(u, "tracker");
    u.x = 30;
    u.y = 20;
    const enemy = s.units.find((t: any) => t.owner === 0)!;
    enemy.x = 32;
    enemy.y = 20;
    s.fronts[0].queue = [u.id];
    s.fronts[0].index = 0;
    E.visibility(s);
    localStorage.setItem("lte-save", E.encode(s));
  });
  await page.reload();
  await page.getByRole("button", { name: /Continuer/ }).click();
  await clickMap(page, 30, 20);
  await expect(
    page.getByRole("button", { name: "Attaquer", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Déplacer", exact: true }),
  ).toHaveCount(0);
  for (const [x, y] of [
    [29, 20],
    [31, 20],
    [30, 19],
    [30, 21],
  ]) {
    const point = await mapPoint(page, x, y);
    expect(
      await page.evaluate(
        (p) => document.elementFromPoint(p.x, p.y)?.id,
        point,
      ),
    ).toBe("map");
  }
  await page
    .getByRole("button", { name: "Objet / Équipement", exact: true })
    .click();
  await page.locator('[data-action="equip-axe"]').click();
  await expect(page.locator(".equipment-modal")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Attaquer", exact: true }),
  ).toHaveCount(0);
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("lte-save")!).units.find(
      (t: any) => t.id === "p1b",
    ),
  );
  expect(saved.activeWeaponId).toBe("axe");
  expect(saved.range).toBe(1);
  await page.getByRole("button", { name: "Fiche", exact: true }).click();
  await expect(page.locator(".unit-window")).toContainText("Hache");
});

test("créateur : un nom avec caractères HTML reste du texte dans la fiche", async ({
  page,
}) => {
  const { clickMap } = await import("./map-helpers");
  await page.goto("/");
  await page.getByRole("button", { name: /Nouvelle aventure/ }).click();
  await page.locator("#hero-name-1").fill("<b>Héros</b> & Co");
  await page.getByRole("button", { name: /Déployer les expéditions/ }).click();
  await clickMap(page, 10, 10);
  await expect(page.locator(".unit-window h2")).toHaveText("<b>Héros</b> & Co");
  await expect(page.locator(".unit-window h2 b")).toHaveCount(0);
});
