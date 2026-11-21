import { test, expect } from "@playwright/test";
test("toutes les bases : 22 variantes en campagne et dans l’essai, corps à corps, tirs, magie et soins", async ({
  page,
}) => {
  test.setTimeout(120000);
  await page.goto("/");
  const saves = await page.evaluate(() => JSON.stringify({ ...localStorage }));
  await page
    .getByRole("button", { name: "Essai des animations", exact: true })
    .click();
  const canvas = page.locator("[data-contact-canvas]");
  await expect(page.locator("[data-contact-character] option")).toHaveCount(22);
  const entries = await page.evaluate(async () => {
    const E = await import(String("/src/engine.ts")),
      R = await import(String("/src/sprites/resources.ts")),
      S = await import(String("/src/sprites/combat-skins.ts")),
      C = await import(String("/src/sprites/catalog.ts")),
      V = await import(String("/src/ui/contact-roster.ts"));
    return V.contactRoster.map((v: any) => {
      const u = E.makeClassUnit(v.id, 1, 1, v.cls, v.name, 0, 0, v.gender);
      u.activeWeaponId = v.weapon;
      E.syncWeapon(u);
      const p = S.combatSkin(R.unitSpriteProfile(u))!.profile;
      return {
        ...v,
        category: E.activeWeapon(u).category,
        shield: E.hasShield(u),
        source: C.resolveClip(p, "idle")!.source,
        hasReload: !!C.resolveClip(p, "reload"),
        hasHeal: !!C.resolveClip(p, "heal"),
      };
    });
  });
  const savedBinding = await page.evaluate(async () => {
    const E = await import(String("/src/engine.ts")),
      R = await import(String("/src/sprites/resources.ts")),
      S = await import(String("/src/sprites/combat-skins.ts"));
    const u = E.makeClassUnit(
      "old-save",
      1,
      1,
      "swordsman",
      "Test",
      0,
      0,
      "female",
    );
    u.combatSkinId = "swordsman:any:sword:default";
    return {
      map: R.unitSpriteProfile(u)?.gender,
      combat: S.skinForUnit(u, R.spriteCatalog.profiles)?.profile.gender,
    };
  });
  expect(savedBinding).toEqual({ map: "female", combat: "female" });
  expect(entries.filter((v: any) => v.faction === "north")).toHaveLength(12);
  expect(entries.filter((v: any) => v.faction === "knight")).toHaveLength(10);
  await page.locator("[data-contact-speed]").selectOption("4");
  for (const v of entries) {
    await page.locator("[data-contact-character]").selectOption(v.id);
    await expect(page.locator("[data-contact-play-animation]")).toBeEnabled();
    await expect(canvas).toHaveAttribute("data-left-frame-source", v.source);
    if (v.shield)
      await expect(
        page.locator('[data-contact-scenario="parry"]'),
      ).toBeVisible();
    else
      await expect(
        page.locator('[data-contact-scenario="parry"]'),
      ).toBeHidden();
    if (v.category === "healing") {
      await expect(
        page.locator('[data-contact-scenario="agility"]'),
      ).toBeHidden();
      await page.locator("[data-contact-animation]").selectOption("heal");
      await page.locator("[data-contact-play-animation]").click();
      await expect(canvas).toHaveAttribute("data-finished", "true");
      await expect(page.locator('[data-combat-value="1"]')).toHaveText(
        "20 / 24 PV",
      );
    } else {
      await page.locator('[data-contact-scenario="critical"]').click();
      await expect(canvas).toHaveAttribute("data-finished", "true");
      if (["bow", "crossbow", "magic"].includes(v.category)) {
        await expect(canvas).toHaveAttribute("data-left-x", "270");
        await expect(canvas).toHaveAttribute("data-right-x", "690");
      } else
        expect(
          Number(await canvas.getAttribute("data-right-x")) -
            Number(await canvas.getAttribute("data-left-x")),
        ).toBeLessThan(v.cls === "spearman" ? 340 : 200);
    }
    for (const action of [
      v.hasReload ? "reload" : null,
      v.hasHeal && v.category !== "healing" ? "heal" : null,
    ].filter(Boolean)) {
      await page.locator("[data-contact-animation]").selectOption(action!);
      await page.locator("[data-contact-play-animation]").click();
      await expect(canvas).toHaveAttribute("data-finished", "true");
      await expect(canvas).toHaveAttribute("data-scenario", `pose-${action}`);
    }
  }
  expect(await page.evaluate(() => JSON.stringify({ ...localStorage }))).toBe(
    saves,
  );
  await page.goto("/validation/chevaliers/index.html");
  await expect(page.locator("[data-variant]")).toHaveCount(10);
  const resolution = await page
    .locator("#terrain")
    .evaluate((i: HTMLImageElement) => i.naturalWidth);
  expect(resolution).toBe(1280);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator("h1")).toHaveText("Tous les Chevaliers de base");
  await page.goto("/validation/vikings/index.html");
  await expect(page.locator("[data-variant]")).toHaveCount(12);
});

