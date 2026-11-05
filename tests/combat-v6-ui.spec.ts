import { test, expect, type Page } from "@playwright/test";
async function clickCell(page: Page, x: number, y: number) {
  await page.waitForFunction(() => {
    const c = document.querySelector<HTMLCanvasElement>("#map");
    return (
      c &&
      ["cameraX", "cameraY", "viewCols", "viewRows"].every(
        (k) =>
          c.dataset[k] !== undefined && Number.isFinite(Number(c.dataset[k])),
      ) &&
      Number(c.dataset.viewCols) > 0 &&
      Number(c.dataset.viewRows) > 0
    );
  });
  const p = await page.locator("#map").evaluate(
    (c: HTMLCanvasElement, { x, y }) => {
      const b = c.getBoundingClientRect();
      return {
        x:
          b.x +
          ((x + 0.5 - Number(c.dataset.cameraX)) / Number(c.dataset.viewCols)) *
            b.width,
        y:
          b.y +
          ((y + 0.5 - Number(c.dataset.cameraY)) / Number(c.dataset.viewRows)) *
            b.height,
      };
    },
    { x, y },
  );
  await page.mouse.click(p.x, p.y);
}
async function adventure(
  page: Page,
  cls: string,
  gender = "female",
  foeAdjacent = false,
  enemyDistance = 2,
  enemyFirst = false,
) {
  await page.goto("/");
  const result = await page.evaluate(
    async ({ cls, gender, foeAdjacent, enemyDistance, enemyFirst }) => {
      const E = await import(String("/src/engine.ts"));
      const { trainingUnit } = await import(String("/src/game/sandbox.ts"));
      const faction = E.classes[cls].faction;
      const s = E.createCampaign(
        faction === "knight" ? ["knight", "north"] : ["north", "knight"],
      );
      s.units = [];
      s.phase = "battle";
      s.scene = null;
      s.merged = true;
      delete s.sandbox;
      delete s.sandboxFlat;
      const a = trainingUnit(s, cls),
        ally = trainingUnit(
          s,
          s.factions[1] === "north" ? "raider" : "man_at_arms",
          1,
          1,
          2,
        ),
        enemy = trainingUnit(s, "raider", 1, 1, 0);
      a.gender = gender;
      a.xp = 95;
      if (enemyFirst) a.hp = a.maxHp = 1000;
      const c = E.map.find(
        (c: any) =>
          c.x > 15 &&
          c.y > 12 &&
          c.x < 40 &&
          c.y < 30 &&
          [-1, 0, 1, 2, 3, 4].every(
            (dx) =>
              E.cell(c.x + dx, c.y)?.walk && E.cell(c.x + dx, c.y)?.cost === 1,
          ) &&
          E.cell(c.x, c.y + 1)?.walk,
      )!;
      Object.assign(a, { x: c.x, y: c.y });
      Object.assign(ally, { x: c.x, y: c.y + 1, hp: ally.maxHp - 5 });
      Object.assign(enemy, {
        x: c.x + (foeAdjacent ? 1 : enemyDistance),
        y: c.y,
        hp: 500,
        maxHp: 500,
      });
      if (enemyFirst) enemy.move = 0;
      s.common = {
        round: 1,
        index: 0,
        queue: enemyFirst
          ? [enemy.id, a.id, ally.id]
          : [a.id, ally.id, enemy.id],
      };
      s.initiativeVersion = 2;
      s.active = 1;
      s.fronts = [s.common, s.common];
      s.mapRevision = E.MAP_REVISION;
      s.events = ["meeting", "sanctuary-guards"];
      s.players.forEach((p: any) => {
        p.camera = { x: c.x - 5, y: c.y - 4 };
        p.visible = E.map.map((_: any, i: number) => i);
        p.explored = p.visible;
      });
      localStorage.setItem("lte-save", E.encode(s));
      localStorage.setItem("lte-speed", "1");
      return { a, ally, enemy };
    },
    { cls, gender, foeAdjacent, enemyDistance, enemyFirst },
  );
  await page.reload();
  await page.locator('[data-action="continue"]').click();
  await expect(page.locator("#map")).toBeVisible();
  return result;
}
async function actions(page: Page, a: any) {
  await clickCell(page, a.x, a.y);
  if (!(await page.locator("#unit-actions").count()))
    await clickCell(page, a.x, a.y);
  await expect(page.locator("#unit-actions")).toBeVisible();
}
async function saved(page: Page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem("lte-save")!));
}

