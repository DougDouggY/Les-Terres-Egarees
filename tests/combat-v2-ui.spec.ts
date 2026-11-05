import { test, expect } from "@playwright/test";
async function open(page: any) {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Tests de combat", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "Comparer toutes les animations",
      exact: true,
    })
    .click();
  await expect(page.locator("[data-compare-play]")).toBeEnabled();
  await expect(page.locator("#compare-canvas")).toHaveAttribute(
    "data-ready",
    "true",
  );
}
test("V2 : scénarios, skins stables, ralenti, miroir, diagnostic et nouvelle galerie", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await open(page);
  await page.locator("#compare-class").selectOption("royal_guard");
  await expect(page.locator("[data-compare-play]")).toBeEnabled();
  await page.locator("#compare-scenario").selectOption("parry");
  await expect(page.locator("[data-compare-play]")).toBeEnabled();
  await expect(page.locator("#compare-canvas")).toHaveAttribute(
    "data-skin-ids",
    /royal_guard/,
  );
  const id = await page
    .locator("#compare-canvas")
    .getAttribute("data-skin-ids");
  for (const point of ["0", "350", "580", "790", "920"]) {
    await page.locator("#compare-progress").fill(point);
    await page.waitForTimeout(50);
    await expect(page.locator("#compare-canvas")).toHaveAttribute(
      "data-skin-ids",
      id!,
    );
  }
  await page.locator("#compare-speed").selectOption("0.2");
  await page.locator("#compare-mirror").check();
  await page.locator("#compare-anchors").check();
  await expect(page.locator("#compare-diagnostic")).toContainText(
    "royal_guard:any:lance-shield:default",
  );
  await page.screenshot({ path: "artifacts/combat-v2/royal-parry.png" });
  const download = page.waitForEvent("download");
  await page.locator("[data-compare-export]").click();
  expect((await download).suggestedFilename()).toContain("combat-v2");
  await page.locator("#compare-class").selectOption("duelist");
  await expect(page.locator("[data-compare-play]")).toBeEnabled();
  await page.locator("#compare-scenario").selectOption("four");
  await expect(page.locator("[data-compare-play]")).toBeEnabled();
  await page.locator("#compare-progress").fill("349");
  await expect(page.locator("#compare-diagnostic")).toContainText(
    '"duration": 2240',
  );
  await page.screenshot({ path: "artifacts/combat-v2/dual-weapons.png" });
  expect(
    await page.evaluate(() => localStorage.getItem("lte-save")),
  ).toBeNull();
  expect(errors).toEqual([]);
});
test("V2 : impacts consommés une seule fois, montures à l’échelle commune de 70 % et aucun remplacement de skin", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const { CombatSceneV2 } = await import(String("/src/ui/combat-v2.ts")),
      { createSandbox, trainingUnit } = await import(
        String("/src/game/sandbox.ts")
      );
    const s = createSandbox(),
      a = trainingUnit(s, "cavalry"),
      b = trainingUnit(s, "man_at_arms", 1, 1, 0),
      strikes = [
        {
          attacker: a.id,
          defender: b.id,
          damage: 6,
          hpAfter: b.hp - 6,
          hit: true,
          blocked: false,
        },
      ];
    const scene = new CombatSceneV2([a, b], strikes);
    await scene.prepare();
    const c = document.createElement("canvas");
    c.width = 960;
    c.height = 600;
    let impacts = 0;
    for (const t of [0, 400, 725, 800, 900, 1250, 1400])
      scene.draw(c.getContext("2d")!, t, () => impacts++);
    const d = scene.diagnosticJSON();
    return {
      impacts,
      heights: d.actors.map((a: any) => a.height),
      originalHp: b.hp,
      actorHp: scene.actors[1].unit.hp,
      strikes,
      frames: scene.lastFrames,
    };
  });
  expect(result.impacts).toBe(1);
  expect(result.heights[0] / result.heights[1]).toBeCloseTo(1.4);
  expect(result.originalHp - result.actorHp).toBe(6);
  for (const f of result.frames as any[]) {
    expect(f.y).toBeGreaterThanOrEqual(-2);
    expect(f.y + f.height).toBeLessThanOrEqual(600);
  }
});

