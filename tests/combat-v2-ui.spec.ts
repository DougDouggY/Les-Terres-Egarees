import { test, expect } from "@playwright/test";
async function open(page: any) {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Tests de combat", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "Comparer toutes les animations",
      exact: true,
    })
    .click();
  await expect(page.locator("[data-compare-play]")).toBeEnabled();
  await expect(page.locator("#compare-canvas")).toHaveAttribute(
    "data-ready",
    "true",
  );
}
test("V2 : scénarios, skins stables, ralenti, miroir, diagnostic et nouvelle galerie", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await open(page);
  await page.locator("#compare-class").selectOption("royal_guard");
  await expect(page.locator("[data-compare-play]")).toBeEnabled();
  await page.locator("#compare-scenario").selectOption("parry");
  await expect(page.locator("[data-compare-play]")).toBeEnabled();
  await expect(page.locator("#compare-canvas")).toHaveAttribute("data-skin-ids", /royal_guard/);
  const id = await page
    .locator("#compare-canvas")
    .getAttribute("data-skin-ids");
  for (const point of ["0", "350", "580", "790", "920"]) {
    await page.locator("#compare-progress").fill(point);
    await page.waitForTimeout(50);
    await expect(page.locator("#compare-canvas")).toHaveAttribute(
      "data-skin-ids",
      id!,
    );
  }
  await page.locator("#compare-speed").selectOption("0.2");
  await page.locator("#compare-mirror").check();
  await page.locator("#compare-anchors").check();
  await expect(page.locator("#compare-diagnostic")).toContainText(
    "royal_guard:any:lance-shield:default",
  );
  await page.screenshot({ path: "artifacts/combat-v2/royal-parry.png" });
  const download = page.waitForEvent("download");
  await page.locator("[data-compare-export]").click();
  expect((await download).suggestedFilename()).toContain("combat-v2");
  await page.locator("#compare-class").selectOption("duelist");
  await expect(page.locator("[data-compare-play]")).toBeEnabled();
  await page.locator("#compare-scenario").selectOption("four");
  await expect(page.locator("[data-compare-play]")).toBeEnabled();
  await page.locator("#compare-progress").fill("349");
  await expect(page.locator("#compare-diagnostic")).toContainText(
    '"duration": 2240',
  );
  await page.screenshot({ path: "artifacts/combat-v2/dual-weapons.png" });
  expect(
    await page.evaluate(() => localStorage.getItem("lte-save")),
  ).toBeNull();
  expect(errors).toEqual([]);
});
test("V2 : impacts consommés une seule fois, montures deux fois plus hautes et aucun remplacement de skin", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const { CombatSceneV2 } = await import(String("/src/ui/combat-v2.ts")),
      { createSandbox, trainingUnit } = await import(
        String("/src/game/sandbox.ts")
      );
    const s = createSandbox(),
      a = trainingUnit(s, "cavalry"),
      b = trainingUnit(s, "man_at_arms", 1, 1, 0),
      strikes = [
        {
          attacker: a.id,
          defender: b.id,
          damage: 6,
          hpAfter: b.hp - 6,
          hit: true,
          blocked: false,
        },
      ];
    const scene = new CombatSceneV2([a, b], strikes);
    await scene.prepare();
    const c = document.createElement("canvas");
    c.width = 960;
    c.height = 600;
    let impacts = 0;
    for (const t of [0, 400, 725, 800, 900, 1250, 1400])
      scene.draw(c.getContext("2d")!, t, () => impacts++);
    const d = scene.diagnosticJSON();
    return {
      impacts,
      heights: d.actors.map((a: any) => a.height),
      originalHp: b.hp,
      actorHp: scene.actors[1].unit.hp,
      strikes,
      frames: scene.lastFrames,
    };
  });
  expect(result.impacts).toBe(1);
  expect(result.heights[0] / result.heights[1]).toBe(2);
  expect(result.originalHp - result.actorHp).toBe(6);
  for (const f of result.frames as any[]) {
    expect(f.y).toBeGreaterThanOrEqual(-2);
    expect(f.y + f.height).toBeLessThanOrEqual(600);
  }
});
