import { test, expect } from "@playwright/test";
test("33 portraits : transparence partagée et couleurs originales conservées", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const { maskDialoguePortraits, portraitBackdropMask } = await import(
      String("/src/ui/portrait-mask.ts")
    );
    const ids = ["C", "V", "N", "R"].flatMap((prefix) =>
      Array.from(
        { length: prefix === "N" ? 5 : prefix === "R" ? 4 : 12 },
        (_, i) => prefix + String(i + 1).padStart(2, "0"),
      ),
    );
    const root = document.querySelector("#app")!;
    root.innerHTML =
      '<main style="background:#d9c8a0;display:grid;grid-template-columns:repeat(6,1fr);gap:8px">' +
      ids
        .map(
          (id) =>
            `<div style="height:150px"><img class="identity-portrait" src="/assets/portraits/${id}.png" alt="${id}"></div>`,
        )
        .join("") +
      "</main>";
    const source = await Promise.all(
      ids.map(
        (id) =>
          new Promise<HTMLImageElement>((resolve, reject) => {
            const im = new Image();
            im.onload = () => resolve(im);
            im.onerror = reject;
            im.src = "/assets/portraits/" + id + ".png";
          }),
      ),
    );
    maskDialoguePortraits(root as HTMLElement);
    const rows = source.map((im, i) => {
      const c = document.createElement("canvas");
      c.width = im.naturalWidth;
      c.height = im.naturalHeight;
      const ctx = c.getContext("2d")!;
      ctx.drawImage(im, 0, 0);
      const raw = ctx.getImageData(0, 0, c.width, c.height).data,
        mask = portraitBackdropMask(
          raw,
          c.width,
          c.height,
          ids[i].startsWith("V") ? 0.68 : 0.47,
        );
      return {
        id: ids[i],
        corner: mask[3],
        transparent: mask.filter(
          (_: number, k: number) => k % 4 === 3 && mask[k] === 0,
        ).length,
        kept: mask.filter(
          (_: number, k: number) => k % 4 === 3 && mask[k] === 255,
        ).length,
      };
    });
    return { rows };
  });
  expect(result.rows).toHaveLength(33);
  for (const r of result.rows) {
    expect(r.corner, r.id).toBe(0);
    expect(r.transparent, r.id).toBeGreaterThan(100);
    expect(r.kept, r.id).toBeGreaterThan(1000);
  }
  await expect(page.locator('img[data-backdrop-masked="true"]')).toHaveCount(
    33,
  );
  await page.screenshot({ path: "/tmp/portraits-transparent.png" });
  // Recruitment changes ownership, never the portrait colours or identity.
  await page.evaluate(async () => {
    const E = await import(String("/src/engine.ts"));
    const { characterSheet } = await import(
      String("/src/ui/character-sheet.ts")
    );
    const s = E.createCampaign(["north", "knight"]);
    E.beginForestChapter(s);
    const u = s.units.find((u: any) => u.id === "geraud");
    const root = document.querySelector("#app")!;
    root.innerHTML = characterSheet(u, false, s);
    (window as any).geraudTest = { s, u, characterSheet };
  });
  await expect(page.locator("img.identity-portrait")).toHaveAttribute(
    "data-team-color",
    "pink",
  );
  await expect(page.locator("img.identity-portrait")).toHaveAttribute(
    "data-backdrop-masked",
    "true",
  );
  const enemy = await page.locator("img").getAttribute("src");
  await page.evaluate(() => {
    const { s, u, characterSheet } = (window as any).geraudTest;
    u.owner = 1;
    document.querySelector("#app")!.innerHTML = characterSheet(u, false, s);
  });
  await expect(page.locator("img.identity-portrait")).toHaveAttribute(
    "data-team-color",
    "blue",
  );
  await expect(page.locator("img.identity-portrait")).toHaveAttribute(
    "data-backdrop-masked",
    "true",
  );
  expect(await page.locator("img").getAttribute("src")).toBe(enemy);
  await expect(page.locator("img")).toHaveAttribute(
    "data-portrait-source",
    /R03.png$/,
  );
});
