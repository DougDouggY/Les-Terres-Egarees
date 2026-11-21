import { test, expect } from "@playwright/test";
for (const mobile of [false, true])
  test(`essai tactique : entrée, camps, sauvegarde et retour ${mobile ? "mobile" : "ordinateur"}`, async ({
    page,
  }) => {
    if (mobile) await page.setViewportSize({ width: 390, height: 844 });
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/");
    await page.evaluate(() =>
      localStorage.setItem("lte-save", "partie normale préservée"),
    );
    await page
      .getByRole("button", {
        name: "Essai sur carte · temporaire",
        exact: true,
      })
      .click();
    await expect(page.locator('[data-unit-review="north"]')).toBeVisible();
    await expect(page.locator("#map")).toBeVisible();
    await expect(page.locator(".mission-objective")).toContainText("Niveau 1");
    if (!mobile) {
      const positions = await page.evaluate(async () => {
        const { createUnitReview } = await import(
          String("/src/game/unit-review.ts")
        );
        const E = await import(String("/src/engine.ts"));
        const s = createUnitReview(),
          u = E.current(s)!;
        const next = [...E.reachable(s, u)].find(
          ([k, p]: any) => k !== E.key(u.x, u.y) && p.cost <= 1,
        )!;
        const c = E.map[next[0]];
        return [
          { x: u.x, y: u.y },
          { x: c.x, y: c.y },
        ];
      });
      for (const pos of positions) {
        const canvas = page.locator("#map"),
          bounds = (await canvas.boundingBox())!;
        const d = await canvas.evaluate((c) => ({
          ...(c as HTMLCanvasElement).dataset,
        }));
        await page.mouse.click(
          bounds.x +
            ((pos.x + 0.5 - Number(d.cameraX)) / Number(d.viewCols)) *
              bounds.width,
          bounds.y +
            ((pos.y + 0.5 - Number(d.cameraY)) / Number(d.viewRows)) *
              bounds.height,
        );
      }
      await expect(
        page.getByRole("button", { name: "Attendre", exact: true }),
      ).toBeVisible();
      await page.getByRole("button", { name: "Annuler", exact: true }).click();
    }

    await page
      .getByRole("button", { name: "Jouer les Chevaliers", exact: true })
      .click();
    await expect(page.locator('[data-unit-review="knight"]')).toBeVisible();
    await page
      .getByRole("button", { name: "Recommencer", exact: true })
      .click();
    await expect(page.locator('[data-unit-review="knight"]')).toBeVisible();
    await page.keyboard.press("Escape");
    await page
      .getByRole("button", { name: "Sauvegarder", exact: true })
      .click();
    await page
      .getByLabel("Nom de la sauvegarde", { exact: true })
      .fill("Essai des classes");
    await page
      .getByRole("button", { name: "Créer une sauvegarde", exact: true })
      .click();
    await expect(page.locator("[data-slot]").first()).toContainText(
      "Essai temporaire des unités",
    );
    expect(await page.evaluate(() => localStorage.getItem("lte-save"))).toBe(
      "partie normale préservée",
    );
    const stored = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("lte-manual-saves-v1")!),
    );
    expect(JSON.stringify(stored)).toContain("review-knight");
    await page.reload();
    await page
      .getByRole("button", { name: "Charger une partie", exact: true })
      .click();
    await page
      .locator("[data-slot]")
      .first()
      .getByRole("button", { name: "Charger", exact: true })
      .click();
    await expect(page.locator('[data-unit-review="knight"]')).toBeVisible();
    await page.keyboard.press("Escape");
    await page
      .getByRole("button", { name: "Menu principal", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Nouvelle partie →" }),
    ).toBeVisible();
    expect(errors).toEqual([]);
  });

test("une grande équipe réutilise les silhouettes sans recolorer les atlas à chaque image", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("button", {
      name: "Essai sur carte · temporaire",
      exact: true,
    }),
  ).toBeVisible();
  const reads = await page.evaluate(async () => {
    const E = await import(String("/src/engine.ts"));
    const { createUnitReview } = await import(
      String("/src/game/unit-review.ts")
    );
    const R = await import(String("/src/sprites/resources.ts"));
    const C = await import(String("/src/sprites/catalog.ts"));
    const s = createUnitReview();
    await Promise.all(
      s.units.map((u: any) =>
        R.spriteImage(
          C.resolveClip(R.unitSpriteProfile(u), "idle")!.source,
        ).decode(),
      ),
    );
    const ctx = document.createElement("canvas").getContext("2d")!;
    const draw = () => {
      for (const u of s.units)
        R.drawResourceFrame(
          ctx,
          R.unitSpriteProfile(u),
          "idle",
          0,
          0,
          0,
          64,
          64,
          true,
          E.colorForOwner(s.teamColors, u.owner),
          "world",
        );
    };
    draw();
    const original = CanvasRenderingContext2D.prototype.getImageData;
    let reads = 0;
    CanvasRenderingContext2D.prototype.getImageData = function (
      ...args: any[]
    ) {
      reads++;
      return original.apply(this, args as any);
    };
    try {
      draw();
      draw();
      return reads;
    } finally {
      CanvasRenderingContext2D.prototype.getImageData = original;
    }
  });
  expect(reads).toBe(0);
});