test("accueil : quatre essais, vitesse et pause, maintien au contact, attaque unique et sauvegardes inchangées", async ({
  page,
}) => {
  await page.goto("/");
  const saves = await page.evaluate(() => JSON.stringify({ ...localStorage }));
  await page
    .getByRole("button", { name: "Essai des animations", exact: true })
    .click();
  await page.locator("[data-contact-character]").selectOption("male");
  const canvas = page.locator("[data-contact-canvas]");
  await expect(page.locator('[data-contact-scenario="agility"]')).toBeEnabled();
  await page.locator("[data-contact-speed]").selectOption("4");
  for (const id of ["agility", "parry", "double-parry", "dodges"]) {
    await page.locator(`[data-contact-scenario="${id}"]`).click();
    await expect
      .poll(async () => Number(await canvas.getAttribute("data-elapsed")))
      .toBeGreaterThan(900);
    const left = await canvas.getAttribute("data-left-x"),
      right = await canvas.getAttribute("data-right-x");
    expect(Number(left)).toBeGreaterThan(270);
    expect(Number(right)).toBeLessThan(690);
    expect(Number(left) + Number(right)).toBeCloseTo(960, 5);
    await page.locator("[data-contact-pause]").click();
    const paused = await canvas.getAttribute("data-elapsed");
    await page.waitForTimeout(180);
    expect(await canvas.getAttribute("data-elapsed")).toBe(paused);
    await page.locator("[data-contact-pause]").click();
    await expect(canvas).toHaveAttribute("data-finished", "true");
    await expect(canvas).toHaveAttribute("data-left-x", left!);
    await expect(canvas).toHaveAttribute("data-right-x", right!);
    await expect(canvas).toHaveAttribute(
      "data-applied",
      id === "double-parry" ? "5" : "3",
    );
    await expect(
      page.locator("[data-contact-events] .contact-applied"),
    ).toHaveCount(id === "double-parry" ? 5 : 3);
    if (id === "dodges")
      await expect(page.locator('[data-combat-value="1"]')).toHaveText(
        "0 / 24 PV",
      );
  }
  const stage = await page.locator(".contact-stage").boundingBox();
  expect(stage!.width).toBeGreaterThan(900);
  expect(stage!.y + stage!.height).toBeLessThanOrEqual(720);
  await expect(page.locator("[data-contact-events]")).toBeHidden();
  await expect(page.locator("[data-contact-status]")).toHaveCSS("width", "1px");
  await page.screenshot({ path: "/tmp/contact-preview.png", fullPage: true });
  await page.getByRole("button", { name: "Retour à l’accueil" }).click();
  await expect(
    page.getByRole("button", {
      name: "Essai des animations",
      exact: true,
    }),
  ).toBeVisible();
  expect(await page.evaluate(() => JSON.stringify({ ...localStorage }))).toBe(
    saves,
  );
});

