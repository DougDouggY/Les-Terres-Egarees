import { test, expect } from "@playwright/test";
test("campagne : les adversaires de mêlée se rejoignent puis restent au contact ; les tireurs restent à leur place", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("button", {
      name: "Essai sur carte · temporaire",
      exact: true,
    }),
  ).toBeVisible();
  const results = await page.evaluate(async () => {
    const E = await import(String("/src/engine.ts"));
    const { CombatSceneV2 } = await import(String("/src/ui/combat-v2.ts"));
    const run = async (left: string, right: string) => {
      const a = E.makeClassUnit("a", 1, 1, left, "A", 24, 19, "male"),
        b = E.makeClassUnit("b", 0, 1, right, "B", 25, 19, "female");
      const strikes = [
        {
          attacker: "a",
          defender: "b",
          damage: 1,
          hpAfter: b.hp - 1,
          hit: true,
          blocked: false,
        },
        {
          attacker: "b",
          defender: "a",
          damage: 1,
          hpAfter: a.hp - 1,
          hit: true,
          blocked: false,
          counter: true,
        },
        {
          attacker: "a",
          defender: "b",
          damage: 1,
          hpAfter: b.hp - 2,
          hit: true,
          blocked: false,
          followUp: true,
        },
      ];
      const scene = new CombatSceneV2([a, b], strikes);
      await scene.prepare();
      const ctx = document.createElement("canvas").getContext("2d")!;
      ctx.canvas.width = 960;
      ctx.canvas.height = 600;
      const samples = [
        0,
        180,
        ...scene.timeline.blocks.map((block: any) => block.beats[0].at),
        scene.timeline.duration - 1,
      ].map((t) => {
        scene.draw(ctx, t);
        return { t, frames: structuredClone(scene.lastFrames) };
      });
      return { samples, missing: [...scene.missing], units: [a.hp, b.hp] };
    };
    return [
      await run("man_at_arms", "man_at_arms"),
      await run("spearman", "crossbowman"),
      await run("crossbowman", "hunter"),
    ];
  });
  const xs = (sample: any) => sample.frames.map((f: any) => f.feetX);
  const melee = results[0];
  expect(xs(melee.samples[0])).toEqual([250, 710]);
  expect(xs(melee.samples[1])[0]).toBeGreaterThan(250);
  expect(xs(melee.samples[1])[1]).toBeLessThan(710);
  const contact = xs(melee.samples[2]);
  for (const sample of melee.samples.slice(2))
    expect(xs(sample)).toEqual(contact);
  const mixed = results[1];
  expect(xs(mixed.samples[1])[0]).toBeGreaterThan(250);
  expect(xs(mixed.samples[1])[1]).toBe(710);
  for (const sample of results[2].samples)
    expect(xs(sample)).toEqual([250, 710]);
  for (const result of results) expect(result.missing).toEqual([]);
});

test("toutes les unités : fichiers et cellules de marche valides, respiration aussi chez les Sans-Repos", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("button", {
      name: "Essai sur carte · temporaire",
      exact: true,
    }),
  ).toBeVisible();
  const audit = await page.evaluate(async () => {
    const E = await import(String("/src/engine.ts")),
      R = await import(String("/src/sprites/resources.ts")),
      C = await import(String("/src/sprites/catalog.ts")),
      I = await import(String("/src/sprites/idle-motion.ts"));
    const rows = [];
    for (const profile of R.spriteCatalog.profiles) {
      // Moving removes fortification; the map uses the same unit's mobile profile.
      if (profile.state === "fortified") continue;
      const clip = C.resolveClip(profile, "move");
      if (!clip) {
        rows.push({ id: C.profileKey(profile), error: "missing move" });
        continue;
      }
      const image = R.spriteImage(clip.source);
      await image.decode();
      const valid = clip.frames.every((column: number, i: number) => {
        const cell = clip.cells?.[i] ?? { column, row: clip.row };
        return (
          cell.column >= 0 &&
          cell.column < clip.columns &&
          cell.row >= 0 &&
          cell.row < clip.rows
        );
      });
      rows.push({
        id: C.profileKey(profile),
        error: valid ? null : "invalid cell",
      });
    }
    const undead = R.spriteCatalog.profiles.filter(
      (p: any) =>
        p.state === "default" &&
        (p.classId === "skeleton" || p.classId.startsWith("sans_")),
    );
    return {
      rows,
      undead: undead.map((p: any) => ({
        id: C.profileKey(p),
        breath: I.groundedIdle(p),
      })),
      cycle: [I.idleBreath(0), I.idleBreath(1100), I.idleBreath(2200)],
    };
  });
  expect(audit.rows.filter((r: any) => r.error)).toEqual([]);
  expect(audit.undead.length).toBeGreaterThan(5);
  expect(audit.undead.every((r: any) => r.breath)).toBe(true);
  expect(audit.cycle[1].height).toBeCloseTo(0.976);
  expect(audit.cycle[0].height).toBeCloseTo(audit.cycle[2].height);
});

