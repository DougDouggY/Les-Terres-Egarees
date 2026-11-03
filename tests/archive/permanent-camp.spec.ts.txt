import { test, expect } from "@playwright/test";
import { clickMap, mapPoint } from "./map-helpers";
test.use({ actionTimeout: 10000 });
test("forêt dense : infobulle 3 / +3 et déplacement réel", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(async () => {
    const E = await import("/src/engine.ts" as string),
      s = E.createCampaign(["north", "knight"]);
    s.phase = "battle";
    s.scene = null;
    Object.assign(s.units[1], { x: 35, y: 12 });
    E.visibility(s);
    localStorage.setItem("lte-save", E.encode(s));
    localStorage.setItem("lte-speed", "5");
  });
  await page.reload();
  await page.getByRole("button", { name: /Continuer/ }).click();
  const p = await mapPoint(page, 35, 13);
  await page.mouse.move(p.x, p.y);
  await expect(page.locator("#map-tooltip")).toContainText("Forêt dense");
  await expect(page.locator("#map-tooltip")).toContainText(
    "Déplacement 3 · Défense +3",
  );
  await clickMap(page, 35, 12);
  await clickMap(page, 35, 13);
  await page.getByRole("button", { name: "Attendre", exact: true }).click();
  expect(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem("lte-save")!).units.find(
        (u: any) => u.id === "p1b",
      ),
    ),
  ).toMatchObject({ x: 35, y: 13 });
});
test("raccourci près des ruines, camp restauré par choix de sorties et reprise", async ({
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
    localStorage.setItem("lte-save", E.encode(s));
  });
  await page.reload();
  await page.getByRole("button", { name: /Continuer/ }).click();
  await expect(
    page.getByRole("button", {
      name: "Terminer le combat (test)",
      exact: true,
    }),
  ).toHaveCount(0);
  // Leave the running game before installing a fixture; beforeunload saves it.
  await page.goto("/");
  await page.evaluate(async () => {
    const E = await import("/src/engine.ts" as string),
      s = E.decode(localStorage.getItem("lte-save")!);
    Object.assign(s.units[1], { x: 31, y: 20 });
    s.units[0].hp = 12;
    E.visibility(s);
    localStorage.setItem("lte-save", E.encode(s));
  });
  await page.reload();
  await page.getByRole("button", { name: /Continuer/ }).click();
  await page
    .getByRole("button", { name: "Terminer le combat (test)", exact: true })
    .click();
  for (let i = 0; i < 8 && !(await page.locator(".camp-screen").count()); i++)
    await page.getByRole("button", { name: /Suite|Poursuivre/ }).click();
  await expect(
    page.getByRole("heading", { name: "Un refuge à rebâtir." }),
  ).toBeVisible();
  await page.screenshot({ path: "artifacts/camp-ruined.png", fullPage: true });
  await page.locator('[data-action="start-expedition-herbs"]').click();
  await page
    .getByRole("button", { name: "Explorer les lieux", exact: true })
    .click();
  // Every step is persisted, including an expedition awaiting its choice.
  await page.reload();
  await page.getByRole("button", { name: /Continuer/ }).click();
  await page
    .getByRole("button", { name: /Cueillir le long du ruisseau/ })
    .click();
  await expect(page.locator(".camp-expedition")).toContainText("Abri de soins");
  await page
    .getByRole("button", { name: "Retourner au camp", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Abri de soins", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Atelier effondré", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Se reposer · 1 vivre", exact: true })
    .click();
  const s = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("lte-save")!),
  );
  expect(s.camp.levels).toEqual({ infirmary: 1, workshop: 0, palisade: 0 });
  expect(s.units[0].hp).toBe(24);
  await page.screenshot({
    path: "artifacts/camp-first-repair.png",
    fullPage: true,
  });
  expect(errors).toEqual([]);
});
