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
      Number(c.dataset.viewCols) > 0
    );
  });
  const point = await page.locator("#map").evaluate(
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
  await page.mouse.click(point.x, point.y);
}
async function setup(page: Page, cls: string, foe = false) {
  await page.goto("/");
  const units = await page.evaluate(
    async ({ cls, foe }) => {
      const E = await import(String("/src/engine.ts"));
      const { createSandbox, trainingUnit } = await import(
        String("/src/game/sandbox.ts")
      );
      const s = createSandbox();
      s.mapRevision = E.MAP_REVISION;
      const a = trainingUnit(s, cls),
        b = trainingUnit(s, "raider", 1, 1, foe ? 0 : 1);
      a.gender = "female";
      a.name = "Héroïne des terres égarées";
      b.name = "Guerrier ennemi au nom particulièrement long";
      const c = E.map.find(
        (c: any) =>
          c.walk &&
          c.x >= 20 &&
          c.x < 25 &&
          c.y >= 15 &&
          E.cell(c.x + 1, c.y)?.walk,
      )!;
      Object.assign(a, { x: c.x, y: c.y });
      Object.assign(b, { x: c.x + 1, y: c.y, hp: Math.max(1, b.maxHp - 20) });
      if (!foe) {
        const focus = a.carriedWeapons?.find(
          (id: string) => E.weaponCatalog[id].category === "healing",
        );
        if (focus) {
          a.activeWeaponId = focus;
          E.syncWeapon(a);
        }
      }
      s.common.queue = [a.id, b.id];
      s.active = 1;
      s.players.forEach((p: any) => {
        p.camera = { x: c.x - 6, y: c.y - 4 };
        p.visible = E.map.map((_: any, i: number) => i);
        p.explored = p.visible;
      });
      localStorage.setItem("lte-save", E.encode(s));
      localStorage.setItem("lte-speed", "1");
      return [a, b];
    },
    { cls, foe },
  );
  await page.reload();
  await page.locator('[data-action="continue"]').click();
  await expect(page.locator("#map")).toBeVisible();
  await page.waitForFunction(
    () =>
      Number(
        document.querySelector<HTMLCanvasElement>("#map")?.dataset.viewCols,
      ) > 0,
  );
  return units;
}
for (const cls of ["shaman", "sorcerer"])
  test(`V4 ${cls} féminine : soin sur la carte, rendu et PV réellement restaurés`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    const [a, b] = await setup(page, cls);
    await clickCell(page, a.x, a.y);
    await clickCell(page, a.x, a.y);
    await page.locator('[data-action="skill-heal"]').click();
    await clickCell(page, b.x, b.y);
    await expect(page.locator("#unit-actions")).toBeHidden();
    await page.waitForTimeout(450);
    await page.screenshot({
      path: `artifacts/combat-v4/${cls}-female-map-heal.png`,
    });
    await expect
      .poll(() =>
        page.evaluate(() => {
          const s = JSON.parse(localStorage.getItem("lte-save")!);
          return s.units[1].hp;
        }),
      )
      .toBeGreaterThan(b.hp);
    expect(errors).toEqual([]);
    await expect(
      page.getByText("sprite indisponible", { exact: false }),
    ).toHaveCount(0);
  });
