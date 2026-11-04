import { test, expect } from "@playwright/test";
test("deux boutons : deux frappes et parade/riposte/attaque, rejouables pour les deux personnages", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.evaluate(async () => {
    const view = await import(String("/src/dev/combat-preview.ts"));
    view.openCombatPreview(document.querySelector("#app")!, () =>
      location.reload(),
    );
  });
  await expect(page.locator("#trial-canvas")).toBeVisible();
  await expect(page.locator("[data-trial]")).toHaveCount(2);
  await expect(page.locator('[data-trial="two-attacks"]')).toBeEnabled();
  for (const hero of ["0", "1"]) {
    await page.locator("#trial-hero").selectOption(hero);
    await page.locator("#trial-speed").selectOption("2");
    await page.locator('[data-trial="two-attacks"]').click();
    await expect(page.locator("#trial-status")).toHaveText("Essai terminé");
    await expect(page.locator("#trial-events li")).toHaveCount(3);
    await expect(page.locator('[data-combat-value="0"]')).toHaveText(
      "20 / 24 PV",
    );
    await expect(page.locator('[data-combat-value="1"]')).toHaveText(
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
  await page.evaluate(async () => {
    const view = await import(String("/src/dev/combat-preview.ts"));
    view.openCombatPreview(document.querySelector("#app")!, () =>
      location.reload(),
    );
  });
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
  await page.evaluate(async () => {
    const view = await import(String("/src/dev/combat-preview.ts"));
    view.openCombatPreview(document.querySelector("#app")!, () =>
      location.reload(),
    );
  });
  await expect(page.locator('[data-trial="two-attacks"]')).toBeEnabled();
  await expect(page.locator("#trial-events li")).toHaveCount(0);
});

test("poses de contact lisibles et écran utilisable sur petit écran", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(async () => {
    const view = await import(String("/src/dev/combat-preview.ts"));
    view.openCombatPreview(document.querySelector("#app")!, () =>
      location.reload(),
    );
  });
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
  const hud = await page.locator(".duel-panels").boundingBox(),
    canvas = await page.locator("#trial-canvas").boundingBox();
  expect(hud!.y).toBeGreaterThanOrEqual(canvas!.y + canvas!.height - 1);

  await page.screenshot({
    path: "artifacts/combat-pair-mobile.png",
    fullPage: true,
  });
});

test("les nuances roses réelles du contour sont bleues ; peau, cuir et transparence préservés", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(async () => {
    const view = await import(String("/src/dev/combat-preview.ts"));
    view.openCombatPreview(document.querySelector("#app")!, () =>
      location.reload(),
    );
  });
  await expect(page.locator('[data-trial="two-attacks"]')).toBeEnabled();
  const pixels = await page.evaluate(async () => {
    const { spriteImage } = await import("/src/sprites/resources.ts" as string),
      { recoloredImage } = await import("/src/sprites/recolor.ts" as string);
    const im = spriteImage("tactical/combat-pair-reference-v2.png");
    await im.decode();
    const src = document.createElement("canvas");
    src.width = im.naturalWidth;
    src.height = im.naturalHeight;
    src.getContext("2d")!.drawImage(im, 0, 0);
    const result = recoloredImage(im, "blue", true);
    const sample = (canvas: HTMLCanvasElement, x: number, y: number) =>
      Array.from(canvas.getContext("2d")!.getImageData(x, y, 1, 1).data);
    return {
      edgeBefore: sample(src, 87, 110),
      edgeAfter: sample(result, 87, 110),
      skinBefore: sample(src, 111, 64),
      skinAfter: sample(result, 111, 64),
      leatherBefore: sample(src, 148, 182),
      leatherAfter: sample(result, 148, 182),
    };
  });
  expect(pixels.edgeAfter[1]).toBeGreaterThan(pixels.edgeAfter[0]);
  expect(pixels.edgeAfter).not.toEqual(pixels.edgeBefore);
  expect(pixels.edgeAfter[3]).toEqual(pixels.edgeBefore[3]);
  expect(pixels.skinAfter).toEqual(pixels.skinBefore);
  expect(pixels.leatherAfter).toEqual(pixels.leatherBefore);
});
