import { test, expect } from "@playwright/test";
test("harmonisation nordique : six variantes testables, sources de campagne et tir immobile", async ({
  page,
}) => {
  await page.goto("/");
  const saves = await page.evaluate(() => JSON.stringify({ ...localStorage }));
  await page
    .getByRole("button", { name: "Essai Pillard contre Pillard", exact: true })
    .click();
  const canvas = page.locator("[data-contact-canvas]");
  await page.locator("[data-contact-speed]").selectOption("4");
  for (const [id, source] of [
    ["male", "combat-v4-north-refresh-male-axe"],
    ["female", "combat-v4-pillarde-axe-v3"],
    ["male-sword", "combat-v4-north-refresh-male-sword"],
    ["female-sword", "combat-v4-north-refresh-female-sword"],
    ["north-warrior", "combat-v4-north-refresh-north-warrior"],
    ["huntress", "combat-v4-north-refresh-huntress"],
  ]) {
    await page.locator("[data-contact-character]").selectOption(id);
    await expect(
      page.locator('[data-contact-scenario="critical"]'),
    ).toBeEnabled();
    await page.locator('[data-contact-scenario="critical"]').click();
    await expect(canvas).toHaveAttribute(
      "data-left-frame-source",
      new RegExp(source),
    );
    await expect(canvas).toHaveAttribute(
      "data-right-frame-source",
      new RegExp(source),
    );
    if (id === "huntress") {
      await expect
        .poll(async () => Number(await canvas.getAttribute("data-elapsed")))
        .toBeGreaterThan(950);
      await expect(canvas).toHaveAttribute("data-left-x", "270");
      await expect(canvas).toHaveAttribute("data-right-x", "690");
      await expect(page.locator(".duel-weapon > strong").first()).toHaveText(
        "Arc",
      );
    }
    await expect(canvas).toHaveAttribute("data-finished", "true");
  }
  expect(await page.evaluate(() => JSON.stringify({ ...localStorage }))).toBe(
    saves,
  );
  await page.goto("/validation/vikings/index.html");
  await expect(page.locator("[data-variant]")).toHaveCount(12);
  await expect(page.locator("#map-proposal")).toBeHidden();
  await page.selectOption("#appearance", "proposal");
  await expect(page.locator("#map-current")).toBeHidden();
  await expect(page.locator("#map-proposal")).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator("h1")).toBeVisible();
});
test("accueil : quatre essais, vitesse et pause, maintien au contact, attaque unique et sauvegardes inchangées", async ({
  page,
}) => {
  await page.goto("/");
  const saves = await page.evaluate(() => JSON.stringify({ ...localStorage }));
  await page
    .getByRole("button", { name: "Essai Pillard contre Pillard", exact: true })
    .click();
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
      name: "Essai Pillard contre Pillard",
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
    .getByRole("button", { name: "Essai Pillard contre Pillard", exact: true })
    .click();
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
    .getByRole("button", { name: "Essai Pillard contre Pillard", exact: true })
    .click();
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
  await expect(page.locator(".contact-version")).toHaveText("Critique V2");
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
    .getByRole("button", { name: "Essai Pillard contre Pillard", exact: true })
    .click();
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
    .getByRole("button", { name: "Essai Pillard contre Pillard", exact: true })
    .click();
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
