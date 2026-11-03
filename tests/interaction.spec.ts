import { test, expect } from "@playwright/test";
import { clickMap, mapPoint } from "./map-helpers";
test("caméra glissée, survol, fiche et aide des statistiques", async ({
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
  const unit = await mapPoint(page, 11, 11);
  await page.mouse.move(unit.x, unit.y);
  await expect(page.locator("#map-tooltip")).toContainText("Astrid");
  await expect(page.locator("#map-tooltip .hp")).toBeVisible();
  await clickMap(page, 11, 11);
  const card = page.getByRole("region", { name: "Fiche de Astrid" });
  await expect(card).toBeVisible();
  const stat = card.locator("[data-tooltip]").filter({ hasText: "FOR" });
  await stat.hover();
  expect(
    await stat.evaluate((e) => getComputedStyle(e, "::after").content),
  ).toContain("Force");
  await page.screenshot({ path: "artifacts/unit-window.png", fullPage: true });
  await page.getByRole("button", { name: "Fermer la fiche" }).click();
  const ground = await mapPoint(page, 12, 11);
  await page.mouse.move(ground.x, ground.y);
  await expect(page.locator("#map-tooltip")).toContainText("Prairie");
  await page.getByRole("button", { name: "Sauvegarder", exact: true }).click();
  const before = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("lte-save")!),
  );
  const r = (await page.locator("#map").boundingBox())!;
  await page.mouse.move(r.x + r.width * 0.5, r.y + r.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(r.x + r.width * 0.25, r.y + r.height * 0.3, {
    steps: 12,
  });
  await page.mouse.up();
  await page.getByRole("button", { name: "Sauvegarder", exact: true }).click();
  const after = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("lte-save")!),
  );
  expect(after.units).toEqual(before.units);
  expect(after.players[0].camera.x).toBeGreaterThan(
    before.players[0].camera.x + 3,
  );
  // The second expedition has its own camera, rather than inheriting the drag.
  await page.keyboard.press("Tab");
  await page.waitForTimeout(200);
  await page.keyboard.press("Tab");
  await page.waitForTimeout(200);
  expect(
    Number(await page.locator("#map").getAttribute("data-camera-x")),
  ).toBeCloseTo(after.players[0].camera.x);
  await page
    .getByRole("button", { name: "Retirer la brume (test)", exact: true })
    .click();
  const woodland = await mapPoint(page, 17, 17);
  await page.mouse.move(woodland.x, woodland.y);
  await page.screenshot({
    path: "artifacts/connected-woods.png",
    fullPage: true,
  });
  expect(errors).toEqual([]);
});
test("entrée sud du village : déplacement réel sur la case de la porte", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(async () => {
    const E = await import("/src/engine.ts" as string),
      s = E.createCampaign(["north", "knight"]);
    s.phase = "battle";
    s.scene = null;
    Object.assign(s.units[1], { x: 31, y: 20 });
    E.visibility(s);
    localStorage.setItem("lte-save", E.encode(s));
    localStorage.setItem("lte-speed", "5");
  });
  await page.reload();
  await page.getByRole("button", { name: /Continuer/ }).click();
  await clickMap(page, 31, 20);
  await clickMap(page, 31, 18);
  await page.getByRole("button", { name: "Attendre", exact: true }).click();
  const unit = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("lte-save")!).units.find(
      (u: any) => u.id === "p1b",
    ),
  );
  expect(unit).toMatchObject({ x: 31, y: 18 });
});
