import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import assert from "node:assert/strict";
await mkdir("artifacts/material-tests", { recursive: true });
const b = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
try {
  const p = await b.newPage({ viewport: { width: 1440, height: 1250 } }),
    errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  await p.goto("http://127.0.0.1:5173/");
  await p.evaluate(() =>
    localStorage.setItem("lte-save", "material-sample-save-preservation"),
  );
  const storage = await p.evaluate(() => JSON.stringify({ ...localStorage }));
  await p.getByRole("button", { name: "Tests de combat", exact: true }).click();
  await p
    .getByRole("button", {
      name: "Tester les textures assemblées",
      exact: true,
    })
    .click();
  await p.locator("[data-material-canvas][data-ready=true]").waitFor();
  async function output(name) {
    const pending = p.waitForEvent("download");
    await p
      .getByRole("button", { name: "Exporter le fragment", exact: true })
      .click();
    await (await pending).saveAs(`artifacts/material-tests/${name}.png`);
  }
  async function click(x, y) {
    await p
      .locator("[data-material-canvas]")
      .click({ position: { x: x * 96 + 48, y: y * 96 + 48 } });
  }
  await output("castle-assembly");
  await p.locator("[data-material-roof]").check();
  await output("castle-roof-assembly");
  await p.getByRole("button", { name: "Ouvrir la porte", exact: true }).click();
  assert.equal(await p.locator("[data-material-roof]").isChecked(), false);
  await output("castle-open-assembly");
  await click(6, 0);
  await p.getByText("Repère 7, 1.", { exact: false }).waitFor();
  await click(6, 1);
  await p.getByText("Case inaccessible :", { exact: false }).waitFor();
  await p.getByRole("button", { name: "Fermer la porte", exact: true }).click();
  await click(6, 0);
  await p.getByText("Case inaccessible :", { exact: false }).waitFor();
  await p.locator("[data-material-roof]").uncheck();
  await click(4, 4);
  await p.getByText("Repère 5, 5.", { exact: false }).waitFor();
  await click(8, 4);
  await p.getByText("Case inaccessible :", { exact: false }).waitFor();
  await click(5, 3);
  await p.getByText("Case inaccessible :", { exact: false }).waitFor();
  await p.getByRole("button", { name: "Bois & mer", exact: true }).click();
  await output("boarding-assembly");
  await click(8, 3);
  await p.getByText("Repère 9, 4.", { exact: false }).waitFor();
  await click(8, 5);
  await p.getByText("Case inaccessible :", { exact: false }).waitFor();
  await click(6, 2);
  await p.getByText("Case inaccessible :", { exact: false }).waitFor();
  for (const [x, y] of [
    [2, 1],
    [3, 2],
    [1, 6],
    [5, 0],
  ]) {
    await click(x, y);
    await p.getByText("Case inaccessible :", { exact: false }).waitFor();
  }
  await p.locator("[data-material-grid]").check();
  await p.locator("[data-material-collisions]").check();
  await p.locator("select").selectOption("0.75");
  assert.equal(
    await p
      .locator("[data-material-canvas]")
      .evaluate((c) => c.getBoundingClientRect().width),
    720,
  );
  await p.screenshot({
    path: "artifacts/material-tests/boarding-lab.png",
    fullPage: true,
  });
  const seams = await p.evaluate(async () => {
    const r = await import("/src/dev/material-renderer.ts");
    const images = await r.loadMaterialImages(),
      tile = r.periodicWater(images.corrections);
    const { data } = tile.getContext("2d").getImageData(0, 0, 256, 256);
    let mismatches = 0;
    for (let i = 0; i < 256; i++)
      for (let c = 0; c < 4; c++) {
        if (data[i * 256 * 4 + c] !== data[(i * 256 + 255) * 4 + c])
          mismatches++;
        if (data[i * 4 + c] !== data[(255 * 256 + i) * 4 + c]) mismatches++;
      }
    const m = await import("/src/dev/material-samples.ts");
    const ship = m.materialSample("boarding"),
      castle = m.materialSample("castle");
    return {
      mismatches,
      uniform: !castle.tiles.includes("warm"),
      blocked: ship.tiles.every(
        (t, k) =>
          k % 10 !== 6 ||
          (Math.floor(k / 10) >= 3 && Math.floor(k / 10) <= 4
            ? m.materialWalkable(t)
            : !m.materialWalkable(t)),
      ),
    };
  });
  assert.deepEqual(seams, { mismatches: 0, uniform: true, blocked: true });
  const railWater = await p.evaluate(async () => {
    const r = await import("/src/dev/material-renderer.ts"),
      m = await import("/src/dev/material-samples.ts");
    const images = await r.loadMaterialImages(),
      map = m.materialSample("boarding"),
      waterOnly = {
        ...map,
        tiles: map.tiles.map((t) => (t === "rail" ? "water" : t)),
      };
    const real = r
      .renderMaterialSample(map, images)
      .getContext("2d")
      .getImageData(0, 0, 960, 768).data;
    const expected = r
      .renderMaterialSample(waterOnly, images)
      .getContext("2d")
      .getImageData(0, 0, 960, 768).data;
    let mismatches = 0;
    for (let y = 0; y < 768; y++)
      if (y < 288 || y >= 480)
        for (let x = 600; x < 672; x++)
          for (let ch = 0; ch < 4; ch++)
            if (
              real[(y * 960 + x) * 4 + ch] !== expected[(y * 960 + x) * 4 + ch]
            )
              mismatches++;
    return mismatches;
  });
  assert.equal(
    railWater,
    0,
    "Sea continues unchanged over the outer three quarters of every railing cell",
  );
  const added = await p.evaluate(async () => {
    const m = await import("/src/dev/material-samples.ts"),
      ship = m.materialSample("boarding"),
      castle = { ...m.materialSample("castle"), doorOpen: false };
    return {
      anchor: ship.tiles[3 * 10 + 5],
      bridge: !!m.materialPath(ship, 3 * 10 + 4, 3 * 10 + 9),
      closed: m.materialPath(castle, castle.start, 6) === null,
      open: !!m.materialPath({ ...castle, doorOpen: true }, castle.start, 6),
      rug: m.materialWalkable(castle.tiles[4 * 10 + 3]),
    };
  });
  const opaque = await p.evaluate(async () => {
    const r = await import("/src/dev/material-renderer.ts"),
      m = await import("/src/dev/material-samples.ts"),
      images = await r.loadMaterialImages();
    const empty = document.createElement("canvas");
    empty.width = 1536;
    empty.height = 1024;
    const blank = new Image();
    blank.src = empty.toDataURL();
    await blank.decode();
    const map = { ...m.materialSample("castle"), doorOpen: false };
    return (
      r.renderMaterialSample(map, images, true).toDataURL() ===
      r.renderMaterialSample(map, { ...images, chest: blank }, true).toDataURL()
    );
  });
  assert.equal(opaque, true, "Upper-room roof fully conceals the chest");
  const underBoards = await p.evaluate(async () => {
    const r = await import("/src/dev/material-renderer.ts"),
      m = await import("/src/dev/material-samples.ts"),
      images = await r.loadMaterialImages();
    const cut = document.createElement("canvas");
    cut.width = images.boarding.width;
    cut.height = images.boarding.height;
    const cc = cut.getContext("2d");
    cc.drawImage(images.boarding, 0, 0);
    cc.clearRect(10, 960, 330, 265);
    const boardless = new Image();
    boardless.src = cut.toDataURL();
    await boardless.decode();
    const actual = r
      .renderMaterialSample(m.materialSample("boarding"), {
        ...images,
        boarding: boardless,
      })
      .getContext("2d")
      .getImageData(0, 0, 960, 768).data;
    const sea = document.createElement("canvas");
    sea.width = 960;
    sea.height = 768;
    const sc = sea.getContext("2d"),
      pattern = sc.createPattern(r.periodicWater(images.corrections), "repeat");
    pattern.setTransform(new DOMMatrix().scale(192 / 256));
    sc.imageSmoothingEnabled = false;
    sc.fillStyle = pattern;
    sc.fillRect(0, 0, 960, 768);
    const expected = sc.getImageData(0, 0, 960, 768).data;
    let errors = 0;
    for (let y = 288; y < 480; y++)
      for (let x = 600; x < 960; x++)
        for (let ch = 0; ch < 4; ch++)
          if (
            actual[(y * 960 + x) * 4 + ch] !== expected[(y * 960 + x) * 4 + ch]
          )
            errors++;
    return errors;
  });
  assert.equal(
    underBoards,
    0,
    "All seaward cells beneath the boarding planks show continuous water",
  );
  assert.deepEqual(added, {
    anchor: "plank",
    bridge: true,
    closed: true,
    open: true,
    rug: true,
  });
  assert.equal(
    await p.evaluate(() => JSON.stringify({ ...localStorage })),
    storage,
  );
  await p
    .getByRole("button", { name: "Retour aux tests", exact: true })
    .click();
  await p
    .getByRole("button", { name: "Explorer les deux cartes", exact: true })
    .waitFor();
  assert.deepEqual(errors, []);
  console.log(
    "PASS: illustrated atlases loaded, 4 PNG exports, floor/planks reachable, walls/pillar/rail/sea blocked, overlays, zoom, menu return, saved campaign unchanged, no JS errors.",
  );
} finally {
  await b.close();
}