test("nouvelles poses : pas rapides, vrai retrait illustré des deux côtés et critique visible", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Essai des animations", exact: true })
    .click();
  await page.locator("[data-contact-character]").selectOption("male");
  await expect(page.locator('[data-contact-scenario="dodges"]')).toBeEnabled();
  await page.locator("[data-contact-speed]").selectOption("0.5");
  await page.locator('[data-contact-scenario="dodges"]').click();
  const c = page.locator("[data-contact-canvas]");
  await page.waitForFunction(
    () =>
      Number(
        document.querySelector<HTMLCanvasElement>("[data-contact-canvas]")!
          .dataset.elapsed,
      ) > 250,
  );
  await page.locator("[data-contact-pause]").click();
  await expect(c).toHaveAttribute("data-left-action", "move");
  await expect(c).toHaveAttribute(
    "data-left-frame-source",
    /combat-v4-north-refresh-male-axe/,
  );
  await page.screenshot({ path: "/tmp/pillard-quickstep-v6.png" });
  await page.locator("[data-contact-pause]").click();
  await page.waitForFunction(() => {
    const c = document.querySelector<HTMLCanvasElement>(
      "[data-contact-canvas]",
    )!;
    return (
      c.dataset.rightAction === "evade" && Number(c.dataset.rightOffset) > 40
    );
  });
  await page.locator("[data-contact-pause]").click();
  await page.screenshot({ path: "/tmp/pillard-backstep-v6.png" });
  await expect(c).toHaveAttribute(
    "data-right-frame-source",
    /combat-v4-north-refresh-male-axe/,
  );
  await page.locator("[data-contact-pause]").click();
  await page.waitForFunction(() => {
    const c = document.querySelector<HTMLCanvasElement>(
      "[data-contact-canvas]",
    )!;
    return (
      c.dataset.leftAction === "evade" && Number(c.dataset.leftOffset) < -40
    );
  });
  await page.waitForFunction(
    () =>
      document.querySelector<HTMLCanvasElement>("[data-contact-canvas]")!
        .dataset.critical === "true",
  );
  await page.locator("[data-contact-pause]").click();
  await page.screenshot({ path: "/tmp/pillard-critical-v6.png" });
});

test("critique partagé : rendu du moteur pour plusieurs classes, HP inchangés et aucun critique sur une parade", async ({
  page,
}) => {
  await page.goto("/");
  const results = await page.evaluate(async () => {
    const E = await import(String("/src/engine.ts"));
    const { CombatSceneV2 } = await import(String("/src/ui/combat-v2.ts"));
    const rows = [];
    for (const cls of ["raider", "man_at_arms", "spearman", "crossbowman"]) {
      for (const blocked of [false, true]) {
        const a = E.makeClassUnit("a", 1, 1, cls, "A", 0, 0, "male");
        const b = E.makeClassUnit("b", 2, 2, "raider", "B", 1, 0, "male");
        const hp = b.hp;
        const scene = new CombatSceneV2(
          [a, b],
          [
            {
              attacker: a.id,
              defender: b.id,
              damage: blocked ? 0 : 3,
              hpAfter: hp - (blocked ? 0 : 3),
              hit: true,
              blocked,
              critical: true,
            },
          ],
        );
        await scene.prepare();
        const c = document.createElement("canvas");
        c.width = 960;
        c.height = 600;
        let impacts = 0;
        const at = scene.timeline.beats[0].at;
        for (const age of [-1, 35, 100, 350, 500])
          scene.draw(c.getContext("2d")!, at + age, () => impacts++);
        const before = c.toDataURL();
        scene.draw(c.getContext("2d")!, at + 100);
        rows.push({
          cls,
          blocked,
          active: c.dataset.critical,
          parry: c.dataset.parry,
          original: b.hp,
          hp,
          after: scene.actors[1].unit.hp,
          impacts,
          changed: before !== c.toDataURL(),
        });
      }
    }
    return rows;
  });
  for (const r of results) {
    expect(r.active).toBe(String(!r.blocked));
    expect(r.parry).toBe(String(r.blocked));
    expect(r.original).toBe(r.hp);
    expect(r.after).toBe(r.hp - (r.blocked ? 0 : 3));
    expect(r.impacts).toBe(1);
  }
});

test("critique seul V2 : accès direct, effet visible sans tuer, pause et rejeu", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Essai des animations", exact: true })
    .click();
  await page.locator("[data-contact-character]").selectOption("male");
  await expect(
    page.getByRole("button", { name: "Critique seul · V2", exact: true }),
  ).toBeEnabled();
  await page.locator("[data-contact-speed]").selectOption("0.5");
  await page
    .getByRole("button", { name: "Critique seul · V2", exact: true })
    .click();
  await page.waitForFunction(() => {
    const c = document.querySelector<HTMLCanvasElement>(
      "[data-contact-canvas]",
    )!;
    return c.dataset.critical === "true" && Number(c.dataset.elapsed) > 1420;
  });
  await page.locator("[data-contact-pause]").click();
  await expect(page.locator('[data-combat-value="1"]')).toHaveText(
    "16 / 24 PV",
  );
  await expect(page.locator(".contact-version")).toHaveText("Classes de base");
  await page.screenshot({ path: "/tmp/critique-v2-validation.png" });
  await page.locator("[data-contact-replay]").click();
  await expect(page.locator("[data-contact-canvas]")).toHaveAttribute(
    "data-scenario",
    "critical",
  );
  await expect(page.locator("[data-contact-canvas]")).toHaveAttribute(
    "data-critical",
    "false",
  );
});

