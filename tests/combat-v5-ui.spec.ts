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
) {
  await page.goto("/");
  const result = await page.evaluate(
    async ({ cls, gender, foeAdjacent, enemyDistance }) => {
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
      a.leader = true; ally.leader = true;
      a.xp = 95;
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
      s.common = { round: 1, index: 0, queue: [a.id, ally.id, enemy.id] };
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
    { cls, gender, foeAdjacent, enemyDistance },
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
for (const cls of ["shaman", "sorcerer", "clan_healer", "archmage"])
  test(`V5 Aventure réelle : ${cls} soigne, gagne de l’XP et présente son niveau`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    const { a, ally } = await adventure(
      page,
      cls,
      cls === "archmage" ? "male" : "female",
    );
    await actions(page, a);
    await page.locator('[data-action="skill-heal"]').click();
    await clickCell(page, ally.x, ally.y);

    await expect(page.locator(".healing-reward")).toBeVisible();
    await expect(page.locator(".restored-hp")).toContainText("+5 PV");
    await expect(page.locator("[data-xp-level]")).toHaveText("Niveau 1");
    await expect
      .poll(() => page.locator("[data-xp-value]").textContent())
      .not.toBe("95 / 100 EXP");
    await expect(page.locator("[data-xp-level]")).toHaveText("Niveau 2");
    await page.screenshot({ path: `artifacts/combat-v5/heal-${cls}.png` });
    await page.locator('[data-action="close-reward"]').click();
    if (await page.getByRole("heading", { name: "Niveau supérieur" }).count())
      await page.locator('[data-action="close-reward"]').click();
    const s = await saved(page);
    expect(s.units.find((u: any) => u.id === a.id).level).toBe(2);
    expect(s.units.find((u: any) => u.id === ally.id).hp).toBeGreaterThan(
      ally.hp,
    );
    expect(s.sandbox).toBeUndefined();
    expect(errors).toEqual([]);
  });
test("V5 Aventure : hache du Traqueur adjacente, prévision bois étroite et cinématique sans défilement", async ({
  page,
}) => {
  const { a, enemy } = await adventure(page, "tracker", "male", true);
  await actions(page, a);
  await page.locator('[data-action="quick-weapon-axe"]').click();
  await expect(page.locator('[data-action="attack-mode"]')).toBeVisible();
  await page.locator('[data-action="attack-mode"]').click();
  await clickCell(page, enemy.x, enemy.y);
  const r = await page.locator(".fe-forecast").boundingBox();
  expect(r!.width).toBeLessThanOrEqual(180);
  await page.screenshot({ path: "artifacts/combat-v5/forecast-wood.png" });
  await page.locator('[data-action^="confirm-attack-"]').click();
  await expect(page.locator(".combat-screen")).toBeVisible();
  await page.evaluate(() => {
    const w = window as any;
    w.hpSamples = [];
    w.hpSampling = setInterval(() => {
      for (const n of Array.from(
        document.querySelectorAll<HTMLElement>('[id^="value-"][data-shown]'),
      ))
        w.hpSamples.push({
          id: n.id,
          shown: Number(n.dataset.shown),
          text: n.textContent,
        });
    }, 20);
  });
  for (const viewport of [
    { width: 1920, height: 1080 },
    { width: 1366, height: 768 },
    { width: 1024, height: 600 },
    { width: 844, height: 390 },
  ]) {
    await page.setViewportSize(viewport);
    const rect = await page.locator(".duel-panels").boundingBox();
    const canvasRect = await page.locator("#combat").boundingBox();
    expect(canvasRect!.width / canvasRect!.height).toBeGreaterThanOrEqual(1.59);
    const scales = await page
      .locator("#combat")
      .evaluate((c: HTMLCanvasElement) => {
        const b = c.getBoundingClientRect();
        return { x: b.width / c.width, y: b.height / c.height };
      });
    expect(Math.abs(scales.x - scales.y)).toBeLessThan(0.01);
    expect(rect!.y).toBeGreaterThanOrEqual(0);
    expect(rect!.y + rect!.height).toBeLessThanOrEqual(viewport.height);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollHeight <= innerHeight + 1,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `artifacts/combat-v5/battle-${viewport.width}.png`,
    });
  }
  await expect(page.locator(".compact-rewards")).toBeVisible();
  await expect(page.locator(".compact-rewards")).not.toContainText("PV");
  const samples = await page.evaluate(() => {
    const w = window as any;
    clearInterval(w.hpSampling);
    return w.hpSamples as { shown: number; text: string }[];
  });
  expect(
    samples.some((n) => Math.abs(n.shown - Math.round(n.shown)) > 0.05),
  ).toBe(true);
  for (const n of samples)
    expect(Number(n.text.split("/")[0].trim())).toBe(Math.round(n.shown));
  await page.screenshot({ path: "artifacts/combat-v5/rewards-wood.png" });
});
for (const [cls, action, field] of [
  ["pavise_crossbowman", "skill-fortify", "fortified"],
  ["standard_bearer", "skill-banner", "bannerPlanted"],
  ["hamrammr", "skill-transform", "bearForm"],
])
  test(`V5 Aventure réelle : ${cls} applique sa capacité et son nouveau visuel`, async ({
    page,
  }) => {
    const { a } = await adventure(page, cls);
    await actions(page, a);
    await page.locator(`[data-action="${action}"]`).click();
    await expect
      .poll(async () => {
        const s = await saved(page);
        return s.units.find((u: any) => u.id === a.id)[field];
      })
      .toBe(true);
    await page.screenshot({ path: `artifacts/combat-v5/adventure-${cls}.png` });
    if (cls === "standard_bearer")
      expect((await saved(page)).banners.length).toBe(1);
    if (cls === "hamrammr") {
      const old = await saved(page);
      old.common.index = old.common.queue.indexOf(a.id);
      delete old.committedMove;
      old.active = 1;
      await page.keyboard.press("Escape");
      await page.locator('[data-action="title"]').click();
      await page.evaluate((s) => {
        localStorage.setItem("lte-save", JSON.stringify(s));
      }, old);
      await page.locator('[data-action="continue"]').click();
      await actions(page, a);
      await page.locator('[data-action="skill-transform"]').click();
      await expect
        .poll(async () => {
          const s = await saved(page);
          return s.units.find((u: any) => u.id === a.id).bearForm;
        })
        .toBe(false);
      expect(
        (await saved(page)).units.find((u: any) => u.id === a.id).gender,
      ).toBe("female");
    }
  });
