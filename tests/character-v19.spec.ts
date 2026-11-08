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
      a.xp = 45;
      a.hp = 3;
      a.maxHp = 30;
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

mkdirSync("artifacts/character-v19", { recursive: true });
test("V19 portrait carré, compteurs compacts et détails ancrés en bas", async ({
  page,
}) => {
  const { a } = await adventure(page, "tracker", "male", true);
  await actions(page, a);
  await page.locator('[data-action="character"]').click();
  const root = page.locator(".character-window"),
    portrait = root.locator(".character-portrait-slot");
  const p = await portrait.boundingBox();
  expect(Math.abs(p!.width - p!.height)).toBeLessThan(1);
  const level = await root.locator("dl > div").nth(0).boundingBox(),
    xp = await root.locator("dl > div").nth(1).boundingBox();
  expect(Math.abs(level!.y - xp!.y)).toBeLessThan(1);
  await expect(root.locator("dt").first()).toHaveText("NIV");
  await expect(root.locator("dl > div").nth(1)).toHaveText("EXP45");
  await expect(root.locator(".character-health")).toHaveText("PV3/30");
  const checkBottom = async () => {
    const panel = await root.locator(".character-pages").boundingBox(),
      details = await root.locator(".character-item-details").boundingBox();
    expect(
      Math.abs(panel!.y + panel!.height - details!.y - details!.height),
    ).toBeLessThanOrEqual(7);
  };
  await checkBottom();
  await page.locator('[data-action="character-item-bandages"]').click();
  await checkBottom();
  await root.screenshot({ path: "artifacts/character-v19/panel.png" });
  await page.screenshot({ path: "artifacts/character-v19/inventory.png" });
  await root.getByRole("button", { name: "Onglet suivant" }).click();
  await page.screenshot({ path: "artifacts/character-v19/statistics.png" });
  await page.setViewportSize({ width: 375, height: 700 });
  const pp = await portrait.boundingBox();
  expect(Math.abs(pp!.width - pp!.height)).toBeLessThan(1);
  const box = await root.boundingBox();
  expect(box!.width).toBeLessThanOrEqual(375);
  expect(box!.height).toBeLessThanOrEqual(264);
  await page.screenshot({ path: "artifacts/character-v19/mobile.png" });
});
