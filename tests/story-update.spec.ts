import { test, expect, type Page } from "@playwright/test";
test.beforeEach(async ({ page }) => {
  await page.routeWebSocket(/.*/, () => {});
});
async function fixture(page: Page, id: string, choice = "storm", last = false) {
  await page.goto("/");
  await page.evaluate(
    async ({ id, choice, last }) => {
      const E = await import(String("/src/engine.ts"));
      const s = E.createCampaign(["north", "knight"]);
      E.beginForestChapter(s);
      const finish = () => {
        const scene = s.chapter1!.pending!.id;
        for (let i = 0; i < 90 && s.chapter1?.pending?.id === scene; i++)
          E.advanceChapterLine(s);
      };
      while (s.chapter1?.pending?.id !== "c1-choice") finish();
      E.votePatrol(s, 1, choice);
      E.votePatrol(s, 2, choice);
      E.confirmPatrol(s);
      if (id.startsWith("c2-")) {
        while (s.chapter1?.pending) finish();
        for (const u of s.units) if (u.owner === 0) u.hp = 0;
        E.checkEnd(s);
        while (s.chapter1?.pending?.id !== id) finish();
      }
      if (last) s.chapter1!.pending!.page = E.chapterLines(s, id).length - 1;
      E.storyUnit(s, "knight-chief")!.name = "Anaïs-Lune";
      E.storyUnit(s, "north-chief")!.name = "Bjørn";
      localStorage.setItem("lte-save", E.encode(s));
    },
    { id, choice, last },
  );
  await page.reload();
  await page.locator('[data-action="continue"]').click();
  await page
    .getByRole("button", { name: "Charger sans modifier", exact: true })
    .click();
}
for (const choice of ["travelers", "storm"])
  test(`patrouille officielle : ${choice}, cinématique exclusive et retour à la bataille`, async ({
    page,
  }) => {
    await page.clock.install();
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await fixture(
      page,
      choice === "travelers" ? "c1-travelers" : "c1-storm",
      choice,
      true,
    );
    await expect(page.locator("#chapter-overlay")).toHaveAttribute(
      "data-ready",
      "true",
    );
    await page.clock.fastForward(10000);
    await page.locator("[data-story-next]").click();
    if (choice === "travelers") {
      await expect(page.locator('[data-scripted-combat="maelys"]')).toHaveCount(
        1,
      );
      await expect(page.locator(".chapter-dialogue")).toHaveCount(0);
      await expect(page.locator("#chapter-overlay")).toHaveAttribute(
        "data-ready",
        "true",
      );
      await page.evaluate(() => {
        (window as any).storyResults = [];
        new MutationObserver(() => {
          const t = document.querySelector(".scripted-result")?.textContent;
          if (t) (window as any).storyResults.push(t);
        }).observe(document.querySelector("#app")!, {
          childList: true,
          subtree: true,
          characterData: true,
        });
      });
      await page.clock.runFor(1100);
      await expect(page.locator(".story-ambush-duel")).toBeVisible();
      await page.screenshot({ path: "/tmp/story-maelys-ambush.png" });
      await page.clock.runFor(6500);
      const results = await page.evaluate(
        () => (window as any).storyResults as string[],
      );
      expect(results).toContain("ESQUIVE");
      expect(results).toContain("CRITIQUE");
    } else await expect(page.locator("[data-scripted-combat]")).toHaveCount(0);
    await expect(page.locator('[data-story-scene="c1-deploy"]')).toHaveCount(1);
    await page.clock.runFor(9000);
    await expect(page.locator("#map")).toBeVisible();
    expect(errors).toEqual([]);
  });
