import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
const faction = process.argv.includes("--faction=knight") ? "knight" : "north";
const knight = faction === "knight";
const title = knight ? "Chevaliers évolués" : "Vikings évolués";
const out = `public/validation/${knight ? "chevaliers" : "vikings"}-evolues`;
await mkdir(out, { recursive: true });
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
try {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 900 },
  });
  await page.routeWebSocket(/.*/, () => {});
  await page.goto("http://127.0.0.1:5173/");
  const result = await page.evaluate(async (faction) => {
    const E = await import("/src/engine.ts"),
      R = await import("/src/sprites/resources.ts"),
      C = await import("/src/sprites/catalog.ts"),
      S = await import("/src/sprites/combat-skins.ts"),
      G = await import("/src/sprites/geometry.ts");
    const mapBefore = JSON.stringify(E.map),
      savesBefore = JSON.stringify({ ...localStorage });
    const inputs = Object.values(E.classes)
      .filter((c) => c.faction === faction && c.stage === "advanced")
      .flatMap((c) =>
        c.starter.flatMap((weapon) =>
          ["male", "female"].map((gender) => ({
            cls: c.id,
            weapon,
            gender,
            ...(faction === "knight" && c.id === "standard_bearer"
              ? { state: weapon === "sword" ? "planted" : "carried" }
              : {}),
          })),
        ),
      );
    if (faction === "knight") {
      const extras = inputs.filter((i) => i.cls === "pavise_crossbowman");
      inputs.push(
        ...extras.map((i) => ({
          ...i,
          state: "fortified",
        })),
      );
    }
    const refs =
      faction === "knight"
        ? [
            { cls: "spearman", weapon: "lance", gender: "male" },
            { cls: "spearman", weapon: "lance", gender: "female" },
            { cls: "crossbowman", weapon: "crossbow", gender: "male" },
          ]
        : [
            { cls: "raider", weapon: "axe_shield", gender: "female" },
            { cls: "nordic_blade", weapon: "sword", gender: "female" },
            { cls: "north_warrior", weapon: "axe", gender: "female" },
          ];
    const rows = [];
    for (const [i, input] of [...inputs, ...refs].entries()) {
      const cls = E.classes[input.cls],
        u = E.makeClassUnit(
          `advanced-review-${i}`,
          1,
          1,
          input.cls,
          cls.name,
          0,
          0,
          input.gender,
        );
      u.activeWeaponId = input.weapon;
      if (input.state === "planted") u.bannerPlanted = true;
      if (input.state === "fortified") u.fortified = true;
      if (input.cls === "hamrammr" && input.weapon === "claws")
        u.bearForm = true;
      E.syncWeapon(u);
      const map = R.unitSpriteProfile(u),
        skin = S.combatSkin(map),
        combat = skin?.profile;
      const capture = async (profile, animation, bodyHeight, small = false) => {
        const clip = C.resolveClip(profile, animation);
        if (!clip) return { missing: `${animation} absent` };
        const image = R.spriteImage(clip.source);
        await image.decode();
        const index = ["attack", "heal"].includes(animation)
          ? (clip.impactFrame ?? Math.floor(clip.frames.length / 2))
          : 0;
        const reference = G.profileMetrics(profile).references.get(clip.source);
        if (!reference) throw Error(`Échelle absente : ${u.id}/${animation}`);
        const canvas = document.createElement("canvas");
        canvas.width = small ? 192 : 640;
        canvas.height = small ? 160 : 640;
        const ctx = canvas.getContext("2d");
        ctx.scale(2, 2);
        ctx.imageSmoothingEnabled = false;
        const width = canvas.width / 2,
          height = canvas.height / 2,
          ground = height - 14;
        const rect = G.resourceRect(clip, index);
        if (rect) {
          const scale = bodyHeight / reference;
          const center = (rect.x + rect.width / 2 - rect.anchorX) * scale;
          ctx.translate(-center, 0);
        }
        const drawn = R.drawResourceFrame(
          ctx,
          profile,
          animation,
          index,
          0,
          ground - height * 0.96,
          width,
          height,
          true,
          "blue",
          "world",
          { scale: bodyHeight / reference },
        );
        if (!drawn) throw Error(`Image non dessinée : ${u.id}/${animation}`);
        return { image: canvas.toDataURL(), source: clip.source, index };
      };
      rows.push({
        id: `${input.cls}-${input.weapon}-${input.gender}${input.state ? "-" + input.state : ""}`,
        state: input.state,
        classId: cls.id,
        className: cls.name,
        role: cls.role,
        gender: input.gender,
        weapon: input.weapon,
        weaponName: E.activeWeapon(u).name,
        bear: !!u.bearForm,
        shared: map?.gender === "any",
        reference: i >= inputs.length,
        issues: skin?.issues ?? [],
        map: await capture(map, "idle", (cls.mounted ? 52 : 38) * 0.74, true),
        action: E.activeWeapon(u).category === "healing" ? "heal" : "attack",
        guard: await capture(
          combat,
          "idle",
          skin?.mounted ? 190.4 : u.bearForm ? 148 : 136,
        ),
        attack: await capture(
          combat,
          E.activeWeapon(u).category === "healing" ? "heal" : "attack",
          skin?.mounted ? 190.4 : u.bearForm ? 148 : 136,
        ),
      });
    }
    if (
      JSON.stringify(E.map) !== mapBefore ||
      JSON.stringify({ ...localStorage }) !== savesBefore
    )
      throw Error("La comparaison ne doit modifier ni carte ni sauvegarde");
    return {
      rows,
      classes: Object.values(E.classes)
        .filter((c) => c.faction === faction && c.stage === "advanced")
        .map((c) => ({
          id: c.id,
          name: c.name,
          role: c.role,
          origin: Object.values(E.classes).find((b) =>
            b.promotions.includes(c.id),
          )?.name,
        })),
    };
  }, faction);
  const rows = [];
  for (const row of result.rows) {
    const entry = { ...row };
    for (const key of ["map", "guard", "attack"]) {
      entry[key] = { ...row[key] };
      if (row[key].image) {
        const file = `${row.id}-${key}.png`;
        await writeFile(
          `${out}/${file}`,
          Buffer.from(row[key].image.split(",")[1], "base64"),
        );
        delete entry[key].image;
        entry[key].file = file;
      }
    }
    rows.push(entry);
  }
  const esc = (s) =>
    String(s ?? "").replace(
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
  const card = (r) =>
    `<article class="card" data-gender="${r.gender}" data-variant="${r.id}"><h3>${esc(r.className)} · ${r.gender === "male" ? "homme" : "femme"}${r.bear ? " · ours" : ""}</h3><p>${esc(r.weaponName)}${r.state ? " · " + { planted: "bannière plantée", carried: "bannière portée", fortified: "pavois déployé" }[r.state] : ""}</p><div class="poses">${["guard", "attack"].map((key, i) => `<figure><figcaption>${i ? (r.action === "heal" ? "Soins · geste" : "Frappe · impact") : "Garde de combat"}</figcaption>${r[key].file ? `<button class="zoom" data-image="${r[key].file}" aria-label="Agrandir ${i ? "la frappe" : "la garde"} · ${esc(r.className)}"><img src="${r[key].file}" alt="${esc(r.className)} ${r.gender === "male" ? "homme" : "femme"} · ${i ? "frappe" : "garde"}" loading="lazy" width="640" height="640"></button>` : `<p>Pose absente</p>`}</figure>`).join("")}</div><figure class="map-pose"><figcaption>Sur la carte · même échelle que le jeu</figcaption><img src="${r.map.file}" alt="Pose sur la carte" width="192" height="160" loading="lazy"></figure>${r.shared ? "<p class=notice>Apparence actuelle partagée entre homme et femme.</p>" : ""}<details><summary>Ressources et limites actuelles</summary><p>Repère : ${r.id}</p><p>Carte : ${esc(r.map.source)}</p><p>Combat : ${esc(r.guard.source)}</p>${r.issues.length ? `<ul>${r.issues.map((i) => `<li>${esc(i.animation)} : ${esc(i.reason)}</li>`).join("")}</ul>` : "<p>Aucune substitution signalée par le profil de combat.</p>"}</details></article>`;
  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} · comparaison actuelle</title><style>*{box-sizing:border-box}body{margin:0;background:#17222c;color:#eee8da;font:16px system-ui,sans-serif}main{max-width:1250px;margin:auto;padding:16px}h1{font-size:25px}h2{color:#eed7a3}p{line-height:1.5}.filters{position:sticky;top:0;z-index:3;background:#17222cf5;padding:10px 0;display:flex;gap:10px;flex-wrap:wrap;border-bottom:1px solid #586573}label{display:flex;flex-direction:column;gap:4px;font-size:13px}select,button{font:inherit;min-height:44px;color:inherit;background:#2b3b49;border:1px solid #71808e;border-radius:5px;padding:8px}select{max-width:100%}.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:12px}.card{min-width:0;padding:12px;background:#24333f;border:1px solid #586573;border-radius:8px}.card h3{margin:0;font-size:18px}.card p{margin:7px 0;font-size:14px}.poses{display:grid;grid-template-columns:1fr 1fr;gap:4px}figure{margin:0;min-width:0}figcaption{font-size:12px;color:#cfdddc;min-height:30px}.zoom{border:0;background:none;padding:0;width:100%;display:block;cursor:zoom-in}.zoom img{display:block;width:100%;height:auto;background:linear-gradient(0deg,#14212c,#344857);border-radius:4px}.map-pose{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:10px}.map-pose img{width:96px;height:80px;flex:none;background:#42594b}.map-pose figcaption{min-height:0}details{font-size:12px;margin-top:12px}details p{overflow-wrap:anywhere}.notice{background:#354451;padding:10px;border-left:3px solid #ddc58e}section{scroll-margin-top:130px;margin:26px 0}a{color:#e8ca8a}dialog{padding:12px;background:#24333f;color:#eee8da;border:1px solid #9b8c69;border-radius:8px;width:min(96vw,690px);max-height:95dvh}dialog::backdrop{background:#000c}dialog img{display:block;width:100%;height:auto;max-height:76dvh;object-fit:contain;background:#344857}dialog button{float:right}body:has(dialog[open]){overflow:hidden}[hidden]{display:none!important}@media(max-width:420px){main{padding:10px}.filters label{flex:1;min-width:0}.cards{grid-template-columns:1fr}h1{font-size:23px}}</style></head><body><main><h1>Classes évoluées ${knight ? "des Chevaliers" : "vikings"}</h1><p>${result.classes.length} classes · ${rows.filter((r) => !r.reference).length} variantes actuelles, hommes et femmes, avec leurs équipements. ${knight ? "Apparences actuelles à examiner avant toute modification. Les animations ne sont pas validées par cette page." : "Les nouvelles propositions sont signalées ; les versions précédentes restent disponibles pour comparer."}</p><p class="notice">Même échelle corporelle pour les unités à pied, proportions préservées. ${knight ? "Les montures gardent leur échelle de combat." : ""} Touchez une grande image pour l’agrandir. « Garde », « Frappe » et « Soins » utilisent les ressources de combat actuelles ; la petite image montre la pose réellement utilisée sur la carte. Les références validées sont en bas.</p><nav class="filters" aria-label="Filtres de comparaison"><label>Classe<select id="class-filter"><option value="all">Toutes les classes</option>${result.classes.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join("")}</select></label><label>Afficher<select id="gender-filter"><option value="all">Hommes et femmes</option><option value="male">Hommes</option><option value="female">Femmes</option></select></label></nav>${result.classes
    .map(
      (c) =>
        `<section data-class="${c.id}"><h2>${esc(c.name)}</h2><p>Évolution de : ${esc(c.origin)} · ${esc(c.role)}</p><div class="cards">${rows
          .filter((r) => r.classId === c.id && !r.reference)
          .map(card)
          .join("")}</div></section>`,
    )
    .join(
      "",
    )}<details id="references"><summary>Comparer avec trois ${knight ? "Chevaliers" : "Vikings"} de base ${knight ? "de référence" : "déjà validés"}</summary><div class="cards">${rows
    .filter((r) => r.reference)
    .map(card)
    .join(
      "",
    )}</div></details><p><a href="../../..">Retour au jeu</a> · <a href="../${knight ? "chevaliers" : "vikings"}/index.html">${knight ? "Chevaliers" : "Vikings"} de base</a> · <a href="../${knight ? "vikings" : "chevaliers"}-evolues/index.html">${knight ? "Vikings" : "Chevaliers"} évolués</a></p></main><dialog aria-label="Sprite agrandi"><button id="close">Fermer ×</button><img alt="Sprite agrandi"></dialog><script>const c=document.querySelector('#class-filter'),g=document.querySelector('#gender-filter'),d=document.querySelector('dialog');function filter(){document.querySelectorAll('[data-class]').forEach(s=>s.hidden=c.value!=='all'&&s.dataset.class!==c.value);document.querySelectorAll('[data-gender]').forEach(s=>s.hidden=g.value!=='all'&&s.dataset.gender!==g.value)}c.onchange=g.onchange=filter;document.querySelectorAll('[data-image]').forEach(b=>b.onclick=()=>{d.querySelector('img').src=b.dataset.image;d.querySelector('img').alt=b.querySelector('img').alt;d.showModal()});document.querySelector('#close').onclick=()=>d.close();d.onclick=e=>{if(e.target===d)d.close()};</script>${knight ? "" : '<script src="reprises/player.js" defer></script>'}</body></html>`;
  await writeFile(`${out}/index.html`, html);
  await writeFile(
    `${out}/manifest.json`,
    JSON.stringify({ classes: result.classes, rows }, null, 2),
  );
  console.log(
    JSON.stringify({
      classes: result.classes.map((c) => c.name),
      variants: rows.filter((r) => !r.reference).length,
      references: 3,
      output: out,
    }),
  );
} finally {
  await browser.close();
}