test("V3 : tous les atlas bleus suivent les couleurs d’équipe sans rester bleus côté ennemi", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const { spriteCatalog, spriteImage, drawResourceFrame } = await import(
      String("/src/sprites/resources.ts")
    );
    const { combatSkin } = await import(String("/src/sprites/combat-skins.ts"));
    const { resolveClip } = await import(String("/src/sprites/catalog.ts"));
    const sources = new Map<string, any>();
    for (const p of spriteCatalog.profiles) {
      const profile = combatSkin(p)!.profile;
      for (const name of Object.keys(profile.clips)) {
        const c = resolveClip(profile, name)!;
        if (
          c.source.startsWith("tactical/combat-v3-") &&
          !sources.has(c.source)
        )
          sources.set(c.source, { profile, name, c });
      }
    }
    const rows = [];
    for (const [source, { profile, name, c }] of sources) {
      await spriteImage(source).decode();
      const counts = [];
      for (const color of ["blue", "red"] as const) {
        const canvas = document.createElement("canvas");
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext("2d")!;
        drawResourceFrame(ctx, profile, name, 0, 0, 0, 256, 256, true, color);
        const pixels = ctx.getImageData(0, 0, 256, 256).data;
        let blue = 0,
          red = 0;
        for (let i = 0; i < pixels.length; i += 4)
          if (pixels[i + 3] > 128) {
            if (
              pixels[i + 2] > pixels[i] * 1.35 &&
              pixels[i + 2] > pixels[i + 1] * 1.15
            )
              blue++;
            if (
              pixels[i] > pixels[i + 2] * 1.5 &&
              pixels[i] > pixels[i + 1] * 1.5
            )
              red++;
          }
        counts.push({ blue, red });
      }
      rows.push({ source, recolor: c.recolor, counts });
    }
    return rows;
  });
  expect(result).toHaveLength(16);
  for (const row of result) {
    expect(row.recolor, row.source).toBe("blue");
    expect(row.counts[1].red, row.source).toBeGreaterThan(20);
    expect(row.counts[1].blue, row.source).toBeLessThan(
      row.counts[0].blue * 0.7,
    );
  }
});

test("riposte : vraie réaction à l’impact et pieds immobiles pendant la courte pause", async ({
  page,
}) => {
  await page.goto("/");
  const sample = await page.evaluate(async () => {
    const { CombatSceneV2 } = await import(String("/src/ui/combat-v2.ts"));
    const { createSandbox, trainingUnit } = await import(
      String("/src/game/sandbox.ts")
    );
    const s = createSandbox(),
      a = trainingUnit(s, "cavalry"),
      b = trainingUnit(s, "man_at_arms", 1, 1, 0);
    const scene = new CombatSceneV2(
      [a, b],
      [
        {
          attacker: a.id,
          defender: b.id,
          damage: 0,
          hpAfter: b.hp,
          hit: true,
          blocked: true,
        },
        {
          attacker: b.id,
          defender: a.id,
          damage: 5,
          hpAfter: a.hp - 5,
          hit: true,
          blocked: false,
          counter: true,
          parryCounter: true,
        },
      ],
    );
    await scene.prepare();
    const c = document.createElement("canvas");
    c.width = 960;
    c.height = 600;
    const at = scene.timeline.beats[1].at;
    scene.draw(c.getContext("2d")!, at);
    const impact = structuredClone(scene.lastFrames);
    scene.draw(c.getContext("2d")!, at + 80);
    const held = structuredClone(scene.lastFrames);
    return { id: a.id, impact, held };
  });
  const hit = sample.impact.find((f: any) => f.actorId === sample.id)! as any;
  expect(hit.animation).toBe("damage");
  expect(hit.index).toBe(1);
  for (const f of sample.impact as any[])
    expect(
      (sample.held as any[]).find((h) => h.actorId === f.actorId).feetX,
    ).toBe(f.feetX);
});