test("Pillarde hache : cinq scénarios, source dédiée, tailles constantes, transparence et retour au Pillard", async ({
  page,
}) => {
  await page.goto("/");
  const saves = await page.evaluate(() => JSON.stringify({ ...localStorage }));
  await page
    .getByRole("button", { name: "Essai des animations", exact: true })
    .click();
  await page.locator("[data-contact-character]").selectOption("male");
  await page.locator("[data-contact-character]").selectOption("female");
  await expect(
    page.locator('[data-contact-scenario="critical"]'),
  ).toBeEnabled();
  await expect(page.locator("[data-contact-title]")).toHaveText(
    "Pillarde contre Pillarde",
  );
  await page.screenshot({ path: "/tmp/pillarde-slim-gabarit.png" });
  await page.locator("[data-contact-speed]").selectOption("4");
  const canvas = page.locator("[data-contact-canvas]");
  for (const id of ["critical", "agility", "parry", "double-parry", "dodges"]) {
    await page.locator(`[data-contact-scenario="${id}"]`).click();
    await expect
      .poll(async () => Number(await canvas.getAttribute("data-elapsed")))
      .toBeGreaterThan(900);
    await expect(canvas).toHaveAttribute(
      "data-profile",
      "raider:female:axe-shield",
    );
    await expect(canvas).toHaveAttribute(
      "data-left-frame-source",
      /combat-v4-pillarde-axe-v3/,
    );
    await expect(canvas).toHaveAttribute(
      "data-right-frame-source",
      /combat-v4-pillarde-axe-v3/,
    );
    const left = await canvas.getAttribute("data-left-x"),
      right = await canvas.getAttribute("data-right-x");
    expect(Number(left) + Number(right)).toBeCloseTo(960);
    await expect(canvas).toHaveAttribute("data-finished", "true");
    await expect(canvas).toHaveAttribute(
      "data-applied",
      id === "critical" ? "1" : id === "double-parry" ? "5" : "3",
    );
  }
  const alpha = await page.evaluate(async () => {
    const { spriteImage } = await import(String("/src/sprites/resources.ts"));
    const im = spriteImage("tactical/combat-v4-pillarde-axe-v3.png");
    const c = document.createElement("canvas");
    c.width = im.naturalWidth;
    c.height = im.naturalHeight;
    const ctx = c.getContext("2d")!;
    ctx.drawImage(im, 0, 0);
    return [
      ctx.getImageData(0, 0, 1, 1).data[3],
      ctx.getImageData(900, 1100, 1, 1).data[3],
    ];
  });
  expect(alpha).toEqual([0, 0]);
  await page.locator("[data-contact-speed]").selectOption("0.5");
  await page.locator('[data-contact-scenario="critical"]').click();
  await page.waitForFunction(
    () =>
      document.querySelector<HTMLCanvasElement>("[data-contact-canvas]")!
        .dataset.critical === "true",
  );
  await page.locator("[data-contact-pause]").click();
  await page.screenshot({ path: "/tmp/pillarde-axe-review.png" });
  await page.locator("[data-contact-character]").selectOption("male");
  await expect(page.locator("[data-contact-title]")).toHaveText(
    "Pillard contre Pillard",
  );
  await expect(page.locator('[data-contact-scenario="agility"]')).toBeEnabled();
  await page.locator('[data-contact-scenario="agility"]').click();
  await expect(canvas).toHaveAttribute(
    "data-profile",
    "raider:male:axe-shield",
  );
  expect(await page.evaluate(() => JSON.stringify({ ...localStorage }))).toBe(
    saves,
  );
});

