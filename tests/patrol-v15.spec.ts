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

test("V15 déploiement : une pause de rendu ne téléporte pas les soldats", async ({
  page,
}) => {
  await load(page, "c1-deploy");
  await page.clock.runFor(250);
  const actors = () =>
    page
      .locator("#story-map")
      .evaluate((c) =>
        JSON.parse((c as HTMLCanvasElement).dataset.storyPositions!),
      );
  const before = await actors();
  await page.clock.fastForward(3000);
  const after = await actors();
  const a = before.find((u: any) => u.id === "valdren-captain"),
    b = after.find((u: any) => u.id === a.id);
  expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeLessThan(0.8);
  await page.clock.runFor(8000);
  await expect(page.locator("#chapter-overlay")).toHaveCount(0);
  await expect(page.locator("#map")).toBeVisible();
});
test("V15 survol des deux équipes : déplacement, attaque et soins sans sélection", async ({
  page,
}) => {
  await load(page, "battle");
  const map = page.locator("#map");
  await expect
    .poll(async () => Number(await map.getAttribute("data-view-cols")))
    .toBeGreaterThan(0);
  const hover = async (id: string) => {
    const pos = await page.evaluate(async (id) => {
      const E = await import(String("/src/engine.ts"));
      const s = E.decode(localStorage.getItem("lte-chapter-one-test")!);
      return s.units.find((u: any) => u.id === id)!;
    }, id);
    const p = await map.evaluate((c: HTMLCanvasElement, u) => {
      const b = c.getBoundingClientRect();
      return {
        x:
          b.x +
          ((u.x + 0.5 - Number(c.dataset.cameraX)) * b.width) /
            Number(c.dataset.viewCols),
        y:
          b.y +
          ((u.y + 0.5 - Number(c.dataset.cameraY)) * b.height) /
            Number(c.dataset.viewRows),
      };
    }, pos);
    await page.mouse.move(p.x, p.y);
    await page.clock.runFor(100);
  };
  await hover("p1a");
  await expect
    .poll(async () => Number(await map.getAttribute("data-ally-move-count")))
    .toBeGreaterThan(1);
  await expect
    .poll(async () => Number(await map.getAttribute("data-ally-attack-count")))
    .toBeGreaterThan(1);
  await hover("story-witch");
  await expect
    .poll(async () => Number(await map.getAttribute("data-ally-heal-count")))
    .toBeGreaterThan(1);
  await mkdir("artifacts/patrol-v15", { recursive: true });
  await page.screenshot({ path: "artifacts/patrol-v15/allied-hover.png" });
});