test("V6 : prévision conservée, fin complète, XP animée puis panneau de niveau", async ({
  page,
}) => {
  const { a, enemy } = await adventure(page, "tracker", "male", true);
  await actions(page, a);
  await page.locator('[data-action="quick-weapon-axe"]').click();
  await page.locator('[data-action="attack-mode"]').click();
  await clickCell(page, enemy.x, enemy.y);
  await expect(page.locator(".fe-forecast")).toHaveCSS("width", "172px");
  await page.screenshot({ path: "artifacts/combat-v6/forecast.png" });
  await page.locator('[data-action^="confirm-attack-"]').click();
  await expect(page.locator(".combat-screen")).toBeVisible();
  await expect(page.locator(".compact-rewards")).toHaveCount(0);
  for (const viewport of [
    { width: 1440, height: 1000 },
    { width: 1024, height: 600 },
    { width: 844, height: 390 },
  ]) {
    await page.setViewportSize(viewport);
    const r = await page.locator(".duel-panels").boundingBox();
    expect(r!.x).toBeGreaterThanOrEqual(0);
    expect(r!.x + r!.width).toBeLessThanOrEqual(viewport.width);
    expect(r!.y + r!.height).toBeLessThanOrEqual(viewport.height);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollHeight <= innerHeight + 1,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `artifacts/combat-v6/battle-${viewport.width}.png`,
    });
  }
  await expect(page.locator(".compact-rewards")).toBeVisible();
  await expect(page.locator(".combat-screen,#combat")).toHaveCount(0);
  await expect(page.locator(".compact-rewards")).not.toContainText("PV");
  await expect(page.locator(".compact-rewards")).not.toContainText("Force");
  await expect(page.locator("[data-xp-level]")).toHaveText("Niveau 2");
  await expect(page.locator('[data-action="close-reward"]')).toBeEnabled();
  await page.screenshot({ path: "artifacts/combat-v6/xp.png" });
  await page.locator('[data-action="close-reward"]').click();
  await expect(
    page.getByRole("heading", { name: "Niveau supérieur" }),
  ).toBeVisible();
  await expect(page.locator(".level-gains")).toContainText("+1");
  await expect(page.locator(".compact-rewards")).toHaveCSS("opacity", "1");
  await page.screenshot({ path: "artifacts/combat-v6/level.png" });
  await page.locator('[data-action="close-reward"]').click();
  await expect(page.locator("#map")).toBeVisible();
});
test("V6 : ancien éclair V4 et nuage, deux orientations", async ({ page }) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const { drawSpell, preloadEffects } = await import(
      String("/src/ui/combat-effects.ts")
    );
    await preloadEffects();
    const c = document.createElement("canvas");
    c.width = 960;
    c.height = 600;
    document.querySelector("#app")!.replaceChildren(c);
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#1e2d27";
    ctx.fillRect(0, 0, 960, 600);
    drawSpell(ctx, "lightning", 0, { x: 120, y: 320 }, { x: 360, y: 400 }, 160);
    drawSpell(ctx, "lightning", 0, { x: 900, y: 320 }, { x: 650, y: 400 }, 160);
    return c.toDataURL();
  });
  await page.screenshot({ path: "artifacts/combat-v6/lightning.png" });
  expect(result.length).toBeGreaterThan(10000);
});

test("V6 Aventure : le défenseur archer gagne son XP même sans riposter", async ({
  page,
}) => {
  const { a } = await adventure(page, "hunter", "female", true, 2, true);
  await expect(page.locator(".combat-screen")).toBeVisible();
  await expect(page.locator(".compact-rewards")).toBeVisible();
  await expect(page.locator(".reward-unit")).toHaveCount(1);
  await expect(page.locator(".reward-unit")).toContainText(a.name);
  await expect(page.locator(".reward-unit")).toContainText("+25 EXP");
  await expect(page.locator("[data-xp-level]")).toHaveText("Niveau 2");
  await expect(page.locator(".compact-rewards")).not.toContainText("PV");
  await page.locator('[data-action="close-reward"]').click();
  await expect(
    page.getByRole("heading", { name: "Niveau supérieur" }),
  ).toBeVisible();
  await page.locator('[data-action="close-reward"]').click();
  await expect(page.locator("#map")).toBeVisible();
  const s = await saved(page);
  expect(s.units.find((u: any) => u.id === a.id).level).toBe(2);
});
