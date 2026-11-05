import { combatSkin } from "./sprites/combat-skins";
import type { SpriteProfile } from "./sprites/catalog";
import { CombatSceneV2 } from "./ui/combat-v2";
import {
  attackEffect,
  drawSpell,
  drawHealing,
  preloadEffects,
} from "./ui/combat-effects";
import { meleeContactDistance } from "./sprites/geometry";
import { initiativeMarkup, bindInitiative } from "./ui/initiative-strip";
import { combatHud } from "./ui/combat-hud";
import "./ui/combat-hud.css";
import { combatPose, linkedStrikes } from "./ui/combat-timeline";
import { resolveClip, strikeAnimation } from "./sprites/catalog";
import { prototypeTools } from "./development";
import { readTeamPreferences, writeTeamPreferences } from "./team-preferences";
import {
  unitSpriteProfile,
  unitVisualNote,
  drawResourceFrame,
  warmSprites,
} from "./sprites/resources";
import { TerrainRenderer, type TerrainStyle } from "./terrain";
import { Mist } from "./fog";
import "@fontsource/cormorant-garamond/latin-500.css";
import "@fontsource/cormorant-garamond/latin-600.css";
import "@fontsource/manrope/latin-400.css";
import "@fontsource/manrope/latin-600.css";
import "@fontsource/manrope/latin-700.css";
import "./style.css";
import * as E from "./engine";
import type { Campaign, Unit, Faction, Kind, Battle } from "./engine";
const app = document.querySelector<HTMLDivElement>("#app")!;
let state: Campaign | null = null,
  screen = "title",
  factions: [Faction, Faction] = ["north", "knight"],
  selected: string | null = null,
  cardOpen = false,
  origin: {
    x: number;
    y: number;
    fortified?: boolean;
    movedDistance?: number;
  } | null = null,
  moved = false,
  busy = false,
  hover: number | null = null,
  observer = false,
  fogEnabled = true,
  showGrid = false,
  terrainStyle: TerrainStyle = "regional",
  panel = "summary",
  speed = Number(localStorage.getItem("lte-animation-v2-speed") || 1),
  sound = localStorage.getItem("lte-sound") !== "off";
let heroDrafts: [E.HeroConfig, E.HeroConfig] = [
  { faction: "north", name: "Eirik", gender: "male", classId: "raider" },
  { faction: "knight", name: "Maël", gender: "male", classId: "man_at_arms" },
];
let companionDrafts: [string[], string[]] = [[], []];
let targetingAttack = false;
let previousHealWeapon: string | undefined;
let aim: "heal" | "summon" | "area" | "buff" | null = null;
let isPanning = false;
let developerCleanup: (() => void) | null = null;
let developerRequest = 0;
let pendingReward: (() => void) | null = null;
let toastTimer: ReturnType<typeof setTimeout>;
const zoom = 1.65;
let viewCols = 30 / zoom,
  viewRows = 20 / zoom;
let focusToken = "";
function clampCamera(p: 1 | 2) {
  const c = state!.players[p - 1].camera;
  c.x = Math.max(0, Math.min(E.W - viewCols, c.x));
  c.y = Math.max(0, Math.min(E.H - viewRows, c.y));
}
function focusUnit(u: Unit) {
  const c = state!.players[state!.active - 1].camera;
  c.x = u.x + 0.5 - viewCols / 2;
  c.y = u.y + 0.5 - viewRows / 2;
  clampCamera(state!.active);
}
const assetBase = import.meta.env.BASE_URL;
const regional = new Image();
regional.src = assetBase + "assets/regional-tiles.png?v=1";
const esc = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
const icon = (s: string) =>
  `<span class="glyph" aria-hidden="true">${s}</span>`;
const button = (label: string, action: string, cls = "", disabled = false) =>
  `<button class="${cls}" data-action="${action}" ${disabled ? "disabled" : ""}>${label}</button>`;
const factionName = (f: Faction) =>
  f === "north" ? "Expédition viking" : "Compagnie de chevaliers";
