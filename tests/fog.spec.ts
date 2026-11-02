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
