import { test, expect } from "@playwright/test";
test("V9 tailles : vrais profils homme/femme, création, carte, portraits et combats", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const E = await import(String("/src/engine.ts")),
      R = await import(String("/src/sprites/resources.ts")),
      C = await import(String("/src/sprites/catalog.ts")),
      G = await import(String("/src/sprites/geometry.ts")),
      D = await import(String("/src/sprites/display-scale.ts")),
      S = await import(String("/src/sprites/combat-skins.ts"));
    const units = Object.values(E.classes)
      .filter((c: any) => c.faction !== "enemy")
      .flatMap((c: any) =>
        ["male", "female"].map((g) =>
          E.makeClassUnit(
            c.id + g,
            1,
            1,
            c.id,
            c.name,
            0,
            0,
            g,
            c.stage === "recruit"
              ? E.baseClasses(c.faction)
                  .slice(0, 2)
                  .map((base: any) => base.id)
              : undefined,
          ),
        ),
      );
    units.push(
      ...E.createCampaign(["north", "knight"]).units.filter(
        (u: any) => u.owner === 0,
      ),
    );
    await R.warmSprites(units, E.defaultTeamColors, ["idle", "move", "attack"]);
    const canvas = document.createElement("canvas");
    canvas.width = 1440;
    canvas.height = Math.ceil(units.length / 12) * 155;
    document.querySelector("#app")!.replaceChildren(canvas);
    canvas.style.width = "1440px";
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#e5d2a3";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = false;
    return units.map((u: any, i: number) => {
      const p = R.unitSpriteProfile(u),
        clip = C.resolveClip(p, "idle"),
        r = clip && G.resourceRect(clip, 0),
        placement = D.anatomicalPlacement(p, "idle", 72);
      const ok = R.drawResourceFrame(
        ctx,
        p,
        "idle",
        0,
        (i % 12) * 120,
        Math.floor(i / 12) * 155,
        120,
        120,
        true,
        "blue",
        "world",
        placement,
      );
      ctx.fillStyle = "#2f2418";
      ctx.font = "10px sans-serif";
      ctx.fillText(
        u.classId.slice(0, 18),
        (i % 12) * 120 + 3,
        Math.floor(i / 12) * 155 + 136,
      );
      ctx.fillText(
        u.gender,
        (i % 12) * 120 + 3,
        Math.floor(i / 12) * 155 + 150,
      );
      const battle = S.combatSkin(p),
        battleClip =
          C.resolveClip(battle?.profile, "combat_idle") ??
          C.resolveClip(battle?.profile, "idle");
      const mapSize = E.unitClass(u).mounted ? 52 : 38;
      const mapScale = G.resourceScale(
        p,
        clip,
        mapSize,
        mapSize * 1.15,
        "world",
        0,
      );
      const portrait = D.anatomicalPlacement(p, "idle", 124);
      return {
        mapBody: (r?.bodyHeight ?? r?.height ?? 0) * mapScale,
        expectedMap: mapSize * 0.74,
        portraitBody:
          (r?.bodyHeight ?? r?.height ?? 0) * (portrait?.scale ?? 0),
        id: u.id,
        ok,
        profile: p?.classId,
        measured: (r?.bodyHeight ?? r?.height ?? 0) * (placement?.scale ?? 0),
        hasMove: !!C.resolveClip(p, "move"),
        battle: !!battleClip,
        mounted: !!E.unitClass(u).mounted,
      };
    });
  });
  expect(result.every((r: any) => r.ok && r.hasMove && r.battle)).toBe(true);
  const bad = result.filter((r: any) => Math.abs(r.measured - 72) > 14);
  expect(bad).toEqual([]);
  for (const row of result) {
    expect(Math.abs(row.mapBody - row.expectedMap)).toBeLessThan(7);
    expect(Math.abs(row.portraitBody - 124)).toBeLessThan(24);
  }
  await page.screenshot({
    path: "artifacts/sprite-v9/scale-library.png",
    fullPage: true,
  });
});
test("V9 création : neuf compagnons normalisés et prénom Armand", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator('[data-action="new"]').click();
  await page.locator('[data-action="creator-factions-ready"]').click();
  await page.locator("#hero-gender-1").selectOption("female");
  await expect(page.locator('[data-creator-hero="0"]')).toHaveAttribute(
    "data-loaded",
    "true",
  );
  await page.screenshot({
    path: "artifacts/sprite-v9/creator-female.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect
    .poll(async () =>
      page
        .locator('[data-creator-hero="0"]')
        .evaluate((c: HTMLCanvasElement) => {
          const r = c.getBoundingClientRect(),
            actual = Math.min(r.width / c.width, r.height / c.height);
          return Math.abs(Number(c.dataset.displayRatio) - actual);
        }),
    )
    .toBeLessThan(0.001);
  await page.screenshot({
    path: "artifacts/sprite-v9/creator-mobile.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  for (const n of [0, 1])
    await page.locator(`[data-action="creator-hero-ready-${n}"]`).click();
  for (const n of [0, 1])
    for (let i = 0; i < 2; i++)
      await page.locator(`[data-action="creator-intro-${n}"]`).click();
  await expect(
    page.locator('[data-creator-companion][data-loaded="true"]'),
  ).toHaveCount(9);
  await expect(page.locator(".knight-party .companion-cards")).toContainText(
    "Armand",
  );
  await expect(
    page.locator(".knight-party .companion-cards"),
  ).not.toContainText("Alix");
  const sizes = await page
    .locator("[data-creator-companion]")
    .evaluateAll((nodes) =>
      nodes.map((c) => (c as HTMLElement).dataset.bodyHeight),
    );
  expect(new Set(sizes)).toEqual(new Set(["96"]));
  await page.screenshot({
    path: "artifacts/sprite-v9/creator.png",
    fullPage: true,
  });
});
test("V9 Sans-Repos : les quatre armes utilisent leurs atlas de squelettes en jeu et en combat", async ({
  page,
}) => {
  await page.goto("/");
  const profiles = await page.evaluate(async () => {
    const E = await import(String("/src/engine.ts")),
      R = await import(String("/src/sprites/resources.ts")),
      S = await import(String("/src/sprites/combat-skins.ts")),
      C = await import(String("/src/sprites/catalog.ts"));
    const enemies = E.createCampaign(["north", "knight"]).units.filter(
      (u: any) => u.owner === 0,
    );
    await R.warmSprites(enemies, E.defaultTeamColors, [
      "idle",
      "move",
      "attack",
    ]);
    const sources = new Set<string>();
    for (const u of enemies)
      for (const name of ["idle", "attack"]) {
        const clip = C.resolveClip(
          S.combatSkin(R.unitSpriteProfile(u))?.profile,
          name,
        );
        if (clip) sources.add(clip.source);
      }
    await Promise.all(
      [...sources].map((source) => R.spriteImage(source).decode()),
    );
    const c = document.createElement("canvas");
    c.width = 960;
    c.height = 350;
    document.querySelector("#app")!.replaceChildren(c);
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#c8b988";
    ctx.fillRect(0, 0, c.width, c.height);
    return enemies.map((u: any, i: number) => {
      const p = R.unitSpriteProfile(u),
        skin = S.combatSkin(p);
      R.drawResourceFrame(
        ctx,
        p,
        "idle",
        0,
        i * 120,
        0,
        120,
        150,
        true,
        "pink",
        "world",
      );
      const attackDrawn = R.drawResourceFrame(
        ctx,
        skin?.profile,
        "attack",
        2,
        i * 120,
        155,
        120,
        150,
        true,
        "pink",
        "world",
      );
      return {
        id: u.id,
        cls: u.classId,
        profile: p?.classId,
        weapon: E.activeWeapon(u).category,
        attack: !!C.resolveClip(skin?.profile, "attack"),
        attackDrawn,
      };
    });
  });
  expect(profiles.filter((p: any) => p.weapon === "bow")).toHaveLength(2);
  expect(
    profiles.every(
      (p: any) =>
        p.cls === p.profile &&
        ["skeleton", "sans_axe", "sans_spear", "sans_archer"].includes(p.cls) &&
        p.attack &&
        p.attackDrawn,
    ),
  ).toBe(true);
  await page.screenshot({ path: "artifacts/sprite-v9/undead.png" });
});
test("V9 dialogues : portrait agrandi sans réduire la taille des acteurs de carte", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(async () => {
    const E = await import(String("/src/engine.ts"));
    const s = E.createCampaign(["north", "knight"]);
    E.beginChapter1(s);
    localStorage.setItem("lte-save", E.encode(s));
  });
  await page.reload();
  await page.locator('[data-action="continue"]').click();
  await expect(page.locator("#chapter-overlay")).toHaveAttribute(
    "data-ready",
    "true",
  );
  const height = await page
    .locator(".chapter-portrait canvas")
    .evaluate((c: HTMLCanvasElement) => {
      const d = c.getContext("2d")!.getImageData(0, 0, c.width, c.height).data;
      let min = c.height,
        max = 0;
      for (let y = 0; y < c.height; y++)
        for (let x = 0; x < c.width; x++)
          if (d[(y * c.width + x) * 4 + 3] > 100) {
            min = Math.min(min, y);
            max = Math.max(max, y);
          }
      return max - min;
    });
  expect(height).toBeGreaterThan(110);
  await page.screenshot({ path: "artifacts/sprite-v9/dialogue.png" });
});
