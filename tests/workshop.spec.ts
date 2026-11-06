import { test, expect } from "@playwright/test";
test("atelier : huit poses, frappe unique et recul sans rejouer attaque ; aucune mission", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.evaluate(async () => {
    const view = await import(String("/src/dev/workshop.ts"));
    view.openWorkshop(document.querySelector("#app")!, () => location.reload());
  });
  await expect(page.locator("#lab-battle")).toBeVisible();
  await page.locator("#lab-animation").selectOption("attack");
  await page.waitForTimeout(1000);
  await page
    .getByRole("button", { name: "Jouer l’échange réel", exact: true })
    .click();
  await page.waitForTimeout(4500);
  await expect(page.locator("#lab-output")).toContainText("attacker");
  await page.getByRole("button", { name: "100 duels", exact: true }).click();
  await expect(page.locator("#lab-output")).toContainText("leftWins");
  await page.screenshot({ path: "artifacts/workshop.png", fullPage: true });
  expect(
    await page.evaluate(() => localStorage.getItem("lte-save")),
  ).toBeNull();
  await expect(page.locator(".battle-screen")).toHaveCount(0);
  expect(errors).toEqual([]);
});
test("création : factions opposées, compagnons obligatoires sans déployer", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Nouvelle aventure/ }).click();
  await page.locator('[data-action="faction-1-knight"]').click();
  await expect(page.locator('[data-action="faction-2-north"]')).toHaveClass(
    /chosen/,
  );
  await page.locator('[data-action="creator-factions-ready"]').click();
  await expect(
    page.locator('#hero-class-1 option[value="sorcerer"]'),
  ).toHaveCount(0);
  for (const n of [0, 1])
    await page.locator(`[data-action="creator-hero-ready-${n}"]`).click();
  for (const n of [0, 1])
    for (let i = 0; i < 2; i++)
      await page.locator(`[data-action="creator-intro-${n}"]`).click();
  await expect(page.locator("[data-companion]")).toHaveCount(9);
  await expect(
    page.locator('[data-action="creator-party-ready-0"]'),
  ).toBeDisabled();
  await expect(
    page.locator('[data-action="creator-party-ready-1"]'),
  ).toBeDisabled();
  await expect(page.locator('[data-action="begin"]')).toBeDisabled();
  await expect(page.locator(".battle-screen")).toHaveCount(0);
  expect(
    await page.evaluate(() => localStorage.getItem("lte-save")),
  ).toBeNull();
});
test("galerie : huit vraies poses homme/femme et outil de sol ; critiques manquants explicites", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Galerie des sprites", exact: true })
    .click();
  await page.locator('[data-gallery-class="man_at_arms"]').click();
  await page.locator("#sprite-animation").selectOption("attack");
  await expect(page.locator("#sprite-frame")).toContainText("/ 8");
  await page.locator("#sprite-gender").selectOption("female");
  await expect(page.locator("#sprite-frame")).toContainText("/ 8");
  await page.locator("#sprite-animation").selectOption("counter");
  await expect(page.locator("#sprite-animation option:checked")).toContainText(
    "Réutilisée",
  );
  await page.locator("#sprite-animation").selectOption("critical");
  await expect(page.locator("#sprite-animation option:checked")).toContainText(
    "Manquante",
  );
  await page.locator("#mirror-sprites").check();
  await page.locator('[data-gallery-class="hamrammr"]').click();
  await expect(page.locator("#sprite-canvas")).toBeVisible();
  await page.locator("#sprite-animation").selectOption("transform");
  await expect(page.locator("#sprite-frame")).toContainText("/ 6");
  await page.locator("#sprite-state").selectOption("bear");
  await expect(page.locator("#sprite-equipment")).toHaveValue("claws");
  await expect(page.locator("#sprite-canvas")).toBeVisible();
  await page.locator("#sprite-state").selectOption("default");
  await page.locator("#sprite-gender").selectOption("female");
  await expect(page.locator(".sprite-missing")).toHaveCount(0);
  await expect(page.locator("#sprite-canvas")).toBeVisible();
  await expect(page.locator("#sprite-frame")).toContainText("/ 5");
  expect(
    await page.evaluate(() => localStorage.getItem("lte-save")),
  ).toBeNull();
});
