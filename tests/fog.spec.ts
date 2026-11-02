import { test, expect } from "@playwright/test";
test("brume continue : animation, raccords, perspectives et retour hors de vue", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const { Mist } = await import("/src/fog.ts" as string);
    const fog = new Mist(12, 8);
    const c = document.createElement("canvas");
    c.width = 384;
    c.height = 256;
    const ctx = c.getContext("2d")!;
    const visible = new Set<number>();
    for (let y = 1; y <= 5; y++)
      for (let x = 1; x <= 5; x++) visible.add(y * 12 + x);
    const pixel = (x: number, y: number) => [
      ...ctx.getImageData(x, y, 1, 1).data,
    ];
    const draw = (v: Set<number>, p: number, t: number) => {
      ctx.clearRect(0, 0, 384, 256);
      ctx.fillStyle = "#ff0000";
      ctx.fillRect(0, 0, 384, 256);
      fog.draw(ctx, v, p, t);
    };
    draw(visible, 1, 1000);
    const inside = pixel(90, 90),
      hidden = pixel(310, 150),
      a = pixel(255, 150),
      b = pixel(256, 150);
    draw(visible, 1, 11000);
    const animated = pixel(310, 150);
    draw(new Set(), 2, 11000);
    const other = pixel(90, 90);
    draw(visible, 1, 11000);
    const first = pixel(90, 90);
    draw(new Set(), 1, 12000);
    draw(new Set(), 1, 13000);
    const returned = pixel(90, 90);
    return {
      inside,
      hidden,
      animated,
      seam: Math.max(...a.slice(0, 3).map((n, i) => Math.abs(n - b[i]))),
      other,
      first,
      returned,
    };
  });
  expect(result.inside[0]).toBeGreaterThan(240);
  expect(result.inside[1]).toBeLessThan(15);
  expect(result.hidden[1]).toBeGreaterThan(70);
  expect(result.animated).not.toEqual(result.hidden);
  expect(result.seam).toBeLessThan(5);
  expect(result.other[1]).toBeGreaterThan(70);
  expect(result.first[1]).toBeLessThan(15);
  expect(result.returned[1]).toBeGreaterThan(70);
});

test("sélection réelle : la brume continue de bouger et les ennemis visibles restent dessinés", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.evaluate(async () => {
    const E = await import("/src/engine.ts" as string);
    const s = E.createCampaign(["north", "knight"]);
    s.phase = "battle";
    s.scene = null;
    localStorage.setItem("lte-save", E.encode(s));
  });
  await page.reload();
  await page.evaluate(() => {
    const prototype = CanvasRenderingContext2D.prototype,
      original = prototype.drawImage;
    (window as any).enemyDraws = 0;
    prototype.drawImage = function (...args: any[]) {
      if (
        this.canvas.id === "map" &&
        args[0] instanceof HTMLImageElement &&
        args[0].src.endsWith("/sprites.png") &&
        args[2] === 512
      )
        (window as any).enemyDraws++;
      return (original as any).apply(this, args);
    };
  });
  await page.getByRole("button", { name: /Continuer/ }).click();
  const canvas = page.locator("#map");
  await expect(canvas).toBeVisible();
  await page.waitForTimeout(350);
  const before = await page.evaluate(() => (window as any).enemyDraws);
  expect(before).toBeGreaterThan(0);
  const box = (await canvas.boundingBox())!;
  await page.mouse.click(
    box.x + (6.5 / 30) * box.width,
    box.y + (6.5 / 20) * box.height,
  );
  await page.waitForTimeout(450);
  expect(errors).toEqual([]);
  const after = await page.evaluate(() => (window as any).enemyDraws);
  expect(after).toBeGreaterThan(before);
  const texture = await page
    .locator("#map")
    .evaluate((canvas: HTMLCanvasElement) => {
      const data = canvas
        .getContext("2d")!
        .getImageData(1400, 300, 240, 240).data;
      let sum = 0,
        sq = 0,
        n = 0;
      for (let i = 0; i < data.length; i += 4) {
        sum += data[i];
        sq += data[i] * data[i];
        n++;
      }
      return sq / n - (sum / n) ** 2;
    });
  expect(texture).toBeGreaterThan(2);
  await page.screenshot({
    path: "artifacts/selection-fog-regression.png",
    fullPage: true,
  });
  await page.keyboard.press("Escape");
  await page.waitForTimeout(150);
  await page.screenshot({
    path: "artifacts/cartoon-terrain.png",
    fullPage: true,
  });
});

test("déplacement réel à travers un allié sans superposition finale", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.evaluate(async () => {
    const E = await import("/src/engine.ts" as string);
    const s = E.createCampaign(["north", "knight"]);
    s.phase = "battle";
    s.scene = null;
    Object.assign(s.units[1], { x: 6, y: 5 });
    Object.assign(s.units[0], { x: 7, y: 5 });
    E.visibility(s);
    localStorage.setItem("lte-save", E.encode(s));
    localStorage.setItem("lte-speed", "5");
  });
  await page.reload();
  await page.getByRole("button", { name: /Continuer/ }).click();
  const click = async (x: number, y: number) => {
    const r = (await page.locator("#map").boundingBox())!;
    await page.mouse.click(
      r.x + ((x + 0.5) / 30) * r.width,
      r.y + ((y + 0.5) / 20) * r.height,
    );
  };
  await click(6, 5);
  await click(8, 5);
  await expect(
    page.getByRole("button", { name: "Annuler", exact: true }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Attendre", exact: true }).click();
  const units = await page.evaluate(
    () => JSON.parse(localStorage.getItem("lte-save")!).units,
  );
  expect(units.find((u: any) => u.id === "p1b")).toMatchObject({ x: 8, y: 5 });
  expect(units.find((u: any) => u.id === "p1a")).toMatchObject({ x: 7, y: 5 });
  expect(errors).toEqual([]);
});
