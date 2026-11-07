import { test, expect, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
async function load(
  page: Page,
  scene: "alliance" | "c1-warning" | "c1-choice" | "c1-deploy",
  line = 0,
) {
  await page.goto("/");
  await page.clock.install();
  await page.evaluate(
    async ({ scene, line }) => {
      const E = await import(String("/src/engine.ts"));
      const s = E.createCampaign(["north", "knight"]);
      if (scene === "alliance") E.prepareChapterOneTest(s);
      else {
        E.beginForestChapter(s);
        const finish = () => {
          const id = s.chapter1!.pending!.id;
          while (s.chapter1?.pending?.id === id) E.advanceChapterLine(s);
        };
        finish();
        if (scene === "c1-choice" || scene === "c1-deploy") finish();
        if (scene === "c1-deploy") {
          E.votePatrol(s, 1, "storm");
          E.votePatrol(s, 2, "storm");
          finish();
        }
        s.developmentTest = "chapter-one";
      }
      s.chapter1!.pending!.page = line;
      s.scenePage = line;
      localStorage.setItem("lte-chapter-one-test", E.encode(s));
    },
    { scene, line },
  );
  await page.reload();
  await page.locator('[data-action="resume-chapter-one"]').click();
  await expect(page.locator("#chapter-overlay")).toHaveAttribute(
    "data-ready",
    "true",
  );
}
async function actors(page: Page) {
  return page
    .locator("#story-map")
    .evaluate((c) =>
      JSON.parse((c as HTMLCanvasElement).dataset.storyPositions || "[]"),
    );
}
test("V12 prologue : cadrage adapté aux deux écrans, pas de titre permanent, présentation de Maëlys", async ({
  page,
}) => {
  await mkdir("artifacts/patrol-v12", { recursive: true });
  await load(page, "alliance", 16);
  await page.clock.fastForward(4000);
  await expect(page.locator(".chapter-context")).toHaveCount(0);
  await expect(page.locator(".chapter-speaker")).toHaveText("La sorcière");
  for (const [w, h] of [
    [1440, 1000],
    [390, 844],
  ]) {
    await page.setViewportSize({ width: w, height: h });
    await page.clock.runFor(1500);
    const check = await page
      .locator("#story-map")
      .evaluate((c: HTMLCanvasElement) => {
        const b = c.getBoundingClientRect(),
          dialog = document
            .querySelector(".chapter-dialogue")!
            .getBoundingClientRect();
        const rows = Number(c.dataset.viewRows),
          cam = Number(c.dataset.cameraY),
          a = JSON.parse(c.dataset.storyPositions!);
        return {
          y: cam + rows / 2,
          allVisible: a
            .filter((u: any) => !u.id.includes("ambush"))
            .every(
              (u: any) =>
                b.y + ((u.y + 1 - cam) * b.height) / rows < dialog.top - 8,
            ),
        };
      });
    expect(check.y).toBeGreaterThanOrEqual(22);
    expect(check.allVisible).toBe(true);
    await page.screenshot({ path: `artifacts/patrol-v12/prologue-${w}.png` });
  }
  // The presentation is appended after the validated invitation, before departure.
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.locator("[data-story-next]").click();
  await page.clock.fastForward(6000);
  await page.locator("[data-story-next]").click();
  await page.clock.fastForward(6000);
  await expect(page.locator(".chapter-text")).toHaveText(
    "Maëlys. Je m’appelle Maëlys.",
  );
  await page.locator("[data-story-next]").click();
  await expect(page.locator(".chapter-speaker")).toHaveText("Maël");
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("lte-chapter-one-test")!).chapter1
          .witchNamed,
    ),
  ).toBe(true);
});
test("V12 patrouille : narrateur sans logo, seulement trois soldats, approche visible et arrêt sur cases", async ({
  page,
}) => {
  await load(page, "c1-warning", 0);
  await page.clock.fastForward(2000);
  await expect(page.locator(".chapter-text")).toHaveText(
    "Sur le chemin de la grotte de Maëlys…",
  );
  await expect(page.locator(".chapter-portrait")).toBeEmpty();
  await page.locator("[data-story-next]").click();
  await page.clock.runFor(500);
  const start = await actors(page);
  await page.clock.runFor(200);
  const next = await actors(page);
  const a = start.find((u: any) => u.id === "valdren-captain"),
    b = next.find((u: any) => u.id === "valdren-captain");
  expect(b.x).toBeLessThan(a.x);
  expect(a.x - b.x).toBeLessThan(1);
  expect(next.filter((u: any) => u.id.startsWith("valdren"))).toHaveLength(3);
  await page.screenshot({ path: "artifacts/patrol-v12/approach.png" });
  await page.clock.fastForward(4000);
  await page.locator("[data-story-next]").click();
  await page.clock.runFor(100);
  const end = await actors(page);
  expect(end.find((u: any) => u.id === "valdren-captain").x).toBe(20);
  await expect(page.locator(".chapter-speaker")).toHaveText(
    "Capitaine de Valdren",
  );
});
test("V12 choix : panneau opaque en bas, deux vues locales réutilisées, désaccord modifiable et mobile", async ({
  page,
}) => {
  await load(page, "c1-choice");
  await page.clock.runFor(200);
  await expect(page.locator("#story-map-peer")).toBeVisible();
  const box = await page.locator(".patrol-choice").boundingBox();
  expect(box!.y + box!.height).toBeGreaterThan(950);
  expect(box!.y).toBeGreaterThan(450);
  await expect(page.locator(".patrol-hint")).toHaveText(
    "Mettez-vous d’accord.",
  );
  await page
    .locator('[data-patrol-owner="1"][data-patrol-choice="storm"]')
    .click();
  await page
    .locator('[data-patrol-owner="2"][data-patrol-choice="travelers"]')
    .click();
  await expect(page.locator(".patrol-status")).toContainText("pas d’accord");
  await page.screenshot({ path: "artifacts/patrol-v12/choice-split.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.clock.runFor(200);
  await expect(page.locator("#story-map-peer")).toHaveCount(0);
  const mobile = await page.locator(".patrol-choice").boundingBox();
  expect(mobile!.x).toBeGreaterThanOrEqual(0);
  expect(mobile!.y).toBeGreaterThanOrEqual(0);
  expect(mobile!.y + mobile!.height).toBeLessThanOrEqual(844);
  await page.screenshot({ path: "artifacts/patrol-v12/choice-mobile.png" });
  await page
    .locator('[data-patrol-owner="1"][data-patrol-choice="travelers"]')
    .click();
  await expect(page.locator('[data-story-scene="c1-travelers"]')).toBeVisible();
});
test("V12 déploiement : recul et renforts sur cases, dézoom temporaire, onze ennemis, retour au jeu normal", async ({
  page,
}) => {
  await load(page, "c1-deploy");
  await page.clock.runFor(200);
  const initial = await actors(page);
  await page.clock.runFor(2500);
  const moving = await actors(page);
  expect(moving.find((u: any) => u.id === "valdren-captain").x).toBeGreaterThan(
    initial.find((u: any) => u.id === "valdren-captain").x,
  );
  const cols = await page.locator("#story-map").getAttribute("data-view-cols");
  expect(Number(cols)).toBeGreaterThan(28);
  await page.screenshot({ path: "artifacts/patrol-v12/deployment.png" });
  await page.clock.fastForward(5000);
  await expect(page.locator("#map")).toBeVisible();
  await page.clock.runFor(100);
  await expect(page.locator(".mission-objective")).toHaveText(
    "Éliminer tous les ennemis",
  );
  await expect(page.locator(".chapter-context")).toHaveCount(0);
  const normalCols = Number(
    await page.locator("#map").getAttribute("data-view-cols"),
  );
  expect(normalCols).toBeLessThan(Number(cols));
  const s = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("lte-chapter-one-test")!),
  );
  expect(s.units.filter((u: any) => u.owner === 0)).toHaveLength(11);
  expect(s.units.find((u: any) => u.id === "valdren-captain").x).toBe(40);
  expect(s.common.round).toBe(1);
  await page.screenshot({ path: "artifacts/patrol-v12/battle.png" });
});
