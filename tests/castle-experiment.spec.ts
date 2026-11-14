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

test("rendu : toit fermé, façades complètes, angles, escaliers, portes miroir et plancher de cantine", async ({
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
    ec.fillStyle = "#22364a";
    ec.fillRect(0, 0, P, P);
    ec.drawImage(old.castle, 633, 320, 303, 300, 0, 0, P, P);
    const closedRoof = renderer.renderCastleExperimentRoof(s, old, art);
    const hiddenFrames =
      crop(closedRoof, 10 * P, 24 * P, P, P) === crop(expected, 0, 0, P, P);
    ec.clearRect(0, 0, P, P);
    ec.drawImage(art.walls, 786, 139, 94, 98, 0, 0, P, P);
    const corner =
      crop(
        renderer.renderCastleExperiment(s, old, art),
        14 * P,
        26 * P,
        P,
        P,
      ) === crop(expected, 0, 0, P, P);
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
          ec.drawImage(art.walls, 786, 139, 94, 98, 0, 0, P, P);
          ec.save();
          if (geometry.sideDoorHiddenSide(s, d) === "right") {
            ec.translate(P, 0);
            ec.scale(-1, 1);
          }
          ec.drawImage(art.side, 24, 0, 8, 32, P * 0.75, 0, P * 0.25, P);
          ec.restore();
          facadeChecks.push(
            crop(base, d.x * P, d.y * P, P, P) === crop(expected, 0, 0, P, P),
          );
        }
      }
      if (step === 2) after = base;
    }
    const canteenPlanks =
      crop(after!, 2 * P, 8 * P, P, P) === crop(after!, 35 * P, 28 * P, P, P);
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
      canteenPlanks,
      noOldSteps,
    };
  });
  expect(result).toEqual({
    hiddenFrames: true,
    corner: true,
    facades: true,
    canteenPlanks: true,
    noOldSteps: true,
  });
});

test("rendu : cases corrigées, fenêtres, pierre des portes et sols assombris", async ({
  page,
}) => {
  test.setTimeout(60000);
  await page.goto("/");
  const result = await page.evaluate(async () => {
    // @ts-expect-error Browser module.
    const m = await import("/src/data/plan-maps.ts");
    // @ts-expect-error Browser module.
    const r = await import("/src/rendering/castle-experiment.ts");
    // @ts-expect-error Browser module.
    const l = await import("/src/rendering/plan-renderer.ts");
    // @ts-expect-error Browser module.
    const layout = await import("/src/rendering/castle-experiment-layout.ts");
    const old = await l.loadPlanArtwork(),
      art = await r.loadCastleExperiment(),
      P = l.PLAN_RENDER_TILE;
    const s = m.createPlanState(layout.buildCastleExperimentPlan());
    const tile = (c: HTMLCanvasElement, n: number) =>
      Array.from(
        c
          .getContext("2d")!
          .getImageData(((n - 1) % 42) * P, Math.floor((n - 1) / 42) * P, P, P)
          .data,
      ).join(",");
    const patch = document.createElement("canvas");
    patch.width = patch.height = P;
    const pc = patch.getContext("2d")!;
    pc.imageSmoothingEnabled = false;
    pc.drawImage(art.walls, 786, 139, 94, 98, 0, 0, P, P);
    const cap = Array.from(pc.getImageData(0, 0, P, P).data).join(",");
    pc.fillStyle = "#22364a";
    pc.fillRect(0, 0, P, P);
    pc.drawImage(old.castle, 633, 320, 303, 300, 0, 0, P, P);
    const roof = Array.from(pc.getImageData(0, 0, P, P).data).join(",");
    const correctionErrors: string[] = [];
    const earlyFaces: string[] = [];
    const corrections: boolean[] = [],
      windows: boolean[] = [],
      stone: boolean[] = [];
    for (const id of [null, 13, 14]) {
      if (id) m.openPlanDoor(s, id, "key");
      const base = r.renderCastleExperiment(s, old, art),
        cover = r.renderCastleExperimentRoof(s, old, art);
      const composed = document.createElement("canvas");
      composed.width = base.width;
      composed.height = base.height;
      const c = composed.getContext("2d")!;
      c.drawImage(base, 0, 0);
      c.drawImage(cover, 0, 0);
      for (const n of [
        1013, 1107, 1120, 627, 879, 1047, 757, 178, 189, 589, 616,
      ]) {
        const ok =
          tile(composed, n) ===
          (layout.castleRoofCovered(s, n - 1) ? roof : cap);
        corrections.push(ok);
        if (!ok) correctionErrors.push(`cap ${n} after ${id}`);
      }
      for (const n of [21, 1018]) {
        const expected = n === 1018 && id !== null ? tile(base, n) : roof;
        const ok = tile(composed, n) === expected;
        if (n === 1018 && id !== null) earlyFaces.push(tile(composed, n));
        corrections.push(ok);
        if (!ok) correctionErrors.push(`roof/face ${n} after ${id}`);
      }
      for (const n of [629, 1011, 1309, 1315, 1332, 1339])
        windows.push(tile(composed, n) === tile(base, 35));
      if (id === 13) {
        pc.clearRect(0, 0, P, P);
        pc.drawImage(art.walls, 786, 139, 94, 98, 0, 0, P, P);
        const ref = Array.from(pc.getImageData(P / 2, P / 2, 1, 1).data).join(
          ",",
        );
        for (const d of s.map.doors.filter((o: { id: number }) =>
          [14, 16, 10003].includes(o.id),
        ))
          stone.push(
            Array.from(
              base
                .getContext("2d")!
                .getImageData(d.x * P + P / 2, d.y * P + P / 2, 1, 1).data,
            ).join(",") === ref,
          );
      }
    }
    for (let pass = 0; pass < 8; pass++)
      for (const d of s.map.doors) m.openPlanDoor(s, d.id, "key");
    const finalBase = r.renderCastleExperiment(
      s,
      old,
      art,
    ) as HTMLCanvasElement;
    const lum = (d: Uint8ClampedArray) =>
      0.2126 * d[0] + 0.7152 * d[1] + 0.0722 * d[2];
    const actual = finalBase.getContext("2d")!;
    pc.drawImage(art.floors, 1465, 614, 172, 170, 0, 0, P, P);
    const average = (d: Uint8ClampedArray) => {
      let sum = 0;
      for (let i = 0; i < d.length; i += 4)
        sum += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
      return sum / (d.length / 4);
    };
    const darkWood =
      average(actual.getImageData(37 * P, 26 * P, P, P).data) <
      average(pc.getImageData(0, 0, P, P).data) * 0.7;
    const darkCanteenWood =
      average(actual.getImageData(7 * P, 8 * P, P, P).data) <
      average(pc.getImageData(0, 0, P, P).data) * 0.7;
    pc.drawImage(art.walls, 42, 424, 102, 94, 0, 0, P, P);
    const stairBacking =
      Array.from(actual.getImageData(18 * P, 27 * P, 1, 1).data).join(",") ===
      Array.from(pc.getImageData(0, 0, 1, 1).data).join(",");
    return {
      correctionErrors,
      earlyWall: earlyFaces.every((t) => t === tile(finalBase, 1018)),
      corrections: corrections.every(Boolean),
      windows: windows.every(Boolean),
      stone: stone.every(Boolean),
      darkWood,
      darkCanteenWood,
      stairBacking,
    };
  });
  expect(result).toEqual({
    correctionErrors: [],
    earlyWall: true,
    corrections: true,
    windows: true,
    stone: true,
    darkWood: true,
    darkCanteenWood: true,
    stairBacking: true,
  });
});

