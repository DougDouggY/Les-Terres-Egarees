import { test, expect, type Page } from "@playwright/test";
async function fixture(page: Page, scene = "arrival-1", line = 0) {
  await page.goto("/");
  await page.evaluate(
    async ({ scene, line }) => {
      const E = await import(String("/src/engine.ts"));
      const { ChapterDirector } = await import(
        String("/src/ui/chapter-dialogue.ts")
      );
      const s = E.createCampaign(
        ["north", "knight"],
        [
          {
            faction: "north",
            gender: "female",
            classId: "raider",
            name: "Athéna",
            portraitId: "V10",
          },
          {
            faction: "knight",
            gender: "male",
            classId: "man_at_arms",
            name: "Arthur",
            portraitId: "C04",
          },
        ],
        [["solveig", "bryn"], ["gaspard"]],
      );
      if (scene.startsWith("c1-")) E.beginForestChapter(s);
      s.chapter1 = {
        ...s.chapter1,
        started: true,
        completed: [],
        pending: {
          id: scene,
          owner: scene === "arrival-1" ? 1 : 2,
          page: line,
        },
      };
      s.scene = "chapter1:" + scene;
      const parent = document.createElement("main");
      parent.style.cssText =
        "position:fixed;inset:0;background:repeating-linear-gradient(30deg,#627960,#627960 20px,#647b62 21px,#647b62 40px)";
      const root = document.createElement("div");
      root.id = "chapter-overlay";
      parent.append(root);
      document.body.replaceChildren(parent);
      let advances = 0;
      const d = new ChapterDirector(
        root,
        s,
        () => {
          advances++;
        },
        () => {},
      );
      const tick = (t: number) => {
        d.tick(t);
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
      (window as any).dialogueFixture = {
        d,
        s,
        root,
        get advances() {
          return advances;
        },
        nextLine() {
          s.chapter1.pending.page++;
          d.refresh();
        },
      };
    },
    { scene, line },
  );
  await expect(page.locator("#chapter-overlay")).toHaveAttribute(
    "data-ready",
    "true",
    { timeout: 15000 },
  );
}
test("FE8 : un interlocuteur puis deux, grand portrait importé, nom absent, composition plein écran", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await fixture(page);
  await expect(page.locator(".chapter-portrait img")).toHaveCount(1);
  await expect(page.locator(".chapter-portrait.speaking img")).toHaveAttribute(
    "data-portrait-source",
    /V10.png$/,
  );
  await expect(page.locator(".chapter-speaker")).toHaveCount(0);
  await expect(page.locator(".chapter-portrait canvas")).toHaveCount(0);
  await page.evaluate(() => (window as any).dialogueFixture.nextLine());
  await expect(page.locator(".chapter-portrait img")).toHaveCount(2);
  await expect(page.locator(".chapter-portrait.speaking img")).toHaveAttribute(
    "alt",
    "Portrait de Solveig",
  );
  await expect(page.locator(".chapter-portrait.listening img")).toHaveAttribute(
    "alt",
    "Portrait de Athéna",
  );
  const box = (await page.locator(".fe-dialogue").boundingBox())!,
    portrait = (await page
      .locator(".chapter-portrait.speaking")
      .boundingBox())!;
  expect(box.width).toBe(1280);
  expect(box.height).toBe(800);
  const speech = (await page.locator(".chapter-speech").boundingBox())!;
  expect(speech.y).toBeLessThan(60);
  expect(speech.width).toBeGreaterThan(900);
  expect(speech.height).toBeLessThan(300);
  expect(portrait.height).toBeGreaterThan(240);
  expect(portrait.height).toBeLessThan(350);
  expect(portrait.y + portrait.height).toBeGreaterThanOrEqual(798);
  await expect(page.locator(".chapter-portrait.speaking img")).toHaveAttribute(
    "data-backdrop-masked",
    "true",
  );
  await expect(page.locator(".chapter-text")).toContainText("tempête");
  expect(
    await page
      .locator(".chapter-portrait.speaking img")
      .evaluate((im) => getComputedStyle(im).objectFit),
  ).toBe("contain");
  await page.screenshot({ path: "/tmp/dialogue-fe8-desktop.png" });
});
test("FE8 : texte paginé sans avancer la scène, clic et clavier, puis un ennemi", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await fixture(page, "arrival-1", 2);
  const original = await page.evaluate(
    () => (window as any).dialogueFixture.d["textPages"],
  );
  expect(original.length).toBeGreaterThan(1);
  await expect(page.locator(".chapter-text")).toHaveText(original[0].trim());
  await page.keyboard.press("Enter");
  await expect(page.locator(".chapter-dialogue")).toHaveAttribute(
    "data-text-page",
    "1",
  );
  expect(
    await page.evaluate(() => (window as any).dialogueFixture.advances),
  ).toBe(0);
  await page.locator(".chapter-text").click();
  await expect(page.locator(".chapter-text")).toHaveText(original[1].trim());
  const box = (await page.locator(".chapter-speech").boundingBox())!;
  expect(box.height).toBeLessThan(190);
  expect(box.y).toBeLessThan(40);
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(390);
  await page.screenshot({ path: "/tmp/dialogue-fe8-mobile.png" });
  await fixture(page, "c1-captain", 0);
  await expect(page.locator(".chapter-portrait.speaking img")).toHaveAttribute(
    "data-portrait-source",
    /N0[34].png$/,
  );
  await expect(page.locator(".chapter-speaker")).toHaveCount(0);
});
