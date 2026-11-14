import { test, expect } from "@playwright/test";

test("nouveau château : comparaison, transparence, portes et export", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page
    .getByRole("button", { name: "Tests de combat", exact: true })
    .click();
  await page.getByRole("button", { name: "Explorer les deux cartes" }).click();
  await expect(page.locator("[data-study]")).toHaveCount(3);
  const canvas = page.locator("#study-canvas");
  await expect(canvas).toHaveAttribute("data-ready", "true");
  const approved = await canvas.evaluate((c) =>
    (c as HTMLCanvasElement).toDataURL(),
  );
  await page
    .getByRole("button", { name: /02 · Château · Nouveau set EC/ })
    .click();
  await expect(canvas).toHaveAttribute("data-skin", "new");
  expect(
    await canvas.evaluate((c) => (c as HTMLCanvasElement).toDataURL()),
  ).not.toBe(approved);
  await page.getByRole("button", { name: /01 · Le château oublié/ }).click();
  await expect(canvas).toHaveAttribute("data-skin", "approved");
  expect(
    await canvas.evaluate((c) => (c as HTMLCanvasElement).toDataURL()),
  ).toBe(approved);
  await page
    .getByRole("button", { name: /02 · Château · Nouveau set EC/ })
    .click();
  await expect(canvas).toHaveAttribute("data-skin", "new");
  await page
    .getByRole("button", { name: "Clé — Porte principale", exact: true })
    .click();
  await expect(page.locator(".study-status")).toContainText(
    "Porte principale ouverte",
  );
  await page.getByRole("button", { name: "Tout révéler (aperçu)" }).click();
  await expect(page.locator(".study-door-row")).toHaveCount(7);
  for (const row of await page.locator(".study-door-row").all())
    await expect(row).toContainText("ouverte");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exporter le PNG" }).click();
  expect((await download).suggestedFilename()).toBe(
    "plan-castle-new-42x34.png",
  );
  await page
    .getByRole("button", { name: "Réinitialiser", exact: true })
    .click();
  await expect(page.locator(".study-door-row").first()).toContainText("fermée");
  await page.getByRole("button", { name: /03 · Abordage naval/ }).click();
  await expect(page.locator("[data-castle-skin]")).toBeHidden();
  await expect(canvas).toHaveAttribute("data-skin", "approved");
  expect(errors).toEqual([]);
});

test("nouveau château : téléphone et véritables assets transparents", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Tests de combat", exact: true })
    .click();
  await page.getByRole("button", { name: "Explorer les deux cartes" }).click();
  await expect(page.locator("#study-canvas")).toHaveAttribute(
    "data-ready",
    "true",
  );
  await page
    .getByRole("button", { name: /02 · Château · Nouveau set EC/ })
    .click();
  await expect(page.locator("#study-canvas")).toHaveAttribute(
    "data-skin",
    "new",
  );
  await page.getByRole("button", { name: "Tout révéler (aperçu)" }).click();
  await page.getByRole("button", { name: "Cadrer la carte" }).click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  const transparent = await page.evaluate(async () => {
    const im = new Image();
    im.src = new URL(
      "assets/castle-experiment/props-transparent.png",
      document.baseURI,
    ).href;
    await im.decode();
    const c = document.createElement("canvas");
    c.width = im.width;
    c.height = im.height;
    const ctx = c.getContext("2d")!;
    ctx.drawImage(im, 0, 0);
    const d = ctx.getImageData(0, 0, c.width, c.height).data;
    let clear = 0,
      opaque = 0;
    for (let i = 3; i < d.length; i += 4) {
      if (!d[i]) clear++;
      if (d[i] >= 250) opaque++;
    }
    return clear > 10000 && opaque > 10000;
  });
  expect(transparent).toBe(true);
});

test("survol : numéro stable de la case avec zoom et déplacement de caméra", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Tests de combat", exact: true })
    .click();
  await page.getByRole("button", { name: "Explorer les deux cartes" }).click();
  const canvas = page.locator("#study-canvas");
  await expect(canvas).toHaveAttribute("data-ready", "true");
  await page
    .getByRole("button", { name: /02 · Château · Nouveau set EC/ })
    .click();
  await expect(canvas).toHaveAttribute("data-skin", "new");
  const tip = page.getByRole("tooltip");
  async function point(x: number, y: number) {
    const b = (await canvas.boundingBox())!,
      z = Number(await page.getByLabel("Zoom", { exact: true }).inputValue());
    return {
      x: b.x + (b.width - 42 * 32 * z) / 2 + (x + 0.5) * 32 * z,
      y: b.y + (b.height - 34 * 32 * z) / 2 + (y + 0.5) * 32 * z,
    };
  }
  for (const [x, y, n] of [
    [0, 0, 1],
    [13, 1, 56],
    [41, 33, 1428],
    [21, 17, 736],
  ]) {
    const p = await point(x, y);
    await page.mouse.move(p.x, p.y);
    await expect(tip).toHaveText(`Case ${n}`);
  }
  await page.getByLabel("Zoom", { exact: true }).selectOption("1");
  const p = await point(21, 17);
  await page.mouse.move(p.x, p.y);
  await expect(tip).toHaveText("Case 736");
  await page.mouse.down();
  await page.mouse.move(p.x + 27, p.y + 19);
  await expect(tip).toBeHidden();
  await page.mouse.up();
  await page.mouse.move(p.x + 28, p.y + 20);
  await expect(tip).toHaveText("Case 736");
  await page.mouse.move(1, 1);
  await expect(tip).toBeHidden();
});