test("chapitre II : titre avant la grotte, portraits des vrais héros, Écorcheurs et arrêt sans carte de camp", async ({
  page,
}) => {
  test.setTimeout(240000);
  await page.clock.install();
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await fixture(page, "c2-title");
  await expect(page.locator(".prologue-title h1")).toHaveText(
    "Un ennemi commun",
  );
  await expect(page.locator(".cave-actors")).toHaveCount(0);
  await page.clock.runFor(4000);
  await expect(page.locator('[data-story-scene="c2-cave"]')).toHaveCount(1);
  await expect(page.locator(".cave-actors")).toBeVisible();
  await expect(page.locator("#chapter-overlay")).toHaveAttribute(
    "data-ready",
    "true",
  );
  let sawVisitor = false,
    sawHero = false;
  for (
    let i = 0;
    i < 160 && (await page.locator("[data-story-next]").count());
    i++
  ) {
    await page.clock.fastForward(9000);
    if (await page.locator('[data-story-scene="c2-visitors"]').count()) {
      if (!sawVisitor) {
        await expect(page.locator(".cave-actors")).toHaveAttribute(
          "data-visitors",
          "3",
        );
        await page.screenshot({ path: "/tmp/story-cave-visitors.png" });
      }
      sawVisitor = true;
    }
    if (
      await page
        .locator(
          '.chapter-portrait [aria-label*="Anaïs"],.chapter-portrait img[alt*="Anaïs"]',
        )
        .count()
    )
      sawHero = true;
    await page.locator("[data-story-next]").click();
  }
  await expect(page.locator(".summary-screen h1")).toHaveText(
    "Chapitre II — Un ennemi commun",
  );
  expect(sawVisitor).toBe(true);
  expect(sawHero).toBe(true);
  expect(errors).toEqual([]);
  await expect(page.locator(".summary-screen")).toContainText("À suivre");
  await page.screenshot({ path: "/tmp/story-chapter2-stop.png" });
});
test("apparences officielles : 21 gardes, teintes bleue/rose, anciens mouvements et sauvegardes", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const E = await import(String("/src/engine.ts")),
      R = await import(String("/src/sprites/resources.ts")),
      C = await import(String("/src/sprites/catalog.ts")),
      S = await import(String("/src/sprites/combat-skins.ts"));
    const p = R.spriteCatalog.profiles.filter((p: any) =>
      C.resolveClip(p, "idle")?.source.includes("official-advanced"),
    );
    const canvas = document.createElement("canvas");
    canvas.width = 640;
    canvas.height = 400;
    const ctx = canvas.getContext("2d")!;
    const errors: string[] = [];
    for (const profile of p) {
      const skin = S.combatSkin(profile)!.profile;
      for (const color of ["blue", "pink"])
        for (const animation of [
          "idle",
          "move",
          C.resolveClip(skin, "attack") ? "attack" : "heal",
        ]) {
          const c = C.resolveClip(skin, animation)!;
          await R.spriteImage(c.source).decode();
          ctx.clearRect(0, 0, 640, 400);
          if (
            !R.drawResourceFrame(
              ctx,
              skin,
              animation,
              0,
              0,
              0,
              640,
              400,
              true,
              color,
              "fit",
            )
          )
            errors.push(C.profileKey(profile) + ":" + animation);
          const pixels = ctx.getImageData(0, 0, 640, 400).data;
          if (!pixels.some((n: number, i: number) => i % 4 === 3 && n > 64))
            errors.push("empty " + C.profileKey(profile));
        }
    }
    const s = E.createCampaign(
      ["north", "knight"],
      [
        {
          faction: "north",
          gender: "female",
          classId: "raider",
          name: "Ancienne unité",
          portraitId: "V10",
        },
        {
          faction: "knight",
          gender: "male",
          classId: "man_at_arms",
          name: "Allié",
          portraitId: "C01",
        },
      ],
      [["solveig", "bryn"], ["gaspard"]],
    );
    const u = E.makeClassUnit(
      "old-advanced",
      1,
      1,
      "huscarl",
      "Ancienne unité",
      s.units[0].x,
      s.units[0].y,
      "female",
    );
    u.activeWeaponId = "sword_shield";
    E.syncWeapon(u);
    u.combatSkinId = "huscarl:any:sword-shield:default";
    u.id = s.units[0].id;
    u.leader = true;
    s.units[0] = u;
    const before = JSON.stringify({
      level: u.level,
      xp: u.xp,
      hp: u.hp,
      weapon: u.activeWeaponId,
    });
    const back = E.decode(E.encode(s));
    const restored = back.units.find((t: any) => t.id === u.id)!;
    const skin = R.unitSpriteProfile(restored);
    return {
      count: p.length,
      errors,
      gender: skin?.gender,
      source: C.resolveClip(skin, "idle")?.source,
      before,
      after: JSON.stringify({
        level: restored.level,
        xp: restored.xp,
        hp: restored.hp,
        weapon: restored.activeWeaponId,
      }),
    };
  });
  expect(result.count).toBe(21);
  expect(result.errors).toEqual([]);
  expect(result.gender).toBe("female");
  expect(result.source).toContain("official-advanced");
  expect(result.after).toBe(result.before);
});

test("téléphone : départ du chapitre II, sauvegarde manuelle et reprise du bilan", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.clock.install();
  await fixture(page, "c2-depart");
  await expect(page.locator(".cave-actors")).toBeVisible();
  await expect(page.locator("#chapter-overlay")).toHaveAttribute(
    "data-ready",
    "true",
  );
  await page.clock.fastForward(9000);
  await expect(page.locator(".cave-actors")).toHaveAttribute(
    "data-departure",
    "1",
  );
  await page.screenshot({ path: "/tmp/story-cave-mobile.png" });
  for (
    let i = 0;
    i < 8 && (await page.locator("[data-story-next]").count());
    i++
  ) {
    await page.clock.fastForward(9000);
    await page.locator("[data-story-next]").click();
  }
  await expect(page.locator(".summary-screen")).toContainText("À suivre");
  await page.locator('[data-action="save"]').click();
  await page
    .getByRole("textbox", { name: "Nom de la sauvegarde" })
    .fill("Chapitre II officiel");
  await page
    .getByRole("button", { name: "Créer une sauvegarde", exact: true })
    .click();
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("lte-manual-saves-v1")!).slots.find(
      (s: any) => s.name === "Chapitre II officiel",
    ),
  );
  expect(saved.chapter).toBe("Chapitre II — Un ennemi commun");
  expect(saved.progression).toBe("En route avec les Écorcheurs");
  expect(JSON.parse(saved.payload).chapter2.stage).toBe("awaiting-battle");
  await page.reload();
  await page.locator('[data-action="continue"]').click();
  await page.locator("[data-slot-load]").first().click();
  await expect(page.locator(".summary-screen h1")).toHaveText(
    "Chapitre II — Un ennemi commun",
  );
  await expect(page.locator(".summary-screen")).toContainText("Bjørn");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
  ).toBe(false);
});
