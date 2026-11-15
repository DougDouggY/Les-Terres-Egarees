import { test, expect } from "@playwright/test";
test("création : deux introductions animées, candidats cachés, sauvegarde et reprise", async ({
  page,
}) => {
  const { completeIntroduction } = await import("./introduction-flow");
  await page.goto("/");
  await page.getByRole("button", { name: /Nouvelle partie/ }).click();
  await page.getByRole("button", { name: "Jouer solo", exact: true }).click();
  await page.getByRole("button", { name: /Créer nos personnages/ }).click();
  await expect(page.getByText("Vous", { exact: true })).toHaveCount(2);
  expect(await page.locator(".expedition-creator").innerText()).not.toMatch(
    /expédition\s*[12]/i,
  );
  await page.locator("#hero-name-1").fill("athéna-rose");
  await expect(page.locator("#hero-name-1")).toHaveValue("Athéna-rose");
  await page.locator("#hero-gender-1").selectOption("female");
  const north = await completeIntroduction(page, 0, "north", "V10", [
    "astrid",
    "solveig",
  ]);
  await page.locator("#hero-name-2").fill("arthur");
  await expect(page.locator("#hero-name-2")).toHaveValue("Arthur");
  const knight = await completeIntroduction(page, 1, "knight", "C04", [
    "gaspard",
  ]);
  const { saveIntroduction } = await import("./introduction-flow");
  const saved = await saveIntroduction(page);
  expect(saved.portraits.assignments.p1a).toBe("V10");
  expect(saved.portraits.assignments.p2a).toBe("C04");
  expect(
    Object.keys(saved.portraits.assignments).filter((id) =>
      id.startsWith("companion:"),
    ),
  ).toHaveLength(3);
  for (const x of [north, knight])
    expect(
      saved.units
        .filter((u: any) => u.owner === x.owner && !u.leader)
        .map((u: any) => u.portraitAsset),
    ).toEqual(x.portraits.map((p) => "assets/" + p));
  expect(new Set(Object.values(saved.portraits.assignments)).size).toBe(
    Object.values(saved.portraits.assignments).length,
  );
  await page.reload();
  await page.locator('[data-action="continue"]').click();
  await page.locator("[data-slot-load]").click();
  await expect(page.locator(".chapter-portrait.speaking img")).toHaveAttribute(
    "data-portrait-source",
    /V10.png$/,
    { timeout: 15000 },
  );
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
    const north = root
      .querySelector(".chapter-portrait.speaking img")
      ?.getAttribute("src");
    d.dispose();
    s.chapter1.pending = { id: "arrival-2", owner: 2, page: 0 };
    s.scene = "chapter1:arrival-2";
    const d2 = new ChapterDirector(
      root,
      s,
      () => {},
      () => {},
    );
    const knight = root
        .querySelector(".chapter-portrait.speaking img")
        ?.getAttribute("src"),
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
    const witch = root
      .querySelector(".chapter-portrait.speaking img")
      ?.getAttribute("src");
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
    const geraud = root
      .querySelector(".chapter-portrait.speaking img")
      ?.getAttribute("src");
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
  expect(Math.abs(portrait.width / portrait.height - 4 / 3)).toBeLessThan(0.01);
  await expect(page.locator(".character-class")).toBeVisible();
});
