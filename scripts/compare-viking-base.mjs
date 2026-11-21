import { chromium } from "@playwright/test";
import { mkdir, writeFile, copyFile, readFile } from "node:fs/promises";
const out = "docs/references",
  pub = "public/validation/vikings";
await mkdir(out, { recursive: true });
await mkdir(pub, { recursive: true });
const previousTerrain =
  "data:image/png;base64," +
  (await readFile(`${out}/vikings-base-avant-terrain.png`)).toString("base64");
await copyFile(
  `${out}/vikings-base-avant-gabarits.png`,
  `${pub}/avant-gabarits.png`,
);
await copyFile(
  `${out}/vikings-base-avant-terrain.png`,
  `${pub}/terrain-avant.png`,
);
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
try {
  const page = await browser.newPage({
    viewport: { width: 1680, height: 1000 },
    deviceScaleFactor: 1,
  });
  await page.goto("http://127.0.0.1:5173/");
  const result = await page.evaluate(async (previousTerrain) => {
    const E = await import("/src/engine.ts"),
      M = await import("/src/game/active-map.ts"),
      R = await import("/src/sprites/resources.ts"),
      C = await import("/src/sprites/catalog.ts"),
      G = await import("/src/sprites/geometry.ts"),
      S = await import("/src/sprites/combat-skins.ts"),
      B = await import("/src/sprites/combat-skin-core.ts"),
      D = await import("/src/sprites/display-scale.ts"),
      T = await import("/src/terrain.ts");
    const review = (
      await import("/src/assets/tactical/pillarde-axe.review.json")
    ).default;
    if (M.currentMapId !== "prologue")
      throw Error("La comparaison attend le terrain du prologue");
    const beforeMap = JSON.stringify(M.map),
      beforeSaves = JSON.stringify({ ...localStorage });
    const entries = [],
      groups = [];
    for (const cls of E.baseClasses("north"))
      for (const weapon of cls.starter) {
        const group = groups.length + 1;
        groups.push({ group, classId: cls.id, weapon });
        for (const gender of ["male", "female"]) {
          const unit = E.makeClassUnit(
            `comparison-${cls.id}-${weapon}-${gender}`,
            1,
            1,
            cls.id,
            cls.name,
            0,
            0,
            gender,
          );
          unit.activeWeaponId = weapon;
          E.syncWeapon(unit);
          const map = R.unitSpriteProfile(unit),
            combat = S.combatSkin(map)?.profile;
          if (!map || !combat) throw Error("Profil absent " + unit.id);
          entries.push({
            id: `${gender === "male" ? "H" : "F"}${group}`,
            group,
            classId: cls.id,
            className: cls.name,
            gender,
            weapon,
            weaponName: E.activeWeapon(unit).name,
            unit,
            map,
            combat,
          });
        }
      }
    const reviewed = entries.find(
      (e) =>
        e.classId === "raider" &&
        e.gender === "female" &&
        e.weapon === "axe_shield",
    );
    const proposal = {
      ...reviewed,
      id: "P",
      map: review,
      combat: B.buildCombatSkin(review, review).profile,
    };
    for (const entry of [...entries, proposal])
      for (const p of [entry.map, entry.combat]) {
        const c = C.resolveClip(p, "idle");
        if (!c) throw Error("Attente absente " + entry.id);
        const image = R.spriteImage(c.source);
        if (!image.complete)
          await new Promise((yes, no) => {
            image.addEventListener("load", yes, { once: true });
            image.addEventListener("error", no, { once: true });
          });
        if (!image.naturalWidth) throw Error(c.source);
      }
    const metrics = [];
    function portrait(entry) {
      const p = entry.combat,
        c = C.resolveClip(p, "idle"),
        r = G.resourceRect(c, 0),
        reference =
          p.referenceHeights?.[c.source] ??
          G.profileMetrics(p).references.get(c.source) ??
          r.bodyHeight;
      const canvas = document.createElement("canvas");
      canvas.width = 260;
      canvas.height = 360;
      const ctx = canvas.getContext("2d");
      ctx.imageSmoothingEnabled = false;
      if (
        !R.drawResourceFrame(
          ctx,
          p,
          "idle",
          0,
          0,
          330 - 360 * 0.96,
          260,
          360,
          true,
          "blue",
          "world",
          { scale: 176 / reference },
        )
      )
        throw Error("Dessin absent " + entry.id);
      const pixels = ctx.getImageData(0, 0, 260, 360).data;
      let left = 260,
        right = -1,
        top = 360,
        bottom = -1;
      for (let y = 0; y < 360; y++)
        for (let x = 0; x < 260; x++)
          if (pixels[(y * 260 + x) * 4 + 3] > 100) {
            left = Math.min(left, x);
            right = Math.max(right, x);
            top = Math.min(top, y);
            bottom = Math.max(bottom, y);
          }
      if (right < 0 || left === 0 || top === 0 || right === 259)
        throw Error("Silhouette vide ou coupée " + entry.id);
      metrics.push({
        id: entry.id,
        classId: entry.classId,
        gender: entry.gender,
        weapon: entry.weapon,
        combatSource: c.source,
        mapSource: C.resolveClip(entry.map, "idle").source,
        bodyReference: reference,
        bodyDisplayReference: 176,
        visibleWidth: right - left + 1,
        visibleHeight: bottom - top + 1,
        review: entry.id === "P",
      });
      return canvas.toDataURL();
    }
    const cards = entries.map((e) => ({ ...e, image: portrait(e) }));
    proposal.image = portrait(proposal);
    const atlas = new Image();
    atlas.src = "/assets/regional-tiles.png";
    await atlas.decode();
    const terrain = new T.TerrainRenderer(atlas),
      surface = terrain.layer("regional", ["north", "knight"]);
    if (!surface) throw Error("Terrain indisponible");
    const camera = { x: 22, y: 12, cols: 20, rows: 14 },
      positions = [],
      occupied = new Set();
    for (const e of entries) {
      const tx = camera.x + 2 + (e.group - 1) * 3,
        ty = camera.y + (e.gender === "male" ? 3 : 8);
      const candidates = M.map.filter(
        (c) =>
          c.walk &&
          ["grass", "road"].includes(c.terrain) &&
          c.x >= camera.x + 1 &&
          c.x < camera.x + camera.cols - 1 &&
          c.y >= camera.y + 1 &&
          c.y < camera.y + camera.rows - 1 &&
          !occupied.has(c.y * M.W + c.x) &&
          positions.every(
            (p) => Math.abs(p.x - c.x) + Math.abs(p.y - c.y) >= 2,
          ),
      );
      candidates.sort(
        (a, b) =>
          Math.abs(a.x - tx) +
            Math.abs(a.y - ty) -
            Math.abs(b.x - tx) -
            Math.abs(b.y - ty) ||
          a.y - b.y ||
          a.x - b.x,
      );
      const cell = candidates[0];
      if (!cell) throw Error("Pas de case praticable");
      occupied.add(cell.y * M.W + cell.x);
      positions.push({ id: e.id, x: cell.x, y: cell.y, terrain: cell.terrain });
    }
    function tactical(useProposal) {
      const canvas = document.createElement("canvas");
      const worldWidth = camera.cols * 32,
        worldHeight = camera.rows * 32;
      canvas.width = worldWidth * 2;
      canvas.height = worldHeight * 2;
      const ctx = canvas.getContext("2d");
      ctx.scale(2, 2);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(
        surface,
        camera.x * 64,
        camera.y * 64,
        worldWidth * 2,
        worldHeight * 2,
        0,
        0,
        worldWidth,
        worldHeight,
      );
      ctx.imageSmoothingEnabled = false;
      ctx.strokeStyle = "#dce1d21f";
      ctx.lineWidth = 0.5;
      for (let x = 0; x <= worldWidth; x += 32) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, worldHeight);
        ctx.stroke();
      }
      for (let y = 0; y <= worldHeight; y += 32) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(worldWidth, y);
        ctx.stroke();
      }
      for (const e of entries) {
        const pos = positions.find((p) => p.id === e.id),
          p = useProposal && e.id === reviewed.id ? proposal.map : e.map;
        const x = (pos.x - camera.x) * 32,
          y = (pos.y - camera.y) * 32,
          size = 38;
        // Same two transforms, 38px frame, world scale and idle sway as main.ts drawSprite.
        ctx.save();
        ctx.translate(x + 16, y + 12);
        const sway = D.tacticalIdleSway(
          e.classId,
          e.gender,
          "idle",
          0,
          C.resolveClip(p, "idle").frames.length,
        );
        if (sway) ctx.transform(1, 0, sway, 1, -sway * (size * 0.384), 0);
        if (
          !R.drawResourceFrame(
            ctx,
            p,
            "idle",
            0,
            -size / 2,
            -size * 0.72,
            size,
            size * 1.15,
            true,
            "blue",
            "world",
          )
        )
          throw Error("Carte vide " + e.id);
        ctx.restore();
        ctx.font = "bold 8px Arial";
        ctx.textAlign = "center";
        ctx.lineWidth = 2;
        ctx.strokeStyle = "#101c22";
        ctx.fillStyle =
          useProposal && e.id === reviewed.id ? "#ffdb88" : "#f3f5e9";
        ctx.strokeText(e.id, x + 16, y - 6);
        ctx.fillText(e.id, x + 16, y - 6);
      }
      return canvas.toDataURL();
    }
    const current = tactical(false),
      proposed = tactical(true);
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
    document.head.innerHTML = `<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Comparaison des gabarits nordiques</title><style>*{box-sizing:border-box}body{margin:0;background:#18212a;color:#eef2f6;font:15px Arial,sans-serif}main{max-width:1680px;margin:auto;padding:24px}h1{font-size:28px;margin:0 0 10px}h2{color:#ead5a5;font-size:22px;margin-top:24px}p{line-height:1.5}.notice{padding:13px;background:#2b3a49;border-left:4px solid #d2b87d}.cards{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:8px}.card{background:#26333f;border:1px solid #536071;padding:8px;min-width:0}.card h3{font-size:15px;line-height:1.3;height:40px;margin:0 0 3px}.card .sub{height:34px;font-size:12px;color:#c3d0e0}.card img{width:100%;height:auto;display:block;image-rendering:pixelated;background:linear-gradient(transparent 91.5%,#c4b48955 91.5%,#c4b48955 91.8%,transparent 91.8%)}.card small{display:block;color:#c3d0e0;line-height:1.4}.proposal{display:flex;align-items:center;gap:24px;flex-wrap:wrap;background:#253340;padding:16px}.proposal img{width:260px;height:360px;image-rendering:pixelated}.proposal>div{flex:1;min-width:230px}.controls{display:flex;gap:18px;flex-wrap:wrap;margin:16px 0}select{padding:8px}label{display:flex;gap:8px;align-items:center}.map-viewport{max-width:100%;max-height:950px;overflow:auto;border:1px solid #a69a70;background:#0e191c}.map-viewport img{display:block;width:1280px;height:auto;max-width:none;image-rendering:pixelated}.map-viewport img[hidden]{display:none}.legend{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:12px}.legend p{margin:0;padding:8px;background:#26333f;font-size:13px}a{color:#ead39b}@media(max-width:1100px){.cards{grid-template-columns:repeat(3,minmax(0,1fr))}.legend{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:600px){main{padding:10px}.cards{grid-template-columns:repeat(2,minmax(0,1fr))}.legend{grid-template-columns:1fr}h1{font-size:23px}.card h3{font-size:13px}}</style>`;
    document.body.innerHTML = `<main><h1>Toutes les classes vikings de base — hommes et femmes</h1><p>5 classes, 6 équipements, 12 variantes actuelles. Chaque paire présente homme puis femme. Le Pillard est montré avec hache/bouclier et épée/bouclier.</p><div class="notice">Les grands portraits de sprites utilisent une même hauteur de corps de référence de 176 px, sans déformation. Les largeurs incluent arme, bouclier et cape. Les images ci-dessous sont celles actuellement enregistrées dans le moteur.</div><h2>Gabarits de combat actuels</h2><div class="cards">${cards
      .map((e) => {
        const m = metrics.find((m) => m.id === e.id);
        return `<article class="card" data-variant="${e.id}"><h3>${esc(e.className)} · ${e.gender === "male" ? "homme" : "femme"}</h3><div class="sub">${esc(e.weaponName)} · repère ${e.id}</div><img src="${e.image}" alt="${esc(e.className)} ${e.gender}"><small>Silhouette avec équipement : ${m.visibleWidth} × ${m.visibleHeight} px</small></article>`;
      })
      .join(
        "",
      )}</div><p><a href="avant-gabarits.png">Voir la comparaison avant harmonisation</a> · <a href="animations/index.html">Voir les planches d’animations actuelles</a> · <a href="couleurs-equipes.png">Comparer les couleurs bleu / rose</a> · Les variantes vikings validées visuellement sont utilisées en campagne, sur carte et en combat ; leurs animations restent à essayer en situation. Le menu d’essai permet de les observer en animation.</p><h2>Sur le véritable terrain tactique du prologue</h2><p>Les unités sont posées sur des cases praticables de la vraie carte, sans déplacer une équipe existante. L’aperçu est rendu directement en double résolution, sans agrandir une miniature. Les facteurs de rendu sont ceux du jeu : case de 32 pixels, cadre de sprite de 38 pixels et échelle de corps calculée par le moteur. Les identifiants ajoutés servent uniquement à la comparaison.</p><div class="controls"><label>Apparences sur la carte<select id="appearance"><option value="current">Après harmonisation</option><option value="proposal">Avant harmonisation</option></select></label><label>Zoom<select id="zoom"><option value="1">×1 · case 32 px</option><option value="2" selected>×2 · case 64 px</option><option value="3">×3 · case 96 px</option></select></label></div><div class="map-viewport"><img id="map-current" src="${current}" alt="Douze variantes sur la carte tactique actuelle"><img id="map-proposal" src="${previousTerrain}" alt="Même terrain et mêmes positions avant harmonisation" hidden></div><div class="legend">${groups
      .map((g) => {
        const e = entries.find((e) => e.group === g.group);
        return `<p><strong>H${g.group} / F${g.group}</strong> — ${esc(e.className)}<br>${esc(e.weaponName)} · H = homme, F = femme</p>`;
      })
      .join(
        "",
      )}</div><p><a href="gabarits.png">Télécharger la comparaison complète</a> · <a href="terrain-actuel.png">Carte actuelle</a> · <a href="terrain-avant.png">Carte avant harmonisation</a></p><div class="notice">La cohérence se juge aussi sur la carte : certains profils y utilisent une autre planche que leur vue de combat. La taille des têtes, la largeur des épaules et la définition des images peuvent donc varier malgré une même échelle technique. Le Chaman est une classe de soins ; ses poses et son équipement ne sont pas ceux d’un combattant à la hache.</div></main>`;
    const behavior = document.createElement("script");
    behavior.textContent = `const appearance=document.getElementById('appearance'),zoom=document.getElementById('zoom'),actual=document.getElementById('map-current'),proposed=document.getElementById('map-proposal');appearance.onchange=()=>{actual.hidden=appearance.value!=='current';proposed.hidden=appearance.value!=='proposal';};zoom.onchange=()=>{for(const image of [actual,proposed])image.style.width=(640*Number(zoom.value))+'px';};`;
    document.body.append(behavior);
    await Promise.all([...document.images].map((i) => i.decode()));
    if (
      beforeMap !== JSON.stringify(M.map) ||
      beforeSaves !== JSON.stringify({ ...localStorage })
    )
      throw Error("La comparaison a modifié un état");
    return {
      manifest: {
        classes: E.baseClasses("north").map((c) => c.id),
        groups,
        entries: metrics.filter((e) => !e.review),
        proposal: {
          ...metrics.find((e) => e.review),
          replaces: reviewed.id,
          reviewOnly: false,
        },
        terrain: {
          map: M.currentMapId,
          camera,
          positions,
          tileSize: 32,
          spriteFrameSize: 38,
          worldBodyHeight: 38 * 0.74,
        },
        mapUntouched: true,
        savesUntouched: true,
      },
      current,
      proposed: previousTerrain,
    };
  }, previousTerrain);
  const stem = "vikings-base";
  await writeFile(
    `${out}/${stem}-inventaire.json`,
    JSON.stringify(result.manifest, null, 2) + "\n",
  );
  for (const [name, data] of [["terrain-actuel", result.current]]) {
    await writeFile(
      `${out}/${stem}-${name}.png`,
      Buffer.from(data.split(",")[1], "base64"),
    );
    await copyFile(`${out}/${stem}-${name}.png`, `${pub}/${name}.png`);
  }
  const html = await page.content();
  await page.screenshot({
    path: `${out}/${stem}-gabarits.png`,
    fullPage: true,
  });
  await copyFile(`${out}/${stem}-gabarits.png`, `${pub}/gabarits.png`);
  await writeFile(`${pub}/index.html`, html);
  console.log(
    JSON.stringify({
      classes: result.manifest.classes,
      variants: result.manifest.entries.length,
      review: result.manifest.proposal.replaces,
      positions: result.manifest.terrain.positions,
    }),
  );
} finally {
  await browser.close();
}