test("parade lumineuse : bouclier superposé au défenseur à l’impact et dégâts nuls", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Essai des animations", exact: true })
    .click();
  await page.locator("[data-contact-character]").selectOption("male");
  await expect(page.locator('[data-contact-scenario="parry"]')).toBeEnabled();
  await page.locator("[data-contact-speed]").selectOption("0.5");
  await page.locator('[data-contact-scenario="parry"]').click();
  const c = page.locator("[data-contact-canvas]");
  await page.waitForFunction(() => {
    const c = document.querySelector<HTMLCanvasElement>(
      "[data-contact-canvas]",
    )!;
    return c.dataset.parry === "true" && Number(c.dataset.elapsed) > 1400;
  });
  await page.locator("[data-contact-pause]").click();
  await expect(page.locator('[data-combat-value="0"]')).toHaveText(
    "24 / 24 PV",
  );
  await expect(c).toHaveAttribute("data-critical", "false");
  await page.screenshot({ path: "/tmp/parade-bouclier-lumineux.png" });
  await page.locator("[data-contact-pause]").click();
  await page.locator("[data-contact-speed]").selectOption("4");
  await expect(c).toHaveAttribute("data-finished", "true");
  await expect(c).toHaveAttribute("data-parry", "false");
  const [comparison] = await Promise.all([
    page.waitForEvent("popup"),
    page.getByRole("link", { name: "Comparer les gabarits ↗" }).click(),
  ]);
  await expect(comparison).toHaveTitle("Comparaison des gabarits nordiques");
  await comparison.close();
});

test("Sorciers : orbe suivi pendant la charge, projectile croissant et explosion commune au jeu", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const E = await import(String("/src/engine.ts")),
      R = await import(String("/src/sprites/resources.ts")),
      S = await import(String("/src/sprites/combat-skins.ts")),
      C = await import(String("/src/sprites/catalog.ts")),
      W = await import(String("/src/sprites/weapon-point.ts")),
      FX = await import(String("/src/ui/combat-effects.ts"));
    await FX.preloadEffects();
    const canvas = document.createElement("canvas");
    canvas.width = 960;
    canvas.height = 480;
    const ctx = canvas.getContext("2d")!;
    const sizes: number[] = [],
      glows: number[][] = [];
    const draw = ctx.drawImage.bind(ctx),
      gradient = ctx.createRadialGradient.bind(ctx);
    ctx.drawImage = ((...args: any[]) => {
      sizes.push(args[7]);
      (draw as any)(...args);
    }) as typeof ctx.drawImage;
    ctx.createRadialGradient = ((...args: number[]) => {
      glows.push(args);
      return (gradient as any)(...args);
    }) as typeof ctx.createRadialGradient;
    const actors = ["male", "female"].map((gender) => {
      const u = E.makeClassUnit(
        "staff-test",
        1,
        1,
        "sorcerer",
        "Test",
        0,
        0,
        gender,
      );
      u.activeWeaponId = "spell";
      E.syncWeapon(u);
      const p = S.combatSkin(R.unitSpriteProfile(u))!.profile,
        c = C.resolveClip(p, "attack")!;
      const from = W.illustratedWeaponPoint(
        p,
        "attack",
        c.impactFrame!,
        270,
        350,
        136,
        1,
      );
      const charge = W.illustratedWeaponPoint(p, "attack", 0, 270, 350, 136, 1);
      FX.drawSpell(ctx, "fire", -250, from, { x: 690, y: 285 }, 100, charge);
      const at = glows.at(-1)!;
      sizes.length = 0;
      for (const t of [-175, -15, 50])
        FX.drawSpell(ctx, "fire", t, from, { x: 690, y: 285 }, 100);
      return {
        sizes: [...sizes],
        glow: [at[0], at[1]],
        charge,
        source: c.source,
      };
    });
    return actors;
  });
  for (const actor of result) {
    expect(actor.source).toContain("combat-v4-refinements-mage-");
    expect(actor.glow).toEqual([actor.charge.x, actor.charge.y]);
    expect(actor.sizes).toHaveLength(3);
    expect(actor.sizes[0]).toBeLessThan(actor.sizes[1]);
    expect(actor.sizes[1]).toBeLessThan(actor.sizes[2]);
  }
});

