import { test, expect, type Page } from "@playwright/test";
async function cellClick(page: Page, x: number, y: number) {
  await expect
    .poll(() => page.locator("#map").getAttribute("data-view-cols"), {
      timeout: 15000,
    })
    .not.toBeNull();
  const p = await page.locator("#map").evaluate(
    (c: HTMLCanvasElement, p) => {
      const r = c.getBoundingClientRect();
      return {
        x:
          r.x +
          ((p.x + 0.5 - Number(c.dataset.cameraX)) * r.width) /
            Number(c.dataset.viewCols),
        y:
          r.y +
          ((p.y + 0.5 - Number(c.dataset.cameraY)) * r.height) /
            Number(c.dataset.viewRows),
      };
    },
    { x, y },
  );
  await page.mouse.click(p.x, p.y);
}
async function battleFixture(
  page: Page,
  injured = true,
  classId = "man_at_arms",
  gender = "male",
  weapon = "",
) {
  await page.goto("/");
  const result = await page.evaluate(
    async ({ injured, classId, gender, weapon }) => {
      const E = await import(String("/src/engine.ts"));
      const { trainingUnit } = await import(String("/src/game/sandbox.ts"));
      const s = E.createCampaign(
        E.classes[classId].faction === "north"
          ? ["north", "knight"]
          : ["knight", "north"],
      );
      s.units = [];
      s.merged = true;
      s.sandbox = true;
      s.sandboxFlat = true;
      s.scene = null;
      s.phase = "battle";
      s.events = ["meeting", "sanctuary-guards"];
      const a = trainingUnit(s, classId, 1, 1, 1),
        b = trainingUnit(s, "raider", 1, 1, 2),
        enemy = trainingUnit(s, "skeleton", 1, 1, 0);
      const c = E.map.find(
        (c: any) =>
          c.x > 15 &&
          c.x < 40 &&
          c.y > 12 &&
          c.y < 30 &&
          [-1, 0, 1, 2].every((dx) => E.cell(c.x + dx, c.y)?.walk) &&
          E.cell(c.x, c.y + 1)?.walk,
      );
      Object.assign(a, { x: c.x, y: c.y, potions: 1, leader: true, gender });
      if (weapon) {
        a.activeWeaponId = weapon;
        E.syncWeapon(a);
      }
      Object.assign(b, {
        x: c.x,
        y: c.y + 1,
        hp: b.maxHp - (injured ? 2 : 0),
        leader: true,
      });
      Object.assign(enemy, { x: c.x + 1, y: c.y, hp: 500, maxHp: 500 });
      s.common = { round: 1, index: 0, queue: [a.id, b.id, enemy.id] };
      s.active = 1;
      s.fronts = [s.common, s.common];
      s.players.forEach((p: any) => {
        p.visible = E.map.map((_: any, k: number) => k);
        p.explored = p.visible;
        p.camera = { x: c.x - 5, y: c.y - 4 };
      });
      s.mapRevision = E.MAP_REVISION;
      localStorage.setItem("lte-save", E.encode(s));
      return { a, b, enemy };
    },
    { injured, classId, gender, weapon },
  );
  await page.locator('[data-action="continue"]').click();
  await page.locator('[data-slot-legacy="lte-save"]').click();
  await expect(page.locator("#map")).toBeVisible();
  return result;
}

