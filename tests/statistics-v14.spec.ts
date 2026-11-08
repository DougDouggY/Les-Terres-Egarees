import { test, expect, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
async function load(page: Page, scene: string) {
  await page.goto("/");
  await page.clock.install();
  await page.evaluate(async (scene) => {
    const E = await import(String("/src/engine.ts"));
    let s = E.createCampaign(["north", "knight"]);
    if (scene === "depart") {
      E.prepareChapterOneTest(s);
      s.chapter1!.witchNamed = true;
      s.chapter1!.pending!.page = E.chapterLines(s, "alliance").length - 1;
      s.scenePage = s.chapter1!.pending!.page;
    } else {
      E.beginForestChapter(s);
      const finish = () => {
        const id = s.chapter1!.pending!.id;
        while (s.chapter1?.pending?.id === id) E.advanceChapterLine(s);
      };
      finish();
      if (scene !== "c1-warning") {
        while (s.chapter1?.pending?.id !== "c1-choice") finish();
      }
      if (scene === "c1-deploy" || scene === "battle") {
        E.votePatrol(s, 1, "storm");
        E.votePatrol(s, 2, "storm");
        E.confirmPatrol(s);
        finish();
        if (scene === "battle") finish();
      }
    }
    s.common.queue = [
      "p1a",
      ...s.common.queue.filter((id: string) => id !== "p1a"),
    ];
    s.common.index = 0;
    s.active = 1;
    s.developmentTest = "chapter-one";
    localStorage.setItem("lte-chapter-one-test", E.encode(s));
  }, scene);
  await page.reload();
  await page.locator('[data-action="resume-chapter-one"]').click();
  if (scene !== "battle")
    await expect(page.locator("#chapter-overlay")).toHaveAttribute(
      "data-ready",
      "true",
    );
  else await expect(page.locator("#map")).toBeVisible();
}

test("V14 roulette et fiche sans portrait, desktop et petit écran", async ({
  page,
}) => {
  await load(page, "battle");
  const map = page.locator("#map");
  await expect
    .poll(async () => Number(await map.getAttribute("data-view-cols")))
    .toBeGreaterThan(0);
  const initial = Number(await map.getAttribute("data-view-cols"));
  await map.hover();
  await page.mouse.wheel(0, -100);
  await page.clock.runFor(200);
  await expect
    .poll(async () => Number(await map.getAttribute("data-view-cols")))
    .toBeLessThan(initial);
  await page.mouse.wheel(0, 100);
  await page.clock.runFor(200);
  await expect
    .poll(async () => Number(await map.getAttribute("data-view-cols")))
    .toBeCloseTo(initial, 1);
  const point = await map.evaluate((c: HTMLCanvasElement) => {
    const b = c.getBoundingClientRect();
    // Fixture leader p1a is at 8,9 in the compact marching formation.
    return {
      x:
        b.x +
        ((8.5 - Number(c.dataset.cameraX)) * b.width) /
          Number(c.dataset.viewCols),
      y:
        b.y +
        ((9.5 - Number(c.dataset.cameraY)) * b.height) /
          Number(c.dataset.viewRows),
    };
  });
  await page.mouse.click(point.x, point.y);
  await page.mouse.click(point.x, point.y);

  await page.locator('[data-action="character"]').click();
  const sheet = page.locator(".unit-window");
  await expect(sheet).toBeVisible();
  await expect(sheet.locator(".portrait,.portrait-placeholder")).toHaveCount(0);
  await expect(sheet).toContainText("EXP");
  expect(
    await sheet.evaluate((el) => el.scrollHeight <= el.clientHeight + 2),
  ).toBe(true);
  await mkdir("artifacts/statistics-v14", { recursive: true });
  await page.screenshot({ path: "artifacts/statistics-v14/sheet-desktop.png" });
  await page.setViewportSize({ width: 800, height: 600 });
  const b = await sheet.boundingBox();
  expect(b!.y + b!.height).toBeLessThanOrEqual(600);
});
