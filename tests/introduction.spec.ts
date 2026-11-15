import { test, expect } from "@playwright/test";
import { completeIntroduction } from "./introduction-flow";
test("départs inversés et téléphone : décors complets, héros visibles, aucune révélation avant validation", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.getByRole("button", { name: /Nouvelle aventure/ }).click();
  await page.locator('[data-action="faction-1-knight"]').click();
  await page.getByRole("button", { name: /Créer nos personnages/ }).click();
  await page.locator("#hero-name-1").fill("élise de Brume");
  await expect(page.locator("#hero-name-1")).toHaveValue("Élise de Brume");
  await page.locator("#hero-gender-1").selectOption("female");
  await completeIntroduction(page, 0, "knight", "C10", ["ysilde"]);
  await completeIntroduction(page, 1, "north", "V02", ["bryn", "runa"]);
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("lte-save")!),
  );
  expect(saved.factions).toEqual(["knight", "north"]);
  expect(saved.units.filter((u: any) => u.owner !== 0)).toHaveLength(5);
  expect(saved.portraits.assignments.p1a).toBe("C10");
  expect(saved.portraits.assignments.p2a).toBe("V02");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
