import { chromium } from "@playwright/test";
import { mkdir, writeFile, copyFile } from "node:fs/promises";
const out = "docs/references",
  pub = "public/validation/gabarits";
await mkdir(out, { recursive: true });
await mkdir(pub, { recursive: true });
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
try {
  const page = await browser.newPage({
    viewport: { width: 1600, height: 1100 },
    deviceScaleFactor: 1,
  });
  await page.goto("http://127.0.0.1:5173/");
  const report = await page.evaluate(async () => {
    const E = await import("/src/engine.ts"),
      R = await import("/src/sprites/resources.ts"),
      C = await import("/src/sprites/catalog.ts"),
      G = await import("/src/sprites/geometry.ts"),
      S = await import("/src/sprites/combat-skins.ts"),
      B = await import("/src/sprites/combat-skin-core.ts");
    const review = (
      await import("/src/assets/tactical/pillarde-axe.review.json")
    ).default;
    const inputs = [
      ["Pillard masculin", "raider", "male"],
      ["Guerrier du Nord masculin", "north_warrior", "male"],
      ["Lame nordique féminine", "nordic_blade", "female"],
      ["Pillarde élancée (essai)", "raider", "female"],
    ];
    const entries = [];
    for (const [label, cls, gender] of inputs) {
      const u = E.makeClassUnit(
        "compare-" + cls + gender,
        1,
        1,
        cls,
        label,
        0,
        0,
        gender,
      );
      const p =
        cls === "raider" && gender === "female"
          ? B.buildCombatSkin(review, review).profile
          : S.combatSkin(R.unitSpriteProfile(u)).profile;
      for (const name of ["idle", "attack"]) {
        const c = C.resolveClip(p, name),
          im = R.spriteImage(c.source);
        if (!im.complete)
          await new Promise((yes, no) => {
            im.addEventListener("load", yes, { once: true });
            im.addEventListener("error", no, { once: true });
          });
        if (!im.naturalWidth) throw Error(c.source);
      }
      entries.push({ label, p });
    }
    document.head.innerHTML =
      '<meta charset="utf-8"><title>Comparaison des gabarits nordiques</title><style>*{box-sizing:border-box}body{margin:0;padding:24px;width:1600px;background:#18212a;color:#edf1f5;font:16px Arial,sans-serif}h1{font-size:28px;margin:0 0 12px}h2{font-size:20px;color:#ead6ab;margin:0 0 10px}p{line-height:1.4}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:22px}.card{background:#26323f;padding:10px;border:1px solid #49586a}h3{font-size:16px;margin:0 0 8px}img{display:block;width:360px;height:350px;image-rendering:pixelated;background:linear-gradient(transparent 309px,#c5ae7855 309px,#c5ae7855 310px,transparent 310px)}small{font-size:13px;color:#c1cede}.note{padding:14px;background:#303e4d;border-left:4px solid #cdb783}</style>';
    document.body.innerHTML =
      "<h1>Comparaison des gabarits — même échelle et même ligne de sol</h1><p>Référence de corps : 220 px pour tous, affichage sans étirement. La largeur mesurée inclut cape, bouclier et arme : elle ne mesure pas seule la largeur du torse.</p>";
    const report = [];
    for (const [name, label] of [
      ["idle", "Garde : comparaison du gabarit"],
      ["attack", "Préparation / arme levée : vérifier la forme des armes"],
    ]) {
      const section = document.createElement("section");
      section.innerHTML = `<h2>${label}</h2><div class="grid"></div>`;
      document.body.append(section);
      for (const { label, p } of entries) {
        const c = C.resolveClip(p, name),
          index = name === "idle" ? 0 : Math.max(0, (c.impactFrame ?? 3) - 1),
          r = G.resourceRect(c, index),
          ref =
            p.referenceHeights?.[c.source] ??
            G.profileMetrics(p).references.get(c.source) ??
            r.bodyHeight;
        const canvas = document.createElement("canvas");
        canvas.width = 360;
        canvas.height = 350;
        const ctx = canvas.getContext("2d");
        ctx.imageSmoothingEnabled = false;
        R.drawResourceFrame(
          ctx,
          p,
          name,
          index,
          0,
          310 - 350 * 0.96,
          360,
          350,
          true,
          "blue",
          "world",
          { scale: 220 / ref },
        );
        const d = ctx.getImageData(0, 0, 360, 350).data;
        let left = 360,
          right = -1,
          top = 350,
          bottom = -1;
        for (let y = 0; y < 350; y++)
          for (let x = 0; x < 360; x++)
            if (d[(y * 360 + x) * 4 + 3] > 100) {
              left = Math.min(left, x);
              right = Math.max(right, x);
              top = Math.min(top, y);
              bottom = Math.max(bottom, y);
            }
        if (right < 0) throw Error("Rendu vide");
        report.push({
          label,
          animation: name,
          frame: index,
          source: c.source,
          bodyReference: ref,
          renderScale: 220 / ref,
          visibleWidth: right - left + 1,
          visibleHeight: bottom - top + 1,
        });
        const card = document.createElement("article");
        card.className = "card";
        card.innerHTML = `<h3>${label}</h3><img src="${canvas.toDataURL()}" alt="${label}"><small>Encombrement visible : ${right - left + 1} × ${bottom - top + 1} px<br>Hauteur de corps de référence : 220 px</small>`;
        section.querySelector(".grid").append(card);
      }
    }
    document.body.insertAdjacentHTML(
      "beforeend",
      '<div class="note">La Pillarde garde la même hauteur de référence ; sa silhouette est plus étroite que celle des deux personnages masculins et se rapproche surtout de la Lame nordique féminine. L’équipement explique une partie des différences. La hache a été retouchée : la comparaison de préparation montre notamment sa tête levée, avec le même gabarit de corps.</div>',
    );
    await Promise.all([...document.images].map((i) => i.decode()));
    return report;
  });
  const html = await page.content();
  await page.screenshot({
    path: `${out}/comparaison-gabarits-nordiques.png`,
    fullPage: true,
  });
  await writeFile(
    `${out}/comparaison-gabarits-nordiques.json`,
    JSON.stringify(report, null, 2) + "\n",
  );
  await writeFile(`${pub}/index.html`, html);
  await copyFile(
    `${out}/comparaison-gabarits-nordiques.png`,
    `${pub}/comparaison.png`,
  );
  console.log(JSON.stringify(report));
} finally {
  await browser.close();
}
