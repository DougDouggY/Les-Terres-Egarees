import { test, expect } from "@playwright/test";
test("trois rendus : inspection sans brume, images différentes et aucune mutation de campagne", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.evaluate(async () => {
    const E = await import("/src/engine.ts" as string);
    const s = E.createCampaign(["north", "knight"]);
    s.phase = "battle";
    s.scene = null;
    localStorage.setItem("lte-save", E.encode(s));
  });
  await page.reload();
  await page.getByRole("button", { name: /Continuer/ }).click();
  const save = page.getByRole("button", { name: "Sauvegarder", exact: true });
  await save.click();
  const baseline = await page.evaluate(() => localStorage.getItem("lte-save"));
  await page
    .getByRole("button", { name: "Retirer la brume (test)", exact: true })
    .click();
  await expect(
    page.getByText("INSPECTION SANS BRUME · VISION LOGIQUE CONSERVÉE"),
  ).toBeVisible();
  const images: string[] = [];
  for (const style of ["blended", "continuous", "varied"]) {
    await page.getByLabel("Version du terrain").selectOption(style);
    await page.waitForTimeout(250);
    await page.screenshot({
      path: `artifacts/terrain-${style}.png`,
      fullPage: true,
    });
    images.push(
      await page.locator("#map").evaluate((c: HTMLCanvasElement) => {
        const x = c.getContext("2d")!,
          p = x.getImageData(18 * 64, 4 * 64, 64, 64);
        let hash = 0;
        for (const v of p.data) hash = (Math.imul(hash, 31) + v) | 0;
        return String(hash);
      }),
    );
  }
  expect(new Set(images).size).toBe(3);
  await page
    .getByRole("button", { name: "Grille masquée", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Grille active", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page
    .getByRole("button", { name: "Rétablir la brume", exact: true })
    .click();
  await save.click();
  expect(await page.evaluate(() => localStorage.getItem("lte-save"))).toEqual(
    baseline,
  );
  expect(errors).toEqual([]);
});