test("bandage depuis la fiche : soigner un voisin blessé même si le porteur est indemne, stock consommé et tour terminé", async ({
  page,
}) => {
  const { a, b } = await battleFixture(page);
  await cellClick(page, a.x, a.y);
  if (!(await page.locator("#unit-actions").count()))
    await cellClick(page, a.x, a.y);
  await page.locator('[data-action="character"]').click();
  await page.locator('[data-action="character-item-bandages"]').click();
  await expect(page.locator('[data-action="heal"]')).toBeEnabled();
  await page.locator('[data-action="heal"]').click();
  await expect(page.locator(".bandage-targets button")).toHaveCount(2);
  await page.locator(`[data-action="use-bandage-${b.id}"]`).click();
  await expect(page.locator(".bandage-targets")).toHaveCount(0);
  await expect(page.locator("#map")).toBeVisible();
  await expect(
    page.locator(`.initiative-entry.current [data-initiative="${b.id}"]`),
  ).toHaveCount(1, { timeout: 15000 });
  await page.keyboard.press("Escape");
  await page.locator('[data-action="save"]').click();
  await page
    .getByLabel("Nom de la sauvegarde", { exact: true })
    .fill("Bandage voisin");
  await page
    .getByRole("button", { name: "Créer une sauvegarde", exact: true })
    .click();
  const s = await page.evaluate(() =>
    JSON.parse(
      JSON.parse(localStorage.getItem("lte-manual-saves-v1")!).slots[0].payload,
    ),
  );
  expect(s.units.find((u: any) => u.id === a.id).potions).toBe(0);
  expect(s.units.find((u: any) => u.id === b.id).hp).toBe(b.maxHp);
  expect(s.common.queue[s.common.index]).not.toBe(a.id);
});
test("combat : largeur accrue, hauteur conservée, quatre textes retirés et vraie carte tactique derrière", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1806, height: 880 });
  const { a, enemy } = await battleFixture(page, false);
  await cellClick(page, a.x, a.y);
  if (!(await page.locator("#unit-actions").count()))
    await cellClick(page, a.x, a.y);
  await page.locator('[data-action="attack-mode"]').click();
  await cellClick(page, enemy.x, enemy.y);
  await page.locator(`[data-action="confirm-attack-${enemy.id}"]`).click();
  await expect(page.locator(".combat-screen")).toBeVisible();
  const field = page.locator("#combat");
  const box = (await field.boundingBox())!;
  expect(box.width).toBeGreaterThan(1104);
  expect(box.height).toBeCloseTo(690, 0);
  expect(await page.locator(".combat-screen").innerText()).not.toMatch(
    /CONFRONTATION|VITESSE|RIVAGES DE L’OUBLI|CHAQUE FRAPPE/,
  );
  expect(
    await page
      .locator(".combat-tactical-background")
      .evaluate((el) => getComputedStyle(el).backgroundImage),
  ).toMatch(/^url\("data:image\/png/);
  await page.screenshot({ path: "/tmp/combat-wide-tactical-v24.png" });
});
test("suppression visible : anciens et nouveaux emplacements, confirmation nominative et stockage intact ailleurs", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(async () => {
    const E = await import(String("/src/engine.ts"));
    const { ManualSaves } = await import(String("/src/game/manual-saves.ts"));
    const s = E.createCampaign(["north", "knight"]);
    localStorage.setItem("lte-save", E.encode(s));
    new ManualSaves(localStorage).create("À garder", s);
    new ManualSaves(localStorage).create("À supprimer", s);
  });
  await page.locator('[data-action="continue"]').click();
  const remove = page.getByRole("button", {
    name: "Supprimer À supprimer",
    exact: true,
  });
  await expect(remove).toBeVisible();
  await remove.click();
  await expect(page.getByRole("alert")).toContainText("À supprimer");
  await page.getByRole("button", { name: "Confirmer", exact: true }).click();
  const legacy = page.locator('[data-slot-legacy-delete="lte-save"]');
  await expect(legacy).toBeVisible();
  await legacy.click();
  await expect(page.getByRole("alert")).toContainText("Ancienne partie");
  await page.getByRole("button", { name: "Confirmer", exact: true }).click();
  expect(
    await page.evaluate(() => localStorage.getItem("lte-save")),
  ).toBeNull();
  expect(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem("lte-manual-saves-v1")!).slots.map(
        (s: any) => s.name,
      ),
    ),
  ).toEqual(["À garder"]);
  await page.reload();
  await page.locator('[data-action="continue"]').click();
  await expect(page.locator("[data-slot] strong")).toHaveText("À garder");
});
test("portraits : yeux opaques, têtes de fiches harmonisées et vraies recolorations sans toucher aux visages", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const P = await import(String("/src/ui/portrait-mask.ts"));
    const L = await import(String("/src/ui/portrait-layout.ts"));
    const ids = [
      "C01",
      "C02",
      "C03",
      "C04",
      "C05",
      "C06",
      "C07",
      "C08",
      "C09",
      "C10",
      "C11",
      "C12",
      "V01",
      "V09",
      "N05",
      "R03",
    ];
    const rows = [];
    for (const id of ids) {
      const im = new Image();
      im.src = "/assets/portraits/" + id + ".png";
      await im.decode();
      const c = document.createElement("canvas");
      c.width = im.width;
      c.height = im.height;
      const ctx = c.getContext("2d")!;
      ctx.drawImage(im, 0, 0);
      const raw = ctx.getImageData(0, 0, c.width, c.height).data,
        before = raw.slice(),
        mask = P.portraitBackdropMask(
          raw,
          c.width,
          c.height,
          id.startsWith("V") ? 0.68 : 0.47,
          0,
          id,
        ),
        old = P.portraitBackdropMask(
          raw,
          c.width,
          c.height,
          id.startsWith("V") ? 0.68 : 0.47,
        );
      let restored = 0;
      for (let k = 3; k < mask.length; k += 4) {
        if (mask[k] && !old[k]) restored++;
        raw[k] = mask[k];
      }
      const bounds = L.opaquePortraitBounds(raw, c.width, c.height),
        head = L.sheetPortraitPlacement(id, bounds).headHeight;
      const pink = before.slice(),
        yellow = before.slice();
      P.recolorPortraitDetails(id, pink, c.width, c.height, [255, 45, 161]);
      P.recolorPortraitDetails(id, yellow, c.width, c.height, [234, 193, 58]);
      let changed = 0,
        faceChanged = 0;
      for (let k = 0; k < raw.length; k += 4)
        if (
          pink[k] !== before[k] ||
          pink[k + 1] !== before[k + 1] ||
          pink[k + 2] !== before[k + 2]
        ) {
          changed++;
          if (Math.floor(k / 4 / c.width) < c.height * 0.5) faceChanged++;
        }
      rows.push({
        id,
        restored,
        head,
        changed,
        faceChanged,
        different: pink.some((x: number, k: number) => x !== yellow[k]),
        corner: mask[3],
      });
    }
    return rows;
  });
  for (const r of result) {
    expect(r.corner, r.id).toBe(0);
    expect(r.faceChanged, r.id).toBe(0);
    if (["C03", "C04", "C06"].includes(r.id))
      expect(r.restored, r.id).toBeGreaterThan(0);
    if (
      [
        "C01",
        "C02",
        "C03",
        "C04",
        "C05",
        "C06",
        "C07",
        "C08",
        "C09",
        "C11",
        "R03",
      ].includes(r.id)
    ) {
      expect(r.changed, r.id).toBeGreaterThan(10);
      expect(r.different).toBe(true);
    }
  }
  const heads = result.map((r) => r.head);
  expect(Math.max(...heads) - Math.min(...heads)).toBeLessThan(40);
});

