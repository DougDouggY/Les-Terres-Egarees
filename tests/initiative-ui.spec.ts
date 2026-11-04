import { test, expect } from "@playwright/test";
async function open(page: any) {
  await page.goto("/");
  await page.evaluate(async () => {
    const view = await import(String("/src/dev/initiative-preview.ts"));
    view.openInitiativePreview(document.querySelector("#app")!, () =>
      location.reload(),
    );
  });
  await expect(page.locator(".initiative-entry.current")).toBeVisible();
}
async function centered(page: any) {
  const d = await page.evaluate(() => {
    const a = document
        .querySelector(".initiative-entry.current")!
        .getBoundingClientRect(),
      b = document.querySelector(".initiative-window")!.getBoundingClientRect();
    return Math.abs(a.x + a.width / 2 - b.x - b.width / 2);
  });
  expect(d).toBeLessThan(2);
}
test("initiative transparente, acteur centré, silhouettes statiques et aucun secret dans les cases inconnues", async ({
  page,
}) => {
  await open(page);
  await centered(page);
  expect(
    await page
      .locator(".initiative-strip")
      .evaluate((e) => getComputedStyle(e).backgroundColor),
  ).toBe("rgba(51, 56, 61, 0.4)");
  const hidden = page.locator(
    '.initiative-entry[aria-label="Présence dans la brume"]',
  );
  expect(await hidden.count()).toBeGreaterThan(1);
  for (const e of await hidden.all()) {
    await expect(e).not.toHaveAttribute("data-action");
    await expect(e.locator("canvas,small")).toHaveCount(0);
    await expect(e).toHaveText("?");
  }
  const canvas = page.locator(".initiative-entry.current canvas");
  await expect
    .poll(() =>
      canvas.evaluate((c: HTMLCanvasElement) =>
        Array.from(c.getContext("2d")!.getImageData(0, 0, 64, 64).data).some(
          (v, i) => i % 4 === 3 && v > 0,
        ),
      ),
    )
    .toBe(true);
  const pose = await canvas.evaluate((c: HTMLCanvasElement) => c.toDataURL());
  await page.waitForTimeout(600);
  expect(await canvas.evaluate((c: HTMLCanvasElement) => c.toDataURL())).toBe(
    pose,
  );
  await page
    .getByRole("button", { name: "Initiative suivante", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Activation suivante", exact: true })
    .click();
  await page.waitForTimeout(350);
  await centered(page);
  await page.screenshot({
    path: "artifacts/initiative-bar.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(() => localStorage.getItem("lte-save")),
  ).toBeNull();
});
test("tour inconnu, perspectives indépendantes, limites de navigation et séparateurs entre cycles", async ({
  page,
}) => {
  await open(page);
  await page
    .getByRole("button", { name: "Perspective 2", exact: true })
    .click();
  for (let i = 0; i < 4; i++)
    await page
      .getByRole("button", { name: "Activation suivante", exact: true })
      .click();
  await expect(page.locator(".initiative-entry.current")).toHaveText("?");
  await expect(page.locator(".initiative-entry.current")).not.toHaveAttribute(
    "data-action",
  );
  await page
    .getByRole("button", { name: "Perspective 1", exact: true })
    .click();
  await expect(page.locator(".initiative-entry.current canvas")).toHaveCount(1);
  for (let i = 0; i < 4; i++)
    await page
      .getByRole("button", { name: "Activation suivante", exact: true })
      .click();
  await expect(page.locator(".initiative-cycle")).toHaveCount(2);
  await page.waitForTimeout(350);
  await centered(page);
  const next = page.getByRole("button", {
    name: "Initiative suivante",
    exact: true,
  });
  for (let i = 0; i < 30 && !(await next.isDisabled()); i++) await next.click();
  await expect(next).toBeDisabled();
  await page
    .getByRole("button", { name: "Activation suivante", exact: true })
    .click();
  await page.waitForTimeout(350);
  await centered(page);
  const before = await page
    .locator('.initiative-entry[aria-label="Présence dans la brume"]')
    .count();
  await page
    .getByRole("button", { name: "Partager la vision (test)", exact: true })
    .click();
  expect(
    await page
      .locator('.initiative-entry[aria-label="Présence dans la brume"]')
      .count(),
  ).toBeLessThan(before);
  await expect(page.locator("#map,.combat-screen")).toHaveCount(0);
});
