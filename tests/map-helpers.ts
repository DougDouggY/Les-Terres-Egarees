import type { Page } from "@playwright/test";
export async function mapPoint(page: Page, x: number, y: number) {
  for (let attempt = 0; attempt < 80; attempt++) {
    const canvas = page.locator("#map");
    const camera = await canvas.evaluate((c: HTMLCanvasElement) => ({
      x: Number(c.dataset.cameraX),
      y: Number(c.dataset.cameraY),
      w: Number(c.dataset.viewCols),
      h: Number(c.dataset.viewRows),
    }));
    if (!camera.w) {
      await page.waitForTimeout(100);
      continue;
    }
    let key = "";
    if (x + 0.5 < camera.x + 0.2) key = "ArrowLeft";
    else if (x + 0.5 > camera.x + camera.w - 0.2) key = "ArrowRight";
    else if (y + 0.5 < camera.y + 0.2) key = "ArrowUp";
    else if (y + 0.5 > camera.y + camera.h - 0.2) key = "ArrowDown";
    if (key) {
      await page.keyboard.press(key);
      await page.waitForTimeout(75);
      continue;
    }
    const r = (await canvas.boundingBox())!;
    return {
      x: r.x + ((x + 0.5 - camera.x) / camera.w) * r.width,
      y: r.y + ((y + 0.5 - camera.y) / camera.h) * r.height,
    };
  }
  throw Error(`Case hors caméra : ${x},${y}`);
}
export async function clickMap(page: Page, x: number, y: number) {
  if (
    await page
      .getByRole("button", { name: "Fermer la fiche", exact: true })
      .count()
  )
    await page
      .getByRole("button", { name: "Fermer la fiche", exact: true })
      .click();
  const p = await mapPoint(page, x, y);
  await page.mouse.click(p.x, p.y);
}