test("rencontre et sorcière : positions réelles, rescapés seulement, Sans-Repos derrière sa victime et impact synchronisé", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(async () => {
    const E = await import(String("/src/engine.ts"));
    const { ChapterDirector } = await import(
      String("/src/ui/chapter-dialogue.ts")
    );
    const s = E.createCampaign(["north", "knight"]);
    const units = s.units.filter((u: any) => u.owner !== 0);
    units.forEach((u: any, i: number) => {
      u.x = 25 + i;
      u.y = 21 + (i % 2);
    });
    s.chapter1 = {
      started: true,
      completed: [],
      pending: { id: "meeting", owner: 1, page: 2 },
    };
    s.scene = "chapter1:meeting";
    const root = document.querySelector("#app")!;
    root.innerHTML =
      '<main class="chapter-screen"><canvas id="story-map"></canvas><div id="chapter-overlay"></div></main>';
    let frame: any;
    const d = new ChapterDirector(
      root.querySelector("#chapter-overlay")!,
      s,
      () => {},
      (_t: any, f: any) => (frame = f),
    );
    (window as any).sceneTest = { E, s, d, getFrame: () => frame };
  });
  await expect
    .poll(() => page.evaluate(() => (window as any).sceneTest.d.ready), {
      timeout: 20000,
    })
    .toBe(true);
  const result = await page.evaluate(() => {
    const { s, d, getFrame } = (window as any).sceneTest,
      base = s.units
        .filter((u: any) => u.owner !== 0)
        .map((u: any) => ({ id: u.id, x: u.x, y: u.y }));
    const frames = [0, 700, 1100, 2050].map((dt) => {
      d.tick(d.started + dt);
      const f = getFrame();
      return {
        dt,
        actors: f.actors.map((a: any) => ({
          id: a.unit.id,
          x: a.x,
          y: a.y,
          animation: a.animation,
        })),
        flash: f.flash,
        strength: document
          .querySelector<HTMLElement>(".chapter-screen")!
          .style.getPropertyValue("--rescue-flash"),
        shake: document
          .querySelector(".chapter-screen")!
          .classList.contains("rescue-impact"),
      };
    });
    return {
      base,
      frames,
      after: s.units
        .filter((u: any) => u.owner !== 0)
        .map((u: any) => ({ id: u.id, x: u.x, y: u.y })),
    };
  });
  expect(result.after).toEqual(result.base);
  for (const u of result.base)
    expect(
      result.frames[0].actors.find((a: any) => a.id === u.id),
    ).toMatchObject(u);
  expect(result.frames[2].shake).toBe(true);
  expect(Number(result.frames[2].strength)).toBeGreaterThan(0);
  expect(
    result.frames[2].actors.some((a: any) => a.animation === "attack"),
  ).toBe(true);
  expect(
    result.frames[3].actors.some((a: any) => a.id === "chapter-ambush"),
  ).toBe(false);
  await page.evaluate(() => {
    const { E, s, d } = (window as any).sceneTest;
    s.chapter1.pending = { id: "alliance", owner: 1, page: 6 };
    d.refresh();
    d.tick(d.started + 2500);
  });
  await expect(page.locator(".offscreen-voice")).toBeVisible();
  await expect(page.locator(".portrait-left")).toHaveCount(0);
  await expect(page.locator(".portrait-right")).toHaveCount(2);
  await page.evaluate(() => {
    const { s, d } = (window as any).sceneTest;
    s.chapter1.pending.page = 8;
    d.refresh();
    d.tick(d.started + 1800);
  });
  await expect(page.locator(".portrait-left img")).toHaveAttribute(
    "data-portrait-source",
    /R01.png$/,
  );
  await expect(page.locator(".portrait-right")).toHaveCount(2);
  await page.screenshot({ path: "/tmp/witch-real-positions-v24.png" });
});

