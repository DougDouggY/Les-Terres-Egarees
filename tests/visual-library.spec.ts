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
  await expect
    .poll(() =>
      page
        .locator("#sprite-canvas")
        .evaluate((c: HTMLCanvasElement) => c.toDataURL()),
    )
    .not.toBe(end);
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
  await expect(page.locator("#team-enemies")).toHaveCount(0);
  await page.reload();
  await page
    .getByRole("button", { name: "Galerie des sprites", exact: true })
    .click();
  await page.locator("details summary").filter({ hasText: "Couleurs" }).click();
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

test("comparaison HSV : même pose, original intact, masque réglable et réinitialisable", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Galerie des sprites", exact: true })
    .click();
  await page.locator('[data-gallery-class="spearman"]').click();
  await page.locator("#sprite-animation").selectOption("attack");
  await page.locator("[data-play]").click();
  await expect(page.locator("#sprite-original")).toBeVisible();
  await expect(page.locator("#sprite-frame")).toContainText("/ 7");
  const pixels = async (id: string) =>
    page.locator(id).evaluate((c: HTMLCanvasElement) => c.toDataURL());
  await page.waitForTimeout(200);
  const original = await pixels("#sprite-original");
  const blue = await pixels("#sprite-canvas");
  expect(blue).not.toBe(original);
  await page.locator("#sprite-color").selectOption("green");
  await page.waitForTimeout(100);
  expect(await pixels("#sprite-original")).toBe(original);
  expect(await pixels("#sprite-canvas")).not.toBe(blue);
  await page
    .getByText("Tolérance de recoloration HSV", { exact: true })
    .click();
  await page.locator("#mask-hue").fill("120");
  await page.waitForTimeout(100);
  expect(await pixels("#sprite-original")).toBe(original);
  expect(await pixels("#sprite-canvas")).not.toBe(blue);
  await page.locator("[data-reset-mask]").click();
  await expect(page.locator("#mask-hue")).toHaveValue("315");
  await page.locator("#sprite-zoom").selectOption("5");
  const size = await page
    .locator("#sprite-canvas")
    .evaluate((c: HTMLCanvasElement) => ({
      display: c.getBoundingClientRect().width,
      pixels: c.width,
    }));
  expect(size.display).toBe(size.pixels);
  expect(size.pixels).toBeGreaterThan(500);
  await page.locator("#sprite-zoom").selectOption("1");
  await expect(page.locator(".battle-screen,.combat-screen")).toHaveCount(0);
  expect(
    await page.evaluate(() => localStorage.getItem("lte-save")),
  ).toBeNull();
  await page.screenshot({ path: "artifacts/gallery-hsv.png", fullPage: true });
});

test("toutes les poses complémentaires tiennent entièrement dans leur aperçu, sans couper tête ou arme", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const { spriteCatalog, spriteImage, drawResourceFrame } = await import(
      "/src/sprites/resources.ts" as string
    );
    const { resolveClip } = await import("/src/sprites/catalog.ts" as string);
    const issues: string[] = [];
    let inspected = 0;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 320;
    const ctx = canvas.getContext("2d")!;
    for (const p of spriteCatalog.profiles)
      for (const animation of Object.keys(p.clips)) {
        const c = resolveClip(p, animation);
        if (!c?.source.includes("/complete-")) continue;
        const im = spriteImage(c.source);
        if (!im.complete)
          await new Promise<void>((resolve, reject) => {
            im.onload = () => resolve();
            im.onerror = () => reject(new Error(c.source));
          });
        for (let frame = 0; frame < c.frames.length; frame++) {
          ctx.clearRect(0, 0, 320, 320);
          drawResourceFrame(ctx, p, animation, frame, 96, 96, 128, 128, true);
          const data = ctx.getImageData(0, 0, 320, 320).data;
          let opaque = 0,
            outside = 0;
          for (let y = 0; y < 320; y++)
            for (let x = 0; x < 320; x++)
              if (data[(y * 320 + x) * 4 + 3] > 16) {
                opaque++;
                if (x < 96 || x >= 224 || y < 96 || y >= 224) outside++;
              }
          if (!opaque || outside)
            issues.push(
              `${p.classId}:${p.equipment}:${animation}:${frame} vide=${!opaque} hors cadre=${outside}`,
            );
          inspected++;
        }
      }
    return { issues, inspected };
  });
  expect(result.inspected).toBeGreaterThan(200);
  expect(result.issues).toEqual([]);
  await expect(page.locator(".battle-screen,.combat-screen")).toHaveCount(0);
});