test("V5 Aventure réelle : invocation visible, unité temporaire et initiative commune", async ({
  page,
}) => {
  const { a } = await adventure(page, "necromancer");
  await actions(page, a);
  await page.locator('[data-action="skill-summon"]').click();
  await clickCell(page, a.x - 1, a.y);
  await expect
    .poll(async () => {
      const s = await saved(page);
      return s.units.filter((u: any) => u.summonedBy === a.id).length;
    })
    .toBe(1);
  const s = await saved(page);
  expect(s.common.queue).toContain(
    s.units.find((u: any) => u.summonedBy === a.id).id,
  );
  await page.screenshot({ path: "artifacts/combat-v5/adventure-summon.png" });
});

async function nextFixtureTurn(page: Page, id: string) {
  const s = await saved(page);
  s.common.index = s.common.queue.indexOf(id);
  s.active = 1;
  delete s.committedMove;
  await page.keyboard.press("Escape");
  await page.locator('[data-action="title"]').click();
  await page.evaluate(
    (s) => localStorage.setItem("lte-save", JSON.stringify(s)),
    s,
  );
  await page.locator('[data-action="continue"]').click();
}
test("V5 Aventure : le pavois perd réellement sa protection après déplacement", async ({
  page,
}) => {
  const { a } = await adventure(page, "pavise_crossbowman");
  await actions(page, a);
  await page.locator('[data-action="skill-fortify"]').click();
  await expect
    .poll(
      async () =>
        (await saved(page)).units.find((u: any) => u.id === a.id).fortified,
    )
    .toBe(true);
  await nextFixtureTurn(page, a.id);
  await clickCell(page, a.x, a.y);
  await clickCell(page, a.x - 1, a.y);
  await expect(page.locator("#unit-actions")).toBeVisible();
  await page.locator('[data-action="wait"]').click();
  await expect
    .poll(
      async () =>
        (await saved(page)).units.find((u: any) => u.id === a.id).fortified,
    )
    .toBe(false);
});
test("V5 Aventure : charge montée après trois cases, bonus réel en prévision", async ({
  page,
}) => {
  const { a, enemy } = await adventure(
    page,
    "mounted_spearman",
    "female",
    false,
    4,
  );
  const expected = await page.evaluate(
    async ({ id, x, y }) => {
      const E = await import(String("/src/engine.ts"));
      const s = E.decode(localStorage.getItem("lte-save")!);
      const a = s.units.find((u: any) => u.id === id)!;
      E.move(s, a, x, y);
      const b = s.units.find((u: any) => u.owner === 0)!;
      const p = E.forecast(a, b, s);
      return { damage: p.damage, charge: p.charge };
    },
    { id: a.id, x: a.x + 3, y: a.y },
  );
  expect(expected.charge).toBe(3);
  await clickCell(page, a.x, a.y);
  await clickCell(page, a.x + 3, a.y);
  await expect(page.locator("#unit-actions")).toBeVisible();
  await page.locator('[data-action="attack-mode"]').click();
  await clickCell(page, enemy.x, enemy.y);
  await expect(page.locator(".fe-stat-grid>b").nth(2)).toContainText(
    String(expected.damage),
  );
  await page.locator('[data-action^="confirm-attack-"]').click();
  await expect(page.locator(".combat-screen")).toBeVisible();
  await page.screenshot({ path: "artifacts/combat-v5/adventure-charge.png" });
  await expect(page.locator(".compact-rewards")).toBeVisible();
});
test("V5 Aventure : l'Archimage lance sa zone et le moteur épargne les alliés", async ({
  page,
}) => {
  const { a, ally, enemy } = await adventure(page, "archmage");
  await actions(page, a);
  await page.locator('[data-action="skill-area"]').click();
  await clickCell(page, enemy.x, enemy.y);
  await page.locator('[data-action^="confirm-area-"]').click();
  await expect(page.locator(".combat-screen")).toBeVisible();
  await expect(page.locator(".compact-rewards")).toBeVisible();
  await page.locator('[data-action="close-reward"]').click();
  const s = await saved(page);
  expect(s.units.find((u: any) => u.id === ally.id).hp).toBe(ally.hp);
  expect(s.units.find((u: any) => u.id === enemy.id).hp).toBeLessThan(enemy.hp);
});

