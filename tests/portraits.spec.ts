import { test, expect } from "@playwright/test";
test("création : galerie compatible, choix indépendant et aperçu des deux héros", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Nouvelle aventure/ }).click();
  await page.getByRole("button", { name: /Créer nos personnages/ }).click();
  await expect(
    page.locator('[aria-label="Apparence du joueur 1"] [data-portrait-id]'),
  ).toHaveCount(6);
  await page.locator("#hero-gender-1").selectOption("female");
  await page.locator('[data-action="appearance-0-V10"]').click();
  await page.locator('[data-action="appearance-1-C04"]').click();
  await expect(
    page.locator('[data-action="appearance-0-V10"]'),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.locator(
      '[aria-label="Apparence du joueur 1"] .appearance-preview img',
    ),
  ).toHaveAttribute("src", /V10.png$/);
  await expect(
    page.locator(
      '[aria-label="Apparence du joueur 2"] .appearance-preview img',
    ),
  ).toHaveAttribute("src", /C04.png$/);
  await expect(
    page.locator('[aria-label="Apparence du joueur 2"] [data-portrait-id]'),
  ).toHaveCount(7);
  await page.waitForFunction(() =>
    Array.from(
      document.querySelectorAll<HTMLImageElement>(".appearance-picker img"),
    ).every((im) => im.complete && im.naturalWidth > 0),
  );
  await page.locator('[data-action="creator-hero-ready-0"]').click();
  await page.locator('[data-action="creator-hero-ready-1"]').click();
  for (const i of [0, 1])
    for (let n = 0; n < 2; n++)
      await page.locator(`[data-action="creator-intro-${i}"]`).click();
  const cast = await page
    .locator(".companion-identity img")
    .evaluateAll((imgs) => imgs.map((im) => im.getAttribute("src")));
  expect(cast).toHaveLength(9);
  expect(new Set(cast).size).toBe(9);
  await page.locator('[data-companion="0:astrid"]').check();
  await page.locator('[data-companion="0:solveig"]').check();
  await page.locator('[data-companion="1:gaspard"]').check();
  const previews = await page
    .locator(".companion-card:has(input:checked) .companion-identity img")
    .evaluateAll((imgs) =>
      imgs.map((im) => {
        const src = im.getAttribute("src")!;
        return src.slice(src.indexOf("assets/portraits/"));
      }),
    );
  await expect(
    page.locator(".companion-card:has(input:checked) .companion-identity img"),
  ).toHaveCount(3);
  await page.locator('[data-action="creator-party-ready-0"]').click();
  await page.locator('[data-action="creator-party-ready-1"]').click();
  await page.getByRole("button", { name: /Commencer le prologue/ }).click();
  await page.waitForFunction(() => !!localStorage.getItem("lte-save"));
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("lte-save")!),
  );
  expect(saved.portraits.assignments.p1a).toBe("V10");
  expect(saved.portraits.assignments.p2a).toBe("C04");
  expect(
    saved.units
      .filter((u: any) => u.owner !== 0 && !u.leader)
      .map((u: any) => u.portraitAsset),
  ).toEqual(previews);
  await page.reload();
  await page.locator('[data-action="continue"]').click();
  await page.waitForFunction(() => document.querySelector(".chapter-dialogue"));
  await expect(page.locator(".chapter-portrait img")).toHaveAttribute(
    "src",
    /V10.png$/,
  );
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  for (const img of await page.locator(".appearance-gallery img").all())
    expect(
      await img.evaluate(
        (im: HTMLImageElement) => im.complete && im.naturalWidth > 0,
      ),
    ).toBe(true);
});
test("dialogues : portraits des joueurs, Maëlys, Géraud et fiches des ennemis", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const E = await import(String("/src/engine.ts"));
    const { ChapterDirector } = await import(
      String("/src/ui/chapter-dialogue.ts")
    );
    const { characterSheet } = await import(
      String("/src/ui/character-sheet.ts")
    );
    const s = E.createCampaign(["north", "knight"]);
    const identities = s.units
      .filter((u: any) => u.leader)
      .map((u: any) => u.portraitAsset);
    const root = document.createElement("div");
    document.body.append(root);
    s.chapter1 = {
      started: true,
      completed: [],
      pending: { id: "arrival-1", owner: 1, page: 0 },
    };
    s.scene = "chapter1:arrival-1";
    const d = new ChapterDirector(
      root,
      s,
      () => {},
      () => {},
    );
    const north = root.querySelector("img")?.getAttribute("src");
    d.dispose();
    s.chapter1.pending = { id: "arrival-2", owner: 2, page: 0 };
    s.scene = "chapter1:arrival-2";
    const d2 = new ChapterDirector(
      root,
      s,
      () => {},
      () => {},
    );
    const knight = root.querySelector("img")?.getAttribute("src"),
      right = !!root.querySelector(".portrait-right");
    d2.dispose();
    E.beginForestChapter(s);
    s.chapter1.pending = { id: "c1-cave", owner: 2, page: 1 };
    s.scene = "chapter1:c1-cave";
    const lines = E.chapterLines(s, "c1-cave");
    const w = lines.findIndex((l: any) => l.speaker === "witch");
    s.chapter1.pending.page = w;
    const d3 = new ChapterDirector(
      root,
      s,
      () => {},
      () => {},
    );
    const witch = root.querySelector("img")?.getAttribute("src");
    d3.dispose();
    s.chapter1.pending = {
      id: "c1-recruit",
      owner: 2,
      page: E.chapterLines(s, "c1-recruit").findIndex(
        (l: any) => l.speaker === "geraud",
      ),
    };
    const d4 = new ChapterDirector(
      root,
      s,
      () => {},
      () => {},
    );
    const geraud = root.querySelector("img")?.getAttribute("src");
    d4.dispose();
    const enemy = s.units.find((u: any) => u.owner === 0 && u.id !== "geraud");
    const html = characterSheet(enemy, false, s);
    root.innerHTML = html;
    const soldier = root.querySelector("img")?.getAttribute("src");
    return { identities, north, knight, right, witch, geraud, soldier };
  });
  expect(result.north).toBe("/" + result.identities[0]);
  expect(result.knight).toBe("/" + result.identities[1]);
  expect(result.right).toBe(true);
  expect(result.witch).toMatch(/R01.png$/);
  expect(result.geraud).toMatch(/R03.png$/);
  expect(result.soldier).toMatch(/N0[34].png$/);
});

test("fiches : portraits et statistiques accessibles sur téléphone, Sans-Repos compris", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.evaluate(async () => {
    const E = await import(String("/src/engine.ts"));
    const { characterSheet } = await import(
      String("/src/ui/character-sheet.ts")
    );
    const s = E.createCampaign(["north", "knight"]);
    const root = document.createElement("main");
    root.className = "compact-battle";
    root.innerHTML = `<section class="unit-window character-window">${characterSheet(
      s.units.find((u: any) => u.owner === 0),
      false,
      s,
    )}</section>`;
    document.body.replaceChildren(root);
  });
  const img = page.locator(".character-portrait-slot img");
  await expect(img).toBeVisible();
  await expect(img).toHaveAttribute("src", /N05.png$/);
  const box = (await page.locator(".character-window").boundingBox())!;
  expect(box.width).toBeLessThanOrEqual(390);
  const portrait = (await page
    .locator(".character-portrait-slot")
    .boundingBox())!;
  expect(Math.abs(portrait.width - portrait.height)).toBeLessThan(1);
  await expect(page.locator(".character-class")).toBeVisible();
});
