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

test("V8 création : couleurs occupées désactivées et rose absent", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator('[data-action="new"]').click();
  await page.locator('[data-action="team-colors"]').click();
  const one = page.locator("#team-player1"),
    two = page.locator("#team-player2");
  await expect(one.locator('option[value="pink"]')).toHaveCount(0);
  await expect(two.locator('option[value="blue"]')).toHaveAttribute(
    "disabled",
    "",
  );
  await one.selectOption("green");
  await expect(two.locator('option[value="green"]')).toHaveAttribute(
    "disabled",
    "",
  );
  await expect(two.locator('option[value="blue"]')).not.toHaveAttribute(
    "disabled",
    "",
  );
  await two.selectOption("orange");
  await expect(one.locator('option[value="orange"]')).toHaveAttribute(
    "disabled",
    "",
  );
  await expect(one.locator('option[value="yellow"]')).not.toHaveAttribute(
    "disabled",
    "",
  );
  await page.locator('[data-action="apply-team-colors"]').click();
  await expect(page.locator(".team-colors-modal")).toHaveCount(0);
  const colors = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("lte-team-colors-v1")!),
  );
  expect(colors).toEqual({
    player1: "green",
    player2: "orange",
    enemies: "pink",
  });
});
test("V8 bataille : vrais pigments, XP centrée et gains successifs avant valeurs finales", async ({
  page,
}) => {
  const { a, enemy } = await adventure(page, "tracker", "male", true);
  await actions(page, a);
  await page.locator('[data-action="quick-weapon-axe"]').click();
  await page.locator('[data-action="attack-mode"]').click();
  await clickCell(page, enemy.x, enemy.y);
  await expect(page.locator(".fe-forecast")).toHaveCSS("width", "172px");
  const mask = await page
    .locator(".fe-forecast")
    .evaluate((el) => getComputedStyle(el, "::before").maskImage);
  expect(mask).toContain("pigment-wash-v8");
  await page.screenshot({ path: "artifacts/chapter1-v8/forecast.png" });
  await page.locator('[data-action^="confirm-attack-"]').click();
  await expect(page.locator(".compact-rewards")).toBeVisible();
  await expect(page.locator("#map")).toBeVisible();
  const assertCentered = async () => {
    const r = await page.locator(".compact-rewards").boundingBox(),
      v = page.viewportSize()!;
    expect(Math.abs(r!.x + r!.width / 2 - v.width / 2)).toBeLessThan(2);
    expect(Math.abs(r!.y + r!.height / 2 - v.height / 2)).toBeLessThan(2);
  };
  await assertCentered();
  await expect(page.locator('[data-action="close-reward"]')).toBeEnabled();
  await page.screenshot({ path: "artifacts/chapter1-v8/xp-center.png" });
  await page.clock.install();
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 50));
  await page.locator('[data-action="close-reward"]').click({ force: true });
  await page.clock.runFor(500);
  await expect(
    page.getByRole("heading", { name: "Niveau supérieur" }),
  ).toBeVisible();
  await assertCentered();
  await expect(page.locator('[data-action="close-reward"]')).toBeDisabled();
  const beginning = await page
    .locator("[data-level-stat]")
    .evaluateAll((rows) =>
      rows.map((row) => ({
        key: (row as HTMLElement).dataset.levelStat,
        old: Number(row.querySelector("[data-level-value]")!.textContent),
        after: Number((row as HTMLElement).dataset.after),
        gain: Number((row as HTMLElement).dataset.gain),
      })),
    );
  expect(beginning.some((row) => row.gain > 0)).toBe(true);
  expect(
    beginning
      .filter((row) => row.gain > 0)
      .every((row) => row.old + row.gain === row.after),
  ).toBe(true);
  await page.clock.runFor(600);
  await page.screenshot({ path: "artifacts/chapter1-v8/level-gain.png" });
  await page.clock.runFor(6000);
  await expect(page.locator("[data-level-final]")).toHaveAttribute(
    "data-level-final",
    "true",
  );
  const final = await page
    .locator("[data-level-stat]")
    .evaluateAll((rows) =>
      rows.every(
        (row) =>
          Number(row.querySelector("[data-level-value]")!.textContent) ===
          Number((row as HTMLElement).dataset.after),
      ),
    );
  expect(final).toBe(true);
  await expect(page.locator('[data-action="close-reward"]')).toBeEnabled();
  await page.clock.resume();
  await page.screenshot({ path: "artifacts/chapter1-v8/level-final.png" });
  await page.locator('[data-action="close-reward"]').click();
});
test("V8 fiche et équipement : cadre bois et parchemin", async ({ page }) => {
  const { a } = await adventure(page, "tracker", "male", true);
  await actions(page, a);
  await page.locator('[data-action="unit-sheet"]').click();
  await expect(page.locator(".unit-window")).toBeVisible();
  expect(
    await page
      .locator(".unit-window")
      .evaluate((el) => getComputedStyle(el).backgroundImage),
  ).toContain("combat-board-v5");
  await page.screenshot({ path: "artifacts/chapter1-v8/character-sheet.png" });
  await page.locator('[data-action="close-unit"]').click();
  await page.locator('[data-action="equipment"]').click();
  await expect(page.locator(".equipment-modal")).toBeVisible();
  await page.screenshot({ path: "artifacts/chapter1-v8/equipment.png" });
});
test("V8 succession : choisir un chef bloque les actions, conserve le cycle et persiste", async ({
  page,
}) => {
  await page.goto("/");
  const before = await page.evaluate(async () => {
    const E = await import(String("/src/engine.ts"));
    const s = E.createCampaign(["north", "knight"]);
    s.events = ["horde", "storm"];
    s.units.find((u: any) => u.id === "p1a")!.hp = 0;
    const ally = s.units.find((u: any) => u.id === "p1b")!;
    s.common = {
      round: 2,
      index: 0,
      queue: [
        ally.id,
        ...s.units
          .filter((u: any) => u.id !== ally.id && u.hp > 0)
          .map((u: any) => u.id),
      ],
    };
    E.visibility(s);
    localStorage.setItem("lte-save", E.encode(s));
    return s.common;
  });
  await page.reload();
  await page.locator('[data-action="continue"]').click();
  await expect(page.locator(".leader-choice")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator(".leader-choice")).toBeVisible();
  await page.locator('[data-action="choose-leader-p1b"]').click();
  await expect(page.locator(".leader-choice")).toHaveCount(0);
  const s = await saved(page);
  expect(s.common).toEqual(before);
  expect(s.units.find((u: any) => u.id === "p1b").leader).toBe(true);
  expect(s.units.find((u: any) => u.id === "p1a").leader).toBe(false);
});
test("V8 coopération préparée : menu verrouillé et dialogue privé caché à l'autre joueur", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(async () => {
    const E = await import(String("/src/engine.ts")),
      M = await import(String("/src/main.ts"));
    const s = E.createCampaign(["north", "knight"]);
    E.beginChapter1(s);
    M.applyCooperativeSnapshot(s, 2);
  });
  await expect(page.locator("#waiting-map")).toBeVisible();
  await expect(page.locator(".chapter-text")).toHaveCount(0);
  await expect(page.locator(".peer-reading")).toBeVisible();
  await page.evaluate(async () => {
    const E = await import(String("/src/engine.ts")),
      M = await import(String("/src/main.ts"));
    const s = E.createCampaign(["north", "knight"]);
    M.applyCooperativeSnapshot(s, 2);
  });
  await page.keyboard.press("Escape");
  await expect(page.locator(".pause-menu")).toBeVisible();
  await expect(page.locator('[data-action^="perspective-"]')).toHaveCount(0);
  await expect(page.locator('[data-action="observer"]')).toHaveCount(0);
});
test("V8 entrée : les deux chefs confirment sur la carte, puis dialogue et bilan final", async ({
  page,
}) => {
  await page.goto("/");
  await page.clock.install();
  await page.evaluate(async () => {
    const E = await import(String("/src/engine.ts"));
    const s = E.createCampaign(["north", "knight"]);
    s.chapter1 = {
      started: true,
      completed: [
        "arrival-1",
        "arrival-2",
        "ruins-1",
        "ruins-2",
        "waiting-1",
        "waiting-2",
        "meeting",
      ],
    };
    s.merged = true;
    s.events = ["storm", "horde"];
    for (const u of s.units) if (u.owner === 0) u.hp = 0;
    const a = s.units.find((u: any) => u.id === "p1a")!,
      b = s.units.find((u: any) => u.id === "p2a")!;
    Object.assign(a, { x: 31, y: 19 });
    Object.assign(b, { x: 31, y: 18 });
    s.common = {
      round: 1,
      index: 0,
      queue: [
        a.id,
        b.id,
        ...s.units
          .filter((u: any) => u.id !== a.id && u.id !== b.id)
          .map((u: any) => u.id),
      ],
    };
    s.players[0].camera = { x: 24, y: 13 };
    s.players[1].camera = { x: 24, y: 13 };
    E.visibility(s);
    localStorage.setItem("lte-save", E.encode(s));
  });
  await page.reload();
  await page.locator('[data-action="continue"]').click();
  await actions(page, { x: 31, y: 19 });
  await page.locator('[data-action="prepare-entry"]').click();
  await expect(page.locator(".chapter-dialogue")).toHaveCount(0);
  expect((await saved(page)).chapter1.prepared["1"]).toBe("p1a");
  await page.keyboard.press("Escape");
  await page.locator('[data-action="perspective-2"]').click();
  await actions(page, { x: 31, y: 18 });
  await page.locator('[data-action="prepare-entry"]').click();
  await expect(page.locator('[data-story-scene="alliance"]')).toBeVisible();
  await expect(page.locator("#chapter-overlay")).toHaveAttribute(
    "data-ready",
    "true",
  );
  await page.clock.install();
  for (
    let n = 0;
    n < 24 && (await page.locator(".chapter-dialogue").count());
    n++
  ) {
    await page.clock.fastForward(9000);
    await page.locator("[data-story-next]").click();
  }
  await expect(
    page.getByRole("heading", { name: "Prologue — Les Terres Égarées" }),
  ).toBeVisible();
  expect((await saved(page)).chapter1.complete).toBe(true);
});
test("V8 nouveau créateur : neuf cartes réelles, sélection FIFO, héros conservés et écran mobile", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.locator('[data-action="new"]').click();
  await page.locator('[data-action="creator-factions-ready"]').click();
  await expect(page.locator(".creator-party")).toHaveCount(2);
  await expect(page.locator(".north-party .companion-card")).toHaveCount(5);
  await expect(page.locator(".knight-party .companion-card")).toHaveCount(4);
  await page.locator("#hero-name-1").fill("Freydis");
  await page.locator("#hero-gender-1").selectOption("female");
  await page.locator("#hero-class-1").selectOption("nordic_blade");
  await expect(page.locator("#hero-name-1")).toHaveValue("Freydis");
  await expect(page.locator('[data-hero-display="0"]')).toHaveText("Freydis");
  await expect(page.locator('[data-creator-hero="0"]')).toHaveAttribute(
    "data-loaded",
    "true",
  );
  for (const n of [0, 1])
    await page.locator(`[data-action="creator-hero-ready-${n}"]`).click();
  for (const n of [0, 1])
    for (let i = 0; i < 2; i++)
      await page.locator(`[data-action="creator-intro-${n}"]`).click();
  await expect(
    page.locator('[data-creator-companion][data-loaded="true"]'),
  ).toHaveCount(9);
  await expect(
    page.locator(".knight-party .companion-cards"),
  ).not.toContainText("Sorcier");
  for (const id of ["astrid", "bryn", "solveig"])
    await page.locator(`[data-companion="0:${id}"]`).locator("..").click();
  await expect(page.locator('[data-companion="0:astrid"]')).not.toBeChecked();
  await expect(page.locator('[data-companion="0:bryn"]')).toBeChecked();
  await expect(page.locator('[data-companion="0:solveig"]')).toBeChecked();
  await expect(page.locator('[data-companion-count="0"]')).toHaveText(
    "2 / 2 choisis",
  );
  await page.locator('[data-companion="1:gaspard"]').locator("..").click();
  await page.locator('[data-companion="1:ysilde"]').locator("..").click();
  await expect(page.locator('[data-companion="1:gaspard"]')).not.toBeChecked();
  await expect(page.locator('[data-companion="1:ysilde"]')).toBeChecked();

  await page.screenshot({
    path: "artifacts/chapter1-v8/creator-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "artifacts/chapter1-v8/creator-mobile.png",
    fullPage: true,
  });
  for (const n of [0, 1])
    await page.locator(`[data-action="creator-party-ready-${n}"]`).click();
  await page.locator('[data-action="begin"]').click();
  await expect(page.locator(".chapter-dialogue")).toBeVisible();
  const s = await saved(page);
  expect(s.units.filter((u: any) => u.owner === 1)).toHaveLength(3);
  expect(s.units.filter((u: any) => u.owner === 2)).toHaveLength(2);
  expect(s.units.find((u: any) => u.id === "p1a")).toMatchObject({
    leader: true,
    name: "Freydis",
    gender: "female",
    classId: "nordic_blade",
  });
  expect(
    s.units.filter((u: any) => u.owner === 1).map((u: any) => u.name),
  ).toEqual(["Freydis", "Bryn", "Solveig"]);
  expect(errors).toEqual([]);
});