test("attentes des 22 variantes : respiration visible, pieds ancrés et pose de carte disponible dans l essai", async ({
  page,
}) => {
  await page.goto("/");
  const audit = await page.evaluate(async () => {
    const E = await import(String("/src/engine.ts")),
      R = await import(String("/src/sprites/resources.ts")),
      C = await import(String("/src/sprites/catalog.ts")),
      G = await import(String("/src/sprites/geometry.ts")),
      V = await import(String("/src/ui/contact-roster.ts")),
      I = await import(String("/src/sprites/idle-motion.ts"));
    const results = [];
    for (const v of V.contactRoster) {
      const u = E.makeClassUnit(v.id, 1, 1, v.cls, v.name, 0, 0, v.gender);
      u.activeWeaponId = v.weapon;
      E.syncWeapon(u);
      const p = R.unitSpriteProfile(u)!,
        c = C.resolveClip(p, "idle")!;
      await R.spriteImage(c.source).decode();
      const reference = G.profileMetrics(p).references.get(c.source)!;
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 256;
      const ctx = canvas.getContext("2d")!,
        hashes = [],
        bottoms = [];
      for (const t of [0, 550, 1100, 1650]) {
        ctx.clearRect(0, 0, 256, 256);
        R.drawResourceFrame(
          ctx,
          p,
          "idle",
          Math.floor((t * c.fps) / 1000),
          0,
          230 - 256 * 0.96,
          256,
          256,
          true,
          "yellow",
          "world",
          { scale: 82 / reference, idleTime: t },
        );
        const px = ctx.getImageData(0, 0, 256, 256).data;
        let hash = 0,
          bottom = -1;
        for (let i = 0; i < px.length; i++) {
          hash = (Math.imul(hash, 31) + px[i]) | 0;
          if (i % 4 === 3 && px[i] > 64) bottom = Math.floor(i / 4 / 256);
        }
        hashes.push(hash);
        bottoms.push(bottom);
      }
      results.push({
        id: v.id,
        source: c.source,
        grounded: I.groundedIdle(p),
        distinct: new Set(hashes).size,
        bottoms,
      });
    }
    return results;
  });
  expect(audit).toHaveLength(22);
  for (const a of audit) {
    expect(a.grounded, a.id).toBe(true);
    expect(a.distinct, a.id).toBeGreaterThan(1);
    expect(
      Math.max(...a.bottoms) - Math.min(...a.bottoms),
      a.id,
    ).toBeLessThanOrEqual(1);
  }
  await page
    .getByRole("button", { name: "Essai des animations", exact: true })
    .click();
  for (const id of [
    "man_at_arms-male-sword_shield",
    "man_at_arms-female-sword_shield",
    "hunter-male-bow",
    "nordic_blade-male-sword",
    "nordic_blade-female-sword",
  ]) {
    await page.locator("[data-contact-character]").selectOption(id);
    await expect(page.locator("[data-contact-play-animation]")).toBeEnabled();
    await page.locator("[data-contact-animation]").selectOption("map-idle");
    await page.locator("[data-contact-play-animation]").click();
    await expect(page.locator("[data-contact-canvas]")).toHaveAttribute(
      "data-left-frame-source",
      audit.find((a) => a.id === id)!.source,
    );
  }
});

test("arcs et arbalètes homme/femme : la cible attend le vol puis esquive à l arrivée", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Essai des animations", exact: true })
    .click();
  // At 0.25x even a capped 100 ms render frame advances only 25 ms,
  // shorter than either observation window.
  await page.locator("[data-contact-speed]").selectOption("0.25");
  for (const id of [
    "hunter-male-bow",
    "huntress",
    "crossbowman-male-crossbow",
    "crossbowman-female-crossbow",
  ]) {
    await page.locator("[data-contact-character]").selectOption(id);
    await expect(page.locator("[data-contact-play-animation]")).toBeEnabled();
    await page.locator('[data-contact-scenario="dodges"]').click();
    const early = await page.waitForFunction(() => {
      const c = document.querySelector<HTMLCanvasElement>(
        "[data-contact-canvas]",
      )!;
      const p = (Number(c.dataset.elapsed) - 850) / 1150;
      return p >= 0.305 && p < 0.335
        ? {
            action: c.dataset.rightAction,
            offset: Number(c.dataset.rightOffset),
          }
        : false;
    });
    expect(await early.jsonValue(), id).toEqual({ action: "idle", offset: 0 });
    const late = await page.waitForFunction(() => {
      const c = document.querySelector<HTMLCanvasElement>(
        "[data-contact-canvas]",
      )!;
      const p = (Number(c.dataset.elapsed) - 850) / 1150;
      return p >= 0.405 && p < 0.435
        ? {
            action: c.dataset.rightAction,
            offset: Number(c.dataset.rightOffset),
          }
        : false;
    });
    const reaction = (await late.jsonValue()) as {
      action: string;
      offset: number;
    };
    expect(reaction.action, id).toBe("evade");
    expect(reaction.offset, id).toBeGreaterThan(45);
    await page.locator("[data-contact-pause]").click();
  }
});

