import { test, expect } from "@playwright/test";
for (const mobile of [false, true])
  test(`carte chapitre II : ${mobile ? "téléphone" : "ordinateur"}, cases et passages`, async ({
    page,
  }) => {
    await page.setViewportSize(
      mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 },
    );
    await page.routeWebSocket(/.*/, () => {});
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/");
    await page.evaluate(() =>
      localStorage.setItem("lte-save", "sauvegarde à conserver"),
    );
    await page
      .getByRole("button", { name: "Carte du chapitre 2", exact: true })
      .click();
    const canvas = page.locator("[data-camp-canvas]");
    await expect(canvas).toHaveAttribute("data-ready", "true", {
      timeout: 30000,
    });
    await expect(page.locator("[data-camp-status]")).toContainText(
      "Praticable",
    );
    await page
      .getByRole("combobox", { name: "Aller à un lieu" })
      .selectOption("4");
    await expect(canvas).toHaveAttribute(
      "data-selected",
      String(18 * 40 + 29 + 1),
    );
    await expect(canvas).toHaveAttribute("data-reachable", "true");
    await page.getByLabel("Grille", { exact: true }).uncheck();
    await expect(canvas).toHaveAttribute("data-grid", "false");
    await page.getByRole("button", { name: "Zoomer", exact: true }).click();
    await page
      .getByRole("button", { name: "Vue entière", exact: true })
      .click();
    const bounds = await canvas.boundingBox();
    await canvas.click({
      position: {
        x: (12.5 / 40) * bounds!.width,
        y: (8.5 / 28) * bounds!.height,
      },
    });
    await expect(canvas).toHaveAttribute("data-reachable", "false");
    await expect(page.locator("[data-camp-status]")).toContainText(
      "Baraquement",
    );
    await page
      .getByRole("combobox", { name: "Aller à un lieu" })
      .selectOption("0");
    await page.getByLabel("Grille", { exact: true }).check();
    await page.screenshot({
      path: `/tmp/camp-chapter2-${mobile ? "mobile" : "desktop"}.png`,
    });
    expect(await page.evaluate(() => localStorage.getItem("lte-save"))).toBe(
      "sauvegarde à conserver",
    );
    await page.getByRole("button", { name: "Retour", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Nouvelle partie", exact: false }),
    ).toBeVisible();
    expect(errors).toEqual([]);
  });
