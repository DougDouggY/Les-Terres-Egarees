import type { Campaign, Cell } from "../src/game/types";
import { test, expect, type Page } from "@playwright/test";
async function fixture(
  page: Page,
  pending = false,
  foe = false,
  classId = "man_at_arms",
) {
  await page.goto("/");
  await page.evaluate(
    async ({ pending, foe, classId }) => {
      const { createSandbox, trainingUnit } = await import(
        String("/src/game/sandbox.ts")
      );
      const { MAP_REVISION, map } = await import(String("/src/game/map.ts"));
      const { encode } = await import(String("/src/game/save.ts"));
      const s: Campaign = createSandbox();
      s.mapRevision = MAP_REVISION;
      s.merged = false;
      const a = trainingUnit(s, classId, 1, 1, 1),
        b = trainingUnit(s, "raider", 1, 1, foe ? 0 : 2);
      const c = (map as Cell[]).find(
        (c) =>
          c.walk &&
          c.x >= 20 &&
          c.x <= 25 &&
          c.y >= 15 &&
          (map as Cell[]).some((d) => d.x === c.x + 1 && d.y === c.y && d.walk),
      )!;
      Object.assign(a, { x: c.x, y: c.y });
      Object.assign(b, {
        x: c.x + (classId === "crossbowman" ? 2 : 1),
        y: c.y,
      });
      s.common.queue = pending ? [b.id, a.id] : [a.id, b.id];
      s.active = 1;
      s.players[0].visible = [c.y * 60 + c.x, ...(foe ? [c.y * 60 + b.x] : [])];
      s.players[1].visible = [c.y * 60 + c.x + 1];
      if (classId === "sorcerer") {
        const spot = (map as Cell[]).find(
          (d) =>
            d.walk &&
            Math.abs(d.x - c.x) + Math.abs(d.y - c.y) === 1 &&
            d.x !== b.x,
        );
        if (spot) {
          const ally = trainingUnit(s, "man_at_arms", 1, 1, 1);
          Object.assign(ally, { x: spot.x, y: spot.y, hp: ally.maxHp - 4 });
          s.players[0].visible.push(spot.y * 60 + spot.x);
        }
      }
      s.players.forEach((p) => (p.camera = { x: c.x - 6, y: c.y - 4 }));
      localStorage.setItem("lte-save", encode(s));
      localStorage.setItem("lte-speed", "5");
    },
    { pending, foe, classId },
  );
  await page.reload();
  await page.locator('[data-action="continue"]').click();
  await expect(page.locator("#map")).toBeVisible();
  await expect
    .poll(() => page.locator("#map").getAttribute("data-view-cols"))
    .not.toBeNull();
}
async function cellClick(page: Page, x: number, y: number) {
  await page.waitForFunction(
    () =>
      Number(
        document.querySelector<HTMLCanvasElement>("#map")?.dataset.viewCols,
      ) > 0,
  );
  const coords = await page.locator("#map").evaluate(
    (c: HTMLCanvasElement, { x, y }) => {
      const r = c.getBoundingClientRect();
      return {
        x:
          r.x +
          ((x + 0.5 - Number(c.dataset.cameraX)) / Number(c.dataset.viewCols)) *
            r.width,
        y:
          r.y +
          ((y + 0.5 - Number(c.dataset.cameraY)) / Number(c.dataset.viewRows)) *
            r.height,
      };
    },
    { x, y },
  );
  await page.mouse.click(coords.x, coords.y);
}
test("carte plein écran, commandes uniquement dans Échap et vue manuelle pour unité en attente", async ({
  page,
}) => {
  await fixture(page, true);
  await expect(
    page.locator(".battle-header,.activation-bar,.map-heading"),
  ).toHaveCount(0);
  await expect(page.locator('[data-action="pause"]')).toHaveCount(0);
  await expect(page.locator(".mission-objective")).toHaveText(
    "Rejoignez le village des Veilleurs",
  );
  const rect = await page.locator("#map").boundingBox();
  expect(rect!.height).toBeGreaterThan(980);
  await expect(page.locator(".initiative-entry.current")).toHaveText("?");
  await page.waitForTimeout(600);
  await expect(page.locator(".initiative-entry.current")).toHaveText("?");
  await page.keyboard.press("Escape");
  await expect(page.locator(".pause-menu")).toBeVisible();
  await expect(page.locator('[data-action="toggle-fog"]')).toBeVisible();
  await expect(page.locator('[data-action="observer"]')).toBeVisible();
  await page.locator('[data-action="perspective-2"]').click();
  await expect(page.locator(".pause-menu")).toHaveCount(0);
  await expect(page.locator(".initiative-entry.current canvas")).toHaveCount(1);
  await page.keyboard.press("Escape");
  await expect(page.locator(".pause-menu")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator(".pause-menu")).toHaveCount(0);
  await page.screenshot({ path: "artifacts/tactical-interface.png" });
});
test("actions ancrées près du personnage et info de case légère au coin inférieur", async ({
  page,
}) => {
  await fixture(page);
  const unit = await page.evaluate(
    () => JSON.parse(localStorage.getItem("lte-save")!).units[0],
  );
  await cellClick(page, unit.x, unit.y);
  await cellClick(page, unit.x, unit.y);
  await expect(page.locator("#unit-actions")).toBeVisible();
  const near = await page.locator("#unit-actions").boundingBox();
  expect(near!.y).toBeLessThan(800);
  expect(near!.width).toBeLessThan(180);
  await page.keyboard.press("Escape");
  await expect(page.locator(".pause-menu")).toBeVisible();
  await page.keyboard.press("Escape");
  const coords = await page
    .locator("#map")
    .evaluate((c: HTMLCanvasElement, { x, y }) => {
      const r = c.getBoundingClientRect();
      return {
        x:
          r.x +
          ((x + 0.5 - Number(c.dataset.cameraX)) / Number(c.dataset.viewCols)) *
            r.width,
        y:
          r.y +
          ((y + 0.5 - Number(c.dataset.cameraY)) / Number(c.dataset.viewRows)) *
            r.height,
      };
    }, unit);
  await page.mouse.move(coords.x, coords.y);
  await expect(page.locator("#map-tooltip")).toBeVisible();
  const box = await page.locator("#map-tooltip").boundingBox();
  expect(box!.x).toBeLessThan(12);
  expect(box!.y + box!.height).toBeGreaterThan(985);
  expect(
    await page
      .locator("#map-tooltip")
      .evaluate((e) => getComputedStyle(e).backgroundColor),
  ).toMatch(/^rgba\(37, 61, 44,/);
  await page.screenshot({ path: "artifacts/tactical-actions.png" });
});

test("prévision compacte sans aide superflue, puis résultats lisibles", async ({
  page,
}) => {
  await fixture(page, false, true);
  const units = await page.evaluate(
    () => JSON.parse(localStorage.getItem("lte-save")!).units,
  );
  await cellClick(page, units[0].x, units[0].y);
  await cellClick(page, units[1].x, units[1].y);
  await expect(page.locator(".compact-forecast")).toBeVisible();
  await expect(page.locator(".compact-forecast")).not.toContainText("agilité");
  const r = await page.locator(".compact-forecast").boundingBox();
  expect(r!.width).toBeLessThan(300);
  await page.screenshot({ path: "artifacts/compact-forecast.png" });
  await page.locator('[data-action^="confirm-attack-"]').click();
  await expect(page.locator(".compact-rewards")).toBeVisible();
  await page.screenshot({ path: "artifacts/compact-results.png" });
});

test("œil : rétraction totale, retour centré et état conservé à la reprise", async ({
  page,
}) => {
  await fixture(page, true);
  const eye = page.getByRole("button", {
    name: "Afficher ou masquer l’initiative",
    exact: true,
  });
  await eye.click();
  await expect(eye).toHaveAttribute("aria-expanded", "false");
  await expect(page.locator(".initiative-window")).toBeHidden();
  await expect(eye).toBeVisible();
  await page.reload();
  await page.locator('[data-action="continue"]').click();
  await expect(page.locator(".initiative-strip")).toHaveClass(/collapsed/);
  await eye.click();
  await expect(page.locator(".initiative-window")).toBeVisible();
  const gap = await page.evaluate(() => {
    const a = document
        .querySelector(".initiative-entry.current")!
        .getBoundingClientRect(),
      b = document.querySelector(".initiative-window")!.getBoundingClientRect();
    return Math.abs(a.x + a.width / 2 - b.x - b.width / 2);
  });
  expect(gap).toBeLessThan(2);
});
test("attaque : menu sans nom, disparition pour cibler et retour par clic droit", async ({
  page,
}) => {
  await fixture(page, false, true);
  const u = await page.evaluate(
    () => JSON.parse(localStorage.getItem("lte-save")!).units[0],
  );
  await cellClick(page, u.x, u.y);
  await cellClick(page, u.x, u.y);
  await expect(page.locator("#unit-actions > strong")).toHaveCount(0);
  await page.locator('[data-action="attack-mode"]').click();
  await expect(page.locator("#unit-actions")).toHaveCount(0);
  await page
    .locator("#map")
    .click({ button: "right", position: { x: 30, y: 300 } });
  await expect(page.locator("#unit-actions")).toBeVisible();
});
test("soins : priorité offensive puis sélection explicite du soin", async ({
  page,
}) => {
  await fixture(page, false, true, "sorcerer");
  const u = await page.evaluate(
    () => JSON.parse(localStorage.getItem("lte-save")!).units[0],
  );
  await cellClick(page, u.x, u.y);
  await cellClick(page, u.x, u.y);
  await expect(page.locator('[data-action="attack-mode"]')).toBeVisible();
  await expect(page.locator('[data-action="skill-heal"]')).toBeVisible();
  await page.screenshot({ path: "artifacts/combat-v2/offensive-range.png" });
  await page.locator('[data-action="skill-heal"]').click();
  await expect(page.locator("#unit-actions")).toBeHidden();
  await page.screenshot({ path: "artifacts/combat-v2/healing-range.png" });
  await page
    .locator("#map")
    .click({ button: "right", position: { x: 30, y: 300 } });
  await expect(page.locator("#unit-actions")).toBeVisible();
});

test("aucune cible blessée : action de soin absente", async ({ page }) => {
  await fixture(page, false, false, "shaman");
  const u = await page.evaluate(
    () => JSON.parse(localStorage.getItem("lte-save")!).units[0],
  );
  await cellClick(page, u.x, u.y);
  await cellClick(page, u.x, u.y);
  await expect(page.locator('[data-action="skill-heal"]')).toHaveCount(0);
  const goal = await page.locator(".mission-objective").boundingBox();
  expect(goal!.x).toBeLessThanOrEqual(3);
  expect(goal!.y).toBeLessThanOrEqual(3);
});

test("arbalète : portée offensive et recharge automatique sans action manuelle", async ({
  page,
}) => {
  await fixture(page, false, true, "crossbowman");
  const u = await page.evaluate(
    () => JSON.parse(localStorage.getItem("lte-save")!).units[0],
  );
  await cellClick(page, u.x, u.y);
  await cellClick(page, u.x, u.y);
  await expect(page.locator('[data-action="skill-reload"]')).toHaveCount(0);
  await expect(page.locator('[data-action="attack-mode"]')).toBeVisible();
  await page.locator('[data-action="attack-mode"]').click();
  await cellClick(page, u.x + 2, u.y);
  await page.locator('[data-action^="confirm-attack-"]').click();
  await expect(page.locator("#combat")).toHaveAttribute("data-phase", "reload");
  await page.screenshot({ path: "artifacts/combat-v2/automatic-reload.png" });
});
