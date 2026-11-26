import { test, expect } from "@playwright/test";

for (const choice of ["storm", "travelers"] as const)
  test(`accueil → victoire ${choice} → chapitre II, sauvegardes intactes`, async ({
    page,
  }) => {
    test.setTimeout(180000);
    await page.setViewportSize(
      choice === "travelers"
        ? { width: 390, height: 844 }
        : { width: 1280, height: 800 },
    );
    await page.routeWebSocket(/.*/, () => {});
    await page.clock.install();
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.setItem("lte-save", "partie existante à conserver");
      localStorage.setItem(
        "lte-manual-saves-v1",
        JSON.stringify({ version: 1, slots: [] }),
      );
    });
    await page
      .getByRole("button", { name: "Tester chapitre 2", exact: true })
      .click();
    const modal = page.getByRole("dialog", { name: "Tester chapitre 2" });
    await expect(modal).toContainText("après la victoire du chapitre 1");
    await modal.getByRole("button", { name: "Annuler", exact: true }).click();
    await expect(modal).toHaveCount(0);
    await page
      .getByRole("button", { name: "Tester chapitre 2", exact: true })
      .click();
    await modal
      .getByRole("button", {
        name:
          choice === "storm" ? "Tempêtes rouges · avec Géraud" : "Vagabonds",
        exact: true,
      })
      .click();
    await expect(
      page.locator(`[data-story-scene="c1-after-${choice}"]`),
    ).toHaveCount(1);
    await expect(page.locator(".chapter-dialogue")).toContainText(
      choice === "storm"
        ? "Je vous avais pourtant déconseillé"
        : "Quelqu’un peut m’expliquer",
    );
    for (
      let i = 0;
      i < 20 && (await page.locator("[data-story-next]").count());
      i++
    ) {
      await page.clock.fastForward(9000);
      await page.locator("[data-story-next]").click();
    }
    await expect(page.locator(".prologue-title h1")).toHaveText(
      "Un ennemi commun",
    );
    await page.clock.runFor(4000);
    await expect(page.locator('[data-story-scene="c2-cave"]')).toHaveCount(1);
    await expect(page.locator(".cave-actors")).toHaveCount(0);
    await expect(page.locator("#story-map")).toBeHidden();
    const backdrop = await page
      .locator("#chapter-overlay")
      .evaluate(async (el) => {
        const url = getComputedStyle(el).backgroundImage.match(
          /url\(["']?(.*?)["']?\)/,
        )?.[1];
        if (!url) throw Error("Décor de grotte absent");
        const image = new Image();
        image.src = url;
        await image.decode();
        return { url, width: image.naturalWidth, height: image.naturalHeight };
      });
    expect(backdrop.url).toContain("maelys-cave-research");
    expect(backdrop.width).toBeGreaterThan(1200);
    expect(backdrop.height).toBeGreaterThan(700);
    await page.screenshot({ path: `/tmp/maelys-cave-${choice}.png` });
    const seen = new Set<string>();
    for (
      let i = 0;
      i < 170 && (await page.locator("[data-story-next]").count());
      i++
    ) {
      seen.add(
        (await page
          .locator("[data-story-scene]")
          .getAttribute("data-story-scene"))!,
      );
      await page.clock.fastForward(9000);
      await page.locator("[data-story-next]").click();
    }
    expect([...seen]).toEqual(["c2-cave", "c2-visitors", "c2-depart"]);
    await expect(page.locator(".summary-screen h1")).toHaveText(
      "Chapitre II — Un ennemi commun",
    );
    await expect(page.locator(".summary-screen")).toContainText("À suivre");
    await expect(
      page.locator(".summary-units h2").filter({ hasText: /^Géraud$/ }),
    ).toHaveCount(choice === "storm" ? 1 : 0);
    expect(
      await page.evaluate(() => [
        localStorage.getItem("lte-save"),
        localStorage.getItem("lte-manual-saves-v1"),
      ]),
    ).toEqual([
      "partie existante à conserver",
      JSON.stringify({ version: 1, slots: [] }),
    ]);
    expect(errors).toEqual([]);
    await page.screenshot({ path: `/tmp/chapter-two-review-${choice}.png` });
    await page
      .getByRole("button", { name: "Menu principal", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Tester chapitre 2", exact: true }),
    ).toBeVisible();
  });
