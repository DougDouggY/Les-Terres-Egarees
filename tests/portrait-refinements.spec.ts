import { test, expect } from "@playwright/test";
import { completeIntroduction } from "./introduction-flow";
test("introductions : commandes au-dessus, bustes contenus, candidats sans molette et éclairage synchronisé", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const size of [
    { width: 1917, height: 1078 },
    { width: 390, height: 844 },
    { width: 844, height: 390 },
  ]) {
    await page.setViewportSize(size);
    await page.goto("/");
    await page.locator('[data-action="new"]').click();
    await page.locator('[data-action="solo"]').click();
    await page.locator('[data-action="creator-factions-ready"]').click();
    for (const [index, faction, face, companions] of [
      [0, "north", "V10", ["astrid", "solveig"]],
      [1, "knight", "C09", ["gaspard"]],
    ] as const) {
      await page.locator(`#hero-gender-${index + 1}`).selectOption("female");
      await page.locator(`[data-action="creator-hero-ready-${index}"]`).click();
      const scene = page.locator(".introduction-scene");
      await expect(scene).toHaveAttribute("data-intro-phase", "hood");
      await expect(scene.locator(".intro-back")).toHaveCount(0);
      await scene.locator("[data-intro-next]").click();
      for (
        let n = 0;
        n < 12 &&
        (await scene
          .locator(".intro-face-image")
          .getAttribute("data-face-id")) !== face;
        n++
      )
        await scene.locator('[data-intro-face="1"]').click();
      await expect(scene.locator(".intro-face-image")).toHaveAttribute(
        "data-face-id",
        face,
      );
      const im = scene.locator(".intro-face-image img");
      await expect(im).toHaveAttribute("data-backdrop-masked", "true");
      const frame = (await scene.locator(".intro-face-image").boundingBox())!,
        controls = (await scene.locator(".intro-face-controls").boundingBox())!;
      expect(frame.y + frame.height).toBeCloseTo(size.height, 0);
      expect(controls.y + controls.height).toBeLessThanOrEqual(frame.y);
      const left = (await scene
          .locator('[data-intro-face="-1"]')
          .boundingBox())!,
        valid = (await scene
          .locator("[data-intro-confirm-face]")
          .boundingBox())!,
        right = (await scene.locator('[data-intro-face="1"]').boundingBox())!;
      expect(left.x).toBeLessThan(valid.x);
      expect(valid.x).toBeLessThan(right.x);
      await scene.locator("[data-intro-confirm-face]").click();
      await expect(scene).toHaveAttribute("data-intro-phase", "ready");
      const hero = scene.locator(".intro-hero-portrait"),
        img = hero.locator("img");
      const box = (await hero.boundingBox())!,
        ib = (await img.boundingBox())!;
      expect(ib.y + ib.height).toBeLessThanOrEqual(size.height + 0.5);
      expect(ib.height).toBeLessThanOrEqual(box.height + 0.5);
      expect(box.y + box.height).toBeCloseTo(size.height, 0);
      await page.screenshot({
        path: `/tmp/intro-refined-${faction}-${size.width}.png`,
      });
      await scene.locator("[data-intro-next]").click();
      await scene.locator("[data-intro-next]").click();
      await expect(scene).toHaveAttribute("data-intro-phase", "recruit");
      const panel = scene.locator(".intro-recruit-panel");
      expect(
        await panel.evaluate((el) => el.scrollHeight <= el.clientHeight + 1),
      ).toBe(true);
      for (const b of await panel.locator("button").all()) {
        const r = (await b.boundingBox())!;
        expect(r.y + r.height).toBeLessThanOrEqual(size.height);
      }
      for (const id of companions)
        await scene.locator(`[data-intro-candidate="${id}"]`).click();
      await scene.locator("[data-intro-confirm-party]").click();
      await expect(scene).toHaveAttribute("data-intro-phase", "words");
      if (faction === "north") {
        await scene.locator("[data-intro-next]").click();
        await expect(scene).toHaveAttribute("data-intro-phase", "arrival");
        await expect(scene.locator('[data-intro-portrait="0"]')).toHaveClass(
          /speaking/,
        );
        await expect(scene.locator('[data-intro-portrait="1"]')).toHaveCount(0);
        await expect(scene).toHaveAttribute("data-intro-phase", "words");
        await expect(scene.locator('[data-intro-portrait="0"]')).toHaveClass(
          /listening/,
        );
        await expect(scene.locator('[data-intro-portrait="1"]')).toHaveClass(
          /speaking/,
        );
      }
      if (faction === "north") {
        const rear = scene.locator(
          '[data-intro-portrait="0"] .dialogue-portrait-identity',
        );
        const front = scene.locator(
          '[data-intro-portrait="1"] .dialogue-portrait-identity',
        );
        const r = (await rear.boundingBox())!,
          f = (await front.boundingBox())!;
        expect(r.x).toBeLessThan(f.x);
        await page.mouse.move(
          r.x + Math.min(5, (f.x - r.x) / 2),
          r.y + r.height * 0.7,
        );
        await expect(rear.getByRole("tooltip")).toHaveText("Astrid");
        await expect(rear.getByRole("tooltip")).toBeVisible();
        await front.hover();
        await expect(front.getByRole("tooltip")).toHaveText("Solveig");
        await expect(front.getByRole("tooltip")).toBeVisible();
      }
      await scene.locator("[data-intro-next]").click();
      await expect(scene).toHaveCount(0);
    }
  }
});
test("fiches : parchemin naturel et identité complète sans défilement, y compris Sans-repos et nom long", async ({
  page,
}) => {
  await page.goto("/");
  for (const size of [
    { width: 1280, height: 800 },
    { width: 390, height: 844 },
    { width: 844, height: 390 },
  ]) {
    await page.setViewportSize(size);
    const rows = await page.evaluate(async () => {
      const E = await import(String("/src/engine.ts"));
      const { characterSheet } = await import(
        String("/src/ui/character-sheet.ts")
      );
      const s = E.createCampaign(["north", "knight"]);
      const units = [
        s.units.find((u: any) => u.name === "Astrid"),
        s.units.find((u: any) => u.owner === 0),
        { ...s.units[0], name: "Alexandre-de-la-Longue-Clairière" },
      ];
      return units.map((u: any) => {
        const app = document.querySelector("#app")!;
        app.innerHTML = `<main class="compact-battle"><section class="unit-window character-window">${characterSheet(u, false, s)}</section></main>`;
        const p = app.querySelector(".character-profile")!,
          slot = app.querySelector(".character-portrait-slot")!,
          r = p.getBoundingClientRect();
        return {
          name: u.name,
          scroll: p.scrollHeight,
          client: p.clientHeight,
          background: getComputedStyle(slot).backgroundColor,
          children: Array.from(p.children).map((el) => ({
            bottom: el.getBoundingClientRect().bottom,
            top: el.getBoundingClientRect().top,
          })),
          bottom: r.bottom,
        };
      });
    });
    for (const r of rows) {
      expect(r.scroll, r.name).toBeLessThanOrEqual(r.client + 1);
      expect(r.background).toBe("rgba(0, 0, 0, 0)");
      for (const c of r.children)
        expect(c.bottom, r.name).toBeLessThanOrEqual(r.bottom + 1);
    }
  }
});
test("noms au survol et à l’appui : texte seul, aucun avancement de dialogue", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(async () => {
    const E = await import(String("/src/engine.ts"));
    const { ChapterDirector } = await import(
      String("/src/ui/chapter-dialogue.ts")
    );
    const s = E.createCampaign(["north", "knight"]);
    s.chapter1 = {
      started: true,
      completed: [],
      pending: { id: "arrival-1", owner: 1, page: 1 },
    };
    s.scene = "chapter1:arrival-1";
    const root = document.querySelector("#app")!;
    root.innerHTML = '<div id="chapter-overlay"></div>';
    let advances = 0;
    new ChapterDirector(
      root.firstElementChild as HTMLElement,
      s,
      () => {
        advances++;
      },
      () => {},
    );
    (window as any).getAdvances = () => advances;
  });
  const portraits = page.locator(".dialogue-portrait-identity");
  await expect(portraits).toHaveCount(2);
  for (const p of await portraits.all()) {
    const name = (await p.getAttribute("data-portrait-name"))!;
    await p.hover();
    await expect(p.getByRole("tooltip")).toHaveText(name);
    await expect(p.getByRole("tooltip")).toBeVisible();
    await p.click();
    expect(await page.evaluate(() => (window as any).getAdvances())).toBe(0);
  }
  await page.mouse.move(1, 1);
  await page.waitForTimeout(2100);
  await expect(page.locator(".portrait-name-tooltip").first()).toBeHidden();
});
test("création : pieds du Pilleur alignés et Guerrière du Nord animée à partir de sa pose existante", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator('[data-action="new"]').click();
  await page.locator('[data-action="solo"]').click();
  await page.locator('[data-action="creator-factions-ready"]').click();
  const bottoms: number[] = [];
  for (const id of ["raider", "north_warrior", "nordic_blade"]) {
    await page.locator("#hero-class-1").selectOption(id);
    await expect(page.locator('[data-creator-hero="0"]')).toHaveAttribute(
      "data-loaded",
      "true",
    );
    bottoms.push(
      await page
        .locator('[data-creator-hero="0"]')
        .evaluate((c: HTMLCanvasElement) => {
          const d = c
            .getContext("2d")!
            .getImageData(0, 0, c.width, c.height).data;
          let bottom = 0;
          for (let y = 0; y < c.height; y++)
            for (let x = 0; x < c.width; x++)
              if (d[(y * c.width + x) * 4 + 3] > 100) bottom = y;
          return bottom;
        }),
    );
  }
  expect(Math.max(...bottoms) - Math.min(...bottoms)).toBeLessThanOrEqual(3);
  const data = await page.evaluate(async () => {
    const E = await import(String("/src/engine.ts"));
    const { unitSpriteProfile } = await import(
      String("/src/sprites/resources.ts")
    );
    const { resolveClip } = await import(String("/src/sprites/catalog.ts"));
    const { tacticalIdleSway } = await import(
      String("/src/sprites/display-scale.ts")
    );
    const u = E.makeClassUnit(
      "test",
      1,
      1,
      "north_warrior",
      "Test",
      0,
      0,
      "female",
    );
    const frames = resolveClip(unitSpriteProfile(u), "idle").frames.length;
    return {
      frames,
      a: tacticalIdleSway(u.classId, u.gender, "idle", 0, frames),
      b: tacticalIdleSway(u.classId, u.gender, "idle", 1, frames),
      attack: tacticalIdleSway(u.classId, u.gender, "attack", 1, frames),
    };
  });
  expect(data.frames).toBe(1);
  expect(data.a).not.toBe(data.b);
  expect(data.attack).toBe(0);
});

