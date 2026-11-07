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
async function positions(page: Page) {
  return page
    .locator("#story-map")
    .evaluate((c) =>
      JSON.parse((c as HTMLCanvasElement).dataset.storyPositions || "[]"),
    );
}
async function point(page: Page, x: number, y: number) {
  await page.waitForFunction(
    () =>
      Number(
        document.querySelector<HTMLCanvasElement>("#map")?.dataset.viewCols,
      ) > 0,
  );
  return page.locator("#map").evaluate(
    (c: HTMLCanvasElement, { x, y }) => {
      const b = c.getBoundingClientRect();
      return {
        x:
          b.x +
          ((x + 0.5 - Number(c.dataset.cameraX)) * b.width) /
            Number(c.dataset.viewCols),
        y:
          b.y +
          ((y + 0.5 - Number(c.dataset.cameraY)) * b.height) /
            Number(c.dataset.viewRows),
      };
    },
    { x, y },
  );
}
test("V13 départ : sortie complète, pas de marche après attente et clic rapide non bloquant", async ({
  page,
}) => {
  await mkdir("artifacts/forest-v13", { recursive: true });
  await load(page, "depart");
  await page.clock.runFor(200);
  expect((await positions(page)).length).toBeGreaterThan(0);
  await page.clock.runFor(3200);
  expect(await positions(page)).toEqual([]);
  await page.clock.fastForward(7000);
  expect(await positions(page)).toEqual([]);
  await page.screenshot({ path: "artifacts/forest-v13/departure.png" });
  await load(page, "depart");
  await page.locator("[data-story-next]").click();
  if (await page.locator("[data-story-next]").count())
    await page.locator("[data-story-next]").click();
  await expect(page.locator(".prologue-title h1")).toHaveText(
    "Pour ne pas oublier",
  );
});
test("V13 narration sans colonne et gardes immobiles jusqu’au clic après Maëlys", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1915, height: 877 });
  await load(page, "c1-warning");
  await page.clock.fastForward(2000);
  await expect(page.locator(".chapter-portrait")).toHaveCount(0);
  await expect(page.locator(".narration-only")).toBeVisible();
  const d = await page.locator(".chapter-dialogue").boundingBox(),
    t = await page.locator(".chapter-text").boundingBox();
  expect(t!.x - d!.x).toBeLessThan(40);
  await page.screenshot({ path: "artifacts/forest-v13/narration.png" });
  await page.locator("[data-story-next]").click();
  await page.clock.fastForward(8000);
  await expect(page.locator(".chapter-speaker")).toHaveText("Maëlys");
  const before = await positions(page);
  expect(before.find((u: any) => u.id === "valdren-captain").x).toBe(17);
  await page.clock.runFor(600);
  expect(
    (await positions(page)).find((u: any) => u.id === "valdren-captain").x,
  ).toBe(17);
  await page.screenshot({ path: "artifacts/forest-v13/warning.png" });
  await page.locator("[data-story-next]").click();
  await expect(page.locator(".chapter-dialogue")).toBeHidden();
  await expect(page.locator("#chapter-overlay")).toHaveAttribute(
    "data-ready",
    "true",
  );
  await page.clock.runFor(250);
  expect(
    (await positions(page)).find((u: any) => u.id === "valdren-captain").x,
  ).toBeLessThan(17);
  await page.clock.runFor(2900);
  await expect(page.locator('[data-story-scene="c1-captain"]')).toBeVisible();
  await page.clock.runFor(100);
  expect(
    (await positions(page)).find((u: any) => u.id === "valdren-captain").x,
  ).toBe(10);
});
test("V13 choix : Valider désactivé en désaccord, accord sans avance automatique puis clic explicite", async ({
  page,
}) => {
  await load(page, "c1-choice");
  const validate = page.locator("[data-patrol-confirm]");
  await expect(validate).toBeDisabled();
  await page
    .locator('[data-patrol-owner="1"][data-patrol-choice="storm"]')
    .click();
  await page
    .locator('[data-patrol-owner="2"][data-patrol-choice="travelers"]')
    .click();
  await expect(validate).toBeDisabled();
  await page
    .locator('[data-patrol-owner="2"][data-patrol-choice="storm"]')
    .click();
  await expect(validate).toBeEnabled();
  await page.clock.runFor(600);
  await expect(page.locator(".patrol-choice")).toBeVisible();
  await page.screenshot({ path: "artifacts/forest-v13/confirm-choice.png" });
  await validate.click();
  await expect(page.locator('[data-story-scene="c1-storm"]')).toBeVisible();
});
test("V13 coopération : chaque propriétaire doit confirmer, une confirmation seule reste en attente", async ({
  page,
}) => {
  await load(page, "c1-choice");
  await page.evaluate(async () => {
    const E = await import(String("/src/engine.ts")),
      M = await import(String("/src/main.ts"));
    const s = E.decode(localStorage.getItem("lte-chapter-one-test")!);
    E.votePatrol(s, 1, "storm");
    E.votePatrol(s, 2, "storm");
    M.applyCooperativeSnapshot(s, 1);
  });
  await page.locator("[data-patrol-confirm]").click();
  await expect(page.locator(".patrol-choice")).toBeVisible();
  await expect(page.locator("[data-patrol-confirm]")).toBeDisabled();
  await expect(page.locator(".patrol-status")).toContainText("confirmation");
  await page.evaluate(async () => {
    const E = await import(String("/src/engine.ts")),
      M = await import(String("/src/main.ts"));
    const s = E.decode(localStorage.getItem("lte-chapter-one-test")!);
    E.confirmPatrol(s, 2);
    M.applyCooperativeSnapshot(s, 1);
  });
  await expect(page.locator('[data-story-scene="c1-storm"]')).toBeVisible();
});
test("V13 déploiement court et carte 34×20 sur écran large ; capitaine zéro déplacement puis déblocage visible", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1915, height: 877 });
  await load(page, "c1-deploy");
  await page.clock.runFor(150);
  const cap = (await positions(page)).find(
    (u: any) => u.id === "valdren-captain",
  );
  expect(cap.x).toBeGreaterThan(10);
  await page.clock.runFor(1500);
  expect(
    Number(await page.locator("#story-map").getAttribute("data-view-cols")),
  ).toBeLessThanOrEqual(34);
  expect(
    Number(await page.locator("#story-map").getAttribute("data-view-rows")),
  ).toBeLessThanOrEqual(20);
  await page.screenshot({ path: "artifacts/forest-v13/deployment.png" });
  await page.clock.runFor(6000);
  await expect(page.locator("#chapter-overlay")).toHaveCount(0);
  await expect(page.locator("#map")).toBeVisible();
  await page.clock.fastForward(12000);
  await page.clock.runFor(200);
  // Pan using the real drag handler to inspect the captain in the rear.
  await page.mouse.move(1600, 300);
  await page.mouse.down();
  await page.mouse.move(150, 300, { steps: 12 });
  await page.mouse.up();
  await page.mouse.move(1400, 300);
  await page.mouse.down();
  await page.mouse.move(800, 300, { steps: 8 });
  await page.mouse.up();
  await page.clock.runFor(120);
  let p = await point(page, 31, 8);
  await page.mouse.move(p.x, p.y);
  await expect(page.locator("#map")).toHaveAttribute(
    "data-enemy-move-count",
    "0",
  );
  await expect(page.locator("#map")).toHaveAttribute("data-enemy-ranges", "1");
  await expect
    .poll(async () =>
      Number(
        await page.locator("#map").getAttribute("data-enemy-attack-count"),
      ),
    )
    .toBeGreaterThan(0);
  await page.screenshot({ path: "artifacts/forest-v13/boss-locked.png" });
  await page.evaluate(async () => {
    const E = await import(String("/src/engine.ts")),
      M = await import(String("/src/main.ts"));
    const s = E.decode(localStorage.getItem("lte-chapter-one-test")!);
    const c = s.units.find((u: any) => u.id === "valdren-captain")!,
      h = s.units.find((u: any) => u.id === "p1a")!;
    E.applyStrike(s, {
      attacker: h.id,
      defender: c.id,
      hpAfter: c.hp - 1,
      damage: 1,
      hit: true,
    });
    s.players[0].camera = { x: 16, y: 4 };
    M.applyCooperativeSnapshot(s, 1);
  });
  p = await point(page, 31, 8);
  await page.mouse.move(p.x, p.y);
  await expect
    .poll(async () =>
      Number(await page.locator("#map").getAttribute("data-enemy-move-count")),
    )
    .toBeGreaterThan(0);
  await page.screenshot({ path: "artifacts/forest-v13/boss-awake.png" });
});
test("V13 combat réel après recadrage : prévision, lancement et fond forestier préservés", async ({
  page,
}) => {
  await load(page, "battle");
  await page.evaluate(async () => {
    const E = await import(String("/src/engine.ts")),
      M = await import(String("/src/main.ts"));
    const s = E.decode(localStorage.getItem("lte-chapter-one-test")!);
    const h = s.units.find((u: any) => u.id === "p1a")!,
      e = s.units.find((u: any) => u.id === "valdren-1")!;
    h.x = 5;
    h.y = 9;
    e.x = 4;
    e.y = 9;
    s.active = 1;
    s.common = {
      round: 1,
      index: 0,
      queue: [
        h.id,
        ...s.units.filter((u: any) => u.id !== h.id).map((u: any) => u.id),
      ],
    };
    s.players[0].camera = { x: 0, y: 4 };
    E.visibility(s);
    M.applyCooperativeSnapshot(s, 1);
  });
  await page.clock.runFor(200);
  let p = await point(page, 5, 9);
  await page.mouse.click(p.x, p.y);
  p = await point(page, 4, 9);
  await page.mouse.click(p.x, p.y);
  await expect(page.locator(".fe-forecast")).toBeVisible();
  await page.locator('[data-action="confirm-attack-valdren-1"]').click();
  await expect(page.locator("#combat")).toBeVisible();
  expect(
    await page
      .locator(".combat-scene-bg")
      .evaluate((e) => getComputedStyle(e).backgroundImage),
  ).toContain("battle-2.png");
});