const mark = '<span class="crest" aria-hidden="true">ᛟ</span>';
function toast(msg: string) {
  document.querySelector(".toast")?.remove();
  const el = document.createElement("div");
  el.className = "toast";
  el.role = "status";
  el.textContent = msg;
  document.body.append(el);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.remove(), 4200);
}
function audio(type = "hit") {
  if (!sound) return;
  try {
    const A =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    const ctx = new A();
    const o = ctx.createOscillator(),
      g = ctx.createGain();
    o.type = type === "storm" ? "sawtooth" : "triangle";
    o.frequency.setValueAtTime(type === "hit" ? 170 : 65, ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(35, ctx.currentTime + 0.25);
    g.gain.setValueAtTime(0.07, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    o.connect(g);
    g.connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.35);
    o.onended = () => void ctx.close();
  } catch {}
}
function title() {
  developerRequest++;
  initiativeCleanup?.();
  initiativeCleanup = undefined;
  developerCleanup?.();
  developerCleanup = null;
  screen = "title";
  state = null;
  app.innerHTML = `<main class="title-screen"><div class="title-art"></div><div class="mist mist-a"></div><div class="mist mist-b"></div><header class="brand">${mark}<span>LES TERRES ÉGARÉES<small>UN RÉCIT DE BRUME ET DE CENDRES</small></span><span class="edition">CHAPITRE I · LES RIVAGES DE L’OUBLI</span></header><section class="title-copy"><div class="eyebrow"><span></span> UN TACTICAL RPG NARRATIF</div><h1>LES TERRES<br><em>ÉGARÉES</em></h1><p class="tagline">Deux expéditions. Deux histoires.<br>Un même piège.</p><div class="title-actions">${button("Nouvelle aventure <span>→</span>", "new", "primary")}${button("Continuer <span>→</span>", "continue", "quiet", !localStorage.getItem("lte-save"))}${button("Options <span>≡</span>", "options", "quiet")}${prototypeTools ? `<div class="dev-entry"><small>OUTILS DU PROTOTYPE · DÉVELOPPEMENT</small>${button("Tests de combat", "dev-tests", "quiet")}${button("Classes et systèmes", "dev-systems", "quiet")}${button("Galerie des sprites", "dev-sprites", "quiet")}</div>` : ""}</div><div class="title-note"><span class="small-diamond">◇</span> UNE AVENTURE SOLO · DEUX DESTINS À GUIDER</div></section><aside class="chapter-card"><span class="eyebrow">01 / LES RIVAGES DE L’OUBLI</span><h2>La brume n’oublie<br>aucun naufragé.</h2><p>Au-delà des cartes connues,<br>quelque chose vous attend.</p><div class="line"></div><span class="card-meta">STRATÉGIE AU TOUR PAR TOUR <span>✦</span> DARK FANTASY</span></aside><footer class="title-footer"><span>UNE TERRE INCONNUE. UNE ALLIANCE IMPROBABLE.</span><span>FRANÇAIS <i>◆</i> SAUVEGARDE LOCALE</span></footer><div class="grain"></div></main>`;
}
function options() {
  const modal = document.createElement("div");
  modal.className = "modal-back";
  modal.innerHTML = `<section class="modal"><span class="eyebrow">VOTRE AVENTURE</span><h2>Options</h2><label>Vitesse des combats<select id="speed"><option value="1">Cinématique</option><option value="2">Rapide ×2</option><option value="5">Express ×5</option></select></label><label>Effets sonores<input id="sound" type="checkbox" ${sound ? "checked" : ""}></label><label>Afficher la grille<input id="grid-option" type="checkbox" ${showGrid ? "checked" : ""}></label>${button("Couleurs des équipes", "team-colors")}${button("Enregistrer", "close-options", "primary")}</section>`;
  app.append(modal);
  (document.querySelector("#speed") as HTMLSelectElement).value = String(speed);
}
function teamColorsModal() {
  const colors = state?.teamColors ?? readTeamPreferences();
  const modal = document.createElement("div");
  modal.className = "modal-back team-colors-modal";
  modal.innerHTML = `<section class="modal"><h2>Couleurs des équipes</h2><p>Indépendantes des factions. Les deux joueurs doivent choisir des couleurs distinctes.</p>${(
    [
      ["player1", "Joueur 1"],
      ["player2", "Joueur 2"],
    ] as const
  )
    .map(
      ([key, label]) =>
        `<label>${label}<select id="team-${key}">${Object.entries(E.teamPalette)
          .filter(([id]) => id !== "pink")
          .map(
            ([id, value]) =>
              `<option value="${id}" ${colors[key] === id ? "selected" : ""}>${value.name}</option>`,
          )
          .join("")}</select></label>`,
    )
    .join(
      "",
    )}<p id="team-color-error" role="alert"></p>${button("Appliquer", "apply-team-colors", "primary")}${button("Fermer", "close-modal")}</section>`;
  app.append(modal);
}
function configure() {
  screen = "config";
  app.innerHTML = `<main class="config-screen phase1-creator"><header class="brand">${mark}<span>LES TERRES ÉGARÉES<small>CRÉATEUR DE HÉROS · PROTOTYPE</small></span>${button("← Retour", "title", "back")}</header><section class="config-heading"><h1>Créez vos deux héros.</h1><p>Le joueur 1 choisit sa faction ; le joueur 2 reçoit l’autre. Choisissez ensuite vos compagnons.</p></section><div class="faction-grid">${heroDrafts
    .map(
      (h, i) =>
        `<section class="faction-card hero-form"><span class="eyebrow">EXPÉDITION ${i + 1}</span><div class="segmented">${button("Vikings", `faction-${i + 1}-north`, h.faction === "north" ? "chosen" : "")}${button("Chevaliers", `faction-${i + 1}-knight`, h.faction === "knight" ? "chosen" : "")}</div><div class="portrait-placeholder" aria-label="Emplacement du futur portrait">◇<small>PORTRAIT À CRÉER</small></div><label>Nom du héros — expédition ${i + 1}<input id="hero-name-${i + 1}" maxlength="32" value="${esc(h.name)}" required></label><label>Sexe — expédition ${i + 1}<select id="hero-gender-${i + 1}"><option value="male" ${h.gender === "male" ? "selected" : ""}>Homme</option><option value="female" ${h.gender === "female" ? "selected" : ""}>Femme</option></select></label><label>Classe — expédition ${i + 1}<select id="hero-class-${i + 1}">${E.baseClasses(
          h.faction,
        )
          .map(
            (c) =>
              `<option value="${c.id}" ${c.id === h.classId ? "selected" : ""}>${c.name}</option>`,
          )
          .join(
            "",
          )}</select></label><p>${E.classes[h.classId].role}</p>${h.classId === "raider" ? `<label>Arme initiale<select data-starter="${i}"><option value="axe_shield" ${h.weaponId !== "sword_shield" ? "selected" : ""}>Hache et bouclier</option><option value="sword_shield" ${h.weaponId === "sword_shield" ? "selected" : ""}>Épée et bouclier</option></select></label>` : ""}<fieldset><legend>Compagnons · choisir ${E.companionCount(h.faction)}</legend>${E.companionRoster
          .filter((c) => c.faction === h.faction)
          .map(
            (c) =>
              `<label><input type="checkbox" data-companion="${i}:${c.id}" ${companionDrafts[i].includes(c.id) ? "checked" : ""}>${c.name} · ${E.classes[c.classId].name}</label>`,
          )
          .join("")}</fieldset></section>`,
    )
    .join(
      "",
    )}</div><div class="config-bottom">${button("Couleurs des équipes", "team-colors")}${button("Déployer les expéditions", "begin", "primary")}</div></main>`;
  app
    .querySelectorAll<HTMLSelectElement>("[data-starter]")
    .forEach(
      (el) =>
        (el.onchange = () =>
          (heroDrafts[Number(el.dataset.starter)].weaponId = el.value)),
    );
  app.querySelectorAll<HTMLInputElement>("[data-companion]").forEach(
    (input) =>
      (input.onchange = () => {
        const [p, id] = input.dataset.companion!.split(":");
        const index = Number(p);
        companionDrafts[index] = E.toggleCompanion(
          heroDrafts[index].faction,
          companionDrafts[index],
          id,
          input.checked,
        );
        app
          .querySelectorAll<HTMLInputElement>(`[data-companion^="${index}:"]`)
          .forEach((el) => {
            el.checked = companionDrafts[index].includes(
              el.dataset.companion!.split(":")[1],
            );
          });
      }),
  );
  for (const i of [1, 2]) {
    (app.querySelector(`#hero-name-${i}`) as HTMLInputElement).oninput = (
      e,
    ) => {
      heroDrafts[i - 1].name = (e.target as HTMLInputElement).value;
    };
    (app.querySelector(`#hero-gender-${i}`) as HTMLSelectElement).onchange = (
      e,
    ) => {
      heroDrafts[i - 1].gender = (e.target as HTMLSelectElement)
        .value as E.Gender;
    };
    (app.querySelector(`#hero-class-${i}`) as HTMLSelectElement).onchange = (
      e,
    ) => {
      heroDrafts[i - 1].classId = (e.target as HTMLSelectElement).value;
      delete heroDrafts[i - 1].weaponId;
      configure();
    };
  }
}
function cinematic() {
  initiativeCleanup?.();
  initiativeCleanup = undefined;
  const s = state!;
  aim = null;
  if (s.scene === "meeting") {
    screen = "transition";
    app.innerHTML = `<main class="phase-event"><span class="eyebrow">RENCONTRE DES EXPÉDITIONS</span><h1>Les deux fronts se rejoignent.</h1><p>Les champs de vision sont partagés. L’ordre d’initiative se poursuit sans recommencer le cycle.</p>${button("Unir les fronts", "next-scene", "primary")}</main>`;
  } else if (s.scene === "ending") {
    s.scene = null;
    s.phase = "summary";
    summary();
    save(true);
  } else {
    s.scene = null;
    s.phase = "battle";
    battleUI();
  }
}
function nextScene() {
  if (!state) return;
  if (state.scene === "meeting") {
    E.merge(state);
    state.scene = null;
    selected =
      E.current(state)?.owner === state.active ? E.current(state)!.id : null;
    moved = state.committedMove === E.current(state)?.id;
    if (state.encounterContinuation) {
      const pending = state.encounterContinuation;
      delete state.encounterContinuation;
      const actor = E.current(state),
        target = state.units.find((u) => u.id === pending.targetId);
      if (actor?.id === pending.actorId && target && E.canAttack(actor, target))
        void fight(actor, target);
      else finishTurn();
    } else battleUI();
    save(true);
  } else cinematic();
}
function portrait(u: Unit, large = false) {
  return `<div class="portrait ${large ? "large" : ""}">${u.portraitAsset ? `<img src="${assetBase + esc(u.portraitAsset)}" alt="Portrait de ${esc(u.name)}">` : `<div class="portrait-placeholder" aria-label="Portrait à créer"><b>${esc(u.name.slice(0, 1))}</b><small>À CRÉER</small></div>`}</div>`;
}
function unitCard(u: Unit) {
  return `${portrait(u, true)}<div class="unit-identity"><span class="eyebrow">${u.owner === 0 ? "LES MAUDITS" : `EXPÉDITION ${u.owner}`}${u.leader ? " · CHEF" : ""}</span><h2>${esc(u.name)}</h2><span>${E.className(u)} · Nv. ${u.level}</span><small>${esc(unitVisualNote(u))}</small><span></span></div><div class="hp-heading"><span>POINTS DE VIE</span><b>${u.hp}<small> / ${u.maxHp}</small></b></div><div class="bar hp"><i style="width:${(u.hp / u.maxHp) * 100}%"></i></div><div class="stats">${[
    [E.powerLabel(u) === "Puissance" ? "PUIS" : "FOR", u.strength],
    ["DÉF", u.defense],
    ["AGI", u.agility],
    ["INIT", u.initiative],
    ["PRÉC", u.accuracy],
    ["MVT", u.move],
  ]
    .map(
      ([n, v]) =>
        `<div tabindex="0" role="button" aria-label="${n} : ${v}" data-tooltip="${({ FOR: "Force : augmente les dégâts physiques.", PUIS: "Puissance : augmente les dégâts magiques et les soins.", DÉF: "Défense : réduit les dégâts reçus, en plus du couvert.", AGI: "Agilité : réduit la précision adverse ; 4 points d’écart donnent une seconde frappe.", INIT: "Initiative : détermine l’ordre de passage, indépendamment de l’agilité.", PRÉC: "Précision : augmente les chances de toucher.", MVT: "Mouvement : budget de déplacement, selon le coût du terrain." } as Record<string, string>)[String(n)]}"><span>${n}</span><b>${v}</b></div>`,
    )
    .join(
      "",
    )}</div><div class="equipment"><span>ARME ÉQUIPÉE</span><strong>${E.weaponName(u)}</strong><small>Portée ${u.minRange}–${u.range} cases${E.activeWeapon(u).reload ? " · Rechargement automatique" : ""}</small><small>${E.unitClass(
    u,
  )
    .skills.filter(
      (id) => u.owner !== 0 || E.discoveries(state!).skills.includes(id),
    )
    .map((id) => E.skillNames[id])
    .join(
      " · ",
    )}</small></div><div class="xp-label"><span>EXPÉRIENCE</span><b>${u.xp} / 100</b></div><div class="bar xp"><i style="width:${u.xp}%"></i></div>`;
}
function equipmentModal(u: Unit) {
  const modal = document.createElement("div");
  modal.className = "modal-back equipment-modal";
  modal.innerHTML = `<section class="modal"><h2>Équipement</h2><p>${esc(u.name)} · Arme active : ${E.weaponName(u)}</p><div class="equipment-list">${(
    u.carriedWeapons ?? []
  )
    .map((id) => {
      const w = E.weaponCatalog[id];
      return button(
        `${w.name}<small>Portée ${w.min}–${w.max}${id === u.activeWeaponId ? " · ÉQUIPÉE" : ""}</small>`,
        `equip-${id}`,
        "",
        !E.compatibleWeapon(u, id) || id === u.activeWeaponId,
      );
    })
    .join(
      "",
    )}</div>${u.potions > 0 && u.hp < u.maxHp ? button(`Utiliser une potion (${u.potions})`, "heal", "primary") : ""}${button("Fermer", "close-modal")}</section>`;
  app.append(modal);
}
function promotionMarkup(u: Unit) {
  const options = E.promotionOptions(u);
  return options.length
    ? `<div class="promotion-choice"><h3>Choisir une évolution</h3>${options.map((id) => button(E.classes[id].name, `promote-${u.id}:${id}`)).join("")}</div>`
    : "";
}
function contextActions(u: Unit) {
  const s = state!,
    targets = E.alive(s).filter((t) => E.seen(s, s.active, t));
  let html = "";
  if (targets.some((t) => E.canAttack(u, t)))
    html += button("Attaquer", "attack-mode");
  html += button("Équipement", "equipment");
  if (u.classId === "hamrammr")
    html += button(
      u.bearForm ? "Reprendre forme humaine" : "Transformer en ours",
      "skill-transform",
      "",
      !u.bearForm && (u.bearCooldown ?? 0) > 0,
    );
  if (E.hasSkill(u, "buff")) html += button("Améliorer un allié", "skill-buff");
  if (E.healingTargets(s, u).length) html += button("Soigner", "skill-heal");
  if (E.hasSkill(u, "banner") && !u.bannerUsed)
    html += button("Planter la bannière", "skill-banner");
  if (E.hasSkill(u, "fortify") && !u.fortified)
    html += button("Se fortifier", "skill-fortify");
  if (E.summonCells(s, u).length) html += button("Invoquer", "skill-summon");
  if (
    E.hasSkill(u, "area") &&
    E.map.some((c) => E.distance(u, c) <= u.range && E.canCastAreaAt(s, u, c))
  )
    html += button("Attaque de zone", "skill-area");
  html +=
    button("Fiche", "unit-sheet") +
    button("Attendre", "wait") +
    button("Annuler", "cancel");
  return `<div id="unit-actions" class="unit-actions" role="menu" aria-label="Actions de ${esc(u.name)}">${html}</div>`;
}
function positionContextMenu() {
  const menu = document.querySelector<HTMLElement>("#unit-actions");
  if (!menu || !state) return;
  const u = E.current(state),
    canvas = document.querySelector<HTMLCanvasElement>("#map");
  menu.hidden = isPanning || !!aim || !!tacticalAction || !u || !canvas;
  if (menu.hidden || !u || !canvas) return;
  const camera = state.players[state.active - 1].camera,
    r = canvas.getBoundingClientRect(),
    parent = menu.offsetParent!.getBoundingClientRect(),
    cellWidth = r.width / viewCols,
    px = r.left - parent.left + (u.x + 0.5 - camera.x) * cellWidth,
    py = r.top - parent.top + ((u.y + 0.5 - camera.y) * r.height) / viewRows;
  const right = px + cellWidth * 0.65,
    left =
      right + menu.offsetWidth < r.right - parent.left - 8
        ? right
        : px - cellWidth * 0.65 - menu.offsetWidth;
  menu.style.left = `${Math.max(8, Math.min(parent.width - menu.offsetWidth - 8, left))}px`;
  menu.style.top = `${Math.max(96, Math.min(parent.height - menu.offsetHeight - 8, py - 24))}px`;
}
let initiativeCleanup: (() => void) | undefined;
function battleUI() {
  if (!state) return;
  const s = state;
  if (s.phase === "summary") {
    summary();
    return;
  }
  if (s.scene) {
    cinematic();
    return;
  }
  if (s.phase === "defeat") {
    defeat();
    return;
  }
  screen = "battle";
  const u = E.current(s),
    sel = s.units.find((u) => u.id === selected),
    own = u?.owner === s.active;
  const token = `${s.active}:${u?.id}:${E.front(s).round}`;
  if (token !== focusToken) {
    focusToken = token;
    const follow =
      u && E.seen(s, s.active, u)
        ? u
        : E.alive(s).find((t) => t.owner === s.active);
    if (follow) {
      const c = s.players[s.active - 1].camera;
      if (
        follow.x < c.x + 1 ||
        follow.x > c.x + viewCols - 2 ||
        follow.y < c.y + 1 ||
        follow.y > c.y + viewRows - 2
      )
        focusUnit(follow);
    }
  }
  clampCamera(s.active);
  initiativeCleanup?.();
  app.innerHTML = `<main class="battle-screen compact-battle">
  <div class="mission-objective">${s.merged ? "Repoussez les morts-vivants" : "Rejoignez le village des Veilleurs"}</div>
  ${initiativeMarkup(s)}<div class="battle-layout"><section class="map-section">
  <div class="canvas-wrap ${observer ? "observing" : ""}"><canvas id="map" width="1920" height="1280" aria-label="Carte tactique. Glissez pour explorer, cliquez pour sélectionner ou déplacer." tabindex="0"></canvas>${observer ? '<canvas id="map2" width="1920" height="1280" aria-label="Vue de l’autre expédition en observation"></canvas>' : ""}
  <div id="map-tooltip" class="map-tooltip" hidden></div>
  ${cardOpen && sel && E.seen(s, s.active, sel) ? `<section class="unit-window" aria-label="Fiche de ${esc(sel.name)}"><button class="close-unit" data-action="close-unit" aria-label="Fermer la fiche">×</button>${unitCard(sel)}${sel.owner !== 0 ? promotionMarkup(sel) : ""}</section>` : ""}
  ${sel && own && sel.id === u?.id && moved && !busy && !targetingAttack ? contextActions(u) : ""}
  </div></section></div></main>`;
  initiativeCleanup = bindInitiative(app, s, () => save(true));
  bindCanvas();
  positionContextMenu();
  document
    .querySelector('[data-action="toggle-grid"]')
    ?.setAttribute("aria-pressed", String(showGrid));
  document
    .querySelector('[data-action="toggle-fog"]')
    ?.setAttribute("aria-pressed", String(!fogEnabled));
  if (u?.owner === 0 && !busy) void enemyTurn();
}
function updateHover(c: { x: number; y: number } | null) {
  hover = c ? E.key(c.x, c.y) : null;
  const info = document.querySelector<HTMLElement>("#map-tooltip");
  if (!info || !state) return;
  const p = state.active,
    k = hover;
  if (k === null || (fogEnabled && !state.players[p - 1].visible.includes(k))) {
    info.hidden = true;
    info.innerHTML = "";
    return;
  }
  const t = E.map[k],
    unit = E.at(state, t.x, t.y);
  info.hidden = false;
  if (unit && (!fogEnabled || E.seen(state, p, unit))) {
    info.innerHTML = `<strong>${esc(unit.name)}</strong><small>${E.className(unit)}</small><span>${unit.hp} / ${unit.maxHp} PV</span><div class="bar hp"><i style="width:${(100 * unit.hp) / unit.maxHp}%"></i></div>`;
  } else
    info.innerHTML = `<strong>${terrainNames[t.terrain]}</strong><span>${t.walk ? `Déplacement ${t.cost} · Défense +${t.defense}` : "Infranchissable"}</span>`;
}
function previousAction() {
  if (busy) return;
  if (document.querySelector(".forecast-back")) {
    document.querySelector(".forecast-back")?.remove();
    return;
  }
  if (aim || targetingAttack) {
    targetingAttack = false;
    if (state && previousHealWeapon) {
      const u = E.current(state)!;
      u.activeWeaponId = previousHealWeapon;
      E.syncWeapon(u);
    }
    previousHealWeapon = undefined;
    aim = null;
    battleUI();
    return;
  }
  if (moved) {
    cancel();
    return;
  }
  selected = null;
  cardOpen = false;
  battleUI();
}
app.addEventListener("contextmenu", (e) => {
  if (screen !== "battle") return;
  e.preventDefault();
  previousAction();
});
function bindCanvas() {
  for (const [id, p] of [
    ["map", state!.active],
    ["map2", 3 - state!.active],
  ] as const) {
    const canvas = document.querySelector<HTMLCanvasElement>(`#${id}`);
    if (!canvas) continue;
    let drag: {
      id: number;
      x: number;
      y: number;
      cx: number;
      cy: number;
      moved: boolean;
    } | null = null;
    canvas.onpointerdown = (e) => {
      if (e.button !== 0) return;
      const c = state!.players[p - 1].camera;
      drag = {
        id: e.pointerId,
        x: e.clientX,
        y: e.clientY,
        cx: c.x,
        cy: c.y,
        moved: false,
      };
      canvas.setPointerCapture(e.pointerId);
    };
    canvas.onpointermove = (e) => {
      const r = canvas.getBoundingClientRect();
      if (drag) {
        const dx = e.clientX - drag.x,
          dy = e.clientY - drag.y;
        if (Math.hypot(dx, dy) > 5) drag.moved = true;
        if (drag.moved) {
          const c = state!.players[p - 1].camera;
          c.x = drag.cx - (dx / r.width) * viewCols;
          c.y = drag.cy - (dy / r.height) * viewRows;
          clampCamera(p as 1 | 2);
          isPanning = true;
          canvas.classList.add("dragging");
          updateHover(null);
          return;
        }
      }
      if (id === "map")
        updateHover(
          canvasCoords(
            e.clientX - r.left,
            e.clientY - r.top,
            r.width,
            r.height,
            p as 1 | 2,
          ),
        );
    };
    canvas.onpointerup = (e) => {
      isPanning = false;
      const was = drag;
      drag = null;
      isPanning = false;
      canvas.classList.remove("dragging");
      if (canvas.hasPointerCapture(e.pointerId))
        canvas.releasePointerCapture(e.pointerId);
      if (!was || was.moved || id !== "map") return;
      const r = canvas.getBoundingClientRect(),
        c = canvasCoords(
          e.clientX - r.left,
          e.clientY - r.top,
          r.width,
          r.height,
          p as 1 | 2,
        );
      if (c) void clickCell(c.x, c.y);
    };
    canvas.onpointercancel = () => {
      drag = null;
      isPanning = false;
      canvas.classList.remove("dragging");
    };
    canvas.onpointerleave = () => {
      if (!drag) updateHover(null);
    };
  }
}
const terrainNames: Record<E.Terrain, string> = {
  grass: "Prairie",
  earth: "Terre",
  road: "Route",
  sand: "Sable",
  water: "Mer",
  forest: "Sous-bois",
  tree: "Forêt dense",
  rock: "Rochers",
  wall: "Mur de pierre",
  ruin: "Ruines",
  floor: "Entrée sud du village",
  debris: "Débris",
  wagon: "Chariot renversé",
  stairs: "Escaliers",
  altar: "Ancien autel",
  arrival: "Épave / convoi détruit",
  hill: "Collines",
  village: "Village détruit · bâtiments infranchissables",
};
function canvasCoords(x: number, y: number, w: number, h: number, p: 1 | 2) {
  const c = state!.players[p - 1].camera,
    xx = Math.floor((x / w) * viewCols + c.x),
    yy = Math.floor((y / h) * viewRows + c.y);
  return E.cell(xx, yy) ? { x: xx, y: yy } : null;
}
function drawSprite(
  ctx: CanvasRenderingContext2D,
  u: Unit,
  x: number,
  y: number,
  size: number,
  frame = 0,
  flip = false,
  attack = false,
  animation = attack ? "attack" : "idle",
  profileOverride?: SpriteProfile,
) {
  const profile = profileOverride ?? unitSpriteProfile(u);
  ctx.save();
  ctx.translate(x + size / 2, y + size / 2);
  if (flip) ctx.scale(-1, 1);
  if (
    !drawResourceFrame(
      ctx,
      profile,
      resolveClip(profile, animation) ? animation : "idle",
      frame,
      -size / 2,
      -size * 0.72,
      size,
      size * 1.15,
      true,
      E.colorForOwner(state?.teamColors, u.owner),
      "world",
    )
  ) {
    ctx.fillStyle = "#e8d4ad";
    ctx.font = `${Math.max(8, size * 0.08)}px sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText("Sprite indisponible", 0, 0);
  }
  ctx.restore();
}
let moveAnim: {
    id: string;
    steps: number[];
    start: number;
    duration: number;
  } | null = null,
  combatAnim: {
    battle: Battle;
    scene: CombatSceneV2;
    start: number;
    done: () => void;
  } | null = null;
const mist = new Mist(E.W, E.H);
let tacticalAction: {
  sprite: Unit;
  profile?: SpriteProfile;
  visualAnimation?: string;
  animation: string;
  start: number;
  fps: number;
  restored?: number;
  target?: { x: number; y: number };
} | null = null;
/** Presentation of an already validated action; never advances initiative itself. */
async function playTacticalAction(
  sprite: Unit,
  animation: string,
  target?: Unit,
  restored?: number,
) {
  const profile = combatSkin(unitSpriteProfile(sprite))?.profile;
  if (animation === "heal" && E.hasSkill(sprite, "bandage"))
    animation = "bandage";
  const visualAnimation = resolveClip(profile, animation) ? animation : "idle";
  const clip = resolveClip(profile, visualAnimation);
  if (!clip) return;
  const previousBusy = busy;
  busy = true;
  tacticalAction = {
    sprite,
    profile,
    visualAnimation: "idle",
    animation: "idle",
    start: performance.now(),
    fps: 2,
  };
  positionContextMenu();
  try {
    // Keep the actor in guard while its atlas loads; loading must not consume
    // the animation's only playback, or leave a committed action interactive.
    try {
      await Promise.all([
        warmSprites([sprite, ...(target ? [target] : [])], state?.teamColors, [
          "idle",
          animation,
        ]),
        preloadEffects(),
        new CombatSceneV2([sprite], [], state?.teamColors).prepare(),
      ]);
    } catch {
      return;
    }
    tacticalAction = {
      sprite,
      profile,
      visualAnimation,
      animation,
      start: performance.now(),
      fps: clip.fps * speed,
      target: target && { x: target.x, y: target.y },
      restored,
    };
    await new Promise((resolve) =>
      setTimeout(
        resolve,
        Math.max(
          (clip.frames.length / Math.max(1, clip.fps * speed)) * 1000,
          ["heal", "bandage"].includes(animation) ? 1100 / speed : 0,
        ),
      ),
    );
  } finally {
    tacticalAction = null;
    busy = previousBusy;
  }
}
const terrain = new TerrainRenderer(regional);
let reachSignature = "",
  reachCache = new Map<number, { cost: number; steps: number[] }>();
function movementField(s: Campaign, u: Unit) {
  const signature =
    s.units.map((t) => `${t.id}:${t.x},${t.y},${t.hp}`).join("|") +
    u.id +
    u.classId +
    u.move +
    JSON.stringify(s.players[u.owner === 2 ? 1 : 0].visible) +
    JSON.stringify(s.players[u.owner === 2 ? 1 : 0].explored);
  if (signature !== reachSignature) {
    reachSignature = signature;
    reachCache = E.reachable(s, u, true);
  }
  return reachCache;
}
let attackSignature = "",
  attackCache = new Set<number>();
function attackField(
  u: Unit,
  reach: Map<number, { cost: number; steps: number[] }>,
) {
  const signature =
    reachSignature +
    u.id +
    u.x +
    "," +
    u.y +
    ":" +
    moved +
    u.activeWeaponId +
    u.crossbowLoaded +
    u.range;
  if (signature !== attackSignature) {
    attackSignature = signature;
    attackCache = E.attackCells(
      u,
      reach.keys(),
      new Set([
        ...state!.players[u.owner === 2 ? 1 : 0].visible,
        ...state!.players[u.owner === 2 ? 1 : 0].explored,
      ]),
    );
  }
  return attackCache;
}
function renderMap(canvas: HTMLCanvasElement, p: 1 | 2, time: number) {
  if (!state) return;
  const bounds = canvas.getBoundingClientRect();
  if (!bounds.width || !bounds.height) return;
  const cols = Math.min(30 / zoom, (E.H * bounds.width) / bounds.height),
    rows = (cols * bounds.height) / bounds.width;
  if (
    canvas.id === "map" &&
    (Math.abs(cols - viewCols) > 0.001 || Math.abs(rows - viewRows) > 0.001)
  ) {
    for (const player of state.players) {
      player.camera.x += (viewCols - cols) / 2;
      player.camera.y += (viewRows - rows) / 2;
    }
    viewCols = cols;
    viewRows = rows;
    clampCamera(1);
    clampCamera(2);
  }
  const ratio = Math.min(2, window.devicePixelRatio || 1);
  const width = Math.round(bounds.width * ratio),
    height = Math.round(bounds.height * ratio);
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  const logicalHeight = (960 * bounds.height) / bounds.width;
  const s = state,
    ctx = canvas.getContext("2d")!,
    visible = new Set(s.players[p - 1].visible),
    explored = new Set(s.players[p - 1].explored),
    cam = s.players[p - 1].camera;
  canvas.dataset.cameraX = String(cam.x);
  canvas.dataset.cameraY = String(cam.y);
  canvas.dataset.viewCols = String(viewCols);
  canvas.dataset.viewRows = String(viewRows);
  ctx.setTransform(
    canvas.width / 960,
    0,
    0,
    canvas.height / logicalHeight,
    0,
    0,
  );
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.fillStyle = "#71858a";
  ctx.fillRect(0, 0, 960, logicalHeight);
  ctx.save();
  ctx.scale(30 / viewCols, 30 / viewCols);
  ctx.translate(-cam.x * 32, -cam.y * 32);
  const surface = terrain.layer(terrainStyle, s.factions);
  if (surface) {
    const x = cam.x * 32,
      y = cam.y * 32,
      w = Math.min(viewCols * 32, E.W * 32 - x),
      h = Math.min(viewRows * 32, E.H * 32 - y);
    ctx.drawImage(surface, x * 2, y * 2, w * 2, h * 2, x, y, w, h);
  }
  if (showGrid) {
    ctx.strokeStyle = "#e4d9bb35";
    ctx.lineWidth = 0.5;
    for (const c of E.map)
      if (!fogEnabled || visible.has(E.key(c.x, c.y)))
        ctx.strokeRect(c.x * 32, c.y * 32, 32, 32);
  }
  const sel = s.units.find((u) => u.id === selected),
    cur = E.current(s);
  if (sel && sel.owner === p && sel.id === cur?.id && !busy) {
    const reach = moved
      ? new Map([[E.key(sel.x, sel.y), { cost: 0, steps: [] }]])
      : movementField(s, sel);
    for (const [k] of reach) {
      const c = E.map[k];
      if (moved || !visible.has(k)) continue;
      ctx.fillStyle = "#4bade34a";
      ctx.fillRect(c.x * 32 + 1, c.y * 32 + 1, 30, 30);
      ctx.strokeStyle = "#72ceee70";
      if (c.x !== sel.x || c.y !== sel.y)
        ctx.strokeRect(c.x * 32 + 1, c.y * 32 + 1, 30, 30);
    }
    for (const k of aim === "heal" ? [] : attackField(sel, reach)) {
      if (!visible.has(k) || reach.has(k)) continue;
      const c = E.map[k];
      ctx.fillStyle = "#e6535837";
      ctx.fillRect(c.x * 32 + 1, c.y * 32 + 1, 30, 30);
      ctx.strokeStyle = "#d77b6860";
      ctx.strokeRect(c.x * 32 + 1, c.y * 32 + 1, 30, 30);
    }
    if (hover !== null && reach.has(hover)) {
      const route = reach.get(hover)!.steps;
      ctx.beginPath();
      ctx.strokeStyle = "#c2e3db";
      ctx.lineWidth = 2;
      route.forEach((k, i) => {
        const c = E.map[k];
        i
          ? ctx.lineTo(c.x * 32 + 16, c.y * 32 + 16)
          : ctx.moveTo(c.x * 32 + 16, c.y * 32 + 16);
      });
      ctx.stroke();
    }
  }
  if (
    sel &&
    sel.id === cur?.id &&
    sel.owner === p &&
    (aim === "heal" || (!aim && E.activeWeapon(sel).category === "healing"))
  ) {
    const origins = moved
      ? [E.key(sel.x, sel.y)]
      : movementField(s, sel).keys();
    const cells = E.healingCells(
      sel,
      origins,
      new Set([...visible, ...explored]),
    );
    const blue = moved ? new Map() : movementField(s, sel);
    for (const k of cells) {
      if (!visible.has(k) || (!moved && blue.has(k))) continue;
      const c = E.map[k];
      ctx.fillStyle = "#58b97c66";
      ctx.fillRect(c.x * 32 + 1, c.y * 32 + 1, 30, 30);
    }
  }
  if (aim && sel && sel.owner === p) {
    const cells =
      aim === "heal"
        ? E.alive(s).filter((t) => E.canHealTarget(s, sel, t))
        : aim === "summon"
          ? E.summonCells(s, sel)
          : hover !== null && E.canCastAreaAt(s, sel, E.map[hover])
            ? E.map.filter(
                (c) => E.distance(c, E.map[hover!]) <= E.tuning.area.radius,
              )
            : [];
    for (const c of cells)
      if (visible.has(E.key(c.x, c.y))) {
        ctx.fillStyle =
          aim === "heal"
            ? "#6bb57e66"
            : aim === "summon"
              ? "#e2c26766"
              : "#d67a7166";
        ctx.fillRect(c.x * 32 + 1, c.y * 32 + 1, 30, 30);
      }
  }
  for (const b of s.banners ?? [])
    if (!fogEnabled || visible.has(E.key(b.x, b.y))) {
      ctx.strokeStyle = "#cab677";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(b.x * 32 + 25, b.y * 32 + 28);
      ctx.lineTo(b.x * 32 + 25, b.y * 32 + 3);
      ctx.stroke();
      ctx.fillStyle = `rgb(${E.teamPalette[E.colorForOwner(s.teamColors, b.owner)].rgb.join(",")})`;
      ctx.beginPath();
      ctx.moveTo(b.x * 32 + 25, b.y * 32 + 3);
      ctx.lineTo(b.x * 32 + 12, b.y * 32 + 9);
      ctx.lineTo(b.x * 32 + 25, b.y * 32 + 14);
      ctx.fill();
    }
  for (const u of E.alive(s).sort((a, b) => a.y - b.y)) {
    if (fogEnabled && !E.seen(s, p, u)) continue;
    let x = u.x * 32,
      y = u.y * 32,
      frame = Math.floor(time / 600) % 2 === 0 ? 0 : 1;
    if (moveAnim?.id === u.id) {
      const f =
          Math.max(
            0,
            Math.min(0.999, (time - moveAnim.start) / moveAnim.duration),
          ) *
          (moveAnim.steps.length - 1),
        i = Math.floor(f),
        a = E.map[moveAnim.steps[i]],
        b = E.map[moveAnim.steps[Math.min(i + 1, moveAnim.steps.length - 1)]];
      x = (a.x + (b.x - a.x) * (f - i)) * 32;
      y = (a.y + (b.y - a.y) * (f - i)) * 32;
      frame = Math.floor(time / 130) % 2;
    }
    const action = tacticalAction?.sprite.id === u.id ? tacticalAction : null;
    if (action)
      frame = Math.min(
        (resolveClip(action.profile, action.visualAnimation ?? action.animation)
          ?.frames.length ?? 1) - 1,
        Math.floor(((time - action.start) * action.fps) / 1000),
      );
    drawSprite(
      ctx,
      action?.sprite ?? u,
      x - 3,
      y - 7,
      38,
      frame,
      false,
      false,
      action?.visualAnimation ??
        action?.animation ??
        (moveAnim?.id === u.id ? "move" : "idle"),
      action?.profile,
    );
    if (u.id === cur?.id || selected === u.id) {
      ctx.strokeStyle = selected === u.id ? "#ecddac99" : "#ecd5a066";
      ctx.lineWidth = 0.7;
      for (const [xx, yy, dx, dy] of [
        [x + 1, y + 1, 1, 1],
        [x + 31, y + 1, -1, 1],
        [x + 1, y + 31, 1, -1],
        [x + 31, y + 31, -1, -1],
      ]) {
        ctx.beginPath();
        ctx.moveTo(xx + dx * 5, yy);
        ctx.lineTo(xx, yy);
        ctx.lineTo(xx, yy + dy * 5);
        ctx.stroke();
      }
    }
  }
  if (fogEnabled)
    mist.draw(ctx, visible, p, time, {
      x: cam.x * 32,
      y: cam.y * 32,
      width: viewCols * 32 + 1,
      height: viewRows * 32 + 1,
    });
  if (sel && sel.owner === p && sel.id === cur?.id && !busy && !moved) {
    for (const [k] of movementField(s, sel)) {
      if (visible.has(k)) continue;
      const c = E.map[k];
      ctx.fillStyle = explored.has(k) ? "#6daedc38" : "#6daedc16";
      ctx.fillRect(c.x * 32 + 1, c.y * 32 + 1, 30, 30);
      ctx.strokeStyle = explored.has(k) ? "#83b7d966" : "#83b7d933";
      ctx.lineWidth = 0.6;
      ctx.strokeRect(c.x * 32 + 2, c.y * 32 + 2, 28, 28);
    }
  }
  if (sel && sel.owner === p && sel.id === cur?.id && !busy) {
    const reach = moved
      ? new Map([[E.key(sel.x, sel.y), { cost: 0, steps: [] }]])
      : movementField(s, sel);
    const healing =
      aim === "heal" || (!aim && E.activeWeapon(sel).category === "healing");
    const cells = healing
      ? E.healingCells(sel, reach.keys(), new Set([...visible, ...explored]))
      : attackField(sel, reach);
    for (const k of cells) {
      if (visible.has(k) || (!moved && reach.has(k))) continue;
      const c = E.map[k];
      ctx.strokeStyle = healing ? "#64c38a44" : "#df6b6644";
      ctx.lineWidth = 0.6;
      ctx.strokeRect(c.x * 32 + 2, c.y * 32 + 2, 28, 28);
    }
  }
  if (!fogEnabled || visible.has(E.key(E.village.entry.x, E.village.entry.y))) {
    const x = E.village.entry.x * 32,
      y = E.village.entry.y * 32;
    ctx.strokeStyle = "#dec48c";
    ctx.lineWidth = 1.1;
    ctx.strokeRect(x + 3, y + 3, 26, 26);
    ctx.fillStyle = "#ead5a2";
    ctx.beginPath();
    ctx.moveTo(x + 12, y + 28);
    ctx.lineTo(x + 16, y + 24);
    ctx.lineTo(x + 20, y + 28);
    ctx.fill();
  }
  if (
    tacticalAction &&
    ["heal", "bandage"].includes(tacticalAction.animation) &&
    tacticalAction.target &&
    (!fogEnabled ||
      visible.has(E.key(tacticalAction.target.x, tacticalAction.target.y)))
  ) {
    const target = tacticalAction.target;
    if (tacticalAction.animation === "heal")
      drawHealing(
        ctx,
        (time - tacticalAction.start) * speed,
        (target.x + 0.5) * 32,
        (target.y + 1) * 32,
        60,
      );
    if (tacticalAction.restored) {
      ctx.fillStyle = "#b6f4bd";
      ctx.font = "bold 12px Manrope";
      ctx.textAlign = "center";
      ctx.fillText(
        `+${tacticalAction.restored} PV`,
        (target.x + 0.5) * 32,
        target.y * 32 - 12,
      );
    }
  }
  if (hover !== null && (!fogEnabled || visible.has(hover))) {
    const c = E.map[hover];
    ctx.strokeStyle = "#f0ead190";
    ctx.lineWidth = 1;
    ctx.lineWidth = 0.5;
    ctx.strokeStyle = "#ecddac66";
    for (const [dx, dy, sx, sy] of [
      [1, 1, 1, 1],
      [31, 1, -1, 1],
      [1, 31, 1, -1],
      [31, 31, -1, -1],
    ]) {
      const x = c.x * 32 + dx,
        y = c.y * 32 + dy;
      ctx.beginPath();
      ctx.moveTo(x + sx * 4, y);
      ctx.lineTo(x, y);
      ctx.lineTo(x, y + sy * 4);
      ctx.stroke();
    }
  }
  ctx.restore();
}
let lastMapFrame = 0;
function animation(time: number) {
  requestAnimationFrame(animation);
  if (
    screen === "battle" &&
    time - lastMapFrame >= 1000 / (moveAnim ? 30 : 15)
  ) {
    lastMapFrame = time;
    const a = document.querySelector<HTMLCanvasElement>("#map"),
      b = document.querySelector<HTMLCanvasElement>("#map2");
    if (a) {
      renderMap(a, state!.active, time);
      positionContextMenu();
    }
    if (b) renderMap(b, (3 - state!.active) as 1 | 2, time);
  }
  if (combatAnim) renderCombat(time);
}
requestAnimationFrame(animation);
async function animateMove(u: Unit, x: number, y: number) {
  const s = state!,
    plan = E.path(s, u, x, y, false, true);
  if (!plan || plan.cost > u.move) return false;
  const p = E.movementPrefix(s, u, plan);
  busy = true;
  moveAnim = {
    id: u.id,
    steps: p.steps,
    start: performance.now(),
    duration: Math.max(160, (p.steps.length * 130) / speed),
  };
  if (screen === "battle") battleUI();
  await new Promise((r) => setTimeout(r, moveAnim!.duration));
  E.move(s, u, p.destination.x, p.destination.y);
  u.movedDistance = p.steps.length - 1;
  if (p.interrupted) {
    origin = null;
    s.committedMove = u.id;
    toast(
      "Progression interrompue : le passage découvert ne permet pas de continuer.",
    );
  }
  moveAnim = null;
  busy = false;
  return true;
}
async function clickCell(x: number, y: number) {
  if (!state || busy || state.scene) return;
  const s = state,
    u = E.current(s),
    target = E.at(s, x, y);

  if (u && u.owner === s.active && aim) {
    try {
      if (aim === "buff" && target) {
        const sprite = structuredClone(u);
        E.improveAlly(s, u, target);
        aim = null;
        await playTacticalAction(sprite, "buff");
        finishTurn();
        return;
      }
      if (aim === "heal" && target) {
        const sprite = structuredClone(u);
        const restored = E.healTarget(s, u, target);
        aim = null;
        await playTacticalAction(sprite, "heal", target, restored);
        finishTurn();
        return;
      }
      if (aim === "summon") {
        const sprite = structuredClone(u);
        E.summon(s, u, x, y);
        aim = null;
        await playTacticalAction(sprite, "summon");
        finishTurn();
        return;
      }
      if (aim === "area" && E.canCastAreaAt(s, u, { x, y })) {
        const m = document.createElement("div");
        m.className = "modal-back";
        m.innerHTML = `<section class="modal forecast"><h2>Attaque de zone</h2><p>Zone de ${E.tuning.area.radius} case autour de la cible. Les alliés sont épargnés.</p>${button("Engager le combat", `confirm-area-${x}-${y}`, "primary")}${button("Annuler", "close-modal")}</section>`;
        app.append(m);
        return;
      }
    } catch (error) {
      toast(error instanceof Error ? error.message : "Action impossible");
      return;
    }
    return;
  }
  if (target && E.seen(s, s.active, target)) {
    if (
      selected === u?.id &&
      u.owner === s.active &&
      target.owner === 0 &&
      E.canAttack(u, target)
    ) {
      preview(u, target);
      return;
    }
    if (
      target.id === u?.id &&
      selected === u.id &&
      u.owner === s.active &&
      !moved
    ) {
      origin = {
        x: u.x,
        y: u.y,
        fortified: u.fortified,
        movedDistance: u.movedDistance,
      };
      moved = true;
      battleUI();
      return;
    }
    selected = target.id;
    aim = null;
    cardOpen = !(target.id === u?.id && u.owner === s.active);
    battleUI();
    return;
  }
  if (selected === u?.id && u?.owner === s.active) {
    const p = E.path(s, u, x, y, false, true);
    if (!moved && s.committedMove !== u.id && p && p.cost <= u.move) {
      origin = {
        x: u.x,
        y: u.y,
        fortified: u.fortified,
        movedDistance: u.movedDistance,
      };
      await animateMove(u, x, y);
      moved = true;
      if (E.encounter(s)) {
        origin = null;
        s.committedMove = u.id;
        selected = u.id;
        cinematic();
      } else battleUI();
    } else toast("Cette case n’est pas accessible pendant cette activation.");
  }
}
function cancel() {
  if (busy) return;
  targetingAttack = false;
  if (state && previousHealWeapon) {
    const u = E.current(state);
    if (u && u.owner === state.active) {
      u.activeWeaponId = previousHealWeapon;
      E.syncWeapon(u);
    }
  }
  previousHealWeapon = undefined;
  aim = null;
  if (origin && state) {
    const u = E.current(state)!;
    Object.assign(u, origin);
    E.visibility(state);
  }
  origin = null;
  moved = !!state && state.committedMove === E.current(state)?.id;
  selected = state
    ? E.current(state)?.owner === state.active
      ? E.current(state)!.id
      : null
    : null;
  document.querySelector(".modal-back")?.remove();
  if (state?.phase === "battle") battleUI();
}
function finishTurn() {
  if (!state || busy) return;
  aim = null;
  targetingAttack = false;
  previousHealWeapon = undefined;
  origin = null;
  moved = false;
  selected = null;
  E.advance(state);
  battleUI();
  if (!state.scene) save(true);
}
function preview(a: Unit, b: Unit) {
  const p = E.forecast(a, b, state!),
    q = E.forecast(b, a, state!, { counter: true });
  const modal = document.createElement("div");
  modal.className = "modal-back";
  modal.className = "modal-back forecast-back";
  const color = (u: Unit) =>
    E.teamPalette[E.colorForOwner(state!.teamColors, u.owner)].rgb.join(",");
  const value = (v: string | number, double = 1) =>
    `<b>${v}${double > 1 ? `<small class="forecast-double">×${double}</small>` : ""}</b>`;
  const weapon = (u: Unit, advantage: number) =>
    `<span class="fe-weapon">${esc(E.weaponName(u))}${advantage ? `<i class="weapon-triangle ${advantage > 0 ? "advantage" : "disadvantage"}" aria-label="${advantage > 0 ? "Avantage" : "Désavantage"} d’arme">${advantage > 0 ? "▲" : "▼"}</i>` : ""}</span>`;
  modal.innerHTML = `<section class="modal forecast compact-forecast fe-forecast" aria-label="Prévision de combat" style="--forecast-left:${color(a)};--forecast-right:${color(b)}"><div class="fe-names"><header><strong>${esc(a.name)}</strong>${weapon(a, p.advantage)}</header><header><strong>${esc(b.name)}</strong>${weapon(b, q.advantage)}</header></div><div class="fe-stat-grid">${value(`${a.hp}/${a.maxHp}`)}<span>PV</span>${value(`${b.hp}/${b.maxHp}`)}${value(p.damage, p.strikes)}<span>Dégâts</span>${value(p.counter ? q.damage : "—", p.counter ? q.strikes : 1)}${value(`${p.hit}%`)}<span>Précision</span>${value(p.counter ? `${q.hit}%` : "—")}${value(`${p.crit}%`)}<span>Critique</span>${value(p.counter ? `${q.crit}%` : "—")}</div><div class="modal-actions">${button("Annuler", "close-modal")}${button("Attaquer", "confirm-attack-" + b.id, "primary")}</div></section>`;
  app.append(modal);
}
function gameCombatHud(left: Unit, right: Unit, battle: Battle) {
  const panels = [left, right].map((u, i) => {
    const target = i === 0 ? right : left,
      actual = battle.strikes.find((t) => t.attacker === u.id)?.forecast,
      p = actual ?? E.forecast(u, target, state!, { counter: i === 1 }),
      ready = !!actual || E.canAttack(u, target);
    return {
      id: u.id,
      name: u.name,
      weapon: E.weaponName(u),
      hp: u.hp,
      maxHp: u.maxHp,
      hit: ready ? p.hit : null,
      damage: ready ? p.damage : null,
      color: E.teamPalette[E.colorForOwner(state?.teamColors, u.owner)].rgb,
    };
  });
  return combatHud([panels[0], panels[1]]);
}
async function fight(a: Unit, b: Unit, area?: { x: number; y: number }) {
  if (busy) return;
  busy = true;
  origin = null;
  moved = false;
  const result = area
    ? E.resolveArea(state!, a, area)
    : E.resolve(state!, a, b);
  if (
    !E.seen(state!, state!.active, a) ||
    !E.seen(state!, state!.active, b) ||
    result.strikes.some((t) =>
      [t.attacker, t.defender].some((id) => {
        const u = state!.units.find((u) => u.id === id);
        return !u || !E.seen(state!, state!.active, u);
      }),
    )
  ) {
    for (const strike of result.strikes) E.applyStrike(state!, strike);
    E.applyXp(state!, result);
    E.visibility(state!);
    busy = false;
    finishTurn();
    return;
  }
  initiativeCleanup?.();
  initiativeCleanup = undefined;
  const participants = [
    a,
    b,
    ...state!.units.filter(
      (u) =>
        u.id !== a.id &&
        u.id !== b.id &&
        result.strikes.some((t) => t.attacker === u.id || t.defender === u.id),
    ),
  ];
  const scene = new CombatSceneV2(
    participants,
    result.strikes,
    state!.teamColors,
  );
  await scene.prepare();
  screen = "combat";
  app.innerHTML = `<main class="combat-screen"><div class="combat-scene-bg" style="background-image:linear-gradient(#0a191c22,#0c1c1c77),url('${assetBase}assets/battle-${a.x <= 6 ? 1 : E.cell(a.x, a.y)?.terrain === "forest" ? 2 : a.x >= 14 && a.x <= 20 ? 0 : 3}.png')"></div><header><span class="eyebrow">LES RIVAGES DE L’OUBLI</span><span>CONFRONTATION</span></header><section class="duel-stage game-duel" style="background-image:url('${assetBase}assets/battle-${a.x <= 6 ? 1 : E.cell(a.x, a.y)?.terrain === "forest" ? 2 : a.x >= 14 && a.x <= 20 ? 0 : 3}.png')"><div class="combat-hud">${gameCombatHud(a, b, result)}</div><canvas id="combat" width="960" height="600"></canvas><div id="combat-result" aria-live="polite"></div></section><footer><span>CHAQUE FRAPPE PEUT CHANGER VOTRE DESTIN</span><span>VITESSE ×${speed}</span></footer></main>`;
  await new Promise<void>((done) => {
    combatAnim = {
      battle: result,
      scene,
      start: performance.now() + 350 / speed,
      done,
    };
  });
  E.applyXp(state!, result);
  E.visibility(state!);
  await rewards(result);
  busy = false;
  const levels = result.xp.filter((e) => e.level);
  if (levels.length) {
    const u = state!.units.find((u) => u.id === levels[0].id)!;
    toast(
      `${u.name} · Niveau ${u.level} ! ${gainText(result.levelGains?.[u.id])}`,
    );
  }
  E.log(state!, `${a.name} affronte ${b.name}.`);
  finishTurn();
}
function gainText(gains?: Record<string, number>) {
  const labels: Record<string, string> = {
    maxHp: "PV",
    strength: "Force / Puissance",
    defense: "Défense",
    agility: "Agilité",
    initiative: "Initiative",
    parryPoints: "Parade",
  };
  return Object.entries(gains ?? {})
    .filter(([, v]) => v > 0)
    .map(([k, v]) => `${labels[k] ?? k} +${v}`)
    .join(" · ");
}
function rewards(result: Battle): Promise<void> {
  if (!result.xp.length) return Promise.resolve();
  return new Promise((done) => {
    pendingReward = done;
    const modal = document.createElement("div");
    modal.className = "modal-back rewards";
    modal.innerHTML = `<section class="modal compact-rewards" aria-label="Résultats de l’affrontement"><h2>Résultats</h2>${result.xp
      .map((e) => {
        const u = state!.units.find((u) => u.id === e.id)!;
        return `<div class="reward-unit">${u.portraitAsset ? portrait(u) : ""}<div><strong>${esc(u.name)} <span>+${e.amount} EXP</span></strong><div class="bar xp"><i data-progress="${u.xp}" style="width:${e.before}%"></i></div><small>${u.xp} / 100 EXP · Niveau ${u.level}</small>${e.level ? `<div class="level-up"><span class="eyebrow">NIVEAU ${u.level}</span><b>${gainText(result.levelGains?.[u.id])}</b></div>` : ""}</div></div>`;
      })
      .join("")}${button("Continuer", "close-reward", "primary")}</section>`;
    app.append(modal);
    setTimeout(
      () =>
        modal
          .querySelectorAll<HTMLElement>("[data-progress]")
          .forEach((el) => (el.style.width = el.dataset.progress + "%")),
      120,
    );
  });
}
function renderCombat(time: number) {
  const anim = combatAnim!,
    canvas = document.querySelector<HTMLCanvasElement>("#combat");
  if (!canvas) return;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  anim.scene.draw(
    ctx,
    Math.max(0, (time - anim.start) * speed),
    (index) => {
      const strike = anim.battle.strikes[index];
      E.applyStrike(state!, strike);
      audio();
      const attacker = state!.units.find((u) => u.id === strike.attacker)!,
        defender = state!.units.find((u) => u.id === strike.defender)!;
      const side =
        anim.scene.actors.find((a) => a.unit.id === attacker.id)?.side ?? 0;
      const left = side === 0 ? attacker : defender,
        right = side === 0 ? defender : attacker;
      const hud = document.querySelector(".combat-hud");
      if (hud) hud.innerHTML = gameCombatHud(left, right, anim.battle);
      const r = document.querySelector("#combat-result");
      if (r)
        r.textContent = strike.hit
          ? strike.blocked
            ? "PARADE"
            : `${strike.critical ? "CRITIQUE · " : ""}−${strike.damage}`
          : "ESQUIVE";
    },
    () => {
      if (anim.scene.missing.size)
        console.info("Ressources de combat à compléter", [
          ...anim.scene.missing,
        ]);
      combatAnim = null;
      anim.done();
    },
  );
}

async function enemyTurn() {
  if (!state || busy || state.scene) return;
  const s = state,
    u = E.current(s);
  if (!u || u.owner !== 0) return;
  busy = true;
  await new Promise((r) => setTimeout(r, 400 / speed));
  busy = false;
  const plan = E.ai(s, u);
  await animateMove(u, plan.x, plan.y);
  if (E.encounter(s)) {
    s.encounterContinuation = { actorId: u.id, targetId: plan.target };
    cinematic();
    return;
  }
  const target = s.units.find((t) => t.id === plan.target);
  if (target && E.canAttack(u, target)) await fight(u, target);
  else finishTurn();
}
function save(silent = false) {
  if (!state || busy || origin) {
    if (!silent) toast("Terminez ou annulez l’action avant de sauvegarder.");
    return;
  }
  try {
    localStorage.setItem("lte-save", E.encode(state));
    if (!silent) toast("Votre aventure a été sauvegardée.");
  } catch {
    if (!silent) toast("Sauvegarde impossible pendant cette transition.");
  }
}
function resume() {
  try {
    state = E.decode(localStorage.getItem("lte-save") || "");
    selected = null;
    aim = null;
    origin = null;
    moved = state.committedMove === E.current(state)?.id;
    if (state.phase === "summary" || state.phase === "camp") summary();
    else battleUI();
  } catch {
    toast("Cette sauvegarde est absente ou incompatible.");
  }
}
function summary() {
  initiativeCleanup?.();
  initiativeCleanup = undefined;
  screen = "summary";
  const s = state!;
  s.phase = "summary";
  app.innerHTML = `<main class="summary-screen"><header class="brand">${mark}<span>LES TERRES ÉGARÉES<small>PROTOTYPE · BILAN TACTIQUE</small></span></header><section><h1>Fin du test tactique</h1><p>Les unités et leur progression sont conservées. Enregistrez ce bilan ou retournez au menu.</p><div class="summary-units">${s.units
    .filter((u) => u.owner !== 0 && !u.summonedBy)
    .map(
      (u) =>
        `<article>${portrait(u)}<h2>${esc(u.name)}</h2><p>${E.className(u)} · Nv. ${u.level}</span><small>${esc(unitVisualNote(u))}</small><span> · ${u.hp} / ${u.maxHp} PV</p>${promotionMarkup(u)}</article>`,
    )
    .join(
      "",
    )}</div>${button("Sauvegarder", "save", "primary")}${button("Menu principal", "title")}</section></main>`;
}
function playerKnowledge() {
  const s = state!,
    d = E.discoveries(s);
  return `<div class="knowledge"><h3>Connaissances découvertes</h3><p>Classes : ${
    d.classes
      .map((id) => E.classes[id]?.name)
      .filter(Boolean)
      .join(" · ") || "Aucune"
  }</p><p>Faiblesses observées : ${
    (d.weaknesses ?? [])
      .map((value) => {
        const [weapon, id] = value.split(":");
        return `${E.classes[id]?.name ?? id} face à ${E.categoryNames[weapon as keyof typeof E.categoryNames]}`;
      })
      .join(" · ") || "Aucune"
  }</p><p>Capacités connues : ${d.skills.map((id) => E.skillNames[id]).join(" · ") || "Aucune capacité particulière observée"}</p>${E.weaponTriangles
    .map((r) =>
      r
        .map((cat, i) => [cat, r[(i + 1) % r.length]])
        .filter((pair) => pair.every((cat) => d.weapons.includes(cat)))
        .map(
          (pair) =>
            `<p>${pair.map((cat) => E.categoryNames[cat]).join(" > ")}</p>`,
        )
        .join(""),
    )
    .join("")}</div>`;
}
function defeat() {
  initiativeCleanup?.();
  initiativeCleanup = undefined;
  screen = "defeat";
  app.innerHTML = `<main class="defeat"><span class="eyebrow">LA BRUME A REPRIS SES DROITS</span><h1>Le dernier feu<br>s’est éteint.</h1><p>Une expédition a été anéantie. La partie est terminée.</p>${button("Reprendre la sauvegarde", "continue", "primary", !localStorage.getItem("lte-save"))}${button("Nouvelle aventure", "new")}</main>`;
}
function pause() {
  const modal = document.createElement("div");
  if (document.querySelector(".pause-menu")) return;
  modal.className = "modal-back pause-menu";
  modal.innerHTML = `<section class="modal"><span class="eyebrow">UNE HALTE DANS LA BRUME</span><h2>Votre aventure</h2><div class="pause-actions">${button("Reprendre", "close-modal", "primary")}<div class="pause-map-controls"><span>Carte · Expédition ${state!.active}</span>${[1, 2].map((p) => button(`Expédition ${p}`, `perspective-${p}`, state!.active === p ? "active" : "", busy)).join("")}${button(observer ? "Vue simple" : "Deux expéditions côte à côte", "observer", "", busy)}${button(fogEnabled ? "Retirer la brume (test)" : "Rétablir la brume", "toggle-fog", "", busy)}${button("Recentrer la carte", "recenter")}${E.canFinishBattleForTest(state!) ? button("Terminer le combat (test)", "finish-battle-test", "", busy) : ""}</div>${button("Sauvegarder", "save", "", busy || !!origin)}${button("Options", "options")}${button("Couleurs des équipes", "team-colors")}${button("Menu principal", "title")}</div></section>`;
  app.append(modal);
}
app.addEventListener("click", async (e) => {
  const el = (e.target as HTMLElement).closest<HTMLElement>("[data-action]");
  if (!el || el.hasAttribute("disabled")) return;
  const action = el.dataset.action!;
  if (tacticalAction) return;
  if (
    prototypeTools &&
    (action === "dev-sprites" ||
      action === "dev-systems" ||
      action.startsWith("dev-workshop") ||
      action === "dev-tests" ||
      action === "dev-comparator" ||
      action === "dev-arena" ||
      action === "dev-parries" ||
      action === "dev-initiative" ||
      action === "dev-combat-preview")
  ) {
    const request = ++developerRequest;
    developerCleanup?.();
    developerCleanup = null;
    screen = "developer";
    app.innerHTML = `<main class="dev-screen"><p role="status">Chargement du test…</p>${button("Menu principal", "title")}</main>`;
    if (action === "dev-tests") {
      const hub = await import("./dev/test-hub");
      if (request !== developerRequest) return;
      developerCleanup = hub.openTestHub(app, title);
      return;
    }
    if (action === "dev-comparator") {
      const view = await import("./dev/combat-comparator");
      if (request !== developerRequest) return;
      developerCleanup = view.openCombatComparator(app, () => {
        developerCleanup?.();
        void import("./dev/test-hub").then((h) => {
          developerCleanup = h.openTestHub(app, title);
        });
      });
      return;
    }
    if (action === "dev-arena" || action === "dev-parries") {
      const view = await import("./dev/combat-arena");
      if (request !== developerRequest) return;
      developerCleanup = view.openCombatArena(
        app,
        () => {
          developerCleanup?.();
          void import("./dev/test-hub").then((h) => {
            developerCleanup = h.openTestHub(app, title);
          });
        },
        action === "dev-parries" ? "parry" : "arena",
      );
      return;
    }
    if (action === "dev-initiative") {
      const view = await import("./dev/initiative-preview");
      if (request !== developerRequest) return;
      developerCleanup = view.openInitiativePreview(app, () => {
        void import("./dev/test-hub").then((h) => {
          developerCleanup?.();
          developerCleanup = h.openTestHub(app, title);
        });
      });
      return;
    }
    if (action === "dev-combat-preview") {
      const preview = await import("./dev/combat-preview");
      if (request !== developerRequest) return;
      developerCleanup = preview.openCombatPreview(app, title);
      return;
    }
    if (action.startsWith("dev-workshop")) {
      const workshop = await import("./dev/workshop");
      if (request !== developerRequest) return;
      developerCleanup = workshop.openWorkshop(
        app,
        title,
        action.slice("dev-workshop-".length),
      );
      return;
    }
    const tools = await import("./dev/tools");
    if (request !== developerRequest) return;
    developerCleanup =
      action === "dev-sprites"
        ? tools.openGallery(app, title)
        : tools.openSystems(app, title);
  } else if (action.startsWith("focus-")) {
    const u = state?.units.find((u) => u.id === action.slice(6));
    if (u && E.seen(state!, state!.active, u)) focusUnit(u);
  } else if (action === "skill-transform") {
    const u = state && E.current(state);
    if (u) {
      try {
        const sprite = structuredClone(u);
        E.transformBear(state!, u);
        await playTacticalAction(sprite, "transform");
        finishTurn();
      } catch (e) {
        toast((e as Error).message);
      }
    }
  } else if (action === "skill-buff") {
    aim = "buff";
    battleUI();
  } else if (action === "team-colors") {
    teamColorsModal();
  } else if (action === "apply-team-colors") {
    const colors = Object.fromEntries(
      ["player1", "player2"].map((key) => [
        key,
        (document.querySelector("#team-" + key) as HTMLSelectElement).value,
      ]),
    ) as E.TeamColors;
    colors.enemies = E.defaultTeamColors.enemies;
    try {
      const target = state ?? {};
      E.setPlayableTeamColors(target, colors);
      writeTeamPreferences(colors);
      document.querySelector(".team-colors-modal")?.remove();
      if (state && screen === "battle") {
        battleUI();
        save(true);
      }
    } catch (error) {
      document.querySelector("#team-color-error")!.textContent = (
        error as Error
      ).message;
    }
  } else if (action === "equipment" || action === "unit-sheet") {
    const u = E.current(state!);
    if (!u || u.owner !== state!.active || busy) return;
    if (action === "equipment") equipmentModal(u);
    else {
      cardOpen = true;
      selected = u.id;
      battleUI();
    }
  } else if (action.startsWith("equip-")) {
    try {
      E.equipWeapon(state!, E.current(state!)!, action.slice(6));
      aim = null;
      battleUI();
      save(true);
    } catch (error) {
      toast((error as Error).message);
    }
  } else if (action.startsWith("promote-")) {
    try {
      const [unitId, classId] = action.slice(8).split(":");
      const u = state!.units.find((u) => u.id === unitId);
      if (
        u &&
        (state!.phase === "summary" ||
          (E.current(state!)?.id === u.id && u.owner === state!.active))
      )
        E.promote(state!, u, classId);
      if (state!.phase === "summary") summary();
      else battleUI();
      save(true);
    } catch (error) {
      toast((error as Error).message);
    }
  } else if (action.startsWith("skill-")) {
    const u = E.current(state!);
    if (!u || busy || u.owner !== state!.active) return;
    try {
      if (action === "skill-heal") {
        if (!E.healingTargets(state!, u).length) return;
        const healingWeapon = u.carriedWeapons?.find(
          (id) => E.weaponCatalog[id].category === "healing",
        );
        if (healingWeapon && E.activeWeapon(u).category !== "healing") {
          previousHealWeapon = u.activeWeaponId;
          E.equipWeapon(state!, u, healingWeapon);
        }
        aim = "heal";
        battleUI();
        toast("Choisissez une unité blessée à portée.");
      } else if (action === "skill-summon") {
        aim = "summon";
        toast("Choisissez une case adjacente libre.");
      } else if (action === "skill-area") {
        aim = "area";
        toast("Choisissez le centre de la zone.");
      } else if (action === "skill-reload") {
        const sprite = structuredClone(u);
        E.reloadWeapon(state!, u);
        await playTacticalAction(sprite, "reload");
        battleUI();
      } else {
        const sprite = structuredClone(u);
        if (action === "skill-banner") E.plantBanner(state!, u);
        else E.fortify(state!, u);
        await playTacticalAction(
          sprite,
          action === "skill-banner" ? "banner" : "fortify",
        );
        finishTurn();
      }
    } catch (error) {
      toast((error as Error).message);
    }
  } else if (action.startsWith("confirm-area-")) {
    const [x, y] = action.slice(13).split("-").map(Number),
      u = E.current(state!)!,
      target = E.alive(state!).find(
        (t) => t.owner === 0 && E.distance(t, { x, y }) <= E.tuning.area.radius,
      )!;
    document.querySelector(".modal-back")?.remove();
    aim = null;
    await fight(u, target, { x, y });
  } else if (action === "finish-battle-test") {
    if (busy || !state || !E.canFinishBattleForTest(state)) return;
    origin = null;
    moved = false;
    selected = null;
    cardOpen = false;
    E.finishBattleForTest(state);
    cinematic();
  } else if (action === "toggle-fog") {
    fogEnabled = !fogEnabled;
    battleUI();
  } else if (action === "toggle-grid") {
    showGrid = !showGrid;
    battleUI();
  } else if (action === "close-reward") {
    document.querySelector(".rewards")?.remove();
    const done = pendingReward;
    pendingReward = null;
    done?.();
  } else if (action === "new") {
    if (state) save(true);
    configure();
  } else if (action === "title") {
    if (busy) return;
    save(true);
    title();
  } else if (action === "continue") resume();
  else if (action === "options") options();
  else if (action === "close-options") {
    speed = Number(
      (document.querySelector("#speed") as HTMLSelectElement).value,
    );
    sound = (document.querySelector("#sound") as HTMLInputElement).checked;
    showGrid = (document.querySelector("#grid-option") as HTMLInputElement)
      .checked;
    localStorage.setItem("lte-speed", String(speed));
    localStorage.setItem("lte-animation-v2-speed", String(speed));
    localStorage.setItem("lte-sound", sound ? "on" : "off");
    el.closest(".modal-back")?.remove();
  } else if (action.startsWith("faction-")) {
    const [, p, f] = action.split("-");
    const index = Number(p) - 1;
    factions[index] = f as Faction;
    factions[1 - index] = f === "north" ? "knight" : "north";
    factions.forEach((f, i) => {
      heroDrafts[i].faction = f;
      heroDrafts[i].classId = E.baseClasses(f)[0].id;
      delete heroDrafts[i].weaponId;
    });
    companionDrafts = [[], []];
    configure();
  } else if (action === "begin") {
    try {
      state = E.createCampaign(factions, heroDrafts, companionDrafts);
      E.setPlayableTeamColors(state, readTeamPreferences());
    } catch (error) {
      toast((error as Error).message);
      return;
    }
    mist.reset();
    terrain.reset();
    selected = null;
    aim = null;
    origin = null;
    moved = false;
    battleUI();
    save(true);
  } else if (action === "next-scene") nextScene();
  else if (action.startsWith("perspective-")) {
    if (busy) return;
    cancel();
    state!.active = Number(action.split("-")[1]) as 1 | 2;
    battleUI();
  } else if (action === "close-unit") {
    cardOpen = false;
    battleUI();
  } else if (action === "recenter") {
    document.querySelector(".pause-menu")?.remove();
    const u = E.current(state!);
    if (u && E.seen(state!, state!.active, u)) focusUnit(u);
    else {
      const friend = E.alive(state!).find((t) => t.owner === state!.active);
      if (friend) focusUnit(friend);
    }
  } else if (action === "observer") {
    observer = !observer;
    battleUI();
  } else if (action === "wait") {
    const u = E.current(state!);
    if (!busy && u?.owner === state!.active) finishTurn();
  } else if (action === "cancel") cancel();
  else if (action === "heal") {
    const u = E.current(state!);
    if (!busy && u?.owner === state!.active) {
      try {
        E.heal(state!, u);
        finishTurn();
      } catch {
        toast("Aucun soin nécessaire.");
      }
    }
  } else if (action === "attack-mode") {
    const u = E.current(state!);
    if (u?.owner === state!.active) {
      targetingAttack = true;
      selected = u.id;
      cardOpen = false;
      battleUI();
      toast(
        "Cliquez un ennemi dans les cases rouges pour prévisualiser l’attaque.",
      );
    }
  } else if (action.startsWith("confirm-attack-")) {
    const u = E.current(state!),
      b = state!.units.find(
        (u) => u.id === action.replace("confirm-attack-", ""),
      );
    if (u && b && u.owner === state!.active && E.seen(state!, state!.active, b))
      void fight(u, b);
  } else if (action.startsWith("inspect-")) {
    const u = state!.units.find((u) => u.id === action.replace("inspect-", ""));
    if (u && E.seen(state!, state!.active, u)) {
      selected = u.id;
      cardOpen = true;
      battleUI();
    }
  } else if (action === "close-modal") el.closest(".modal-back")?.remove();
  else if (action === "save") save();
  else if (action === "pause") pause();
  else if (action === "rules") {
    const modal = document.createElement("div");
    modal.className = "modal-back";
    modal.innerHTML = `<section class="modal"><span class="eyebrow">LES LOIS DE CES TERRES</span><h2>Règles du combat</h2><p>Une activation par unité et par round, par initiative décroissante. En cas d’égalité : identifiant stable.</p><p>Dégâts = Force − Défense − couvert (minimum 1). Précision = précision de l’attaquant − 2 × agilité adverse, entre 25 et 98 %. Critique : moitié de l’agilité, minimum 2 %, dégâts ×3.</p><p>Un écart d’agilité de 4 permet une seconde frappe. Une contre-attaque exige une cible vivante, la bonne portée et une ligne de vue libre.</p><p>Après la rencontre, les champs de vision sont partagés ; le cycle d’initiative en cours continue.</p>${playerKnowledge()}${button("Compris", "close-modal", "primary")}</section>`;
    app.append(modal);
  } else if (action.startsWith("sheet-")) {
    const u = state!.units.find((u) => u.id === action.slice(6))!;
    const m = document.createElement("div");
    m.className = "modal-back";
    m.innerHTML = `<section class="modal sheet">${unitCard(u)}${button("Fermer", "close-modal", "primary")}</section>`;
    app.append(m);
  }
});
window.addEventListener("keydown", (e) => {
  if ((e.target as HTMLElement)?.matches("input,select,textarea")) return;
  if (e.code === "Space" && screen === "transition") {
    e.preventDefault();
    nextScene();
  }
  if (
    e.key === "Tab" &&
    screen === "battle" &&
    !busy &&
    !document.querySelector(".modal-back")
  ) {
    e.preventDefault();
    cancel();
    state!.active = (3 - state!.active) as 1 | 2;
    battleUI();
  }
  if (e.key === "Escape") {
    if (pendingReward) return;
    if (document.querySelector(".modal-back"))
      document.querySelector(".modal-back:last-child")?.remove();
    else if (screen === "battle") {
      pause();
    }
    e.preventDefault();
  }
  if (
    screen === "battle" &&
    e.key.startsWith("Arrow") &&
    !document.querySelector(".modal-back")
  ) {
    e.preventDefault();
    const c = state!.players[state!.active - 1].camera;
    if (e.key === "ArrowLeft") c.x = c.x - 1;
    if (e.key === "ArrowRight") c.x = c.x + 1;
    if (e.key === "ArrowUp") c.y = c.y - 1;
    if (e.key === "ArrowDown") c.y = c.y + 1;
    clampCamera(state!.active);
    updateHover(null);
  }
});
window.addEventListener("beforeunload", () => save(true));
title();
