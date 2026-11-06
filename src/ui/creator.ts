import * as E from "../engine";
import {
  unitSpriteProfile,
  warmSprites,
  drawResourceFrame,
} from "../sprites/resources";
const esc = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
const classLabel = (id: string, gender: E.Gender) =>
  gender === "female"
    ? (E.classes[id].femaleName ?? E.classes[id].name)
    : E.classes[id].name;
export function creatorMarkup(
  drafts: [E.HeroConfig, E.HeroConfig],
  companions: [string[], string[]],
  colors: E.TeamColors,
) {
  return `<main class="config-screen expedition-creator"><header class="brand"><span class="creator-rune" aria-hidden="true">ᛟ</span><span>LES TERRES ÉGARÉES<small>VOS EXPÉDITIONS</small></span><button data-action="title" class="back">← Retour</button></header><section class="config-heading"><span class="eyebrow">LES RIVAGES DE L’OUBLI</span><h1>Deux expéditions. Un destin.</h1><p>Façonnez vos chefs et choisissez ceux qui traverseront la tempête à leurs côtés.</p></section><div class="creator-parties">${drafts
    .map((h, i) => {
      const owner = (i + 1) as 1 | 2,
        north = h.faction === "north",
        rgb = E.teamPalette[E.colorForOwner(colors, owner)].rgb.join(",");
      return `<section class="creator-party ${north ? "north-party" : "knight-party"}" style="--party-rgb:${rgb}" aria-label="Expédition ${owner} · ${north ? "Vikings" : "Chevaliers"}"><header class="creator-party-heading"><span class="faction-seal" aria-hidden="true">${north ? "ᚱ" : "✦"}</span><div><span class="eyebrow">EXPÉDITION ${owner}</span><h2>${north ? "Les Vikings" : "Les Chevaliers"}</h2><p>${north ? "Des rivages du Nord, trois survivants." : "Deux compagnons d’armes, loin de leurs repères."}</p></div><div class="segmented"><button data-action="faction-${owner}-north" class="${north ? "chosen" : ""}">Vikings</button><button data-action="faction-${owner}-knight" class="${north ? "" : "chosen"}">Chevaliers</button></div></header><article class="creator-hero hero-form"><div class="creator-hero-visual"><canvas width="150" height="175" data-creator-hero="${i}" aria-label="Apparence du chef"></canvas><span>VOTRE CHEF</span><strong class="hero-display-name" data-hero-display="${i}">${esc(h.name)}</strong><small>Commandement · +1 Initiative</small></div><div class="creator-hero-fields"><label>Nom du héros — expédition ${owner}<input id="hero-name-${owner}" maxlength="32" value="${esc(h.name)}" required></label><div class="creator-fields-row"><label>Sexe — expédition ${owner}<select id="hero-gender-${owner}"><option value="male" ${h.gender === "male" ? "selected" : ""}>Homme</option><option value="female" ${h.gender === "female" ? "selected" : ""}>Femme</option></select></label><label>Classe — expédition ${owner}<select id="hero-class-${owner}">${E.baseClasses(
        h.faction,
      )
        .map(
          (c) =>
            `<option value="${c.id}" ${h.classId === c.id ? "selected" : ""}>${esc(classLabel(c.id, h.gender))}</option>`,
        )
        .join(
          "",
        )}</select></label></div><p class="creator-role">${esc(E.classes[h.classId].role)}</p>${h.classId === "raider" ? `<label>Arme initiale<select data-starter="${i}"><option value="axe_shield" ${h.weaponId !== "sword_shield" ? "selected" : ""}>Hache et bouclier</option><option value="sword_shield" ${h.weaponId === "sword_shield" ? "selected" : ""}>Épée et bouclier</option></select></label>` : ""}</div></article><fieldset class="creator-companions"><legend>Vos compagnons <small data-companion-count="${i}">${companions[i].length} / ${E.companionCount(h.faction)} choisis</small></legend><p>${north ? "Choisissez deux compagnons." : "Choisissez un compagnon."} Un nouveau choix remplace le plus ancien.</p><div class="companion-cards">${E.companionRoster
        .filter((c) => c.faction === h.faction)
        .map(
          (c) =>
            `<label class="companion-card"><input type="checkbox" data-companion="${i}:${c.id}" ${companions[i].includes(c.id) ? "checked" : ""}><span class="companion-selected" aria-hidden="true">✓</span><canvas width="104" height="112" data-creator-companion="${i}:${c.id}" aria-hidden="true"></canvas><div><strong>${esc(c.name)}</strong><span>${esc(classLabel(c.classId, c.gender))}</span><small>${c.gender === "female" ? "Femme" : "Homme"}</small></div><p>${esc(E.classes[c.classId].role)}</p></label>`,
        )
        .join("")}</div></fieldset></section>`;
    })
    .join(
      "",
    )}</div><footer class="config-bottom creator-bottom"><span>Choisissez 2 compagnons vikings et 1 compagnon chevalier.</span><button data-action="team-colors">Couleurs des équipes</button><button data-action="begin" class="primary">Déployer les expéditions →</button></footer></main>`;
}
let request = 0;
export async function paintCreatorSprites(
  root: HTMLElement,
  drafts: [E.HeroConfig, E.HeroConfig],
  colors: E.TeamColors,
) {
  const current = ++request;
  const previews = Array.from(
    root.querySelectorAll<HTMLCanvasElement>(
      "[data-creator-hero],[data-creator-companion]",
    ),
  ).map((canvas) => {
    let u: E.Unit;
    let owner: 1 | 2;
    if (canvas.dataset.creatorHero !== undefined) {
      const i = Number(canvas.dataset.creatorHero),
        h = drafts[i];
      owner = (i + 1) as 1 | 2;
      u = E.makeClassUnit(
        "preview-hero",
        owner,
        owner,
        h.classId,
        h.name,
        0,
        0,
        h.gender,
      );
      if (h.weaponId) {
        u.activeWeaponId = h.weaponId;
        E.syncWeapon(u);
      }
    } else {
      const [index, id] = canvas.dataset.creatorCompanion!.split(":"),
        c = E.companionRoster.find((c) => c.id === id)!;
      owner = (Number(index) + 1) as 1 | 2;
      u = E.makeClassUnit(
        "preview-" + id,
        owner,
        owner,
        c.classId,
        c.name,
        0,
        0,
        c.gender,
      );
    }
    return { canvas, u };
  });
  await warmSprites(
    previews.map((p) => p.u),
    colors,
    ["idle"],
  );
  if (current !== request || !root.querySelector(".expedition-creator")) return;
  for (const { canvas, u } of previews) {
    if (!canvas.isConnected) continue;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = false;
    const drawn = drawResourceFrame(
      ctx,
      unitSpriteProfile(u),
      "idle",
      0,
      4,
      4,
      canvas.width - 8,
      canvas.height - 8,
      true,
      E.colorForOwner(colors, u.owner),
    );
    canvas.dataset.loaded = String(drawn);
  }
}
