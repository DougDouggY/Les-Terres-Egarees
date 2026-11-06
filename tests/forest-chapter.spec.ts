import { test, expect, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
async function advanceScene(page: Page, id: string) {
  await expect(page.locator(`[data-story-scene="${id}"]`)).toBeVisible();
  await expect(page.locator("#chapter-overlay")).toHaveAttribute(
    "data-ready",
    "true",
  );
  for (
    let n = 0;
    n < 45 && (await page.locator(`[data-story-scene="${id}"]`).count());
    n++
  ) {
    await page.clock.fastForward(9000);
    await page.locator("[data-story-next]").click();
  }
  await expect(page.locator(`[data-story-scene="${id}"]`)).toHaveCount(0);
}
async function clickUnit(page: Page, x: number, y: number) {
  await page.waitForFunction(
    () =>
      Number(
        document.querySelector<HTMLCanvasElement>("#map")?.dataset.viewCols,
      ) > 0,
  );
  const pt = await page.locator("#map").evaluate(
    (c: HTMLCanvasElement, { x, y }) => {
      const b = c.getBoundingClientRect();
      return {
        x:
          b.x +
          ((x + 0.5 - Number(c.dataset.cameraX)) * b.width) /
            Number(c.dataset.viewCols),
        y:
          b.y +
          ((y + 0.5 - Number(c.dataset.cameraY)) * b.height) /
            Number(c.dataset.viewRows),
      };
    },
    { x, y },
  );
  await page.mouse.click(pt.x, pt.y);
}
async function fixture(page: Page, choice = "storm") {
  await page.goto("/");
  await page.evaluate(async (choice) => {
    const E = await import(String("/src/engine.ts"));
    const s = E.createCampaign(["north", "knight"]);
    E.beginForestChapter(s);
    const finish = () => {
      const id = s.chapter1!.pending!.id;
      for (let i = 0; i < 80 && s.chapter1?.pending?.id === id; i++)
        E.advanceChapterLine(s);
    };
    finish();
    finish();
    E.votePatrol(s, 1, choice);
    E.votePatrol(s, 2, choice);
    finish();
    const k = s.units.find((u: any) => u.id === "p2a")!,
      g = s.units.find((u: any) => u.id === "geraud")!;
    k.x = g.x - 1;
    k.y = g.y;
    g.hp = 11;
    s.active = 2;
    s.common = {
      round: 2,
      index: 0,
      queue: [
        k.id,
        g.id,
        ...s.units
          .filter((u: any) => u.id !== k.id && u.id !== g.id)
          .map((u: any) => u.id),
      ],
    };
    s.players.forEach((p: any) => (p.camera = { x: 21, y: 17 }));
    E.visibility(s);
    localStorage.setItem("lte-save", E.encode(s));
  }, choice);
  await page.reload();
  await page.locator('[data-action="continue"]').click();
  await expect(page.locator("#map")).toBeVisible();
}
test("Chapitre 1 : finale du prologue, vote des deux joueurs et sauvegarde normale protégée", async ({
  page,
}) => {
  await mkdir("artifacts/chapter-one", { recursive: true });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.evaluate(() =>
    localStorage.setItem("lte-save", "normal-save-sentinel"),
  );
  await page.clock.install();
  await page.locator('[data-action="dev-chapter-one"]').click();
  await advanceScene(page, "alliance");
  await expect(page.locator(".prologue-title h1")).toHaveText(
    "Pour ne pas oublier",
  );
  await page.screenshot({
    path: "artifacts/chapter-one/title.png",
    animations: "disabled",
  });
  await page.clock.fastForward(4000);
  await advanceScene(page, "c1-warning");
  await expect(page.locator(".patrol-choice")).toBeVisible();
  await page
    .locator('[data-patrol-owner="1"][data-patrol-choice="storm"]')
    .click();
  await page
    .locator('[data-patrol-owner="2"][data-patrol-choice="travelers"]')
    .click();
  await expect(page.locator(".patrol-status")).toContainText("diffèrent");
  await page.screenshot({ path: "artifacts/chapter-one/vote.png" });
  await page
    .locator('[data-patrol-owner="2"][data-patrol-choice="storm"]')
    .click();
  await advanceScene(page, "c1-storm");
  await expect(page.locator("#map")).toBeVisible();
  await expect(page.locator(".mission-objective")).toHaveText(
    "Éliminez tous les ennemis",
  );
  const result = await page.evaluate(() => ({
    normal: localStorage.getItem("lte-save"),
    test: JSON.parse(localStorage.getItem("lte-chapter-one-test")!),
  }));
  expect(result.normal).toBe("normal-save-sentinel");
  expect(result.test.forestChapter.choice).toBe("storm");
  expect(
    result.test.units.filter((u: any) => u.id === "story-witch"),
  ).toHaveLength(1);
  expect(result.test.players.every((p: any) => p.visible.length === 2400)).toBe(
    true,
  );
  await page.screenshot({ path: "artifacts/chapter-one/forest.png" });
  await page.keyboard.press("Escape");
  await page.locator('[data-action="restart-chapter-one"]').click();
  await expect(page.locator(".prologue-title h1")).toHaveText(
    "Pour ne pas oublier",
  );
  expect(errors).toEqual([]);
});
test("Chapitre 1 : Parler volontairement à Géraud et poursuivre vers la grotte sans tour gratuit", async ({
  page,
}) => {
  await fixture(page);
  await page.clock.install();
  await clickUnit(page, 27, 21);
  await clickUnit(page, 27, 21);
  await expect(page.locator('[data-action="talk-geraud"]')).toBeVisible();
  await page.locator('[data-action="talk-geraud"]').click();
  await expect(page.locator('[data-story-scene="c1-recruit"]')).toBeVisible();
  await expect(page.locator(".chapter-speaker")).toHaveText("Géraud");
  await page.clock.fastForward(9000);
  await page.screenshot({ path: "artifacts/chapter-one/recruit.png" });
  await advanceScene(page, "c1-recruit");
  const s = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("lte-save")!),
  );
  expect(s.forestChapter.geraudRecruited).toBe(true);
  const g = s.units.find((u: any) => u.id === "geraud");
  expect(g.owner).toBe(2);
  expect(g.hp).toBe(11);
  expect(g.x).toBe(28);
  expect(s.common.queue[s.common.index]).toBe("geraud");
  // Deterministic victory checkpoint isolates the final dialogue from combat balancing.
  await page.goto("/");
  await page.evaluate(async () => {
    const E = await import(String("/src/engine.ts"));
    const s = E.decode(localStorage.getItem("lte-save")!);
    for (const u of s.units) if (u.owner === 0) u.hp = 0;
    E.checkEnd(s);
    localStorage.setItem("lte-save", E.encode(s));
  });
  await page.reload();
  await page.locator('[data-action="continue"]').click();
  await expect(page.locator('[data-story-scene="c1-cave"]')).toBeVisible();
  await page.clock.fastForward(9000);
  await page.screenshot({ path: "artifacts/chapter-one/cave.png" });
  await advanceScene(page, "c1-cave");
  await expect(
    page.getByRole("heading", { name: "Chapitre 1 — Pour ne pas oublier" }),
  ).toBeVisible();
});
test("Chapitre 1 : branche voyageurs sans Parler et lame métallique", async ({
  page,
}) => {
  await fixture(page, "travelers");
  await clickUnit(page, 27, 21);
  await clickUnit(page, 27, 21);
  await expect(page.locator('[data-action="talk-geraud"]')).toHaveCount(0);
  const changed = await page.evaluate(async () => {
    const R = await import(String("/src/sprites/resources.ts"));
    const E = await import(String("/src/engine.ts"));
    const C = await import(String("/src/sprites/catalog.ts"));
    const u = E.makeClassUnit("s", 0, 1, "squire", "Géraud", 0, 0, "male", [
      "man_at_arms",
      "spearman",
    ]);
    await R.warmSprites([u], E.defaultTeamColors, ["idle", "move", "attack"]);
    const c = document.createElement("canvas");
    c.width = 1024;
    c.height = 512;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#28352f";
    ctx.fillRect(0, 0, c.width, c.height);
    for (let i = 0; i < 4; i++)
      R.drawResourceFrame(
        ctx,
        R.unitSpriteProfile(u),
        "idle",
        i,
        i * 256,
        0,
        256,
        256,
        false,
        "pink",
        "world",
      );
    document.querySelector("#app")!.replaceChildren(c);
    const clip = C.resolveClip(R.unitSpriteProfile(u), "idle")!;
    const before = R.spriteImage(clip.source);
    const image = R.prepareSpriteSource(clip, "pink")!;
    const x = document.createElement("canvas");
    x.width = before.width;
    x.height = before.height;
    const p = x.getContext("2d")!;
    p.drawImage(before, 0, 0);
    const a = p.getImageData(0, 0, x.width, x.height).data;
    p.clearRect(0, 0, x.width, x.height);
    p.drawImage(image, 0, 0);
    const b = p.getImageData(0, 0, x.width, x.height).data;
    let steel = 0;
    for (let i = 0; i < a.length; i += 4)
      if (a[i] > a[i + 2] + 22 && b[i + 2] > b[i] && a[i + 3] === b[i + 3])
        steel++;
    return steel;
  });
  expect(changed).toBeGreaterThan(50);
  await page.screenshot({ path: "artifacts/chapter-one/geraud-steel.png" });
});