test("Hommes d armes homme/femme : bouclier visible à l impact, dégâts nuls et espace pour le coup complet", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Essai des animations", exact: true })
    .click();
  const gaps: number[] = [];
  for (const gender of ["male", "female"]) {
    await page
      .locator("[data-contact-character]")
      .selectOption(`man_at_arms-${gender}-sword_shield`);
    await expect(page.locator("[data-contact-play-animation]")).toBeEnabled();
    await page.locator('[data-contact-scenario="parry"]').click();
    const value = await page.waitForFunction(() => {
      const c = document.querySelector<HTMLCanvasElement>(
        "[data-contact-canvas]",
      )!;
      return c.dataset.parry === "true"
        ? {
            action: c.dataset.leftAction,
            gap: Number(c.dataset.rightX) - Number(c.dataset.leftX),
          }
        : false;
    });
    const result = (await value.jsonValue()) as { action: string; gap: number };
    expect(result.action).toBe("block");
    gaps.push(result.gap);
    await expect(page.locator('[data-combat-value="0"]')).toHaveText(
      "24 / 24 PV",
    );
    await page.locator("[data-contact-pause]").click();
  }
  expect(gaps[0]).toBeGreaterThan(145);
  expect(gaps[1]).toBeGreaterThan(145);
  expect(Math.max(...gaps)).toBeLessThan(190);
});

test("campagne : esquive de mêlée tardive et pose de frappe présente à l impact pour toutes les variantes concernées", async ({
  page,
}) => {
  await page.goto("/");
  const rows = await page.evaluate(async () => {
    const E = await import(String("/src/engine.ts")),
      V = await import(String("/src/ui/contact-roster.ts")),
      C = await import(String("/src/sprites/catalog.ts")),
      { CombatSceneV2 } = await import(String("/src/ui/combat-v2.ts"));
    const out = [];
    for (const v of V.contactRoster) {
      const a = E.makeClassUnit("a", 1, 1, v.cls, "A", 0, 0, v.gender),
        b = E.makeClassUnit("b", 2, 2, v.cls, "B", 1, 0, v.gender);
      for (const u of [a, b]) {
        u.activeWeaponId = v.weapon;
        E.syncWeapon(u);
      }
      if (!["sword", "axe", "lance"].includes(E.activeWeapon(a).category))
        continue;
      if (v.cls === "nordic_blade" && v.gender === "female") continue;
      const scene = new CombatSceneV2(
        [a, b],
        [
          {
            attacker: "a",
            defender: "b",
            hit: false,
            damage: 0,
            hpAfter: b.hp,
          },
        ],
      );
      await scene.prepare();
      const canvas = document.createElement("canvas");
      canvas.width = 960;
      canvas.height = 600;
      const ctx = canvas.getContext("2d")!,
        at = scene.timeline.beats[0].at;
      scene.draw(ctx, at - 150);
      const early = scene.lastFrames.find(
        (r: any) => r.actorId === "b",
      )!.animation;
      scene.draw(ctx, at);
      const target = scene.lastFrames.find((r: any) => r.actorId === "b")!,
        attacker = scene.lastFrames.find((r: any) => r.actorId === "a")!;
      out.push({
        id: v.id,
        early,
        late: target.animation,
        index: attacker.index,
        impact: C.resolveClip(scene.actors[0].skin!.profile, "attack")!
          .impactFrame,
        hp: scene.actors[1].unit.hp,
        original: b.hp,
      });
    }
    return out;
  });
  expect(rows.length).toBeGreaterThanOrEqual(13);
  for (const r of rows) {
    expect(r.early, r.id).not.toBe("evade");
    expect(r.late, r.id).toBe("evade");
    expect(r.index, r.id).toBe(r.impact);
    expect(r.hp, r.id).toBe(r.original);
  }
});

