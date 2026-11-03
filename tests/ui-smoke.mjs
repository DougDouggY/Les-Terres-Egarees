import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const errors = [];
try {
  for (const first of ["north", "knight"])
    for (const second of ["north", "knight"]) {
      const context = await browser.newContext({
        viewport: { width: 1440, height: 960 },
      });
      const page = await context.newPage();
      page.on("pageerror", (e) => errors.push(e.message));
      page.on("response", (r) => {
        if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`);
      });
      await page.goto("http://127.0.0.1:5173/");
      await page.getByRole("button", { name: /Nouvelle aventure/ }).click();
      await page.locator(`[data-action="faction-1-${first}"]`).click();
      await page.locator(`[data-action="faction-2-${second}"]`).click();
      await page
        .getByRole("button", { name: /Déployer les expéditions/ })
        .click();
      await page.keyboard.press("Tab");
      assert.equal(
        await page.locator(".perspectives .active").innerText(),
        "EXPÉDITION 2",
      );
      await page
        .getByRole("button", { name: "Observation côte à côte" })
        .click();
      assert.equal(await page.locator("#map2").count(), 1);
      await page.waitForTimeout(150);
      const cameras = await page.locator("#map").getAttribute("data-camera-x");
      await page.keyboard.press("ArrowLeft");
      await page
        .getByRole("button", { name: "Sauvegarder", exact: true })
        .click();
      const state = await page.evaluate(() =>
        JSON.parse(localStorage.getItem("lte-save")),
      );
      assert.deepEqual(state.factions, [first, second]);
      assert.ok(state.units[0].classId);
      assert.ok(state.units[2].classId);
      assert.ok(
        Math.abs(state.players[1].camera.x - Number(cameras) + 1) < 0.1,
      );
      assert.notDeepEqual(state.players[0].visible, state.players[1].visible);
      await page.keyboard.press("Tab");
      await page
        .getByRole("button", { name: "Observation côte à côte" })
        .click();
      await page.waitForTimeout(600);
      await page.screenshot({
        path: `artifacts/factions-${first}-${second}.png`,
        fullPage: true,
      });
      await context.close();
      console.log(
        `Interface, origines, Tab, observation et caméras : ${first}/${second} OK`,
      );
    }
  assert.deepEqual(errors, []);
  console.log("Aucune erreur JavaScript ou réponse HTTP en échec.");
} finally {
  await browser.close();
}