test("création : Pillard/Pillarde, deux armes, tête et pieds alignés sans lissage ni changement des originaux", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator('[data-action="new"]').click();
  await page.locator('[data-action="solo"]').click();
  await page.locator('[data-action="creator-factions-ready"]').click();
  const rows = [];
  for (const gender of ["male", "female"]) {
    await page.locator("#hero-gender-1").selectOption(gender);
    for (const cls of ["raider", "north_warrior", "hunter"]) {
      await page.locator("#hero-class-1").selectOption(cls);
      for (const weapon of cls === "raider"
        ? ["axe_shield", "sword_shield"]
        : [""]) {
        if (weapon)
          await page.locator('[data-starter="0"]').selectOption(weapon);
        const c = page.locator('[data-creator-hero="0"]');
        await expect(c).toHaveAttribute("data-loaded", "true");
        const bounds = await c.evaluate((c: HTMLCanvasElement) => {
          const r = c.getBoundingClientRect(),
            d = c.getContext("2d")!.getImageData(0, 0, c.width, c.height).data;
          let top = c.height,
            bottom = 0;
          for (let y = 0; y < c.height; y++)
            for (let x = 0; x < c.width; x++)
              if (d[(y * c.width + x) * 4 + 3] > 100) {
                top = Math.min(top, y);
                bottom = Math.max(bottom, y);
              }
          return {
            top: (top * r.height) / c.height,
            bottom: (bottom * r.height) / c.height,
            smooth: c.getContext("2d")!.imageSmoothingEnabled,
            render: getComputedStyle(c).imageRendering,
          };
        });
        rows.push({ gender, cls, weapon, ...bounds });
        expect(bounds.smooth).toBe(false);
        expect(bounds.render).toBe("pixelated");
      }
    }
  }
  expect(
    Math.max(...rows.map((r) => r.bottom)) -
      Math.min(...rows.map((r) => r.bottom)),
  ).toBeLessThan(2);
  expect(
    Math.max(...rows.map((r) => r.top)) - Math.min(...rows.map((r) => r.top)),
  ).toBeLessThan(20);
  await page.screenshot({ path: "/tmp/v24-creation-sharp-aligned.png" });
});

