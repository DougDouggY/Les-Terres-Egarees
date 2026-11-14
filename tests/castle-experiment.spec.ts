import { test, expect } from "@playwright/test";

test("nouveau château : comparaison, transparence, portes et export", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page
    .getByRole("button", { name: "Tests de combat", exact: true })
    .click();
  await page.getByRole("button", { name: "Explorer les deux cartes" }).click();
  await expect(page.locator("[data-study]")).toHaveCount(3);
  const canvas = page.locator("#study-canvas");
  await expect(canvas).toHaveAttribute("data-ready", "true");
  const approved = await canvas.evaluate((c) =>
    (c as HTMLCanvasElement).toDataURL(),
  );
  await page
    .getByRole("button", { name: /02 · Château · Nouveau set EC/ })
    .click();
  await expect(canvas).toHaveAttribute("data-skin", "new");
  expect(
    await canvas.evaluate((c) => (c as HTMLCanvasElement).toDataURL()),
  ).not.toBe(approved);
  await page.getByRole("button", { name: /01 · Le château oublié/ }).click();
  await expect(canvas).toHaveAttribute("data-skin", "approved");
  expect(
    await canvas.evaluate((c) => (c as HTMLCanvasElement).toDataURL()),
  ).toBe(approved);
  await page
    .getByRole("button", { name: /02 · Château · Nouveau set EC/ })
    .click();
  await expect(canvas).toHaveAttribute("data-skin", "new");
  await page
    .getByRole("button", { name: "Clé — Porte principale", exact: true })
    .click();
  await expect(page.locator(".study-status")).toContainText(
    "Porte principale ouverte",
  );
  await page.getByRole("button", { name: "Tout révéler (aperçu)" }).click();
  await expect(page.locator(".study-door-row")).toHaveCount(7);
  for (const row of await page.locator(".study-door-row").all())
    await expect(row).toContainText("ouverte");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exporter le PNG" }).click();
  expect((await download).suggestedFilename()).toBe(
    "plan-castle-new-42x34.png",
  );
  await page
    .getByRole("button", { name: "Réinitialiser", exact: true })
    .click();
  await expect(page.locator(".study-door-row").first()).toContainText("fermée");
  await page.getByRole("button", { name: /03 · Abordage naval/ }).click();
  await expect(page.locator("[data-castle-skin]")).toBeHidden();
  await expect(canvas).toHaveAttribute("data-skin", "approved");
  expect(errors).toEqual([]);
});

test("nouveau château : téléphone et véritables assets transparents", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Tests de combat", exact: true })
    .click();
  await page.getByRole("button", { name: "Explorer les deux cartes" }).click();
  await expect(page.locator("#study-canvas")).toHaveAttribute(
    "data-ready",
    "true",
  );
  await page
    .getByRole("button", { name: /02 · Château · Nouveau set EC/ })
    .click();
  await expect(page.locator("#study-canvas")).toHaveAttribute(
    "data-skin",
    "new",
  );
  await page.getByRole("button", { name: "Tout révéler (aperçu)" }).click();
  await page.getByRole("button", { name: "Cadrer la carte" }).click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  const transparent = await page.evaluate(async () => {
    const im = new Image();
    im.src = new URL("assets/castle-experiment/props-transparent.png", document.baseURI).href;
    await im.decode();
    const c = document.createElement("canvas");
    c.width = im.width;
    c.height = im.height;
    const ctx = c.getContext("2d")!;
    ctx.drawImage(im, 0, 0);
    const d = ctx.getImageData(0, 0, c.width, c.height).data;
    let clear = 0,
      opaque = 0;
    for (let i = 3; i < d.length; i += 4) {
      if (!d[i]) clear++;
      if (d[i] >= 250) opaque++;
    }
    return clear > 10000 && opaque > 10000;
  });
  expect(transparent).toBe(true);
});
