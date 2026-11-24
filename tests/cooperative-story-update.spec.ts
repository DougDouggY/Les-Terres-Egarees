import { test, expect } from "@playwright/test";
test("chapitre II : deux vues coopératives, acquittement partagé et portraits des héros inversés", async ({
  browser,
}) => {
  const a = await browser.newPage(),
    b = await browser.newPage();
  try {
    await a.routeWebSocket(/.*/, () => {});
    await b.routeWebSocket(/.*/, () => {});
    await a.goto("/");
    await b.goto("/");
    let payload = await a.evaluate(async () => {
      const E = await import(String("/src/engine.ts"));
      const s = E.createCampaign(["knight", "north"]);
      E.beginForestChapter(s);
      const finish = () => {
        const id = s.chapter1!.pending!.id;
        while (s.chapter1?.pending?.id === id) E.advanceChapterLine(s);
      };
      while (s.chapter1?.pending?.id !== "c1-choice") finish();
      E.votePatrol(s, 1, "storm");
      E.votePatrol(s, 2, "storm");
      E.confirmPatrol(s);
      while (s.chapter1?.pending) finish();
      for (const u of s.units) if (u.owner === 0) u.hp = 0;
      E.checkEnd(s);
      finish();
      finish();
      E.storyUnit(s, "north-chief")!.name = "Skadi";
      E.storyUnit(s, "knight-chief")!.name = "Léonie";
      E.advanceChapterLine(s, 1, { id: "c2-cave", page: 0 });
      return E.encode(s);
    });
    const show = async () => {
      for (const [p, owner] of [
        [a, 1],
        [b, 2],
      ] as const)
        await p.evaluate(
          async ({ payload, owner }) => {
            const E = await import(String("/src/engine.ts")),
              M = await import(String("/src/main.ts"));
            M.applyCooperativeSnapshot(E.decode(payload), owner);
          },
          { payload, owner },
        );
    };
    await show();
    await expect(a.locator("[data-story-next]")).toBeDisabled();
    await expect(a.locator("[data-story-next]")).toContainText("attente");
    await expect(b.locator("#chapter-overlay")).toHaveAttribute(
      "data-ready",
      "true",
    );
    await expect(b.locator("[data-story-next]")).toBeEnabled();
    payload = await b.evaluate(async (payload) => {
      const E = await import(String("/src/engine.ts")),
        s = E.decode(payload);
      E.advanceChapterLine(s, 2, { id: "c2-cave", page: 0 });
      return E.encode(s);
    }, payload);
    await show();
    for (const p of [a, b]) {
      await expect(p.locator('[data-story-scene="c2-cave"]')).toHaveAttribute(
        "data-story-line",
        "1",
      );
      await expect(p.locator('[data-story-scene="c2-cave"]')).toHaveAttribute(
        "data-current-speaker",
        "p2a",
      );
      await expect(
        p.locator('.dialogue-portrait-identity[aria-label="Skadi"]'),
      ).toBeVisible();
    }
  } finally {
    await a.close();
    await b.close();
  }
});