test("rendu : toit fermé, façades complètes, angles, escaliers, portes miroir et vrai damier", async ({
  page,
}) => {
  test.setTimeout(60000);
  await page.goto("/");
  const result = await page.evaluate(async () => {
    // @ts-expect-error Browser imports use the dev server's absolute module URL.
    const m = await import("/src/data/plan-maps.ts");
    // @ts-expect-error Browser module.
    const renderer = await import("/src/rendering/castle-experiment.ts");
    // @ts-expect-error Browser module.
    const legacy = await import("/src/rendering/plan-renderer.ts");
    // @ts-expect-error Browser module.
    const geometry = await import("/src/rendering/plan-geometry.ts");
    const old = await legacy.loadPlanArtwork(),
      art = await renderer.loadCastleExperiment(),
      P = legacy.PLAN_RENDER_TILE;
    const s = m.createPlanState(m.castlePlan),
      w = s.map.width;
    const pixel = (c: HTMLCanvasElement, x: number, y: number) =>
      Array.from(c.getContext("2d")!.getImageData(x, y, 1, 1).data).join(",");
    const crop = (
      c: HTMLCanvasElement,
      x: number,
      y: number,
      ww: number,
      hh: number,
    ) =>
      Array.from(c.getContext("2d")!.getImageData(x, y, ww, hh).data).join(",");
    const expected = document.createElement("canvas");
    expected.width = expected.height = P;
    const ec = expected.getContext("2d")!;
    ec.imageSmoothingEnabled = false;
    ec.drawImage(old.castle, 633, 320, 303, 300, 0, 0, P, P);
    const closedRoof = renderer.renderCastleExperimentRoof(s, old, art);
    const hiddenFrames =
      crop(closedRoof, 19 * P, 26 * P, P, P) === crop(expected, 0, 0, P, P);
    ec.clearRect(0, 0, P, P);
    ec.drawImage(art.walls, 786, 139, 94, 98, 0, 0, P, P);
    const corner =
      crop(closedRoof, 14 * P, 26 * P, P, P) === crop(expected, 0, 0, P, P);
    const facadeChecks: boolean[] = [];
    let after: HTMLCanvasElement | undefined;
    for (let step = 0; step < 3; step++) {
      if (step === 1) m.openPlanDoor(s, 13, "key");
      if (step === 2)
        for (let i = 0; i < 8; i++)
          for (const d of s.map.doors) m.openPlanDoor(s, d.id, "key");
      const base = renderer.renderCastleExperiment(s, old, art),
        roof = renderer.renderCastleExperimentRoof(s, old, art);
      const composed = document.createElement("canvas");
      composed.width = base.width;
      composed.height = base.height;
      composed.getContext("2d")!.drawImage(base, 0, 0);
      composed.getContext("2d")!.drawImage(roof, 0, 0);
      for (const k of geometry.exteriorFacadeCells(s.map)) {
        const x = (k % w) * P,
          y = (Math.floor(k / w) + 1) * P;
        facadeChecks.push(
          crop(composed, x, y, P, P) === crop(base, x, y, P, P),
        );
      }
      if (step === 1) {
        facadeChecks.push(
          pixel(roof, 19 * P + P / 2, 26 * P + P / 2) === "0,0,0,0",
        );
        // Each side door uses the opposite mirror of the earlier implementation.
        for (const id of [14, 16]) {
          const d = s.map.doors.find((o: { id: number }) => o.id === id)!;
          ec.clearRect(0, 0, P, P);
          ec.save();
          if (geometry.sideDoorHiddenSide(s, d) === "right") {
            ec.translate(P, 0);
            ec.scale(-1, 1);
          }
          ec.drawImage(art.side, 0, 0, 32, 32, 0, 0, P, P);
          ec.restore();
          facadeChecks.push(
            crop(base, d.x * P, d.y * P, P, P) === crop(expected, 0, 0, P, P),
          );
        }
      }
      if (step === 2) after = base;
    }
    // A continuous checker alternates across both cell edges; three squares per tile.
    const checker = after!;
    const samples = [
      pixel(checker, 2 * P + (P * 5) / 6, 8 * P + P / 6),
      pixel(checker, 3 * P + P / 6, 8 * P + P / 6),
      pixel(checker, 3 * P + P / 2, 8 * P + P / 6),
    ];
    const checkerJoins = samples[0] !== samples[1] && samples[0] === samples[2];
    const modified = document.createElement("canvas");
    modified.width = old.castle.width;
    modified.height = old.castle.height;
    const mc = modified.getContext("2d")!;
    mc.drawImage(old.castle, 0, 0);
    mc.fillStyle = "#ff00ff";
    mc.fillRect(7, 688, 296, 47);
    mc.fillRect(8, 738, 294, 177);
    const poison = new Image();
    poison.src = modified.toDataURL();
    await poison.decode();
    const poisonBase = renderer.renderCastleExperiment(
      s,
      { ...old, castle: poison },
      art,
    );
    const noOldSteps =
      crop(poisonBase, 18 * P, 27 * P, 6 * P, 2 * P) ===
      crop(after!, 18 * P, 27 * P, 6 * P, 2 * P);
    return {
      hiddenFrames,
      corner,
      facades: facadeChecks.every(Boolean),
      checkerJoins,
      noOldSteps,
    };
  });
  expect(result).toEqual({
    hiddenFrames: true,
    corner: true,
    facades: true,
    checkerJoins: true,
    noOldSteps: true,
  });
});
