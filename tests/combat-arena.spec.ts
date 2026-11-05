import { test, expect, type Page } from "@playwright/test";
async function open(page: Page, parry = false) {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Tests de combat", exact: true })
    .click();
  await expect(page.locator(".test-cards article")).toHaveCount(3);
  await page
    .getByRole("button", {
      name: parry ? "Tester les parades" : "Tester sur la carte du chapitre 1",
      exact: true,
    })
    .click();
  await expect(page.locator("[data-arena-attack]")).toBeEnabled();
}
async function allButtonsVisible(page: Page) {
  for (const b of await page.locator(".arena-controls button").all()) {
    const r = await b.boundingBox();
    expect(r!.y).toBeGreaterThanOrEqual(0);
    expect(r!.y + r!.height).toBeLessThanOrEqual(page.viewportSize()!.height);
  }
}
test("arène simple, deux unités seulement, cible 10000 PV, classes en direct, attaque et rejeu", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await open(page);
  await expect(page.locator("#arena-map")).toHaveAttribute(
    "data-unit-count",
    "2",
  );
  await expect(page.locator('[data-arena-hp="1"]')).toHaveText(
    /10000 \/ 10000/,
  );
  await allButtonsVisible(page);
  await page.locator("#arena-class").selectOption("mounted_spearman");
  await expect(page.locator("[data-arena-attack]")).toBeEnabled();
  await page.locator("[data-arena-attack]").click();
  await expect
    .poll(() => page.locator("#arena-duel").getAttribute("data-phase"), {
      intervals: [30],
    })
    .toBe("impact");
  await page.waitForFunction(() => {
    const c = document.querySelector<HTMLElement>("#arena-duel")!;
    return c.dataset.phase === "impact";
  });
  await page.locator("[data-arena-pause]").click();
  const distance = await page
    .locator("#arena-duel")
    .getAttribute("data-contact-gap");
  expect(Number(distance)).toBeGreaterThan(40);
  expect(Number(distance)).toBeLessThan(340);
  await page.screenshot({ path: "artifacts/arena-mounted-contact.png" });
  await page.locator("[data-arena-pause]").click();
  await expect(page.locator("#arena-status")).toContainText("Terminé");
  await page.locator("[data-arena-attack]").click();
  await expect(page.locator("#arena-status")).toContainText("Terminé");
  await page.locator("[data-arena-heal]").click();
  await expect(page.locator("#arena-status")).toContainText("soignée");
  await page.locator("#arena-class").selectOption("hamrammr");
  await expect(page.locator("[data-bear]")).toBeEnabled();
  await page.locator("[data-bear]").click();
  await expect(page.locator("[data-arena-attack]")).toBeEnabled();
  await page.locator("[data-arena-attack]").click();
  await expect
    .poll(() => page.locator("#arena-duel").getAttribute("data-phase"), {
      intervals: [30],
    })
    .toBe("impact");
  await page.waitForFunction(() => {
    const c = document.querySelector<HTMLElement>("#arena-duel")!;
    return c.dataset.phase === "impact";
  });
  await page.locator("[data-arena-pause]").click();
  await page.screenshot({ path: "artifacts/arena-bear-contact.png" });
  expect(errors).toEqual([]);
  expect(
    await page.evaluate(() => localStorage.getItem("lte-save")),
  ).toBeNull();
});
test("chaque classe avec bouclier montre une vraie parade réussie puis riposte, commandes sur mobile", async ({
  page,
}) => {
  await open(page, true);
  await page.locator("#arena-speed").selectOption("0.5");
  const classes = await page
    .locator("#arena-class option")
    .evaluateAll((es) => es.map((e) => (e as HTMLOptionElement).value));
  expect(classes.length).toBeGreaterThan(4);
  for (const id of classes) {
    await page.locator("#arena-class").selectOption(id);
    await expect(page.locator("[data-arena-attack]")).toBeEnabled();
    await page.locator("[data-arena-attack]").click();
    await expect(page.locator("#arena-status")).toHaveText("Parade réussie");
    await expect(page.locator("#arena-status")).toHaveText("Riposte immédiate");
    await expect(page.locator("#arena-status")).toContainText("Terminé");
  }
  await page.setViewportSize({ width: 390, height: 740 });
  await allButtonsVisible(page);
  await page.screenshot({ path: "artifacts/parry-mobile.png" });
});

test("arène : déplacement animé sur un chemin valide plutôt qu’une téléportation", async ({
  page,
}) => {
  await open(page);
  const canvas = page.locator("#arena-map");
  await expect(canvas).toHaveAttribute("data-unit-count", "2");
  const before = await canvas.evaluate((c) => ({
    x: Number((c as HTMLElement).dataset.heroX),
    y: Number((c as HTMLElement).dataset.heroY),
  }));
  const dest = await page.evaluate(async ({ x, y }) => {
    const { map } = await import(String("/src/game/map.ts"));
    return (
      (map as any[]).find((c) => c.x === x + 2 && c.y === y && c.walk) ??
      (map as any[]).find((c) => c.x === x && c.y === y + 2 && c.walk)
    );
  }, before);
  expect(dest).toBeTruthy();
  const point = await canvas.evaluate((c: HTMLCanvasElement, d) => {
    const r = c.getBoundingClientRect();
    return {
      x: r.x + ((d.x + 0.5 - Number(c.dataset.cameraX)) / 14) * r.width,
      y:
        r.y +
        ((d.y + 0.5 - Number(c.dataset.cameraY)) / Number(c.dataset.viewRows)) *
          r.height,
    };
  }, dest);
  await page.mouse.click(point.x, point.y);
  await expect(canvas).toHaveAttribute("data-moving", "true");
  await expect(canvas).toHaveAttribute("data-hero-x", String(before.x));
  await expect(canvas).toHaveAttribute("data-moving", "false");
  await expect(canvas).toHaveAttribute("data-hero-x", String(dest.x));
  await expect(canvas).toHaveAttribute("data-hero-y", String(dest.y));
});
