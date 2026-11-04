import { test, expect, type Page } from "@playwright/test";
async function open(page: Page, parry = false) {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Tests de combat", exact: true })
    .click();
  await expect(page.locator(".test-cards article")).toHaveCount(2);
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
    .toBe("attack");
  await page.waitForFunction(() => {
    const c = document.querySelector<HTMLElement>("#arena-duel")!;
    return Number(c.dataset.elapsed) >= Number(c.dataset.impact);
  });
  await page.locator("[data-arena-pause]").click();
  const distance = await page
    .locator("#arena-duel")
    .evaluate((c) => ({
      actual: Number((c as HTMLElement).dataset.actorDistance),
      contact: Number((c as HTMLElement).dataset.contactDistance),
    }));
  expect(distance.actual).toBeCloseTo(distance.contact, 0);
  expect(distance.actual).toBeLessThan(200);
  await page.screenshot({ path: "artifacts/arena-mounted-contact.png" });
  await page.locator("[data-arena-pause]").click();
  await expect(page.locator("[data-arena-attack]")).toBeEnabled();
  await page.locator("[data-arena-attack]").click();
  await expect(page.locator("[data-arena-attack]")).toBeEnabled();
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
    .toBe("attack");
  await page.waitForFunction(() => {
    const c = document.querySelector<HTMLElement>("#arena-duel")!;
    return Number(c.dataset.elapsed) >= Number(c.dataset.impact);
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
    await expect(page.locator("[data-arena-attack]")).toBeEnabled();
  }
  await page.setViewportSize({ width: 390, height: 740 });
  await allButtonsVisible(page);
  await page.screenshot({ path: "artifacts/parry-mobile.png" });
});