test("attente reprise après déplacement et action : Pillarde hache, Pillarde épée et Lame nordique féminine sur la carte", async ({
  page,
}) => {
  for (const [cls, weapon] of [
    ["raider", "axe_shield"],
    ["raider", "sword_shield"],
    ["nordic_blade", ""],
  ]) {
    const { a, b } = await battleFixture(page, false, cls, "female", weapon);
    await cellClick(page, a.x, a.y);
    await cellClick(page, a.x - 1, a.y);
    await expect(page.locator("#unit-actions")).toBeVisible({ timeout: 15000 });
    const sample = () =>
      page.locator("#map").evaluate(
        (c: HTMLCanvasElement, { x, y }) => {
          const sx = c.width / Number(c.dataset.viewCols),
            sy = c.height / Number(c.dataset.viewRows),
            d = c
              .getContext("2d")!
              .getImageData(
                Math.floor((x + 0.05 - Number(c.dataset.cameraX)) * sx),
                Math.floor((y - 1 - Number(c.dataset.cameraY)) * sy),
                Math.ceil(0.9 * sx),
                Math.ceil(1.6 * sy),
              ).data;
          let hash = 0;
          for (let i = 0; i < d.length; i++)
            hash = (Math.imul(hash, 31) + d[i]) | 0;
          return hash;
        },
        { x: a.x - 1, y: a.y },
      );
    const moved = await sample();
    await expect.poll(sample, { timeout: 5000 }).not.toBe(moved);
    await page.locator('[data-action="wait"]').click();
    await expect(
      page.locator(`.initiative-entry.current [data-initiative="${b.id}"]`),
    ).toHaveCount(1);
    const after = await sample();
    await expect.poll(sample, { timeout: 5000 }).not.toBe(after);
  }
});

test("combat repris après la rencontre : le fond utilise aussi la carte de la cinématique", async ({
  page,
}) => {
  await battleFixture(page, false);
  await page.evaluate(async () => {
    const E = await import(String("/src/engine.ts"));
    const s = E.decode(localStorage.getItem("lte-save")!);
    delete s.sandbox;
    delete s.sandboxFlat;
    s.chapter1.started = true;
    s.chapter1.pending = { id: "meeting", owner: 1, page: 5 };
    s.scene = "chapter1:meeting";
    s.encounterContinuation = {
      actorId: s.common.queue[0],
      targetId: s.units.find((u: any) => u.owner === 0).id,
    };
    localStorage.setItem("lte-save", E.encode(s));
  });
  await page.reload();
  await page.locator('[data-action="continue"]').click();
  await page.locator('[data-slot-legacy="lte-save"]').click();
  await expect(page.locator("#story-map")).toBeVisible();
  await expect(page.locator("#chapter-overlay")).toHaveAttribute(
    "data-ready",
    "true",
    { timeout: 15000 },
  );
  for (
    let i = 0;
    i < 3 && (await page.locator("[data-story-next]").count());
    i++
  ) {
    await page.locator("[data-story-next]").click();
    if (await page.locator(".combat-screen").count()) break;
    await page.waitForTimeout(100);
  }
  await expect(page.locator(".combat-screen")).toBeVisible({ timeout: 15000 });
  expect(
    await page
      .locator(".combat-tactical-background")
      .evaluate((el) => getComputedStyle(el).backgroundImage),
  ).toMatch(/^url\("data:image\/png/);
});
