import { chromium } from "@playwright/test";
import { mkdir, writeFile, copyFile } from "node:fs/promises";
import { resolve } from "node:path";

// Capture the actual selected sprites. No new character art is generated here.
const out = resolve("docs/references"),
  published = resolve("public/validation/pillard");
await mkdir(out, { recursive: true });
await mkdir(published, { recursive: true });
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
  const result = await page.evaluate(async () => {
    const E = await import("/src/engine.ts"),
      V = await import("/src/sprites/visual-classes.ts"),
      R = await import("/src/sprites/resources.ts"),
      C = await import("/src/sprites/catalog.ts"),
      G = await import("/src/sprites/geometry.ts"),
      S = await import("/src/sprites/combat-skins.ts");
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
    const rows = [
      {
        scope: "Carte",
        p: map,
        name: "idle",
        label: "Attente sur la carte",
        count: 2,
      },
      {
        scope: "Combat",
        p: combat,
        name: "idle",
        label: "Garde de combat",
        count: 2,
      },
      {
        scope: "Carte et combat",
        p: combat,
        name: "move",
        label: "Pas rapides / approche",
        count: 4,
      },
      {
        scope: "Combat",
        p: combat,
        name: "attack",
        label: "Attaque · aussi riposte et seconde attaque",
        count: 8,
      },
      {
        scope: "Combat",
        p: combat,
        name: "block",
        label: "Parade · trois poses retenues dans l’essai",
        count: 3,
      },
      {
        scope: "Combat",
        p: combat,
        name: "evade",
        label: "Esquive · pas en arrière",
        count: 3,
      },
      { scope: "Combat", p: combat, name: "damage", label: "Dégâts", count: 3 },
      { scope: "Combat", p: combat, name: "death", label: "Mort", count: 1 },
    ];
    for (const row of rows) {
      const clip = C.resolveClip(row.p, row.name);
      if (!clip || clip.frames.length < row.count)
        throw Error(row.name + " absent");
      const im = R.spriteImage(clip.source);
      if (!im.complete)
        await new Promise((yes, no) => {
          im.addEventListener("load", yes, { once: true });
          im.addEventListener("error", no, { once: true });
        });
      if (!im.naturalWidth) throw Error(clip.source);
    }
    const cell = 320,
      baseline = 280,
      atlas = document.createElement("canvas");
    atlas.width = atlas.height = cell * 8;
    const ac = atlas.getContext("2d");
    ac.imageSmoothingEnabled = false;
    const reference = (p, c) =>
      p.referenceHeights?.[c.source] ??
      G.profileMetrics(p).references.get(c.source) ??
      G.resourceRect(c, 0).bodyHeight;
    let bodyHeight = 176;
    for (const row of rows) {
      const c = C.resolveClip(row.p, row.name),
        ref = reference(row.p, c);
      for (let i = 0; i < row.count; i++) {
        const r = G.resourceRect(c, i),
          ground = r.bodyGround ?? r.y + r.height;
        bodyHeight = Math.min(
          bodyHeight,
          (144 * ref) / Math.max(1, r.anchorX - r.x, r.x + r.width - r.anchorX),
          (264 * ref) / Math.max(1, ground - r.y),
          (24 * ref) / Math.max(1, r.y + r.height - ground),
        );
      }
    }
    const manifest = {
      character: "raider:male:axe-shield:default",
      edition: "18 novembre 2026 · critique validé sans triangles",
      atlas: {
        file: "pillard-modele-atlas.png",
        columns: 8,
        rows: 8,
        cellWidth: cell,
        cellHeight: cell,
        width: atlas.width,
        height: atlas.height,
        baseline,
        bodyHeight,
        transparentUnusedCells: true,
      },
      animations: [],
      frames: [],
      aliases: {
        counter: "attack",
        followUp: "attack",
        critical: "attack + effet partagé (deux griffures, flash et secousse)",
      },
      missing: [],
      groups: {},
    };
    const images = [];
    for (const [rowIndex, row] of rows.entries()) {
      const c = C.resolveClip(row.p, row.name),
        ref = reference(row.p, c);
      manifest.animations.push({
        row: rowIndex,
        name: row.name,
        label: row.label,
        scope: row.scope,
        frames: row.count,
        fps: c.fps,
      });
      const previews = [];
      for (let i = 0; i < row.count; i++) {
        const r = G.resourceRect(c, i),
          sourceCell = c.cells?.[i] ?? { row: c.row, column: c.frames[i] };
        const frame = document.createElement("canvas");
        frame.width = frame.height = cell;
        const ctx = frame.getContext("2d");
        ctx.imageSmoothingEnabled = false;
        if (
          !R.drawResourceFrame(
            ctx,
            row.p,
            row.name,
            i,
            0,
            baseline - cell * 0.96,
            cell,
            cell,
            true,
            "blue",
            "world",
            {
              scale: bodyHeight / ref,
              anchorX: r.anchorX,
              ground: r.bodyGround ?? r.y + r.height,
            },
          )
        )
          throw Error("Pose absente");
        const pixels = ctx.getImageData(0, 0, cell, cell).data;
        let opaque = 0;
        for (let y = 0; y < cell; y++)
          for (let x = 0; x < cell; x++)
            if (pixels[(y * cell + x) * 4 + 3] > 32) {
              opaque++;
              if (x === 0 || y === 0 || x === cell - 1 || y === cell - 1)
                throw Error("Pose coupée : " + row.name + " " + i);
            }
        if (!opaque) throw Error("Pose vide");
        ac.drawImage(frame, i * cell, rowIndex * cell);
        previews.push(frame.toDataURL());
        manifest.frames.push({
          animation: row.name,
          scope: row.scope,
          row: rowIndex,
          column: i,
          source: c.source,
          sourceRow: sourceCell.row,
          sourceColumn: sourceCell.column,
        });
      }
      images.push(previews);
    }
    for (const key of ["sameShield", "otherMelee", "special"])
      manifest.groups[key] = [];
    for (const p of R.spriteCatalog.profiles) {
      const cls = V.visualClasses[p.classId];
      if (!cls) continue;
      const item = {
        id: p.classId,
        label: cls.name,
        gender: p.gender,
        equipment: p.equipment,
        state: p.state,
        skills: cls.skills,
      };
      if (
        !cls.mounted &&
        p.state === "default" &&
        ["axe-shield", "sword-shield"].includes(p.equipment)
      )
        manifest.groups.sameShield.push(item);
      else if (
        !cls.mounted &&
        p.state === "default" &&
        ["axe", "sword", "lance", "lance-shield", "great-axe"].includes(
          p.equipment,
        )
      )
        manifest.groups.otherMelee.push(item);
      else manifest.groups.special.push(item);
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
    document.head.innerHTML = `<meta charset="utf-8"><title>Modèle Pillard — animations validées</title><style>*{box-sizing:border-box}body{margin:0;padding:24px;width:1500px;background:#19202a;color:#eef0f5;font:15px Arial,sans-serif}h1{font-size:30px;margin:0 0 12px}h2{font-size:20px;color:#e8d19b;margin:0 0 6px}p{line-height:1.5}a{color:#f2d49a}nav{display:flex;gap:20px;margin:15px 0}.notice{padding:14px;background:#303c4d;border-left:4px solid #d9bb77}section{margin:22px 0;break-inside:avoid}.frames{display:grid;grid-template-columns:repeat(8,1fr);gap:8px}.frame{padding:8px;background:#242e3a;border:1px solid #45536a}.frame img{display:block;width:150px;height:150px;image-rendering:pixelated;background-color:#303947;background-image:linear-gradient(45deg,#3b4553 25%,transparent 25%),linear-gradient(-45deg,#3b4553 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#3b4553 75%),linear-gradient(-45deg,transparent 75%,#3b4553 75%);background-size:16px 16px;background-position:0 0,0 8px,8px -8px,-8px 0}.frame small{display:block;margin-top:6px;color:#c3d0e2}table{border-collapse:collapse;width:100%}td,th{border:1px solid #526174;padding:8px;text-align:left}footer{padding:15px;background:#303c4d}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}nav{display:none}}</style>`;
    document.body.innerHTML = `<h1>PILLARD MASCULIN · HACHE + BOUCLIER</h1><p>Modèle à jour — 18 novembre 2026. Taille du corps et repère de sol communs ; aucune pose Legacy.</p><nav><a href="pillard-modele-atlas.png">Planche transparente</a><a href="pillard-masculin-hache-bouclier.pdf">Fiche PDF</a><a href="guide-remplacement.md">Liste des variantes et consignes</a></nav><div class="notice">Une seule série d’attaque : elle sert aussi à la riposte et à la seconde attaque. Aucun dessin supplémentaire pour le critique : deux griffures, flash et secousse ajoutés par le jeu. Le damier indique la transparence et ne fait pas partie des sprites.</div>`;
    for (const [r, row] of rows.entries()) {
      const section = document.createElement("section");
      section.innerHTML = `<h2>Ligne ${r + 1} — ${esc(row.label)} · ${row.count} pose${row.count > 1 ? "s" : ""}</h2><p>${esc(row.scope)} · ${C.resolveClip(row.p, row.name).fps} images/s</p><div class="frames">${images[r].map((src, i) => `<div class="frame"><img src="${src}" alt="${esc(row.label)} pose ${i + 1}"><small>Case ${r + 1}:${i + 1}</small></div>`).join("")}</div>`;
      document.body.append(section);
    }
    document.body.insertAdjacentHTML(
      "beforeend",
      `<footer><h2>Pour générer un autre personnage</h2><p>Utiliser la planche transparente : 8 colonnes × 8 lignes, cases carrées de 320 × 320 px, personnage tourné vers la droite, pieds au repère de sol (280 px). Garder exactement les mêmes poses, leur ordre et les cases vides. Redessiner le même personnage partout, avec son arme et son bouclier adaptés. Ne pas inclure de texte, d’ombre de sol ni de damier dans l’image.</p><p>Le jeu ajoute le déplacement et le recul de l’esquive. Ne pas décaler chaque dessin dans sa case. Les PNG seront contrôlés et leurs ancrages adaptés à l’intégration : une image générée ne garantit pas à elle seule l’absence de défauts.</p><p>Cette fiche décrit les animations retenues pour le modèle de l’essai. Les trois poses de parade remplacent ici l’ancienne quatrième pose où la hache partait en avant ; les capacités propres aux autres classes doivent être ajoutées séparément.</p></footer>`,
    );
    await Promise.all([...document.images].map((im) => im.decode()));
    return { manifest, atlas: atlas.toDataURL() };
  });
  const name = "pillard-masculin-hache-bouclier";
  await writeFile(
    `${out}/${name}.json`,
    JSON.stringify(result.manifest, null, 2) + "\n",
  );
  await writeFile(
    `${out}/pillard-modele-atlas.png`,
    Buffer.from(result.atlas.split(",")[1], "base64"),
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
  const groups = result.manifest.groups;
  const table = (items) =>
    [
      "| Classe | Sexe du profil | Équipement | État | Capacités à garder |",
      "|---|---|---|---|---|",
      ...items.map(
        (p) =>
          `| ${p.label} (${p.id}) | ${p.gender} | ${p.equipment} | ${p.state} | ${p.skills.join(", ") || "—"} |`,
      ),
    ].join("\n");
  const guide = `# Modèle de remplacement des personnages\n\nLa structure est réutilisable, pas les dessins : chaque classe, sexe et équipement doit garder sa propre identité. Cette liste décrit les profils présents, pas un diagnostic affirmant que tous leurs dessins sont défectueux.\n\n## Priorité proposée\n\n1. Pillarde hache-bouclier (raider:female:axe-shield:default).\n2. Pillarde épée-bouclier (raider:female:sword-shield:default).\n3. Huscarl féminine hache-bouclier puis épée-bouclier (classe appelée « Ulfkarl » dans la discussion ; identifiant actuel huscarl).\n4. Guérisseuse du clan féminine, hache-bouclier puis épée-bouclier. Ajouter le geste de bandage.\n5. Porte-étendard masculin dans une fiche distincte : bannière portée/plantée et changement d’arme à conserver.\n\n## Même famille de mouvements : fantassins avec bouclier\n\nSexe : male = masculin, female = féminin, any = dessin partagé dans les données actuelles.\n\nAttente, approche, attaque réutilisée pour la riposte et la seconde frappe, parade, esquive, dégâts, mort. Critique par effet partagé sans nouveau dessin. Les coups d’épée doivent être redessinés pour une épée ; ne pas simplement remplacer une hache dans une trajectoire incompatible. Huscarl : conserver l’interception ; Guérisseur : conserver les bandages.\n\n${table(groups.sameShield)}\n\n## Même tronc de mouvements, gestuelle à adapter\n\nArmes sans bouclier ou lances : ne pas copier le geste de parade au bouclier ni le maniement de la hache. La logique du combat est commune ; les dessins restent propres à l’arme et aux capacités.\n\n${table(groups.otherMelee)}\n\n## Autres familles, à ne pas forcer dans ce modèle\n\nTireurs : tir et recharge ; soigneurs/mages : soins ou sorts ; doubles armes : seconde main ; cavaliers : monture et charge ; porte-étendards : bannière portée/plantée ; formes animales et états spéciaux : planches distinctes.\n\n${table(groups.special)}\n\n## Fichiers à envoyer\n\n- PNG original transparent, sans compression JPEG, texte, décor ou damier.\n- Modèle : 2560 × 2560 px, 8 × 8 cases carrées de 320 px. Garder les cases inutilisées transparentes. Une autre résolution reste adaptable si la grille 8 × 8 est régulière ; privilégier une image assez définie pour ne pas retrouver le flou actuel.\n- Lignes : attente carte 2 poses ; garde combat 2 ; pas rapides 4 ; attaque 8 ; parade 3 ; esquive 3 ; dégâts 3 ; mort 1.\n- Pieds au repère 280 px, même axe et proportions, personnage orienté à droite ; le jeu peut le retourner.\n- Armes, boucliers, cheveux et cape entièrement dans chaque case ; aucun membre ou détail coupé.\n- Garder une seule tenue et le même visage entre toutes les poses. Pas de poses de critique, riposte ou seconde attaque en double.\n- Fournir aussi les gestes spéciaux de la classe sur une planche séparée.\n\nOui, une planche produite avec Chat peut être intégrée. Il faudra vérifier la grille, les poses, la transparence, l’échelle, l’arme et les ancrages ; on ne peut pas promettre zéro défaut d’image avant de l’examiner. Le modèle facilite cette vérification et évite de reconstruire les séquences.\n`;
  await writeFile(`${out}/guide-remplacement.md`, guide);
  // Public standalone reference: not loaded by the game itself.
  for (const file of [
    `${name}.png`,
    `${name}.pdf`,
    `${name}.json`,
    "pillard-modele-atlas.png",
    "guide-remplacement.md",
  ])
    await copyFile(`${out}/${file}`, `${published}/${file}`);
  await writeFile(`${published}/index.html`, html);
  console.log(
    `${result.manifest.frames.length} poses exportées ; modèle transparent 8 × 8 ; liste des profils et fiche publiable dans ${published}`,
  );
} finally {
  await browser.close();
}
