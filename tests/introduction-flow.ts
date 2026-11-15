import { expect, type Page } from "@playwright/test";
/** Exercise the public creation UI, including the real staged animation and hidden candidates. */
export async function completeIntroduction(
  page: Page,
  index: 0 | 1,
  faction: "north" | "knight",
  face: string,
  ids: string[],
) {
  const owner = index + 1;
  await page.locator(`[data-action="creator-hero-ready-${index}"]`).click();
  const scene = page.locator(".introduction-scene");
  await expect(scene).toHaveAttribute("data-intro-owner", String(index));
  await expect(scene.locator(".intro-backdrop")).toHaveAttribute(
    "src",
    new RegExp(
      faction === "north"
        ? "viking-drakkar-rrtt.png$"
        : "knight-clearing-rrr.png$",
    ),
  );
  await expect(scene).toHaveAttribute("data-intro-phase", "hood");
  await expect(scene.locator(".intro-bubble p")).toHaveText(
    "Approche, enlève ta capuche.",
  );
  await expect(
    scene.locator(".intro-bubble img,.intro-bubble canvas"),
  ).toHaveCount(0);
  const stopped = Number(
    await scene.locator(".intro-actors").getAttribute("data-hero-x"),
  );
  await scene.locator("[data-intro-next]").click();
  await expect(scene).toHaveAttribute("data-intro-phase", "face");
  const portrait = scene.locator(".intro-face-image");
  const initial = await portrait.getAttribute("data-face-id");
  await scene.getByRole("button", { name: "Visage précédent" }).click();
  expect(await portrait.getAttribute("data-face-id")).not.toBe(initial);
  await scene.getByRole("button", { name: "Visage suivant" }).click();
  await expect(portrait).toHaveAttribute("data-face-id", initial!);
  for (
    let i = 0;
    i < 12 && (await portrait.getAttribute("data-face-id")) !== face;
    i++
  )
    await scene.getByRole("button", { name: "Visage suivant" }).click();
  await expect(portrait).toHaveAttribute("data-face-id", face);
  expect(await scene.locator(".intro-face-panel").innerText()).not.toMatch(
    /[CV]\d{2}/,
  );
  await scene.locator("[data-intro-confirm-face]").click();
  await expect(scene.locator(".intro-face-panel")).toHaveCount(0);
  await expect(scene.locator(".intro-bubble p")).toContainText(
    faction === "north"
      ? "pour le grand voyage à l'ouest ?"
      : "Allez, on y va ! Le convoi ne va pas tarder. Dépêchez-vous !",
  );
  await scene.locator("[data-intro-next]").click();
  await expect(scene).toHaveAttribute("data-intro-phase", "invite");
  await scene.locator("[data-intro-next]").click();
  await expect(scene).toHaveAttribute("data-intro-phase", "recruit");
  expect(
    Number(await scene.locator(".intro-actors").getAttribute("data-hero-x")),
  ).toBe(
    faction === "north"
      ? page.viewportSize()!.width < page.viewportSize()!.height
        ? 0.62
        : 0.35
      : 0.65,
  );
  await expect(scene.locator(".intro-actors")).toHaveAttribute(
    "data-hero-facing",
    faction === "north" ? "right" : "left",
  );
  const panel = scene.locator(".intro-recruit-panel");
  await expect(panel.locator("img,canvas")).toHaveCount(0);
  await expect(scene.locator(".intro-recruit-portraits img")).toHaveCount(0);
  await expect(panel.locator("[data-intro-confirm-party]")).toBeDisabled();
  for (const id of ids)
    await panel.locator(`[data-intro-candidate="${id}"]`).click();
  await expect(panel.locator('[aria-pressed="true"]')).toHaveCount(ids.length);
  await panel.locator("[data-intro-confirm-party]").click();
  const portraits: string[] = [];
  for (let i = 0; i < ids.length; i++) {
    await expect(scene).toHaveAttribute("data-intro-phase", "words");
    await expect(scene.locator(".intro-recruit-portraits img")).toHaveCount(
      i + 1,
    );
    const active = scene.locator(".intro-recruit-portraits .speaking img");
    portraits.push(
      (await active.getAttribute("data-portrait-source"))!.split("assets/")[1],
    );
    await expect(active).toHaveAttribute("data-backdrop-masked", "true");
    await expect(scene.locator(".chapter-speaker")).toHaveCount(0);
    if (i === 1) {
      const a = (await scene
          .locator(".intro-recruit-portraits .speaking")
          .boundingBox())!,
        b = (await scene
          .locator(".intro-recruit-portraits .listening")
          .boundingBox())!;
      expect(Math.abs(a.x - b.x)).toBeGreaterThan(20);
    }
    const bubble = (await scene.locator(".intro-bubble").boundingBox())!;
    expect(bubble.y).toBeGreaterThanOrEqual(0);
    expect(bubble.x + bubble.width).toBeLessThanOrEqual(
      page.viewportSize()!.width,
    );
    if (i === ids.length - 1)
      await page.screenshot({
        path: `/tmp/introduction-${faction}-${page.viewportSize()!.width}.png`,
      });
    await scene.locator("[data-intro-next]").click();
  }
  await expect(scene).toHaveCount(0);
  return { owner, face, ids, portraits };
}

export async function saveIntroduction(page: Page) {
  expect(
    await page.evaluate(() => localStorage.getItem("lte-save")),
  ).toBeNull();
  await page.locator('[data-action="story-save"]').click({ timeout: 15000 });
  await page
    .getByLabel("Nom de la sauvegarde", { exact: true })
    .fill("Officielle");
  await page
    .getByRole("button", { name: "Créer une sauvegarde", exact: true })
    .click();
  const saved = await page.evaluate(() =>
    JSON.parse(
      JSON.parse(localStorage.getItem("lte-manual-saves-v1")!).slots[0].payload,
    ),
  );
  await page.getByRole("button", { name: "Fermer les sauvegardes" }).click();
  return saved;
}