test("V4 prévision : noms longs, triangle réel, colonnes alignées et cadrage mobile", async ({
  page,
}) => {
  const [a, b] = await setup(page, "man_at_arms", true);
  await clickCell(page, a.x, a.y);
  await clickCell(page, b.x, b.y);
  await expect(page.locator(".fe-forecast")).toBeVisible();
  for (const size of [
    { width: 1440, height: 1000 },
    { width: 390, height: 844 },
    { width: 844, height: 390 },
  ]) {
    await page.setViewportSize(size);
    const result = await page.locator(".fe-forecast").evaluate((e) => {
      const b = e.getBoundingClientRect();
      return {
        x: b.x,
        y: b.y,
        right: b.right,
        bottom: b.bottom,
        overflow: e.scrollWidth > e.clientWidth,
      };
    });
    expect(result.x).toBeGreaterThanOrEqual(0);
    expect(result.y).toBeGreaterThanOrEqual(0);
    expect(result.right).toBeLessThanOrEqual(size.width);
    expect(result.bottom).toBeLessThanOrEqual(size.height);
    expect(result.overflow).toBe(false);
    await expect(page.locator(".fe-names header strong").last()).toHaveText(
      b.name,
    );
    await expect(page.locator(".fe-stat-grid>span")).toHaveText([
      "PV",
      "Dégâts",
      "Précision",
      "Critique",
    ]);
    await page.screenshot({
      path: `artifacts/combat-v4/forecast-${size.width}.png`,
    });
  }
  const arrows = await page.locator(".weapon-triangle").allTextContents();
  expect(arrows).toEqual(["▲", "▼"]);
});
test("V4 comparateur : transformation féminine, bandages et pavois après déplacement accessibles", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(async () => {
    const { openCombatComparator } = await import(
      String("/src/dev/combat-comparator.ts")
    );
    openCombatComparator(document.querySelector("#app")!, () => {});
  });
  for (const [cls, action, expected] of [
    ["hamrammr", "transform", '"bear":true'],
    ["clan_healer", "bandage", '"restored":'],
    ["pavise_crossbowman", "fortify-move", '"afterMove":false'],
    ["archmage", "area", '"ability":"area"'],
    ["mounted_spearman", "charge", '"charge":3'],
  ]) {
    await page.locator("#compare-class").selectOption(cls);
    await expect(page.locator("[data-compare-play]")).toBeEnabled();
    const female = await page
      .locator("#compare-skin option")
      .evaluateAll((options) =>
        options
          .map((o) => (o as HTMLOptionElement).value)
          .find((v) => v.includes(":female:") && v.endsWith(":default")),
      );
    if (female) {
      await page.locator("#compare-skin").selectOption(female);
      await expect(page.locator("[data-compare-play]")).toBeEnabled();
    }
    await page.locator("#compare-action").selectOption(action);
    await expect(page.locator("#compare-status")).toContainText(expected);
    await page.locator("[data-compare-play]").click();
    await page.locator("#compare-progress").fill("800");
    await page.screenshot({
      path: `artifacts/combat-v4/capability-${cls}.png`,
    });
  }
  expect(
    await page.evaluate(() => localStorage.getItem("lte-save")),
  ).toBeNull();
});
test("V4 : images du duel conservées malgré l’éviction du cache de palettes", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const { CombatSceneV2 } = await import(String("/src/ui/combat-v2.ts"));
    const { createSandbox, trainingUnit } = await import(
      String("/src/game/sandbox.ts")
    );
    const { spriteCatalog, spriteImage } = await import(
      String("/src/sprites/resources.ts")
    );
    const { resolveClip } = await import(String("/src/sprites/catalog.ts"));
    const { recoloredImage } = await import(String("/src/sprites/recolor.ts"));
    const s = createSandbox(),
      a = trainingUnit(s, "guard_knight"),
      b = trainingUnit(s, "raider", 1, 1, 0);
    const scene = new CombatSceneV2(
      [a, b],
      [
        {
          attacker: a.id,
          defender: b.id,
          damage: 6,
          hpAfter: b.hp - 6,
          hit: true,
          blocked: false,
        },
      ],
    );
    await scene.prepare();
    const c = document.createElement("canvas");
    c.width = 960;
    c.height = 600;
    const ctx = c.getContext("2d")!;
    const at = scene.timeline.beats[0].at + 20;
    function render() {
      ctx.clearRect(0, 0, 960, 600);
      scene.resetPresentation();
      scene.draw(ctx, at);
      return c.toDataURL();
    }
    const before = render(),
      held = [...scene.actors[0].preparedSources.values()];
    for (const p of spriteCatalog.profiles.slice(0, 12)) {
      const clip = resolveClip(p, "idle");
      if (!clip) continue;
      const im = spriteImage(clip.source);
      await im.decode();
      for (const color of [
        "blue",
        "yellow",
        "red",
        "pink",
        "white",
        "black",
      ] as const)
        recoloredImage(
          im,
          color,
          clip.recolorEdges,
          clip.recolor === "blue" ? 215 : undefined,
        );
    }
    return {
      same: before === render(),
      held: held.length,
      preserved: held.every(
        (im, i) => im === [...scene.actors[0].preparedSources.values()][i],
      ),
    };
  });
  expect(result.held).toBeGreaterThan(0);
  expect(result.preserved).toBe(true);
  expect(result.same).toBe(true);
});
