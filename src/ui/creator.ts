import { anatomicalPlacement } from "../sprites/display-scale";
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
  flow: E.CreationFlow,
) {
  const steps = ["Les expéditions", "Votre personnage", "Vos compagnons"];
  if (flow.step === 1)
    return `<main class="config-screen expedition-creator creator-factions"><header class="brand"><span>LES TERRES ÉGARÉES<small>PROLOGUE</small></span><button data-action="title">← Retour</button></header><section class="config-heading"><span class="eyebrow">ÉTAPE 1 / 3</span><h1>À chacun son expédition.</h1><p>Qui prendra la mer, et qui partira sur les routes ?</p></section><div class="creator-parties">${drafts.map((h, i) => `<section class="creator-party ${h.faction === "north" ? "north-party" : "knight-party"}"><h2>Joueur ${i + 1}</h2><div class="faction-choice-icon">${h.faction === "north" ? "ᚱ" : "✦"}</div><h3>${h.faction === "north" ? "Les Vikings" : "Les Chevaliers"}</h3><p>${h.faction === "north" ? "Le grand voyage vers l’ouest." : "Une mission à l’approche du convoi."}</p><div class="segmented"><button data-action="faction-${i + 1}-north" class="${h.faction === "north" ? "chosen" : ""}">Vikings</button><button data-action="faction-${i + 1}-knight" class="${h.faction === "knight" ? "chosen" : ""}">Chevaliers</button></div></section>`).join("")}</div><footer class="config-bottom creator-bottom"><button data-action="team-colors">Couleurs des équipes</button><button data-action="creator-factions-ready" class="primary">Créer nos personnages →</button></footer></main>`;
  return `<main class="config-screen expedition-creator" data-creation-step="${flow.step}"><header class="brand"><span class="creator-rune" aria-hidden="true">ᛟ</span><span>LES TERRES ÉGARÉES<small>VOS EXPÉDITIONS</small></span><button data-action="title" class="back">← Retour</button></header><section class="config-heading"><span class="eyebrow">ÉTAPE ${flow.step} / 3 · ${steps[flow.step - 1]}</span><h1>${flow.step === 2 ? "Qui êtes-vous ?" : "Qui embarque à vos côtés ?"}</h1><p>${flow.step === 2 ? "Chaque joueur valide son personnage avant de poursuivre." : "Écoutez la voix, puis composez votre groupe."}</p></section><div class="creator-parties">${drafts
    .map((h, i) => {
      const owner = (i + 1) as 1 | 2,
        north = h.faction === "north",
        rgb = E.teamPalette[E.colorForOwner(colors, owner)].rgb.join(",");
      return `<section class="creator-party ${north ? "north-party" : "knight-party"}" style="--party-rgb:${rgb}" aria-label="Expédition ${owner} · ${north ? "Vikings" : "Chevaliers"}"><header class="creator-party-heading"><span class="faction-seal" aria-hidden="true">${north ? "ᚱ" : "✦"}</span><div><span class="eyebrow">EXPÉDITION ${owner}</span><h2>${north ? "Les Vikings" : "Les Chevaliers"}</h2><p>${north ? "Prêts pour le grand voyage vers l’ouest." : "Une mission sur la route du convoi."}</p></div><div hidden class="segmented"><button data-action="faction-${owner}-north" class="${north ? "chosen" : ""}">Vikings</button><button data-action="faction-${owner}-knight" class="${north ? "" : "chosen"}">Chevaliers</button></div></header>${
        flow.step === 2
          ? `<fieldset class="hero-validation" ${flow.heroReady[i] ? "disabled" : ""}><article class="creator-hero hero-form"><div class="creator-hero-visual"><canvas width="150" height="175" data-creator-hero="${i}" aria-label="Apparence du chef"></canvas><span>VOTRE CHEF</span><strong class="hero-display-name" data-hero-display="${i}">${esc(h.name)}</strong><small>Commandement · +1 Initiative</small></div><div class="creator-hero-fields"><label>Nom du héros — expédition ${owner}<input id="hero-name-${owner}" maxlength="32" value="${esc(h.name)}" required></label><div class="creator-fields-row"><label>Sexe — expédition ${owner}<select id="hero-gender-${owner}"><option value="male" ${h.gender === "male" ? "selected" : ""}>Homme</option><option value="female" ${h.gender === "female" ? "selected" : ""}>Femme</option></select></label><label>Classe — expédition ${owner}<select id="hero-class-${owner}">${E.startingHeroClasses(
              h.faction,
            )
              .map(
                (c) =>
                  `<option value="${c.id}" ${h.classId === c.id ? "selected" : ""}>${esc(classLabel(c.id, h.gender))}</option>`,
              )
              .join(
                "",
              )}</select></label></div><p class="creator-role">${esc(E.classes[h.classId].role)}</p>${h.classId === "raider" ? `<label>Arme initiale<select data-starter="${i}"><option value="axe_shield" ${h.weaponId !== "sword_shield" ? "selected" : ""}>Hache et bouclier</option><option value="sword_shield" ${h.weaponId === "sword_shield" ? "selected" : ""}>Épée et bouclier</option></select></label>` : ""}</div></article></fieldset><button class="hero-confirm primary" data-action="creator-hero-ready-${i}" ${flow.heroReady[i] ? "disabled" : ""}>${flow.heroReady[i] ? "Personnage validé ✓" : "Valider mon personnage"}</button>`
          : `<p class="creator-chief-summary">${esc(h.name)} · ${esc(classLabel(h.classId, h.gender))}</p>`
      }${flow.step === 3 && flow.introPage[i] < 2 ? `<aside class="creator-narrator" role="dialog" aria-label="Une voix vous interpelle"><span class="unknown-speaker" aria-hidden="true">?</span><h3>Une voix ${north ? "sur le quai" : "près de la route"}</h3><p>${esc(E.recruitmentVoice(h.faction)[flow.introPage[i]])}</p><button data-action="creator-intro-${i}">${flow.introPage[i] === 0 ? "Continuer" : "Choisir mes compagnons"}</button></aside>` : ""}<fieldset class="creator-companions" ${flow.step !== 3 || flow.introPage[i] < 2 ? "hidden" : ""} ${flow.partyReady[i] ? "disabled" : ""}><legend>Vos compagnons <small data-companion-count="${i}">${companions[i].length} / ${E.companionCount(h.faction)} choisis</small></legend><p>${north ? "Choisissez deux compagnons." : "Choisissez un compagnon."} Un nouveau choix remplace le plus ancien.</p><div class="companion-cards">${E.companionRoster
        .filter((c) => c.faction === h.faction)
        .map(
          (c) =>
            `<label class="companion-card"><input type="checkbox" data-companion="${i}:${c.id}" ${companions[i].includes(c.id) ? "checked" : ""}><span class="companion-selected" aria-hidden="true">✓</span><canvas width="104" height="112" data-creator-companion="${i}:${c.id}" aria-hidden="true"></canvas><div><strong>${esc(c.name)}</strong><span>${esc(classLabel(c.classId, c.gender))}</span><small>${c.gender === "female" ? "Femme" : "Homme"}</small></div><p>${esc(E.classes[c.classId].role)}</p></label>`,
        )
        .join(
          "",
        )}</div></fieldset>${flow.step === 3 && flow.introPage[i] >= 2 ? `<button data-action="creator-party-ready-${i}" class="primary party-confirm" ${flow.partyReady[i] || companions[i].length !== E.companionCount(h.faction) ? "disabled" : ""}>${flow.partyReady[i] ? "Groupe prêt ✓" : "Valider mon groupe"}</button>` : ""}</section>`;
    })
    .join(
      "",
    )}</div><footer class="config-bottom creator-bottom"><button data-action="creator-back">← Étape précédente</button><button data-action="team-colors">Couleurs des équipes</button>${flow.step === 3 ? `<button data-action="begin" class="primary" ${flow.partyReady.every(Boolean) ? "" : "disabled"}>Commencer le prologue →</button>` : ""}</footer></main>`;
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
  )
    .filter((canvas) => !canvas.closest("[hidden]"))
    .map((canvas) => {
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
    const bounds = canvas.getBoundingClientRect();
    const displayRatio = Math.min(
      bounds.width / canvas.width,
      bounds.height / canvas.height,
    );
    const profile = unitSpriteProfile(u);
    const body = 96 / Math.max(0.1, displayRatio);
    const drawn = drawResourceFrame(
      ctx,
      profile,
      "idle",
      0,
      4,
      4,
      canvas.width - 8,
      canvas.height - 8,
      true,
      E.colorForOwner(colors, u.owner),
      "world",
      anatomicalPlacement(profile, "idle", body),
    );
    canvas.dataset.loaded = String(drawn);
    canvas.dataset.bodyHeight = "96";
    canvas.dataset.displayRatio = String(displayRatio);
  }
}
