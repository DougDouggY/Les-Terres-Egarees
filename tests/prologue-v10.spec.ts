import { test, expect, type Page } from "@playwright/test";
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
async function fixture(page: Page, shaman = false) {
  await page.goto("/");
  const result = await page.evaluate(async (shaman) => {
    const E = await import(String("/src/engine.ts"));
    const s = E.createCampaign(["north", "knight"]);
    if (shaman) {
      const u = E.makeClassUnit(
        "p1a",
        1,
        1,
        "shaman",
        "Solveig",
        10,
        10,
        "female",
      );
      u.leader = true;
      s.units = s.units.filter((u: any) => u.owner !== 1);
      s.units.push(u);
      E.setPlayableTeamColors(s, {
        player1: "red",
        player2: "yellow",
        enemies: "pink",
      });
    }
    const a = s.units.find((u: any) => u.id === "p1a")!;
    Object.assign(a, { x: 10, y: 10 });
    const e1 = s.units.find((u: any) => u.id === "e1")!,
      e2 = s.units.find((u: any) => u.id === "e2")!;
    Object.assign(e1, { x: 14, y: 10 });
    Object.assign(e2, { x: 16, y: 10 });
    s.units = s.units.filter(
      (u: any) =>
        u.owner !== 0 || u.id === "e1" || u.id === "e2" || u.id === "e8",
    );
    s.common = {
      round: 1,
      index: 0,
      queue: [
        a.id,
        ...s.units.filter((u: any) => u.id !== a.id).map((u: any) => u.id),
      ],
    };
    s.events = ["horde", "storm"];
    s.players[0].camera = { x: 5, y: 5 };
    s.players[0].visible = shaman
      ? E.map.map((_: any, i: number) => i)
      : E.map
          .filter((c: any) => c.x >= 8 && c.x <= 18 && c.y >= 8 && c.y <= 13)
          .map((c: any) => E.key(c.x, c.y));
    s.players[0].explored = [...s.players[0].visible];
    localStorage.setItem("lte-save", E.encode(s));
    return { a, e1, e2 };
  }, shaman);
  await page.reload();
  await page.locator('[data-action="continue"]').click();
  await expect(page.locator("#map")).toBeVisible();
  return result;
}
test("V10 création en trois temps : deux validations, voix privées, compagnons, carton du prologue", async ({
  page,
}) => {
  await page.goto("/");
  await page.clock.install();
  await page.locator('[data-action="new"]').click();
  await expect(page.locator(".creator-factions")).toBeVisible();
  await expect(page.locator("#hero-name-1")).toHaveCount(0);
  await page.screenshot({ path: "artifacts/prologue-v10/step1.png" });
  await page.locator('[data-action="creator-factions-ready"]').click();
  await expect(page.locator("#hero-name-1")).toBeVisible();
  await expect(
    page.locator('#hero-class-2 option[value="sorcerer"]'),
  ).toHaveCount(0);
  await page.locator("#hero-gender-2").selectOption("female");
  await page.locator("#hero-name-2").fill("Maëlle");
  await expect(
    page.locator('#hero-class-2 option[value="sorcerer"]'),
  ).toHaveCount(0);
  await expect(page.locator(".creator-companions").first()).toBeHidden();
  await expect(page.locator('[data-creator-hero="0"]')).toHaveAttribute(
    "data-loaded",
    "true",
  );
  await expect(page.locator('[data-creator-hero="0"]')).toHaveAttribute(
    "data-body-height",
    "96",
  );
  await page.screenshot({
    path: "artifacts/prologue-v10/step2.png",
    fullPage: true,
  });
  await page.locator('[data-action="creator-hero-ready-0"]').click();
  await expect(page.locator('[data-creation-step="2"]')).toBeVisible();
  await expect(
    page.locator('[data-action="creator-hero-ready-0"]'),
  ).toBeDisabled();
  await page.locator('[data-action="creator-hero-ready-1"]').click();
  await expect(page.locator('[data-creation-step="3"]')).toBeVisible();
  await expect(page.locator(".north-party .creator-narrator")).toContainText(
    "vers l’ouest",
  );
  await expect(page.locator(".knight-party .creator-narrator")).toContainText(
    "convoi",
  );
  await expect(
    page.locator(".creator-narrator canvas,.creator-narrator img"),
  ).toHaveCount(0);
  await page.screenshot({
    path: "artifacts/prologue-v10/voices.png",
    fullPage: true,
  });
  await page.locator('[data-action="creator-intro-0"]').click();
  await expect(page.locator(".north-party .creator-narrator")).toContainText(
    "deux places",
  );
  await expect(page.locator(".knight-party .creator-narrator")).toContainText(
    "convoi",
  );
  await page.locator('[data-action="creator-intro-0"]').click();
  await page.locator('[data-action="creator-intro-1"]').click();
  await page.locator('[data-action="creator-intro-1"]').click();
  await expect(
    page.locator('[data-creator-companion][data-loaded="true"]'),
  ).toHaveCount(9);
  await expect(
    page.locator(".knight-party .companion-cards"),
  ).not.toContainText("Sorcier");
  for (const id of ["astrid", "bryn", "solveig"])
    await page.locator(`[data-companion="0:${id}"]`).locator("..").click();
  await expect(page.locator('[data-companion="0:astrid"]')).not.toBeChecked();
  await page.locator('[data-companion="1:gaspard"]').locator("..").click();
  await page.locator('[data-action="creator-party-ready-0"]').click();
  await expect(page.locator('[data-action="begin"]')).toBeDisabled();
  await page.locator('[data-action="creator-party-ready-1"]').click();
  await expect(page.locator('[data-action="begin"]')).toBeEnabled();
  await page.screenshot({
    path: "artifacts/prologue-v10/step3.png",
    fullPage: true,
  });
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
  await page.locator('[data-action="begin"]').click({ force: true });
  await page.clock.runFor(2500);
  await expect(page.locator(".prologue-title")).toBeVisible();
  await expect(page.locator(".prologue-perspectives span")).toHaveCount(2);
  await page.screenshot({
    path: "artifacts/prologue-v10/prologue.png",
    animations: "disabled",
  });
  await page.clock.runFor(800);
  await expect(page.locator(".prologue-title")).toBeVisible();
  await page.clock.runFor(1200);
  await page.clock.resume();
  await expect(page.locator("#chapter-overlay")).toHaveAttribute(
    "data-ready",
    "true",
  );
  await expect(page.locator('[data-story-scene="arrival-1"]')).toBeVisible();
});
test("V10 danger : survol, D pour les ennemis visibles et commande dans Échap", async ({
  page,
}) => {
  const { e1 } = await fixture(page);
  const p = await point(page, e1.x, e1.y);
  await page.mouse.move(p.x, p.y);
  await expect(page.locator("#map")).toHaveAttribute("data-enemy-ranges", "1");
  await page.screenshot({ path: "artifacts/prologue-v10/enemy-hover.png" });
  const empty = await point(page, 9, 9);
  await page.mouse.move(empty.x, empty.y);
  await expect(page.locator("#map")).toHaveAttribute("data-enemy-ranges", "0");
  await page.keyboard.press("d");
  await expect(page.locator("#map")).toHaveAttribute(
    "data-enemy-range-mode",
    "all",
  );
  await expect(page.locator("#map")).toHaveAttribute("data-enemy-ranges", "2");
  await page.screenshot({ path: "artifacts/prologue-v10/enemy-all.png" });
  await page.keyboard.press("d");
  await expect(page.locator("#map")).toHaveAttribute("data-enemy-ranges", "0");
  await page.keyboard.press("Escape");
  await expect(page.locator(".pause-commands")).toContainText(
    "ennemis visibles",
  );
  await expect(page.locator(".pause-commands dt")).toContainText([
    "Échap",
    "D",
    "Souris",
    "Glisser",
    "Flèches",
    "Tab",
  ]);
  await page.screenshot({ path: "artifacts/prologue-v10/commands.png" });
});
test("V10 Chamane rouge : couleur, oscillation de repos et équipement lisible", async ({
  page,
}) => {
  await page.goto("/");
  await page.clock.install();
  await fixture(page, true);
  await page.evaluate(async () => {
    const E = await import(String("/src/engine.ts")),
      R = await import(String("/src/sprites/resources.ts"));
    const s = E.decode(localStorage.getItem("lte-save")!);
    await R.warmSprites(
      [s.units.find((u: any) => u.id === "p1a")],
      s.teamColors,
      ["idle"],
    );
  });
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
  const now = await page.evaluate(() => performance.now());
  await page.clock.runFor(600 - (now % 600) + 40);
  const crop = async () =>
    page.locator("#map").evaluate((c: HTMLCanvasElement) => {
      const d = c
        .getContext("2d")!
        .getImageData(
          Math.floor(
            ((9 - Number(c.dataset.cameraX)) * c.width) /
              Number(c.dataset.viewCols),
          ),
          Math.floor(
            ((8 - Number(c.dataset.cameraY)) * c.height) /
              Number(c.dataset.viewRows),
          ),
          Math.floor((3 * c.width) / Number(c.dataset.viewCols)),
          Math.floor((4 * c.height) / Number(c.dataset.viewRows)),
        ).data;
      let hash = 0;
      for (let i = 0; i < d.length; i += 4)
        hash = (hash * 31 + d[i] + d[i + 1] + d[i + 2]) | 0;
      return hash;
    });
  const first = await crop();
  const before = await page.locator("#map").getAttribute("data-idle-frame");
  for (
    let n = 0;
    n < 12 &&
    (await page.locator("#map").getAttribute("data-idle-frame")) === before;
    n++
  )
    await page.clock.runFor(100);
  expect(await page.locator("#map").getAttribute("data-idle-frame")).not.toBe(
    before,
  );
  expect(await crop()).not.toBe(first);
  await page.clock.resume();
  await page.screenshot({ path: "artifacts/prologue-v10/shaman-red.png" });
  const p = await point(page, 10, 10);
  await page.mouse.click(p.x, p.y);
  if (!(await page.locator("#unit-actions").count()))
    await page.mouse.click(p.x, p.y);
  await page.locator('[data-action="equipment"]').click();
  await expect(page.locator(".equipment-modal")).toBeVisible();
  const style = await page
    .locator(".equipment-list button")
    .first()
    .evaluate((el) => ({
      color: getComputedStyle(el).color,
      opacity: getComputedStyle(el).opacity,
    }));
  expect(style.opacity).toBe("1");
  expect(style.color).toBe("rgb(79, 54, 24)");
  await page.screenshot({ path: "artifacts/prologue-v10/equipment.png" });
});
