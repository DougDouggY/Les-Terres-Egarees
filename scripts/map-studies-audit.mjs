import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
const out = "artifacts/map-plans";
await mkdir(out, { recursive: true });
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
try {
  const page = await browser.newPage({
      viewport: { width: 1600, height: 1250 },
    }),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(process.env.MAP_STUDIES_URL || "http://127.0.0.1:5173");
  await page.evaluate(() => {
    localStorage.setItem("lte-save", "preserve-campaign");
    localStorage.setItem("lte-chapter-one-test", "preserve-chapter-one");
  });
  const storage = await page.evaluate(() =>
    JSON.stringify({ ...localStorage }),
  );
  await page
    .getByRole("button", { name: "Tests de combat", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Explorer les deux cartes", exact: true })
    .click();
  await page.locator("#study-canvas[data-ready=true]").waitFor();
  const exports = [];
  async function exportPNG(name) {
    const pending = page.waitForEvent("download");
    await page
      .getByRole("button", { name: "Exporter le PNG", exact: true })
      .click();
    const download = await pending;
    await download.saveAs(`${out}/${name}.png`);
    exports.push(download.suggestedFilename());
  }
  const getCanvas = () =>
    page.locator("#study-canvas").evaluate((c) => c.toDataURL());
  assert.equal(
    await page
      .getByRole("button", { name: "Clé — Salle du trône", exact: true })
      .isDisabled(),
    true,
  );
  await exportPNG("castle-roof-42x34");
  const closed = await getCanvas();
  await page
    .getByRole("button", { name: "Clé — Porte principale", exact: true })
    .click();
  assert.notEqual(await getCanvas(), closed);
  await page
    .getByRole("button", { name: "Clé — Salle du trône", exact: true })
    .waitFor({ state: "visible" });
  assert.equal(
    await page
      .getByRole("button", { name: "Clé — Salle du trône", exact: true })
      .isEnabled(),
    true,
  );
  await exportPNG("castle-entrance-open-42x34");
  for (const room of [
    "Cantine",
    "Armurerie",
    "Salle des gardes",
    "Réserve",
    "Bibliothèque",
  ]) {
    await page
      .getByRole("button", { name: `Détruire — ${room}`, exact: true })
      .click();
  }
  await page
    .getByRole("button", { name: "Clé — Salle du trône", exact: true })
    .click();
  await exportPNG("castle-interior-42x34");
  async function detail(name, x, y) {
    await page
      .getByRole("button", { name: "Cadrer la carte", exact: true })
      .click();
    await page.locator("#study-zoom").selectOption("3");
    await page.locator("#study-canvas").focus();
    const dx = x - 21,
      dy = y - 17;
    for (let n = 0; n < Math.abs(dx); n++)
      await page.keyboard.press(
        dx > 0 ? "Shift+ArrowRight" : "Shift+ArrowLeft",
      );
    for (let n = 0; n < Math.abs(dy); n++)
      await page.keyboard.press(dy > 0 ? "Shift+ArrowDown" : "Shift+ArrowUp");
    await page
      .locator(".study-stage")
      .screenshot({ path: `${out}/${name}.png` });
  }
  await detail("correction-castle-junctions-openings", 12, 22);
  await detail("correction-castle-entrance", 21, 27);
  await detail("correction-castle-throne-rug", 33, 8);
  await page
    .getByRole("button", { name: "Cadrer la carte", exact: true })
    .click();
  await page.screenshot({ path: `${out}/workshop-castle.png`, fullPage: true });
  // At 50% each cell is 16 screen pixels. Centered coordinates exercise actual DOM clicks.
  await page.locator("#study-zoom").selectOption("0.5");
  async function clickCell(x, y) {
    const b = await page.locator("#study-canvas").boundingBox();
    await page.mouse.click(
      b.x + (b.width - 1344 * 0.5) / 2 + x * 16 + 8,
      b.y + (b.height - 1088 * 0.5) / 2 + y * 16 + 8,
    );
  }
  await clickCell(16, 8);
  await page.waitForFunction(() =>
    document
      .querySelector(".study-status")
      ?.textContent.includes("colonne 17, ligne 9"),
  );
  await clickCell(0, 0);
  await page.getByText("Case inaccessible :", { exact: false }).waitFor();
  await page
    .getByRole("button", { name: "Réinitialiser", exact: true })
    .click();
  assert.equal(
    await page
      .getByRole("button", { name: "Clé — Salle du trône", exact: true })
      .isDisabled(),
    true,
  );
  assert.equal(
    await page
      .getByRole("button", { name: "Clé — Porte principale", exact: true })
      .isEnabled(),
    true,
  );
  await page.locator("[data-study=boarding]").click();
  for (const [x, y] of [
    [26, 7],
    [6, 25],
  ]) {
    await clickCell(x, y);
    await page.waitForFunction(
      ({ x, y }) =>
        document
          .querySelector(".study-status")
          ?.textContent.includes(`colonne ${x + 1}, ligne ${y + 1}`),
      { x, y },
    );
  }
  for (const [x, y] of [
    [0, 10],
    [18, 12],
    [9, 15],
    [3, 7],
  ]) {
    await clickCell(x, y);
    await page.getByText("Case inaccessible :", { exact: false }).waitFor();
  }
  await page.locator("#study-grid").check();
  await page.locator("#study-collisions").check();
  const overlay = await getCanvas();
  await page.locator("#study-grid").uncheck();
  await page.locator("#study-collisions").uncheck();
  assert.notEqual(await getCanvas(), overlay);
  await page.locator("#study-zoom").selectOption("2");
  const zoomed = await getCanvas();
  const b = await page.locator("#study-canvas").boundingBox();
  await page.mouse.move(b.x + 100, b.y + 100);
  await page.mouse.down();
  await page.mouse.move(b.x + 210, b.y + 150, { steps: 6 });
  await page.mouse.up();
  assert.notEqual(await getCanvas(), zoomed);
  await page
    .getByRole("button", { name: "Cadrer la carte", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Réinitialiser", exact: true })
    .click();
  await exportPNG("boarding-42x34");
  await detail("correction-ship-rails-gangway", 21, 7);
  await detail("correction-ship-mast-left", 10, 16);
  await detail("correction-ship-mast-right", 32, 17);
  await detail("correction-ship-hatch-storage", 6, 29);
  await page.locator("#study-grid").check();
  await detail("correction-ship-storage-grid", 4, 8);
  await page.locator("#study-grid").uncheck();
  await page
    .getByRole("button", { name: "Cadrer la carte", exact: true })
    .click();
  await page.screenshot({
    path: `${out}/workshop-boarding.png`,
    fullPage: true,
  });
  // Assert opacity of the actual roof layer by painting a fake unit underneath every roof cell.
  const opacity = await page.evaluate(async () => {
    const m = await import("/src/data/plan-maps.ts"),
      r = await import("/src/rendering/plan-renderer.ts");
    const s = m.createPlanState(m.castlePlan),
      atlas = await r.loadPlanArtwork(),
      base = r.renderPlanBase(s, atlas),
      c = base.getContext("2d"),
      roof = r.renderPlanRoof(s, atlas);
    c.drawImage(roof, 0, 0);
    const expected = base.toDataURL();
    c.fillStyle = "#ff00ff";
    for (const k of s.map.building)
      c.fillRect(
        (k % s.map.width) * r.PLAN_RENDER_TILE,
        Math.floor(k / s.map.width) * r.PLAN_RENDER_TILE,
        r.PLAN_RENDER_TILE,
        r.PLAN_RENDER_TILE,
      );
    c.drawImage(roof, 0, 0);
    return expected === base.toDataURL();
  });
  assert.equal(opacity, true, "Roof is opaque, including over simulated units");
  const approved = await page.evaluate(async () => {
    const plans = await import("/src/data/plan-maps.ts"),
      r = await import("/src/rendering/plan-renderer.ts"),
      micro = await import("/src/dev/material-renderer.ts"),
      data = await import("/src/dev/material-samples.ts");
    const images = await r.loadPlanArtwork(),
      P = r.PLAN_RENDER_TILE;
    const castle = r.renderPlanBase(
        plans.createPlanState(plans.castlePlan),
        images,
      ),
      castleSmall = micro.renderMaterialSample(
        data.materialSample("castle"),
        images,
      );
    const boat = r.renderPlanBase(
        plans.createPlanState(plans.boardingPlan),
        images,
      ),
      boatSmall = micro.renderMaterialSample(
        data.materialSample("boarding"),
        images,
      );
    function same(a, ax, ay, b, bx, by) {
      const x = a.getContext("2d").getImageData(ax * P, ay * P, P, P).data,
        y = b.getContext("2d").getImageData(bx * P, by * P, P, P).data;
      return x.every((v, i) => v === y[i]);
    }
    return {
      size: castle.width === 4032 && castle.height === 3264,
      floor: same(castle, 2, 2, castleSmall, 0, 1),
      wall: same(castle, 9, 12, castleSmall, 8, 4),
      deck: same(boat, 5, 10, boatSmall, 1, 0),
      water: same(boat, 20, 10, boatSmall, 8, 6),
      widerRail: (() => {
        const a = boat.getContext("2d").getImageData(18 * P, 10 * P, P, P).data,
          b = boatSmall.getContext("2d").getImageData(6 * P, 6 * P, P, P).data;
        let changed = 0;
        for (let y = 0; y < P; y++)
          for (let x = 24; x < 48; x++) {
            const k = (y * P + x) * 4;
            if (a[k] !== b[k] || a[k + 1] !== b[k + 1] || a[k + 2] !== b[k + 2])
              changed++;
          }
        for (let y = 0; y < P; y++)
          for (let x = 48; x < P; x++)
            for (let ch = 0; ch < 4; ch++)
              if (a[(y * P + x) * 4 + ch] !== b[(y * P + x) * 4 + ch])
                return false;
        return changed > 1500;
      })(),
    };
  });
  const underGangways = await page.evaluate(async () => {
    const m = await import("/src/data/plan-maps.ts"),
      r = await import("/src/rendering/plan-renderer.ts"),
      micro = await import("/src/dev/material-renderer.ts"),
      images = await r.loadPlanArtwork(),
      P = r.PLAN_RENDER_TILE;
    const blank = document.createElement("canvas");
    blank.width = images.boarding.width;
    blank.height = images.boarding.height;
    const bc = blank.getContext("2d");
    bc.drawImage(images.boarding, 0, 0);
    bc.clearRect(10, 960, 330, 265);
    const boardless = new Image();
    boardless.src = blank.toDataURL();
    await boardless.decode();
    const actual = r
      .renderPlanBase(m.createPlanState(m.boardingPlan), {
        ...images,
        boarding: boardless,
      })
      .getContext("2d");
    let errors = 0;
    for (const g of m.boardingPlan.objects.filter(
      (o) => o.type === "gangway",
    )) {
      const x = (g.x - 1) * P + P / 4,
        y = g.y * P,
        w = (g.w + 1.5) * P,
        h = g.h * P;
      const reference = document.createElement("canvas");
      reference.width = w;
      reference.height = h;
      const rc = reference.getContext("2d");
      rc.imageSmoothingEnabled = false;
      const pattern = rc.createPattern(
        micro.periodicWater(images.corrections),
        "repeat",
      );
      pattern.setTransform(new DOMMatrix().translate(-x, -y).scale(192 / 256));
      rc.fillStyle = pattern;
      rc.fillRect(0, 0, w, h);
      const a = actual.getImageData(x, y, w, h).data,
        b = rc.getImageData(0, 0, w, h).data;
      for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) errors++;
    }
    return errors;
  });
  const mastMatch = await page.evaluate(async () => {
    const m = await import("/src/data/plan-maps.ts"),
      r = await import("/src/rendering/plan-renderer.ts"),
      im = await r.loadPlanArtwork(),
      P = r.PLAN_RENDER_TILE;
    const ctx = r
      .renderPlanBase(m.createPlanState(m.boardingPlan), im)
      .getContext("2d");
    const main = ctx.getImageData(8 * P, 16 * P, 4 * P, 2 * P).data,
      half = ctx.getImageData(8 * P, 0, 4 * P, 2 * P).data;
    return main.every((v, i) => v === half[i]);
  });
  assert.equal(
    mastMatch,
    true,
    "Central circular mast matches the partial mast artwork exactly",
  );
  assert.equal(
    underGangways,
    0,
    "Sea continues under both gangways, including the partial edge cells",
  );
  assert.deepEqual(
    approved,
    {
      size: true,
      floor: true,
      wall: true,
      deck: true,
      water: true,
      widerRail: true,
    },
    "Full maps use the approved sample pixels at the same texture density",
  );

  assert.deepEqual(exports, [
    "plan-castle-42x34.png",
    "plan-castle-42x34.png",
    "plan-castle-42x34.png",
    "plan-boarding-42x34.png",
  ]);
  const previews = await page.evaluate(async () => {
    const m = await import("/src/data/plan-maps.ts"),
      r = await import("/src/rendering/plan-renderer.ts"),
      images = await r.loadPlanArtwork();
    const entries = [];
    for (const name of [
      "castle-covered",
      "castle-complete",
      "boarding-complete",
    ]) {
      const state = m.createPlanState(
        name.startsWith("castle") ? m.castlePlan : m.boardingPlan,
      );
      if (name === "castle-complete")
        for (const id of [13, 10003, 14, 116, 15, 117, 16])
          m.openPlanDoor(state, id, "key");
      const source = r.compositePlan(state, images),
        overview = document.createElement("canvas");
      overview.width = state.map.width * 32;
      overview.height = state.map.height * 32;
      const ctx = overview.getContext("2d");
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(source, 0, 0, overview.width, overview.height);
      entries.push([name, overview.toDataURL().split(",")[1]]);
    }
    return entries;
  });
  for (const [name, png] of previews)
    await writeFile(`${out}/${name}-overview.png`, Buffer.from(png, "base64"));
  assert.equal(
    await page.evaluate(() => JSON.stringify({ ...localStorage })),
    storage,
  );
  await page
    .getByRole("button", { name: "Retour aux tests", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Retour au menu", exact: true })
    .click();
  await page.getByRole("button", { name: /Nouvelle aventure/ }).waitFor();
  assert.deepEqual(errors, []);
  console.log(
    "PASS: progressive roofs, all 7 doors by key/destruction, opaque roof over simulated units, reset, rooms/corridors movement, both gangways, rails/sea/masts/crates blocked, overlays, zoom/pan, PNG exports, navigation, campaign storage preserved, no browser errors.",
  );
} finally {
  await browser.close();
}