test("carte tactique : la Guerrière du Nord change réellement de pixels en attente", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(async () => {
    const { createSandbox, trainingUnit } = await import(
      String("/src/game/sandbox.ts")
    );
    const E = await import(String("/src/engine.ts"));
    const { warmSprites } = await import(String("/src/sprites/resources.ts"));
    const s = createSandbox();
    const u = trainingUnit(s, "north_warrior", 1, 1, 1);
    u.gender = "female";
    u.name = "Guerrière";
    const spot = E.map.find(
      (c: any) => c.walk && c.x >= 20 && c.x <= 25 && c.y >= 15,
    )!;
    u.x = spot.x;
    u.y = spot.y;
    (window as any).warriorXY = { x: u.x, y: u.y };
    const { MAP_REVISION } = await import(String("/src/game/map.ts"));
    s.mapRevision = MAP_REVISION;
    const other = trainingUnit(s, "man_at_arms", 1, 1, 2);
    const far = E.map.find(
      (c: any) => c.walk && Math.abs(c.x - u.x) + Math.abs(c.y - u.y) > 8,
    )!;
    other.x = far.x;
    other.y = far.y;
    s.common.queue = [u.id, other.id];
    s.common.index = 0;
    s.active = 1;
    await warmSprites([u, other], s.teamColors, ["idle"]);
    localStorage.setItem("lte-save", E.encode(s));
  });
  await page.locator('[data-action="continue"]').click();
  await page.locator('[data-slot-legacy="lte-save"]').click();
  await expect(page.locator("#map")).toBeVisible();
  await expect
    .poll(() => page.locator("#map").getAttribute("data-view-cols"))
    .not.toBeNull();
  const crop = () =>
    page.locator("#map").evaluate((c: HTMLCanvasElement) => {
      const sx = c.width / Number(c.dataset.viewCols),
        sy = c.height / Number(c.dataset.viewRows),
        x =
          ((window as any).warriorXY.x - 0.5 - Number(c.dataset.cameraX)) * sx,
        y =
          ((window as any).warriorXY.y - 1.5 - Number(c.dataset.cameraY)) * sy;
      const d = c
        .getContext("2d")!
        .getImageData(
          Math.floor(x),
          Math.floor(y),
          Math.ceil(2 * sx),
          Math.ceil(2.5 * sy),
        ).data;
      let hash = 0;
      for (let i = 0; i < d.length; i += 4)
        hash = (hash * 31 + d[i] + d[i + 1] + d[i + 2]) | 0;
      return hash;
    });
  const first = await crop();
  await expect
    .poll(crop, { timeout: 4000, intervals: [100, 150, 250] })
    .not.toBe(first);
  await page.screenshot({ path: "/tmp/warrior-female-map-idle.png" });
});