test("Chapitre 1 : vote de son propre joueur, attente du pair et présentation mobile", async ({
  page,
}) => {
  await page.goto("/");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(async () => {
    const E = await import(String("/src/engine.ts")),
      M = await import(String("/src/main.ts"));
    const s = E.createCampaign(["north", "knight"]);
    E.beginForestChapter(s);
    for (let n = 0; n < 2; n++) {
      const id = s.chapter1!.pending!.id;
      while (s.chapter1!.pending!.id === id) E.advanceChapterLine(s);
    }
    M.applyCooperativeSnapshot(s, 1);
  });
  await expect(page.locator(".patrol-choice")).toBeVisible();
  for (const b of await page.locator('[data-patrol-owner="2"]').all())
    await expect(b).toBeDisabled();
  await page
    .locator('[data-patrol-owner="1"][data-patrol-choice="storm"]')
    .click();
  await expect(page.locator(".patrol-status")).toContainText("attente");
  await page.evaluate(async () => {
    const E = await import(String("/src/engine.ts")),
      M = await import(String("/src/main.ts"));
    const s = E.decode(localStorage.getItem("lte-save")!);
    E.votePatrol(s, 2, "travelers");
    M.applyCooperativeSnapshot(s, 1);
  });
  await expect(page.locator(".patrol-status")).toContainText("diffèrent");
  const b = await page.locator(".patrol-choice").boundingBox();
  expect(b!.x).toBeGreaterThanOrEqual(0);
  expect(b!.x + b!.width).toBeLessThanOrEqual(390);
  expect(b!.y).toBeGreaterThanOrEqual(0);
  expect(b!.y + b!.height).toBeLessThanOrEqual(844);
  await page.screenshot({ path: "artifacts/chapter-one/vote-mobile.png" });
});
test("Écuyer et Écuyère : contrôle visuel des lames, course, frappe et blessure existantes", async ({
  page,
}) => {
  await page.goto("/");
  const missing = await page.evaluate(async () => {
    const E = await import(String("/src/engine.ts")),
      R = await import(String("/src/sprites/resources.ts")),
      S = await import(String("/src/sprites/combat-skins.ts")),
      C = await import(String("/src/sprites/catalog.ts"));
    const c = document.createElement("canvas");
    c.width = 1440;
    c.height = 700;
    document.querySelector("#app")!.replaceChildren(c);
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#243830";
    ctx.fillRect(0, 0, c.width, c.height);
    const missing: string[] = [];
    let row = 0;
    for (const gender of ["male", "female"]) {
      const u = E.makeClassUnit("s", 2, 2, "squire", "Géraud", 0, 0, gender, [
        "man_at_arms",
        "spearman",
      ]);
      const p = S.combatSkin(R.unitSpriteProfile(u))?.profile;
      let col = 0;
      for (const [animation, frame] of [
        ["idle", 0],
        ["move", 0],
        ["move", 1],
        ["attack", 2],
        ["attack", 3],
        ["damage", 1],
        ["death", 1],
      ]) {
        const clip = C.resolveClip(p, animation);
        if (clip) await R.spriteImage(clip.source).decode();
        if (
          !R.drawResourceFrame(
            ctx,
            p,
            animation,
            frame,
            col * 200,
            row * 340,
            200,
            270,
            false,
            "yellow",
            "fit",
          )
        )
          missing.push(gender + animation);
        ctx.fillStyle = "#eeddb6";
        ctx.font = "14px sans-serif";
        ctx.fillText(
          gender + " · " + animation + " " + frame,
          col * 200 + 8,
          row * 340 + 300,
        );
        col++;
      }
      row++;
    }
    return missing;
  });
  expect(missing).toEqual([]);
  await page.screenshot({ path: "artifacts/chapter-one/squire-poses.png" });
});
