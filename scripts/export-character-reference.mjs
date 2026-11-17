import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

// Export the real runtime frames. No generated or retouched character art.
const out = resolve("docs/references");
await mkdir(out, { recursive: true });
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
try {
  const page = await browser.newPage({
    viewport: { width: 1500, height: 1000 },
    deviceScaleFactor: 1,
  });
  await page.goto(process.env.REFERENCE_BASE_URL || "http://127.0.0.1:5173/");
  const manifest = await page.evaluate(async () => {
    const E = await import("/src/engine.ts");
    const R = await import("/src/sprites/resources.ts");
    const C = await import("/src/sprites/catalog.ts");
    const G = await import("/src/sprites/geometry.ts");
    const S = await import("/src/sprites/combat-skins.ts");
    const u = E.makeClassUnit(
      "reference",
      1,
      1,
      "raider",
      "Pillard",
      0,
      0,
      "male",
    );
    u.activeWeaponId = "axe_shield";
    E.syncWeapon(u);
    const map = R.unitSpriteProfile(u),
      combat = S.combatSkin(map).profile;
    await R.warmSprites(
      [u],
      { player1: "pink", player2: "blue", enemies: "red" },
      [
        "idle",
        "move",
        "attack",
        "counter",
        "attack_again",
        "damage",
        "death",
        "block",
      ],
    );
    for (const p of [map, combat])
      for (const name of Object.keys(p.clips)) {
        const c = C.resolveClip(p, name);
        if (c) {
          const im = R.spriteImage(c.source);
          if (!im.complete)
            await new Promise((yes, no) => {
              im.addEventListener("load", yes, { once: true });
              im.addEventListener("error", no, { once: true });
            });
          if (!im.naturalWidth) throw Error(c.source);
        }
      }
    const esc = (s) =>
      String(s).replace(
        /[&<>"']/g,
        (c) =>
          ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;",
          })[c],
      );
    document.head.innerHTML = `<meta charset="utf-8"><title>Pillard masculin — Hache et bouclier — Référence complète</title><style>
      *{box-sizing:border-box}body{margin:0;padding:26px;background:#181e28;color:#edf0f7;font:15px Arial,sans-serif;width:1500px}h1{font-size:30px;margin:0 0 10px}p{line-height:1.45;margin:8px 0}header{padding-bottom:18px}.notice{padding:14px;background:#303c4e;border-left:4px solid #c9b26b}section{margin:18px 0;break-inside:avoid}h2{font-size:20px;margin:0 0 5px;color:#e9d7a6}small{color:#b6c5d8}.frames{display:grid;grid-template-columns:repeat(8,1fr);gap:8px;margin-top:10px}.frame{border:1px solid #46546a;padding:8px;min-height:202px;background:#202936}.frame img{display:block;width:150px;height:160px;object-fit:contain;image-rendering:pixelated;background-color:#303947;background-image:linear-gradient(45deg,#3b4553 25%,transparent 25%),linear-gradient(-45deg,#3b4553 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#3b4553 75%),linear-gradient(-45deg,transparent 75%,#3b4553 75%);background-size:16px 16px;background-position:0 0,0 8px,8px -8px,-8px 0}.frame span{display:block;font-size:12px;margin-top:5px}.missing{padding:16px;background:#402d34;border:1px solid #ba7d88}footer{margin-top:20px;font-size:13px;color:#c0ccdd}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
    </style>`;
    document.body.innerHTML = `<header><h1>PILLARD MASCULIN · HACHE + BOUCLIER</h1><p>Fiche des poses réellement actives dans le jeu — 17 novembre 2026. Carte et combat séparés ; aucune pose Legacy. Palette de jeu bleue appliquée aux couleurs d’équipe.</p><div class="notice">Modèle pour refaire le même personnage : garder visage, tenue, proportions, pieds et arme cohérents dans toutes les animations. Les répétitions nécessaires aux séquences sont conservées. Le damier indique la transparence, il ne fait pas partie des images.</div></header>`;
    const manifest = {
      character: "raider:male:axe-shield:default",
      frames: [],
      missing: ["evade"],
      optional: [
        "critical distinct (sinon attaque réutilisée)",
        "chute animée (mort actuelle à une pose)",
      ],
    };
    for (const [scope, p, names] of [
      [
        "Carte",
        map,
        [
          ["idle", "Attente"],
          ["move", "Marche"],
        ],
      ],
      [
        "Combat",
        combat,
        [
          ["idle", "Garde"],
          ["move", "Approche / retour"],
          ["attack", "Attaque"],
          ["counter", "Riposte (attaque réutilisée)"],
          ["attack_again", "Seconde frappe — variante"],
          ["block", "Parade"],
          ["damage", "Dégâts"],
          ["death", "Mort"],
        ],
      ],
    ])
      for (const [name, label] of names) {
        const c = C.resolveClip(p, name);
        if (!c) throw Error(scope + ": " + name);
        const section = document.createElement("section");
        section.innerHTML = `<h2>${esc(scope)} — ${esc(label)} · ${c.frames.length} poses référencées</h2><small>${esc(c.source)} · ${c.fps} images/s · ${c.loop === false ? "une lecture" : "boucle / maintien selon moteur"}</small><div class="frames"></div>`;
        document.body.append(section);
        for (let i = 0; i < c.frames.length; i++) {
          const rect = G.resourceRect(c, i);
          if (!rect) throw Error("Découpage absent : " + name + " " + i);
          const canvas = document.createElement("canvas");
          canvas.width = 150;
          canvas.height = 160;
          const ctx = canvas.getContext("2d");
          ctx.imageSmoothingEnabled = false;
          const scale = Math.min(
            112 / (rect.bodyHeight || rect.height),
            138 / rect.width,
            145 / rect.height,
          );
          const drawn = R.drawResourceFrame(
            ctx,
            p,
            name,
            i,
            0,
            0,
            150,
            155,
            true,
            "blue",
            "world",
            {
              scale,
              ground: rect.bodyGround || rect.y + rect.height,
              anchorX: rect.x + rect.width / 2,
            },
          );
          if (!drawn) throw Error("Rendu absent " + name);
          const pixels = ctx.getImageData(0, 0, 150, 160).data;
          if (!pixels.some((a, k) => k % 4 === 3 && a))
            throw Error("Pose vide " + name);
          const cell = c.cells?.[i] || { row: c.row, column: c.frames[i] };
          const entry = {
            scope,
            animation: name,
            index: i + 1,
            source: c.source,
            row: cell.row,
            column: cell.column,
            fps: c.fps,
          };
          manifest.frames.push(entry);
          const card = document.createElement("div");
          card.className = "frame";
          card.innerHTML = `<img src="${canvas.toDataURL()}" alt="${esc(scope + " " + label + " " + (i + 1))}"><span>Pose ${i + 1} · ligne ${cell.row}, colonne ${cell.column}</span>`;
          section.querySelector(".frames").append(card);
        }
      }
    document.body.insertAdjacentHTML(
      "beforeend",
      `<section class="missing"><h2>À fournir pour une série complète</h2><p><strong>Esquive :</strong> manque un dessin cohérent avec ce personnage ; l’ancienne pose Legacy n’est pas utilisée. Prévoir idéalement départ, retrait et retour en garde.</p><p><strong>Facultatif :</strong> critique distinct (le jeu réutilise l’attaque), chute plus progressive (mort actuelle : une pose). Pas de nouvelle compétence à inventer.</p><p>Pour les prochains personnages : envoyer les planches PNG transparentes originales, leur grille et l’ordre des poses. Inclure aussi leurs gestes propres : soins, transformation ou bannière si leur classe les utilise.</p></section><footer>Cette fiche est une référence documentaire, pas un atlas directement importable. Les poses proviennent de plusieurs planches actuelles ; les réunir ici ne corrige pas leurs différences de qualité. Tous les fichiers Team Sample utilisés sont conservés.</footer>`,
    );
    await Promise.all([...document.images].map((im) => im.decode()));
    return manifest;
  });
  const name = "pillard-masculin-hache-bouclier";
  await writeFile(
    `${out}/${name}.json`,
    JSON.stringify(manifest, null, 2) + "\n",
  );
  const html = "<!doctype html>\n" + (await page.content());
  await page.screenshot({ path: `${out}/${name}.png`, fullPage: true });
  const height = await page.evaluate(
    () => document.documentElement.scrollHeight,
  );
  await page.pdf({
    path: `${out}/${name}.pdf`,
    width: "1500px",
    height: `${height + 4}px`,
    printBackground: true,
    margin: { top: "0", bottom: "0", left: "0", right: "0" },
  });
  await writeFile(`${out}/${name}.html`, html);
  console.log(
    `${manifest.frames.length} poses référencées exportées. Esquive manquante. Fiche HTML, PNG, PDF et manifeste : ${out}`,
  );
} finally {
  await browser.close();
}
