import { test, expect } from "@playwright/test";
test("deux boutons : deux frappes et parade/riposte/attaque, rejouables pour les deux personnages", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page
    .getByRole("button", { name: "Essai des combats", exact: true })
    .click();
  await expect(page.locator("#trial-canvas")).toBeVisible();
  await expect(page.locator("[data-trial]")).toHaveCount(2);
  await expect(page.locator('[data-trial="two-attacks"]')).toBeEnabled();
  for (const hero of ["0", "1"]) {
    await page.locator("#trial-hero").selectOption(hero);
    await page.locator("#trial-speed").selectOption("2");
    await page.locator('[data-trial="two-attacks"]').click();
    await expect(page.locator("#trial-status")).toHaveText("Essai terminé");
    await expect(page.locator("#trial-events li")).toHaveCount(2);
    await expect(page.locator('[data-trial-value="0"]')).toHaveText(
      "24 / 24 PV",
    );
    await expect(page.locator('[data-trial-value="1"]')).toHaveText(
      "16 / 24 PV",
    );
    await page.locator('[data-trial="parry"]').click();
    await expect(page.locator("#trial-status")).toHaveText("Essai terminé");
    await expect(page.locator("#trial-events li")).toHaveCount(3);
    await expect(page.locator('[data-impact="parry"]')).toContainText(
      "0 dégât",
    );
    await expect(page.locator("#trial-canvas")).toHaveAttribute(
      "data-left-action",
      "combat_idle",
    );
    await expect(page.locator("#trial-canvas")).toHaveAttribute(
      "data-right-action",
      "combat_idle",
    );
  }
  await page.screenshot({
    path: "artifacts/combat-pair-trial.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(() => localStorage.getItem("lte-save")),
  ).toBeNull();
  await expect(page.locator(".battle-screen,#map")).toHaveCount(0);
  expect(errors).toEqual([]);
});
test("pause et sortie : pas de frappe supplémentaire ni d’essai encore actif au retour", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Essai des combats", exact: true })
    .click();
  await page.locator("#trial-speed").selectOption("0.5");
  await expect(page.locator('[data-trial="parry"]')).toBeEnabled();
  await page.locator('[data-trial="parry"]').click();
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  const before = await page
    .locator("#trial-canvas")
    .getAttribute("data-elapsed");
  await page.waitForTimeout(250);
  expect(await page.locator("#trial-canvas").getAttribute("data-elapsed")).toBe(
    before,
  );
  await page.getByRole("button", { name: "Reprendre", exact: true }).click();
  await page.waitForTimeout(100);
  expect(
    await page.locator("#trial-canvas").getAttribute("data-elapsed"),
  ).not.toBe(before);
  await page
    .getByRole("button", { name: "Retour au menu", exact: true })
    .click();
  await expect(page.locator("#trial-canvas")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Essai des combats", exact: true })
    .click();
  await expect(page.locator('[data-trial="two-attacks"]')).toBeEnabled();
  await expect(page.locator("#trial-events li")).toHaveCount(0);
});

test("poses de contact lisibles et écran utilisable sur petit écran", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Essai des combats", exact: true })
    .click();
  await expect(page.locator('[data-trial="two-attacks"]')).toBeEnabled();
  await page.locator("#trial-speed").selectOption("0.5");
  await page.locator('[data-trial="two-attacks"]').click();
  await expect
    .poll(
      async () =>
        Number(
          await page.locator("#trial-canvas").getAttribute("data-elapsed"),
        ),
      { intervals: [20], timeout: 8000 },
    )
    .toBeGreaterThan(740);
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await expect(page.locator("#trial-canvas")).toHaveAttribute(
    "data-left-action",
    "attack",
  );
  await page.screenshot({
    path: "artifacts/combat-pair-impact.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('[data-trial="parry"]')).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
  const hud = await page.locator(".trial-hud").boundingBox(),
    canvas = await page.locator("#trial-canvas").boundingBox();
  expect(hud!.y + hud!.height).toBeLessThanOrEqual(canvas!.y + 1);
  await page.screenshot({
    path: "artifacts/combat-pair-mobile.png",
    fullPage: true,
  });
});