test("inventaire : vingt-et-une icônes distinctes, transparentes et adaptées aux équipements", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("button", {
      name: "Essai sur carte · temporaire",
      exact: true,
    }),
  ).toBeVisible();
  const icons = await page.evaluate(async () => {
    const { inventoryIcon, inventoryIconIds } = await import(
      String("/src/ui/item-icons.ts")
    );
    const E = await import(String("/src/engine.ts"));
    const { characterPage } = await import(
      String("/src/ui/character-sheet.ts")
    );
    const u = E.makeClassUnit(
      "audit",
      1,
      1,
      "spearman",
      "Test",
      24,
      19,
      "male",
    );
    u.potions = 1;
    const panel = document.createElement("section");
    panel.innerHTML = characterPage(u, "inventory");
    document.body.append(panel);
    const selected = panel
      .querySelector("[data-item-icon]")
      ?.getAttribute("data-item-icon");
    const gallery = document.createElement("section");
    gallery.innerHTML = inventoryIconIds
      .map((id: string) => inventoryIcon(id))
      .join("");
    document.body.append(gallery);
    const spans = Array.from(
      gallery.querySelectorAll<HTMLElement>(".item-icon"),
    );
    const url = getComputedStyle(spans[0]).backgroundImage.slice(5, -2);
    const image = new Image();
    image.src = url;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(image, 0, 0);
    const alpha = ctx.getImageData(0, 0, 1, 1).data[3];
    const result = {
      selected,
      alpha,
      count: spans.length,
      positions: spans.map(
        (s) =>
          getComputedStyle(s).backgroundImage +
          getComputedStyle(s).backgroundPosition,
      ),
      transparent: spans.every(
        (s) => getComputedStyle(s).backgroundColor === "rgba(0, 0, 0, 0)",
      ),
    };
    gallery.remove();
    panel.remove();
    return result;
  });
  expect(icons.selected).toBe("lance");
  expect(icons.alpha).toBe(0);
  expect(icons.count).toBe(21);
  expect(new Set(icons.positions).size).toBe(21);
  expect(icons.transparent).toBe(true);
});

test("lancier ennemi : marche chargée avant son premier déplacement réel", async ({
  page,
}) => {
  await page.addInitScript(() => {
    (window as any).__missingMove = [];
    const original = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (
      text: string,
      x: number,
      y: number,
      maxWidth?: number,
    ) {
      if (
        text === "Sprite indisponible" &&
        this.canvas.id === "map" &&
        this.canvas.dataset.movingUnit
      )
        (window as any).__missingMove.push(this.canvas.dataset.movingUnit);
      return maxWidth === undefined
        ? original.call(this, text, x, y)
        : original.call(this, text, x, y, maxWidth);
    };
  });
  await page.goto("/");
  await expect(
    page.getByRole("button", {
      name: "Essai sur carte · temporaire",
      exact: true,
    }),
  ).toBeVisible();
  const actor = await page.evaluate(async () => {
    const E = await import(String("/src/engine.ts")),
      R = await import(String("/src/sprites/resources.ts")),
      C = await import(String("/src/sprites/catalog.ts"));
    const { createUnitReview } = await import(
      String("/src/game/unit-review.ts")
    );
    const s = createUnitReview();
    const u = s.units.find(
      (u: any) => u.classId === "spearman" && u.gender === "male",
    )!;
    s.common.queue = [
      u.id,
      ...s.common.queue.filter((id: string) => id !== u.id),
    ];
    localStorage.setItem("lte-save", E.encode(s));
    return {
      id: u.id,
      source: C.resolveClip(R.unitSpriteProfile(u), "move")!.source,
    };
  });
  let requested = false;
  await page.route(`**/${actor.source.split("/").pop()}*`, async (route) => {
    requested = true;
    await new Promise((r) => setTimeout(r, 700));
    await route.continue();
  });
  await page
    .getByRole("button", { name: "Charger une partie", exact: true })
    .click();
  await page.locator('[data-slot-legacy="lte-save"]').click();
  await expect(page.locator("#map")).toHaveAttribute(
    "data-moving-unit",
    actor.id,
  );
  await expect(page.locator("#map")).toHaveAttribute("data-moving-unit", "");
  expect(requested).toBe(true);
  expect(await page.evaluate(() => (window as any).__missingMove)).toEqual([]);
});
