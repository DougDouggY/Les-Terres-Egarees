import { test, expect } from "@playwright/test";
import type { Campaign } from "../src/engine";
test("parcours navigateur : deux introductions, tactique, annulation, combat, alliance, victoire, camp et reprise", async ({
  page,
}) => {
  // The full two-front mission also runs on software-rendered Chromium.
  test.setTimeout(240000);
  const errors: string[] = [];
  page.on("pageerror", (e) => {
    errors.push(e.message);
    console.log("ERREUR NAVIGATEUR", e.message);
  });
  await page.goto("/");
  await page.evaluate(() => localStorage.setItem("lte-speed", "5"));
  await page.reload();
  await page.getByRole("button", { name: /Nouvelle aventure/ }).click();
  await page.getByRole("button", { name: /Prendre la route/ }).click();
  for (let i = 0; i < 12; i++)
    await page.getByRole("button", { name: /Suite|Poursuivre/ }).click();
  await expect(page.locator("#map")).toBeVisible();
  async function clickCell(x: number, y: number) {
    const r = await page.locator("#map").boundingBox();
    await page.mouse.click(
      r!.x + ((x + 0.5) / 30) * r!.width,
      r!.y + ((y + 0.5) / 20) * r!.height,
    );
  }
  // Verify actual provisional movement and rollback through the interface.
  await clickCell(6, 6);
  await clickCell(7, 6);
  await expect(
    page.getByRole("button", { name: "Annuler", exact: true }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Annuler", exact: true }).click();
  await page.getByRole("button", { name: "Sauvegarder", exact: true }).click();
  let s = (await page.evaluate(() =>
    JSON.parse(localStorage.getItem("lte-save")!),
  )) as Campaign;
  expect(s.units.find((u) => u.id === "p1b")!.x).toBe(6);
  await page.keyboard.press("Tab");
  await expect(page.locator(".perspectives .active")).toHaveText(
    "EXPÉDITION 2",
  );
  await page.keyboard.press("Tab");
  let capturedMap = false;
  let turns = 0,
    combatSeen = false,
    commonCombatSeen = false,
    meetingSeen = false,
    rotate: number | null = null;
  for (; turns < 100; turns++) {
    if (await page.locator(".camp-screen").count()) break;
    if (await page.locator(".cinematic").count()) {
      if (
        await page
          .getByText("Attendez… Des hommes vivants ?", { exact: true })
          .count()
      )
        meetingSeen = true;
      await page.getByRole("button", { name: /Suite|Poursuivre/ }).click();
      continue;
    }
    await page.waitForFunction(() => {
      const label =
        document.querySelector(".activation-bar .eyebrow")?.textContent || "";
      return (
        document.querySelector(".camp-screen,.cinematic,.rewards") ||
        label === "À VOUS DE JOUER" ||
        label.startsWith("EXPÉDITION ")
      );
    });
    if (await page.locator(".rewards").count()) {
      await page.getByRole("button", { name: "Reprendre la bataille" }).click();
      turns--;
      continue;
    }
    if (await page.locator(".cinematic,.camp-screen").count()) {
      turns--;
      continue;
    }
    if (rotate !== null) {
      const merged = await page.evaluate(
        () => JSON.parse(localStorage.getItem("lte-save")!).merged,
      );
      if (!merged)
        await page
          .getByRole("button", { name: `EXPÉDITION ${rotate}`, exact: true })
          .click();
      rotate = null;
    }
    if (
      !capturedMap &&
      (await page
        .getByText("Repoussez les morts-vivants", { exact: true })
        .count())
    ) {
      await page.screenshot({
        path: "artifacts/alliance-map.png",
        fullPage: true,
      });
      capturedMap = true;
    }
    const active = Number(
      (await page.locator(".perspectives .active").innerText()).slice(-1),
    );
    const plan = await page.evaluate(async (active) => {
      const E = await import("/src/engine.ts" as string),
        s = JSON.parse(localStorage.getItem("lte-save")!);
      s.active = active;
      let u = E.current(s);
      if (u.owner !== 0 && u.owner !== active) return { switch: u.owner };
      if (u.owner === 0) return { enemy: true };
      const reachable = E.reachable(s, u);
      let best = {
        k: E.key(u.x, u.y),
        score: -Infinity,
        target: undefined as string | undefined,
      };
      for (const [k, p] of reachable) {
        if (!s.players[active - 1].visible.includes(k)) continue;
        const c = E.map[k],
          ghost = { ...u, x: c.x, y: c.y },
          targets = E.alive(s).filter(
            (t: any) => t.owner === 0 && E.seen(s, active, t),
          );
        const target = targets
          .filter((t: any) => E.canAttack(ghost, t))
          .sort((a: any, b: any) => a.hp - b.hp)[0];
        const goal = s.merged
          ? (targets.sort(
              (a: any, b: any) => E.distance(a, ghost) - E.distance(b, ghost),
            )[0] ?? { x: 16, y: 10 })
          : { x: u.owner === 1 ? 14 : 18, y: 11 };
        const score =
          (target ? 130 - target.hp : 0) - E.distance(c, goal) - p.cost * 0.01;
        if (score > best.score) best = { k, score, target: target?.id };
      }
      return {
        unit: { x: u.x, y: u.y },
        dest: E.map[best.k],
        target: best.target,
        heal: u.hp <= 12 && u.potions > 0,
      };
    }, active);
    if ("switch" in plan) {
      await page
        .getByRole("button", { name: `EXPÉDITION ${plan.switch}`, exact: true })
        .click();
      turns--;
      continue;
    }
    if ("enemy" in plan) {
      await page.waitForTimeout(150);
      turns--;
      continue;
    }
    await clickCell(plan.unit!.x, plan.unit!.y);
    if (plan.heal) {
      await page.getByRole("button", { name: /Objets/ }).click();
    } else {
      if (plan.dest!.x !== plan.unit!.x || plan.dest!.y !== plan.unit!.y) {
        await clickCell(plan.dest!.x, plan.dest!.y);
        await page.waitForTimeout(450);
      }
      if (await page.locator(".cinematic").count()) {
        turns--;
        continue;
      }
      if (plan.target) {
        const target = await page.evaluate(
          (id) =>
            JSON.parse(localStorage.getItem("lte-save")!).units.find(
              (u: any) => u.id === id,
            ),
          plan.target,
        );
        await clickCell(target.x, target.y);
        await expect(page.locator(".forecast")).toBeVisible();
        if (
          await page
            .getByText("Repoussez les morts-vivants", { exact: true })
            .count()
        )
          commonCombatSeen = true;
        await page.getByRole("button", { name: "Engager le combat" }).click();
        if (!combatSeen) {
          await page.waitForTimeout(130);
          await page.screenshot({
            path: "artifacts/combat.png",
            fullPage: true,
          });
        }
        combatSeen = true;
        await expect(page.locator(".rewards")).toBeVisible({ timeout: 15000 });
        await page
          .getByRole("button", { name: "Reprendre la bataille" })
          .click();
      } else
        await page
          .getByRole("button", { name: /Attendre/ })
          .first()
          .click();
    }
    rotate = 3 - active;
    await page.waitForTimeout(180);
  }
  await expect(page.locator(".camp-screen")).toBeVisible();
  expect(combatSeen).toBe(true);
  expect(commonCombatSeen).toBe(true);
  expect(meetingSeen).toBe(true);
  await page.getByRole("button", { name: "Personnages", exact: true }).click();
  await expect(page.locator(".comparison tbody tr")).toHaveCount(4);
  await page.screenshot({ path: "artifacts/camp.png", fullPage: true });
  await page.getByRole("button", { name: "Carte du monde" }).click();
  await expect(page.locator(".world-map")).toBeVisible();
  await page.screenshot({ path: "artifacts/world.png", fullPage: true });
  await page.getByRole("button", { name: "Sauvegarder", exact: true }).click();
  await page.getByRole("button", { name: "Menu principal" }).click();
  await page.getByRole("button", { name: /Continuer/ }).click();
  await expect(page.locator(".camp-screen")).toBeVisible();
  expect(errors).toEqual([]);
  console.log({ turns, combatSeen, meetingSeen, commonCombatSeen });
});
