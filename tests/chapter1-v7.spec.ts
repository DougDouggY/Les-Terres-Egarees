import { test, expect, type Page } from "@playwright/test";
async function setup(page: Page, scene = "arrival", line = 0) {
  await page.goto("/");
  await page.clock.install();
  const result = await page.evaluate(
    async ({ scene, line }) => {
      const E = await import(String("/src/engine.ts"));
      const s = E.createCampaign(["north", "knight"]);
      const chief = s.units.find((u: any) => u.id === "p1a")!,
        other = s.units.find((u: any) => u.id === "p2a")!;
      s.common = {
        round: 1,
        index: 0,
        queue: [
          chief.id,
          other.id,
          ...s.units
            .filter((u: any) => u.id !== chief.id && u.id !== other.id)
            .map((u: any) => u.id),
        ],
      };
      s.events = ["storm", "horde"];
      if (scene === "arrival") E.beginChapter1(s);
      else {
        s.chapter1 = { started: true, completed: ["arrival-1", "arrival-2"] };
        if (scene === "meeting" || scene === "alliance")
          s.chapter1.completed.push("ruins-1", "ruins-2");
        if (scene === "alliance") {
          s.chapter1.completed.push("meeting");
          s.merged = true;
          for (const u of s.units) if (u.owner === 0) u.hp = 0;
          E.checkEnd(s);
        } else E.queueChapterScene(s, scene as any, 1);
        s.chapter1!.pending!.page = line;
        s.scenePage = line;
      }
      E.visibility(s);
      localStorage.setItem("lte-save", E.encode(s));
      return {
        queue: s.common,
        units: s.units.map((u: any) => ({
          id: u.id,
          hp: u.hp,
          x: u.x,
          y: u.y,
        })),
        players: s.players,
      };
    },
    { scene, line },
  );
  await page.reload();
  await page.locator('[data-action="continue"]').click();
  await expect(page.locator("#chapter-overlay")).toHaveAttribute(
    "data-ready",
    "true",
  );
  return result;
}
async function next(page: Page) {
  await expect(page.locator("#chapter-overlay")).toHaveAttribute(
    "data-ready",
    "true",
  );
  await page.clock.fastForward(7500);
  await page.locator("[data-story-next]").click();
}
async function finishScene(page: Page, scene: string) {
  for (let n = 0; n < 30; n++) {
    if ((await page.locator(`[data-story-scene="${scene}"]`).count()) === 0)
      return;
    await next(page);
  }
  throw Error("Scène non terminée");
}
async function saved(page: Page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem("lte-save")!));
}
test("V7 arrivées : dialogues des deux groupes, clavier bloqué et reprise à la réplique", async ({
  page,
}) => {
  const before = await setup(page);
  await expect(page.locator(".chapter-speaker")).toHaveText("Eirik");
  const initial = await page.locator(".chapter-text").textContent();
  expect(initial!.length).toBeLessThan(100);
  await page.keyboard.press("Escape");
  await page.keyboard.press("Tab");
  await page.keyboard.press("ArrowRight");
  await expect(page.locator(".pause-menu")).toHaveCount(0);
  await expect(page.locator('[data-story-scene="arrival-1"]')).toBeVisible();
  await next(page);
  expect((await saved(page)).chapter1.pending.page).toBe(1);
  await page.reload();
  await page.locator('[data-action="continue"]').click();
  await expect(page.locator('[data-story-line="1"]')).toBeVisible();
  await expect(page.locator("#chapter-overlay")).toHaveAttribute(
    "data-ready",
    "true",
  );
  await page.clock.fastForward(1000);
  await page.screenshot({ path: "artifacts/chapter1-v7/arrival.png" });
  await finishScene(page, "arrival-1");
  await expect(page.locator('[data-story-scene="arrival-2"]')).toBeVisible();
  await page.clock.fastForward(7500);
  await expect(page.locator(".chapter-text")).toContainText("convoi");
  await finishScene(page, "arrival-2");
  await expect(page.locator("#map")).toBeVisible();
  const s = await saved(page);
  expect(s.common).toEqual(before.queue);
  expect(
    s.units.map((u: any) => ({ id: u.id, hp: u.hp, x: u.x, y: u.y })),
  ).toEqual(before.units);
});
test("V7 découverte sur la carte : neuf cases temporaires, brume privée et activation préservée", async ({
  page,
}) => {
  await page.goto("/");
  await page.clock.install();
  const data = await page.evaluate(async () => {
    const E = await import(String("/src/engine.ts"));
    const s = E.createCampaign(["north", "knight"]);
    s.chapter1 = { started: true, completed: ["arrival-1", "arrival-2"] };
    const dist = (c: any) =>
      Math.max(30 - c.x, 0, c.x - 32) + Math.max(16 - c.y, 0, c.y - 18);
    let from: any, to: any;
    for (const c of E.map) {
      if (!c.walk || c.y < 10 || c.y > 25 || dist(c) !== 16) continue;
      const n = [
        [1, 0],
        [0, 1],
        [-1, 0],
        [0, -1],
      ]
        .map(([dx, dy]) => E.cell(c.x + dx, c.y + dy))
        .find(
          (d) => d?.walk && d.cost <= 5 && dist(d) === 15 && !E.at(s, d.x, d.y),
        );
      if (n && !E.at(s, c.x, c.y)) {
        from = c;
        to = n;
        break;
      }
    }
    const a = s.units.find((u: any) => u.id === "p1a")!;
    a.x = from.x;
    a.y = from.y;
    s.common = {
      round: 1,
      index: 0,
      queue: [
        a.id,
        ...s.units.filter((u: any) => u.id !== a.id).map((u: any) => u.id),
      ],
    };
    s.players[0].camera = { x: a.x - 5, y: a.y - 4 };
    E.visibility(s);
    localStorage.setItem("lte-save", E.encode(s));
    return { a, to, other: s.players[1], queue: s.common };
  });
  await page.reload();
  await page.locator('[data-action="continue"]').click();
  const click = async (x: number, y: number) => {
    await page.waitForFunction(
      () =>
        Number(
          document.querySelector<HTMLCanvasElement>("#map")?.dataset.viewCols,
        ) > 0,
    );
    const p = await page.locator("#map").evaluate(
      (c: HTMLCanvasElement, { x, y }) => {
        const b = c.getBoundingClientRect();
        return {
          x:
            b.x +
            ((x + 0.5 - Number(c.dataset.cameraX)) /
              Number(c.dataset.viewCols)) *
              b.width,
          y:
            b.y +
            ((y + 0.5 - Number(c.dataset.cameraY)) /
              Number(c.dataset.viewRows)) *
              b.height,
        };
      },
      { x, y },
    );
    await page.mouse.click(p.x, p.y);
  };
  await click(data.a.x, data.a.y);
  await click(data.to.x, data.to.y);
  await expect(page.locator('[data-story-scene="ruins-1"]')).toBeVisible();
  await expect(page.locator("#chapter-overlay")).toHaveAttribute(
    "data-ready",
    "true",
  );
  await page.clock.fastForward(1400);
  await expect(page.locator("#story-map")).toHaveAttribute(
    "data-story-reveal",
    "9",
  );
  await page.screenshot({ path: "artifacts/chapter1-v7/ruins-reveal.png" });
  const during = await saved(page);
  expect(during.players[1]).toEqual(data.other);
  expect(during.common).toEqual(data.queue);
  const logical = await page.evaluate(async () => {
    const E = await import(String("/src/engine.ts"));
    const s = E.decode(localStorage.getItem("lte-save")!);
    const before = s.players.map((p: any) => p.visible);
    E.visibility(s);
    return (
      JSON.stringify(before) ===
      JSON.stringify(s.players.map((p: any) => p.visible))
    );
  });
  expect(logical).toBe(true);
  await finishScene(page, "ruins-1");
  await expect(page.locator("#map")).toBeVisible();
  const after = await saved(page);
  expect(after.common).toEqual(data.queue);
  expect(after.committedMove).toBe(data.a.id);
  expect(after.chapter1.completed).not.toContain("ruins-2");
});
test("V7 sauvetage : sprites éphémères, impact visible et fusion unique sans tour dépensé", async ({
  page,
}) => {
  const before = await setup(page, "meeting", 2);
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 50));
  await page.clock.runFor(900);
  await expect(page.locator("#story-map")).toHaveAttribute(
    "data-story-actors",
    /chapter-ambush/,
  );
  await expect(page.locator("[data-story-next]")).toBeDisabled();
  await page.keyboard.press("Space");
  expect((await saved(page)).chapter1.pending.page).toBe(2);
  await page.screenshot({ path: "artifacts/chapter1-v7/rescue-impact.png" });
  await page.clock.resume();
  await finishScene(page, "meeting");
  await expect(page.locator("#map")).toBeVisible();
  const s = await saved(page);
  expect(s.merged).toBe(true);
  expect(s.common.round).toBe(before.queue.round);
  expect(s.common.index).toBe(before.queue.index);
  expect(s.common.queue[0]).toBe(before.queue.queue[0]);
  expect(
    s.units.filter((u: any) => u.id.startsWith("sanctuary-")),
  ).toHaveLength(2);
  for (const u of before.units)
    expect(s.units.find((v: any) => v.id === u.id)).toMatchObject(u);
  expect(
    s.units.some(
      (u: any) => u.id === "chapter-ambush" || u.id === "chapter-witch",
    ),
  ).toBe(false);
});
test("V7 victoire : alliance et sorcière sans coupure, départ et sauvegarde de fin", async ({
  page,
}) => {
  const before = await setup(page, "alliance");
  await page
    .locator("#story-map")
    .evaluate((c) => (c.dataset.continuous = "yes"));
  for (let n = 0; n < 6; n++) await next(page);
  await expect(page.locator(".chapter-speaker")).toHaveText("???");
  expect((await saved(page)).chapter1.allied).toBe(true);
  await expect(page.locator("#story-map")).toHaveAttribute(
    "data-continuous",
    "yes",
  );
  await next(page);
  await next(page);
  await expect(page.locator(".chapter-speaker")).toHaveText("La sorcière");
  await page.clock.fastForward(1800);
  await page.screenshot({ path: "artifacts/chapter1-v7/witch.png" });
  await finishScene(page, "alliance");
  await expect(
    page.getByRole("heading", { name: "Chapitre I — Hors des ruines" }),
  ).toBeVisible();
  const s = await saved(page);
  expect(s.chapter1.complete).toBe(true);
  expect(s.chapter1.guideMet).toBe(true);
  expect(s.units).toHaveLength(before.units.length);
  expect(s.common).toEqual(before.queue);
  await page.screenshot({
    path: "artifacts/chapter1-v7/departure-summary.png",
  });
  await page.locator('[data-action="title"]').click();
  await page.locator('[data-action="continue"]').click();
  await expect(page.locator(".chapter-dialogue")).toHaveCount(0);
});
test("V7 initiative : Chasseur et Chasseresse à la même échelle que les autres piétons", async ({
  page,
}) => {
  await page.goto("/");
  const bounds = await page.evaluate(async () => {
    const E = await import(String("/src/engine.ts"));
    const { initiativeMarkup, bindInitiative } = await import(
      String("/src/ui/initiative-strip.ts")
    );
    const { warmSprites } = await import(String("/src/sprites/resources.ts"));
    const s = E.createCampaign(["north", "knight"]);
    const a = s.units.find((u: any) => u.id === "p1a")!,
      female = s.units.find((u: any) => u.classId === "hunter")!;
    const male = E.makeClassUnit(
      "male-hunter",
      1,
      1,
      "hunter",
      "Chasseur",
      12,
      12,
      "male",
    );
    s.units.push(male);
    s.common.queue.push(male.id);
    s.players[0].visible = E.map.map((_: any, i: number) => i);
    await warmSprites([a, female, male], s.teamColors, ["idle"]);
    const app = document.querySelector("#app")!;
    app.innerHTML = initiativeMarkup(s);
    bindInitiative(app, s, () => {});
    return [a, female, male].map((u) => {
      const c = app.querySelector<HTMLCanvasElement>(
        `[data-initiative="${u.id}"]`,
      )!;
      const d = c.getContext("2d")!.getImageData(0, 0, 64, 64).data;
      let min = 64,
        max = 0;
      for (let y = 0; y < 64; y++)
        for (let x = 0; x < 64; x++)
          if (d[(y * 64 + x) * 4 + 3] > 100) {
            min = Math.min(min, y);
            max = Math.max(max, y);
          }
      return max - min;
    });
  });
  expect(Math.max(...bounds) - Math.min(...bounds)).toBeLessThanOrEqual(8);
  expect(Math.min(...bounds)).toBeGreaterThan(30);
});
