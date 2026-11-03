import { test, expect } from "@playwright/test";
test("carte régionale : inspection sans brume et aucune mutation de campagne", async ({
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
  await page.waitForTimeout(400);
  await page.screenshot({
    path: "artifacts/terrain-regional.png",
    fullPage: true,
  });
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

test("inspection des nouvelles lisières aux ruines et du convoi sur sa route", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.evaluate(async () => {
    const E = await import("/src/engine.ts" as string),
      s = E.createCampaign(["north", "knight"]);
    s.phase = "battle";
    s.scene = null;
    Object.assign(s.units[1], { x: 31, y: 20 });
    E.visibility(s);
    localStorage.setItem("lte-save", E.encode(s));
  });
  await page.reload();
  await page.getByRole("button", { name: /Continuer/ }).click();
  await page
    .getByRole("button", { name: "Retirer la brume (test)", exact: true })
    .click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: "artifacts/wooded-ruins.png" });
  await page.keyboard.press("Tab");
  await page.waitForTimeout(300);
  await page.screenshot({ path: "artifacts/forest-convoy.png" });
  expect(errors).toEqual([]);
});