test("boule de feu esquivée : poursuite du vol sans explosion, impacts conservés sur une touche", async ({
  page,
}) => {
  await page.goto("/");
  const rows = await page.evaluate(async () => {
    const E = await import(String("/src/engine.ts")),
      { CombatSceneV2 } = await import(String("/src/ui/combat-v2.ts")),
      FX = await import(String("/src/ui/combat-effects.ts"));
    await FX.preloadEffects();
    const out = [];
    for (const hit of [false, true])
      for (const gender of ["male", "female"]) {
        const a = E.makeClassUnit("a", 1, 1, "sorcerer", "A", 0, 0, gender),
          b = E.makeClassUnit("b", 2, 2, "raider", "B", 1, 0, "male");
        a.activeWeaponId = "spell";
        E.syncWeapon(a);
        const scene = new CombatSceneV2(
          [a, b],
          [
            {
              attacker: "a",
              defender: "b",
              hit,
              damage: hit ? 3 : 0,
              hpAfter: b.hp - (hit ? 3 : 0),
            },
          ],
        );
        await scene.prepare();
        const canvas = document.createElement("canvas");
        canvas.width = 960;
        canvas.height = 600;
        const ctx = canvas.getContext("2d")!,
          frames: number[] = [];
        const draw = ctx.drawImage.bind(ctx);
        ctx.drawImage = ((...args: any[]) => {
          const im = args[0];
          if (im instanceof HTMLImageElement && im.src.includes("combat-magic"))
            frames.push(Math.round(args[1] / (im.naturalWidth / 6)));
          (draw as any)(...args);
        }) as typeof ctx.drawImage;
        scene.draw(ctx, scene.timeline.beats[0].at + 50);
        out.push({ hit, gender, frames });
      }
    return out;
  });
  for (const r of rows) {
    expect(r.frames.length).toBeGreaterThan(0);
    if (r.hit) expect(r.frames).toContain(4);
    else {
      expect(r.frames).toContain(3);
      expect(r.frames).not.toContain(4);
      expect(r.frames).not.toContain(5);
    }
  }
});

test("Lames nordiques : arrêt en garde sans dernier pas ni chevauchement", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Essai des animations", exact: true })
    .click();
  await page.locator("[data-contact-speed]").selectOption("0.5");
  for (const gender of ["male", "female"]) {
    await page
      .locator("[data-contact-character]")
      .selectOption(`nordic_blade-${gender}-sword`);
    await expect(page.locator("[data-contact-play-animation]")).toBeEnabled();
    await page.locator('[data-contact-scenario="agility"]').click();
    const before = await page.waitForFunction(() => {
      const c = document.querySelector<HTMLCanvasElement>(
        "[data-contact-canvas]",
      )!;
      const t = Number(c.dataset.elapsed);
      return t >= 590 && t < 650
        ? {
            action: c.dataset.leftAction,
            x: Number(c.dataset.leftX),
            source: c.dataset.leftFrameSource,
          }
        : false;
    });
    const moving = (await before.jsonValue()) as {
      action: string;
      x: number;
      source: string;
    };
    expect(moving.action).toBe("move");
    if (gender === "male") expect(moving.source).toContain("nordic-male-steps");
    const settled = await page.waitForFunction(() => {
      const c = document.querySelector<HTMLCanvasElement>(
        "[data-contact-canvas]",
      )!;
      const t = Number(c.dataset.elapsed);
      return t >= 690 && t < 755
        ? {
            action: c.dataset.leftAction,
            x: Number(c.dataset.leftX),
            gap: Number(c.dataset.rightX) - Number(c.dataset.leftX),
          }
        : false;
    });
    const guard = (await settled.jsonValue()) as {
      action: string;
      x: number;
      gap: number;
    };
    expect(guard.action).toBe("idle");
    expect(guard.x).toBeGreaterThanOrEqual(moving.x);
    expect(guard.x - moving.x).toBeLessThan(4);
    expect(guard.gap).toBeGreaterThan(97);
    const end = await page.waitForFunction(() => {
      const c = document.querySelector<HTMLCanvasElement>(
        "[data-contact-canvas]",
      )!;
      const t = Number(c.dataset.elapsed);
      return t >= 775 && t < 845
        ? { action: c.dataset.leftAction, x: Number(c.dataset.leftX) }
        : false;
    });
    expect(await end.jsonValue()).toEqual({ action: "idle", x: guard.x });
    await page.locator("[data-contact-pause]").click();
  }
});
