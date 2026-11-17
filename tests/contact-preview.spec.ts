import { test, expect } from "@playwright/test";
test("accueil : quatre essais, vitesse et pause, maintien au contact, attaque unique et sauvegardes inchangées", async ({
  page,
}) => {
  await page.goto("/");
  const saves = await page.evaluate(() => JSON.stringify({ ...localStorage }));
  await page
    .getByRole("button", { name: "Essai Pillard contre Pillard", exact: true })
    .click();
  const canvas = page.locator("[data-contact-canvas]");
  await expect(page.locator('[data-contact-scenario="agility"]')).toBeEnabled();
  await page.locator("[data-contact-speed]").selectOption("4");
  for (const id of ["agility", "parry", "double-parry", "dodges"]) {
    await page.locator(`[data-contact-scenario="${id}"]`).click();
    await expect
      .poll(async () => Number(await canvas.getAttribute("data-elapsed")))
      .toBeGreaterThan(900);
    const left = await canvas.getAttribute("data-left-x"),
      right = await canvas.getAttribute("data-right-x");
    expect(Number(left)).toBeGreaterThan(270);
    expect(Number(right)).toBeLessThan(690);
    expect(Number(left) + Number(right)).toBeCloseTo(960, 5);
    await page.locator("[data-contact-pause]").click();
    const paused = await canvas.getAttribute("data-elapsed");
    await page.waitForTimeout(180);
    expect(await canvas.getAttribute("data-elapsed")).toBe(paused);
    await page.locator("[data-contact-pause]").click();
    await expect(canvas).toHaveAttribute("data-finished", "true");
    await expect(canvas).toHaveAttribute("data-left-x", left!);
    await expect(canvas).toHaveAttribute("data-right-x", right!);
    await expect(canvas).toHaveAttribute(
      "data-applied",
      id === "double-parry" ? "5" : "3",
    );
    await expect(
      page.locator("[data-contact-events] .contact-applied"),
    ).toHaveCount(id === "double-parry" ? 5 : 3);
    if (id === "dodges")
      await expect(page.locator('[data-combat-value="1"]')).toHaveText(
        "0 / 24 PV",
      );
  }
  const stage = await page.locator(".contact-stage").boundingBox();
  expect(stage!.width).toBeGreaterThan(900);
  expect(stage!.y + stage!.height).toBeLessThanOrEqual(720);
  await expect(page.locator("[data-contact-events]")).toBeHidden();
  await expect(page.locator("[data-contact-status]")).toHaveCSS("width", "1px");
  await page.screenshot({ path: "/tmp/contact-preview.png", fullPage: true });
  await page.getByRole("button", { name: "Retour à l’accueil" }).click();
  await expect(
    page.getByRole("button", {
      name: "Essai Pillard contre Pillard",
      exact: true,
    }),
  ).toBeVisible();
  expect(await page.evaluate(() => JSON.stringify({ ...localStorage }))).toBe(
    saves,
  );
});

test("nouvelles poses : pas rapides, vrai retrait illustré des deux côtés et critique visible", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Essai Pillard contre Pillard", exact: true })
    .click();
  await expect(page.locator('[data-contact-scenario="dodges"]')).toBeEnabled();
  await page.locator("[data-contact-speed]").selectOption("0.5");
  await page.locator('[data-contact-scenario="dodges"]').click();
  const c = page.locator("[data-contact-canvas]");
  await page.waitForFunction(
    () =>
      Number(
        document.querySelector<HTMLCanvasElement>("[data-contact-canvas]")!
          .dataset.elapsed,
      ) > 250,
  );
  await page.locator("[data-contact-pause]").click();
  await expect(c).toHaveAttribute("data-left-action", "move");
  await expect(c).toHaveAttribute(
    "data-left-frame-source",
    /pillard-quickstep-dodge-v6/,
  );
  await page.screenshot({ path: "/tmp/pillard-quickstep-v6.png" });
  await page.locator("[data-contact-pause]").click();
  await page.waitForFunction(() => {
    const c = document.querySelector<HTMLCanvasElement>(
      "[data-contact-canvas]",
    )!;
    return (
      c.dataset.rightAction === "evade" && Number(c.dataset.rightOffset) > 40
    );
  });
  await page.locator("[data-contact-pause]").click();
  await page.screenshot({ path: "/tmp/pillard-backstep-v6.png" });
  await expect(c).toHaveAttribute(
    "data-right-frame-source",
    /pillard-quickstep-dodge-v6/,
  );
  await page.locator("[data-contact-pause]").click();
  await page.waitForFunction(() => {
    const c = document.querySelector<HTMLCanvasElement>(
      "[data-contact-canvas]",
    )!;
    return (
      c.dataset.leftAction === "evade" && Number(c.dataset.leftOffset) < -40
    );
  });
  await page.waitForFunction(
    () =>
      document.querySelector<HTMLCanvasElement>("[data-contact-canvas]")!
        .dataset.critical === "true",
  );
  await page.locator("[data-contact-pause]").click();
  await page.screenshot({ path: "/tmp/pillard-critical-v6.png" });
});
