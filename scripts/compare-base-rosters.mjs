import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";

// Older shared links lead to the current roster instead of a stale low-resolution review.
await mkdir("public/validation/vikings-a-revoir", { recursive: true });
await writeFile(
  "public/validation/vikings-a-revoir/index.html",
  '<!doctype html><html lang="fr"><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=../vikings/index.html"><title>Comparaison des Vikings de base</title><a href="../vikings/index.html">Ouvrir la comparaison actuelle des Vikings</a></html>',
);
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
try {
  for (const kind of ["knight"]) {
    const directory = kind === "knight" ? "chevaliers" : "vikings-a-revoir";
    const out = `public/validation/${directory}`;
    await mkdir(out, { recursive: true });
    const page = await browser.newPage({
      viewport: { width: 1500, height: 1000 },
    });
    // Public report writes must not reload the offscreen capture through Vite HMR.
    await page.routeWebSocket(/.*/, () => {});
    await page.goto("http://127.0.0.1:5173/");
    const result = await page.evaluate(async (kind) => {
      const E = await import("/src/engine.ts"),
        R = await import("/src/sprites/resources.ts"),
        C = await import("/src/sprites/catalog.ts"),
        G = await import("/src/sprites/geometry.ts"),
        S = await import("/src/sprites/combat-skins.ts"),
        T = await import("/src/terrain.ts"),
        M = await import("/src/game/active-map.ts"),
        D = await import("/src/sprites/display-scale.ts"),
        roster = await import("/src/ui/contact-roster.ts"),
        old = (
          await import("/src/assets/tactical/north-female-before.reference.json")
        ).default;
      const beforeMap = JSON.stringify(M.map),
        beforeSave = JSON.stringify({ ...localStorage });
      const inputs =
        kind === "knight"
          ? E.baseClasses("knight").flatMap((cls) =>
              cls.starter.flatMap((weapon) =>
                ["male", "female"].map((gender) => ({
                  id: `${cls.id}-${weapon}-${gender}`,
                  cls: cls.id,
                  gender,
                  weapon,
                  label: `${cls.femaleName && gender === "female" ? cls.femaleName : cls.name} · ${gender === "male" ? "homme" : "femme"}`,
                  status:
                    ["man_at_arms", "swordsman"].includes(cls.id) ||
                    (gender === "female" &&
                      ["crossbowman", "sorcerer"].includes(cls.id))
                      ? "Nouveau · animations à tester"
                      : "Référence conservée · animations à tester",
                })),
              ),
            )
          : roster.contactRoster;
      const rows = [],
        signatures = new Set();
      for (const input of inputs) {
        const u = E.makeClassUnit(
          input.id,
          1,
          1,
          input.cls,
          input.label,
          0,
          0,
          input.gender,
        );
        u.activeWeaponId = input.weapon;
        E.syncWeapon(u);
        const signature = `${input.cls}:${input.gender}:${E.activeWeapon(u).visual}`;
        if (kind === "knight" && signatures.has(signature)) continue;
        signatures.add(signature);
        const isOld = input.id === "old-north-warrior-female";
        const map = isOld ? old.map : R.unitSpriteProfile(u),
          skin = isOld
            ? { profile: old.combat, issues: [] }
            : S.combatSkin(map),
          combat = skin?.profile;
        if (!map || !combat) throw Error(`Profil absent : ${input.id}`);
        for (const profile of [map, combat])
          await R.spriteImage(C.resolveClip(profile, "idle").source).decode();
        const c = C.resolveClip(combat, "idle"),
          reference = G.profileMetrics(combat).references.get(c.source);
        const canvas = document.createElement("canvas");
        canvas.width = 280;
        canvas.height = 300;
        R.drawResourceFrame(
          canvas.getContext("2d"),
          combat,
          "idle",
          0,
          0,
          278 - 300 * 0.96,
          280,
          300,
          true,
          kind === "knight" ? "yellow" : "blue",
          "world",
          { scale: 185 / reference },
        );
        rows.push({
          ...input,
          map,
          combat,
          reference,
          weaponName:
            E.activeWeapon(u).name +
            (kind === "knight" && E.hasSkill(u, "heal")
              ? " · soins avec la même apparence"
              : ""),
          source: c.source,
          mapSource: C.resolveClip(map, "idle").source,
          shared: map.gender === "any",
          image: canvas.toDataURL(),
          issues: skin.issues,
        });
      }
      const camera = { x: 22, y: 12, cols: 20, rows: 14 };
      const atlas = new Image();
      atlas.src = "/assets/regional-tiles.png";
      await atlas.decode();
      const layer = new T.TerrainRenderer(atlas).layer("regional", [
        "north",
        "knight",
      ]);
      const terrain = document.createElement("canvas");
      terrain.width = 1280;
      terrain.height = 896;
      const ctx = terrain.getContext("2d");
      ctx.scale(2, 2);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(
        layer,
        camera.x * 64,
        camera.y * 64,
        1280,
        896,
        0,
        0,
        640,
        448,
      );
      const occupied = new Set(),
        positions = [];
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i],
          group = Math.floor(i / 2),
          tx = camera.x + 2 + group * 3,
          ty = camera.y + (i % 2 ? 8 : 3);
        const candidates = [];
        for (let y = camera.y + 1; y < camera.y + camera.rows - 1; y++)
          for (let x = camera.x + 1; x < camera.x + camera.cols - 1; x++) {
            const cell = E.cell(x, y);
            if (
              cell?.walk &&
              ["road", "grass"].includes(cell.terrain) &&
              !occupied.has(`${x}:${y}`) &&
              positions.every((p) => Math.abs(p.x - x) + Math.abs(p.y - y) >= 2)
            )
              candidates.push({ x, y, d: Math.abs(x - tx) + Math.abs(y - ty) });
          }
        candidates.sort((a, b) => a.d - b.d || a.y - b.y || a.x - b.x);
        const cell = candidates[0];
        if (!cell) throw Error("Aucune case de comparaison");
        occupied.add(`${cell.x}:${cell.y}`);
        positions.push({ id: row.id, x: cell.x, y: cell.y });
        const x = (cell.x - camera.x) * 32,
          y = (cell.y - camera.y) * 32,
          size = 38;
        ctx.save();
        ctx.translate(x + 16, y + 12);
        const sway = 0; // Same grounded neutral pose as the map at breath time zero.
        if (sway) ctx.transform(1, 0, sway, 1, -sway * size * 0.384, 0);
        R.drawResourceFrame(
          ctx,
          row.map,
          "idle",
          0,
          -size / 2,
          -size * 0.72,
          size,
          size * 1.15,
          true,
          kind === "knight" ? "yellow" : "blue",
          "world",
        );
        ctx.restore();
        ctx.font = "bold 10px Arial";
        ctx.textAlign = "center";
        ctx.lineWidth = 3;
        ctx.strokeStyle = "#111";
        ctx.strokeText(String(i + 1), x + 16, y - 6);
        ctx.fillStyle = "#fff";
        ctx.fillText(String(i + 1), x + 16, y - 6);
      }
      const terrainImage = terrain.toDataURL();
      const title =
        kind === "knight"
          ? "Tous les Chevaliers de base"
          : "Comparaison des gabarits nordiques";
      const intro =
        kind === "knight"
          ? "Cinq classes de base, hommes et femmes : dix variantes. Six nouveaux dessins à tester, quatre références conservées. Le Sorcier conserve la même apparence pour la magie offensive et les soins."
          : "La nouvelle Guerrière du Nord, une seule ancienne version et trois références vikings déjà validées. Les autres variantes restent disponibles dans les campagnes.";
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
      document.head.innerHTML = `<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>*{box-sizing:border-box}body{margin:0;background:#18212a;color:#eef2f6;font:16px Arial}main{max-width:1500px;margin:auto;padding:22px}h1{font-size:28px}a{color:#ead5a5}p{line-height:1.5}.cards{display:grid;grid-template-columns:repeat(${kind === "knight" ? 6 : 5},minmax(0,1fr));gap:10px}.card{padding:10px;background:#26333f;border:1px solid #536071}.card h2{font-size:16px;min-height:42px}.card p{font-size:13px;min-height:36px}.card img{width:100%;height:auto;image-rendering:pixelated}.card small{display:block;color:#c5d4df;line-height:1.5}.terrain{overflow:auto;max-width:100%;border:1px solid #536071}.terrain img{display:block;width:1280px;max-width:none;image-rendering:pixelated}.legend{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.legend p{padding:8px;background:#26333f;font-size:13px}.notice{padding:12px;background:#2b3a49;border-left:4px solid #d2b87d}@media(max-width:1000px){.cards{grid-template-columns:repeat(3,minmax(0,1fr))}.legend{grid-template-columns:repeat(2,1fr)}}@media(max-width:600px){main{padding:10px}.cards{grid-template-columns:repeat(2,minmax(0,1fr))}.legend{grid-template-columns:1fr}}</style>`;
      document.body.innerHTML = `<main><h1>${title}</h1><p>${intro}</p><p><a href="../vikings/index.html">Vikings de base</a> · <a href="../chevaliers/index.html">Chevaliers de base</a> · <a href="../vikings/index.html">Toutes les bases vikings</a> · <a href="animations/index.html">Planches d’animations des Chevaliers</a> · <a href="couleurs-equipes.png">Couleurs jaune / rose</a> · <a href="archives/avant.png">Comparaison avant les reprises</a> · <a href="../../">Retour au jeu</a></p><p class="notice">Même hauteur anatomique de référence : 185 pixels, sans étirement. Les équipements peuvent dépasser ce repère. Les figurines sur le terrain utilisent les dimensions du jeu. L’image est rendue directement en double résolution pour préserver les détails au zoom ×2. Une ressource partagée entre les sexes est signalée, sans inventer de nouvelle apparence.</p><div class="cards">${rows.map((r, i) => `<article class="card" data-variant="${r.id}"><h2>${i + 1} · ${esc(r.label)}</h2><p>${esc(r.status)}<br>${esc(r.weaponName)}</p><img src="${r.image}" alt="${esc(r.label)}"><small>Définition de corps source : ${Math.round(r.reference)} px${r.shared ? "<br>Profil graphique partagé entre les sexes" : ""}${r.issues.length ? `<br>${r.issues.length} réserve(s) technique(s) du skin` : ""}</small></article>`).join("")}</div><h2>Sur le terrain tactique du prologue</h2><p>Mise en situation indépendante, sur les cases praticables de la vraie carte. Aucune équipe ni sauvegarde n’est déplacée. <label>Zoom <select id="zoom"><option value="1">×1</option><option value="2" selected>×2</option><option value="3">×3</option></select></label></p><div class="terrain"><img id="terrain" src="${terrainImage}" alt="Comparaison sur le terrain tactique"></div><div class="legend">${rows.map((r, i) => `<p>${i + 1} · ${esc(r.label)}<br>${esc(r.weaponName)}</p>`).join("")}</div><p><a href="comparaison.png">Télécharger cette comparaison</a> · <a href="terrain.png">Télécharger le terrain</a></p></main>`;
      const script = document.createElement("script");
      script.textContent = `document.getElementById('zoom').onchange=e=>document.getElementById('terrain').style.width=(640*Number(e.target.value))+'px';`;
      document.body.append(script);
      await Promise.all([...document.images].map((i) => i.decode()));
      if (
        beforeMap !== JSON.stringify(M.map) ||
        beforeSave !== JSON.stringify({ ...localStorage })
      )
        throw Error("État de jeu modifié");
      return {
        terrain: terrainImage,
        manifest: {
          kind,
          entries: rows.map(
            ({
              id,
              cls,
              gender,
              weapon,
              status,
              source,
              mapSource,
              reference,
              shared,
            }) => ({
              id,
              cls,
              gender,
              weapon,
              status,
              source,
              mapSource,
              reference,
              shared,
            }),
          ),
          positions,
          mapUntouched: true,
          savesUntouched: true,
        },
      };
    }, kind);
    await writeFile(`${out}/index.html`, await page.content());
    await writeFile(
      `${out}/terrain.png`,
      Buffer.from(result.terrain.split(",")[1], "base64"),
    );
    await page.screenshot({ path: `${out}/comparaison.png`, fullPage: true });
    await writeFile(
      `docs/references/${directory}-inventaire.json`,
      JSON.stringify(result.manifest, null, 2) + "\n",
    );
    console.log(`${directory}: ${result.manifest.entries.length} variantes`);
    await page.close();
  }
} finally {
  await browser.close();
}