test("coffres : ouvrir, refermer, cliquer sur la carte et réinitialiser", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await page.evaluate(() =>
    localStorage.setItem("lte-save", "chests-preview-sentinel"),
  );
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
  await expect(
    page.getByRole("button", { name: "Ouvrir les coffres visibles" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Tout révéler (aperçu)" }).click();
  await expect(page.locator(".study-chest-row")).toHaveCount(4);
  const closed = await canvas.evaluate((c) =>
    (c as HTMLCanvasElement).toDataURL(),
  );
  await page
    .getByRole("button", {
      name: "Ouvrir le coffre de la case 662",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Fermer le coffre de la case 662",
      exact: true,
    }),
  ).toBeVisible();
  expect(
    await canvas.evaluate((c) => (c as HTMLCanvasElement).toDataURL()),
  ).not.toBe(closed);
  await page
    .getByRole("button", {
      name: "Fermer le coffre de la case 662",
      exact: true,
    })
    .focus();
  await page.keyboard.press("Enter");
  expect(
    await canvas.evaluate((c) => (c as HTMLCanvasElement).toDataURL()),
  ).toBe(closed);
  await canvas.scrollIntoViewIfNeeded();
  const box = (await canvas.boundingBox())!,
    z = Number(await page.getByLabel("Zoom", { exact: true }).inputValue());
  await page.mouse.click(
    box.x + (box.width - 42 * 32 * z) / 2 + 31.5 * 32 * z,
    box.y + (box.height - 34 * 32 * z) / 2 + 15.5 * 32 * z,
  );
  await expect(
    page.getByRole("button", {
      name: "Fermer le coffre de la case 662",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Ouvrir les coffres visibles" })
    .click();
  for (const row of await page.locator(".study-chest-row").all())
    await expect(row).toContainText("ouvert");
  await page
    .getByRole("button", { name: "Tout refermer", exact: true })
    .click();
  for (const row of await page.locator(".study-chest-row").all())
    await expect(row).toContainText("fermé");
  await page
    .getByRole("button", { name: "Ouvrir les coffres visibles" })
    .click();
  await page
    .getByRole("button", { name: "Réinitialiser", exact: true })
    .click();
  for (const row of await page.locator(".study-chest-row").all())
    await expect(row).toContainText("fermé");
  expect(await page.evaluate(() => localStorage.getItem("lte-save"))).toBe(
    "chests-preview-sentinel",
  );
});