test.describe("appareil tactile", () => {
  test.use({ hasTouch: true, viewport: { width: 390, height: 844 } });
  test("appui : nom temporaire sans avancer la conversation", async ({
    page,
  }) => {
    await page.goto("/");
    await page.evaluate(async () => {
      const E = await import(String("/src/engine.ts"));
      const { ChapterDirector } = await import(
        String("/src/ui/chapter-dialogue.ts")
      );
      const s = E.createCampaign(["north", "knight"]);
      s.chapter1 = {
        started: true,
        completed: [],
        pending: { id: "arrival-1", owner: 1, page: 0 },
      };
      s.scene = "chapter1:arrival-1";
      const root = document.querySelector("#app")!;
      root.innerHTML = '<div id="chapter-overlay"></div>';
      let next = 0;
      const director = new ChapterDirector(
        root.firstElementChild as HTMLElement,
        s,
        () => next++,
        () => {},
      );
      const tick = (t: number) => {
        director.tick(t);
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
      (window as any).touchNext = () => next;
    });
    await expect(page.locator("#chapter-overlay")).toHaveAttribute(
      "data-ready",
      "true",
      { timeout: 15000 },
    );
    const p = page.locator(".dialogue-portrait-identity");
    await p.tap();
    await expect(p.getByRole("tooltip")).toHaveText(
      (await p.getAttribute("data-portrait-name")) as string,
    );
    await expect(p.getByRole("tooltip")).toBeVisible();
    expect(await page.evaluate(() => (window as any).touchNext())).toBe(0);
    await expect(p.getByRole("tooltip")).toBeHidden({ timeout: 3500 });
  });
});
