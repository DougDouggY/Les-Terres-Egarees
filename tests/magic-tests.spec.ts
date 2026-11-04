import { test, expect } from "@playwright/test";
async function hub(page: any, preset = "") {
  await page.goto("/");
  await page.evaluate(async (preset: string) => {
    const view = await import(String("/src/dev/workshop.ts"));
    view.openWorkshop(
      document.querySelector("#app")!,
      () => location.reload(),
      preset,
    );
  }, preset);
}
test("soin : cible alliée visible, vrais effets et reprises sans dupliquer les unités", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await hub(page, "heal");
  await expect(page.locator("#lab-battle")).toBeVisible({ timeout: 15000 });
  await expect(page.locator(".lab-panels")).toContainText("Allié blessé");
  await expect(page.locator("#lab-status")).toContainText("→");
  await expect(page.locator("#lab-battle")).toHaveAttribute(
    "data-effect",
    "heal",
  );
  await page.locator("#lab-speed").selectOption("0.25");
  await page.locator('[data-skill="heal"]').click();
  await page.waitForFunction(() => {
    const c = document.querySelector<HTMLCanvasElement>("#lab-battle");
    const t = Number(c?.dataset.elapsed);
    return c?.dataset.effect === "heal" && t > 450 && t < 650;
  });
  await page.locator("[data-play]").click();
  expect(
    await page.locator("#lab-battle").evaluate((c: HTMLCanvasElement) => {
      const a = c.getContext("2d")!.getImageData(800, 180, 230, 250).data;
      let green = 0;
      for (let i = 0; i < a.length; i += 4)
        if (
          a[i + 1] > 100 &&
          a[i + 1] > a[i] * 1.3 &&
          a[i + 1] > a[i + 2] * 1.2
        )
          green++;
      return green;
    }),
  ).toBeGreaterThan(100);
  await page
    .locator("#lab-battle")
    .screenshot({ path: "artifacts/healing-test.png" });
  await page.locator("#lab-speed").selectOption("1");
  await page.locator('[data-skill="heal"]').click();
  await expect(page.locator("#lab-unit option")).toHaveCount(3);
  await page.waitForTimeout(1200);
  expect(errors).toEqual([]);
  expect(
    await page.evaluate(() => localStorage.getItem("lte-save")),
  ).toBeNull();
});
for (const [name, kind] of [
  ["Boule de feu", "fire"],
  ["Éclairs vikings", "lightning"],
])
  test(`${name} : sort affiché et échange réel rejouable`, async ({ page }) => {
    await hub(page, kind);
    await expect(page.locator("#lab-output")).toContainText("attacker");
    await expect(page.locator("#lab-battle")).toHaveAttribute(
      "data-effect",
      kind,
    );
    await page.locator("#lab-speed").selectOption("0.25");
    await page.locator("[data-duel]").click();
    await page.waitForFunction((kind) => {
      const c = document.querySelector<HTMLCanvasElement>("#lab-battle");
      if (!c || c.dataset.effect !== kind) return false;
      const delta = Number(c.dataset.elapsed) - Number(c.dataset.impact);
      return kind === "fire"
        ? delta > -140 && delta < -50
        : delta > -60 && delta < -5;
    }, kind);
    await page.locator("[data-play]").click();
    await page
      .locator("#lab-battle")
      .screenshot({ path: `artifacts/${kind}-test.png` });
    if (kind === "fire")
      expect(
        await page.locator("#lab-battle").evaluate((c: HTMLCanvasElement) => {
          const a = c.getContext("2d")!.getImageData(420, 240, 400, 150).data;
          let orange = 0;
          for (let i = 0; i < a.length; i += 4)
            if (a[i] > 160 && a[i + 1] > 50 && a[i + 2] < 100) orange++;
          return orange;
        }),
      ).toBeGreaterThan(100);
    const first = await page.locator("#lab-output").textContent();
    await page.locator("[data-duel]").click();
    await expect(page.locator("#lab-output")).toHaveText(first!);
    await expect(page.locator("#lab-status")).not.toContainText("impossible");
    await expect(page.locator("#map,.combat-screen")).toHaveCount(0);
    expect(
      await page.evaluate(() => localStorage.getItem("lte-save")),
    ).toBeNull();
  });
test("changer de classe applique immédiatement le choix ; les recrues au niveau 20 ne bloquent pas le test", async ({
  page,
}) => {
  await hub(page);
  await page.locator("#lab-left").selectOption("young_viking");
  await page.locator("#lab-level").selectOption("20");
  await expect(page.locator(".lab-panels")).toContainText("Jeune Viking");
  await page.locator("#lab-left").selectOption("sorcerer");
  await expect(page.locator(".lab-panels")).toContainText("Sorcier");
});