test("V5 aperçu d’esquive : retrait visible et coordonnées finies des deux côtés", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const { CombatSceneV2 } = await import(String("/src/ui/combat-v2.ts"));
    const { spriteCatalog } = await import(String("/src/sprites/resources.ts"));
    const { makeComparisonActor } = await import(
      String("/src/dev/combat-comparator.ts")
    );
    const a = makeComparisonActor(
      spriteCatalog.profiles.find(
        (p: any) => p.classId === "man_at_arms" && p.gender === "male",
      )!,
      "a",
      1,
    );
    const b = makeComparisonActor(
      spriteCatalog.profiles.find(
        (p: any) =>
          p.classId === "raider" &&
          p.gender === "female" &&
          p.equipment === "axe-shield",
      )!,
      "b",
      0,
    );
    const scene = new CombatSceneV2([a, b], []);
    await scene.prepare();
    const canvas = document.createElement("canvas");
    canvas.width = 960;
    canvas.height = 600;
    return [a, b].map((actor) => {
      scene.preview = { actorId: actor.id, animation: "evade", duration: 1200 };
      scene.draw(canvas.getContext("2d")!, 0);
      const start = scene.lastFrames.find(
        (f: { actorId: string; feetX: number }) => f.actorId === actor.id,
      )!.feetX;
      scene.draw(canvas.getContext("2d")!, 600);
      const middle = scene.lastFrames.find(
        (f: { actorId: string; feetX: number }) => f.actorId === actor.id,
      )!.feetX;
      return { start, middle };
    });
  });
  for (const r of result) {
    expect(Number.isFinite(r.middle)).toBe(true);
    expect(Math.abs(r.middle - r.start)).toBeGreaterThan(20);
  }
});
