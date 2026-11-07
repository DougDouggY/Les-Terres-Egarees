import { mkdirSync } from "node:fs";
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
      a.leader = true;
      ally.leader = true;
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

mkdirSync("artifacts/magic-v16", { recursive: true });
test("V16 soin direct et niveau automatique à côté de l’XP", async ({
  page,
}) => {
  const { a, ally } = await adventure(page, "sorcerer", "female", true);
  await page.clock.install();
  await actions(page, a);
  await expect(page.locator('[data-action="attack-mode"]')).toBeVisible();
  await page.locator('[data-action="skill-heal"]').click();
  await clickCell(page, ally.x, ally.y);
  await page.clock.runFor(1700);
  await expect(page.locator(".xp-reward-pending")).toBeVisible();
  await expect(
    page.locator('.xp-reward-pending [data-action="close-reward"]'),
  ).toHaveCount(0);
  await page.clock.runFor(3000);
  await expect(page.locator(".level-reward-side")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Niveau supérieur" }),
  ).toBeVisible();
  const xp = await page
      .locator(".xp-reward-side .compact-rewards")
      .boundingBox(),
    level = await page
      .locator(".level-reward-side .compact-rewards")
      .boundingBox();
  expect(xp!.x + xp!.width).toBeLessThan(level!.x);
  await page.clock.runFor(7000);
  await expect(page.locator('[data-action="close-reward"]')).toBeEnabled();
  await page.screenshot({ path: "artifacts/magic-v16/automatic-level.png" });
  await page.locator('[data-action="close-reward"]').click();
  await expect(page.locator(".rewards")).toHaveCount(0);
  const after = await saved(page);
  expect(after.units.find((u: any) => u.id === a.id).activeWeaponId).toBe(
    a.activeWeaponId,
  );
});
test("V16 cadrage combat compact et proportion 960 sur 600", async ({
  page,
}) => {
  const { a, enemy } = await adventure(page, "man_at_arms", "male", true);
  await actions(page, a);
  await page.locator('[data-action="attack-mode"]').click();
  await clickCell(page, enemy.x, enemy.y);
  await page.locator('[data-action^="confirm-attack-"]').click();
  await expect(page.locator("#combat")).toBeVisible();
  const box = await page.locator("#combat").boundingBox();
  expect(box!.width).toBeLessThanOrEqual(1120);
  expect(box!.width / box!.height).toBeCloseTo(1.6, 1);
  await page.screenshot({ path: "artifacts/magic-v16/compact-combat.png" });
});
test("V16 premier texte visible pendant le chargement lent des sprites", async ({
  page,
}) => {
  await page.goto("/");
  await page.route(
    /\/assets\/tactical\/.*\.(png|webp)(\?.*)?$/,
    async (route) => {
      await new Promise((done) => setTimeout(done, 2500));
      await route.continue();
    },
  );
  await page.evaluate(async () => {
    const E = await import(String("/src/engine.ts"));
    const s = E.createCampaign(["north", "knight"]);
    E.beginForestChapter(s);
    while (s.chapter1?.pending?.id === "c1-title") E.advanceChapterLine(s);
    localStorage.setItem("lte-save", E.encode(s));
  });
  await page.reload();
  await page.locator('[data-action="continue"]').click();
  await expect(page.locator(".chapter-text")).toContainText("Sur le chemin", {
    timeout: 1500,
  });
  await expect(page.locator("#chapter-overlay")).toHaveAttribute(
    "data-ready",
    "false",
  );
  await expect(page.locator("#chapter-overlay")).toHaveAttribute(
    "data-ready",
    "true",
    { timeout: 15000 },
  );
});
