import { tacticalIdleSway } from "./sprites/display-scale";
import { creatorMarkup, paintCreatorSprites } from "./ui/creator";
import {
  statSnapshot,
  levelRows,
  animateLevelGains,
  type StatSnapshot,
} from "./ui/level-gains";
import { ChapterDirector, type ChapterMapFrame } from "./ui/chapter-dialogue";
import { animateHp, animateExperience } from "./ui/value-animation";
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
let creationFlow = E.newCreationFlow();
const dangerAll: [boolean, boolean] = [false, false];
let dangerSignature = "";
let allyFieldSignature = "";
let allyPreview: ReturnType<typeof E.alliedFields> | undefined;
let dangerFields: ReturnType<typeof E.enemyFields> = {
  moves: new Set(),
  attacks: new Set(),
  ids: [],
};
let targetingAttack = false;
let previousHealWeapon: string | undefined;
let aim: "heal" | "summon" | "area" | "buff" | null = null;
let isPanning = false;
let developerCleanup: (() => void) | null = null;
let developerRequest = 0;
let chapterDirector: ChapterDirector | undefined;
let chapterFrame: ChapterMapFrame | null = null;
let pendingReward: (() => void) | null = null;
let toastTimer: ReturnType<typeof setTimeout>;
let zoom = 1.65;
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
function saveKey() {
  return state?.developmentTest ? "lte-chapter-one-test" : "lte-save";
}
function title() {
  developerRequest++;
  initiativeCleanup?.();
  initiativeCleanup = undefined;
  developerCleanup?.();
  developerCleanup = null;
  screen = "title";
  state = null;
  app.innerHTML = `<main class="title-screen"><div class="title-art"></div><div class="mist mist-a"></div><div class="mist mist-b"></div><header class="brand">${mark}<span>LES TERRES ÉGARÉES<small>UN RÉCIT DE BRUME ET DE CENDRES</small></span><span class="edition">PROLOGUE · LES TERRES ÉGARÉES</span></header><section class="title-copy"><div class="eyebrow"><span></span> UN TACTICAL RPG NARRATIF</div><h1>LES TERRES<br><em>ÉGARÉES</em></h1><p class="tagline">Deux expéditions. Deux histoires.<br>Un même piège.</p><div class="title-actions">${button("Nouvelle aventure <span>→</span>", "new", "primary")}${button("Continuer <span>→</span>", "continue", "quiet", !localStorage.getItem("lte-save"))}${button("Options <span>≡</span>", "options", "quiet")}${prototypeTools ? `<div class="dev-entry"><small>OUTILS DU PROTOTYPE · DÉVELOPPEMENT</small>${button("Tester chapitre 1", "dev-chapter-one", "quiet")}${localStorage.getItem("lte-chapter-one-test") ? button("Reprendre le test du chapitre 1", "resume-chapter-one", "quiet") : ""}${button("Tests de combat", "dev-tests", "quiet")}${button("Classes et systèmes", "dev-systems", "quiet")}${button("Galerie des sprites", "dev-sprites", "quiet")}</div>` : ""}</div><div class="title-note"><span class="small-diamond">◇</span> UNE AVENTURE SOLO · DEUX DESTINS À GUIDER</div></section><aside class="chapter-card"><span class="eyebrow">PROLOGUE / LES TERRES ÉGARÉES</span><h2>La brume n’oublie<br>aucun naufragé.</h2><p>Au-delà des cartes connues,<br>quelque chose vous attend.</p><div class="line"></div><span class="card-meta">STRATÉGIE AU TOUR PAR TOUR <span>✦</span> DARK FANTASY</span></aside><footer class="title-footer"><span>UNE TERRE INCONNUE. UNE ALLIANCE IMPROBABLE.</span><span>FRANÇAIS <i>◆</i> SAUVEGARDE LOCALE</span></footer><div class="grain"></div></main>`;
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
  const first = modal.querySelector<HTMLSelectElement>("#team-player1")!;
  const second = modal.querySelector<HTMLSelectElement>("#team-player2")!;
  const sync = () => {
    for (const [self, other] of [
      [first, second],
      [second, first],
    ])
      for (const option of Array.from(self.options))
        option.disabled = option.value === other.value;
  };
  first.addEventListener("change", sync);
  second.addEventListener("change", sync);
  sync();
}
function configure() {
  screen = "config";
  app.innerHTML = creatorMarkup(
    heroDrafts,
    companionDrafts,
    readTeamPreferences(),
    creationFlow,
  );
  void paintCreatorSprites(app, heroDrafts, readTeamPreferences());
  app.querySelectorAll<HTMLSelectElement>("[data-starter]").forEach(
    (el) =>
      (el.onchange = () => {
        heroDrafts[Number(el.dataset.starter)].weaponId = el.value;
        void paintCreatorSprites(app, heroDrafts, readTeamPreferences());
      }),
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
        const counter = app.querySelector(`[data-companion-count="${index}"]`);
        if (counter)
          counter.textContent = `${companionDrafts[index].length} / ${E.companionCount(heroDrafts[index].faction)} choisis`;
        creationFlow.partyReady[index] = false;
        const confirm = app.querySelector<HTMLButtonElement>(
          `[data-action="creator-party-ready-${index}"]`,
        );
        if (confirm)
          confirm.disabled =
            companionDrafts[index].length !==
            E.companionCount(heroDrafts[index].faction);
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
    if (!app.querySelector(`#hero-name-${i}`)) continue;
    (app.querySelector(`#hero-name-${i}`) as HTMLInputElement).oninput = (
      e,
    ) => {
      heroDrafts[i - 1].name = (e.target as HTMLInputElement).value;
      const display = app.querySelector(`[data-hero-display="${i - 1}"]`);
      if (display) display.textContent = heroDrafts[i - 1].name;
    };
    (app.querySelector(`#hero-gender-${i}`) as HTMLSelectElement).onchange = (
      e,
    ) => {
      heroDrafts[i - 1].gender = (e.target as HTMLSelectElement)
        .value as E.Gender;
      configure();
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
let prologueToken = 0;
function showPrologueTitle(s: Campaign) {
  screen = "prologue";
  busy = true;
  const view = E.sessionView(),
    owners = view.mode === "coop" ? [view.owner] : [1, 2];
  const forest = s.chapter1?.pending?.id === "c1-title",
    titleId = s.chapter1!.pending!.id;
  app.innerHTML = `<main class="prologue-title" aria-label="${forest ? "Chapitre 1 — Pour ne pas oublier" : "Prologue — Les Terres Égarées"}"><div class="prologue-storm"></div><div class="prologue-mist mist-one"></div><div class="prologue-mist mist-two"></div><div class="prologue-perspectives">${owners.map((owner) => `<span>Expédition ${owner} · ${s.factions[owner - 1] === "north" ? "Vikings" : "Chevaliers"}</span>`).join("")}</div><section><span>${forest ? "CHAPITRE 1" : "PROLOGUE"}</span><h1>${forest ? "Pour ne pas oublier" : "Les Terres Égarées"}</h1><i></i></section></main>`;
  localStorage.setItem(saveKey(), E.encode(s));
  const token = ++prologueToken;
  setTimeout(() => {
    if (
      token !== prologueToken ||
      state !== s ||
      s.chapter1?.pending?.id !== titleId
    )
      return;
    E.advanceChapterLine(s, view.mode === "coop" ? view.owner : undefined, {
      id: titleId,
      page: 0,
    });
    localStorage.setItem(saveKey(), E.encode(s));
    if (s.chapter1?.pending?.id === titleId) {
      app
        .querySelector("section")!
        .insertAdjacentHTML(
          "beforeend",
          "<p>En attente de l’autre expédition…</p>",
        );
      return;
    }
    busy = false;
    cinematic();
  }, 3800);
}
function chapterCinematic() {
  chapterDirector?.dispose();
  chapterDirector = undefined;
  const s = state!;
  if (!s.chapter1?.pending) {
    s.scene = null;
    busy = false;
    battleUI();
    return;
  }
  if (["prologue", "c1-title"].includes(s.chapter1.pending.id)) {
    if (s.developmentTest && s.chapter1.pending.id === "c1-title")
      localStorage.setItem("lte-chapter-one-start", E.encode(s));
    showPrologueTitle(s);
    return;
  }
  const view = E.sessionView();
  if (
    view.mode === "coop" &&
    !E.sharedChapterScene(s.chapter1.pending.id) &&
    s.chapter1.pending.owner !== view.owner
  ) {
    chapterFrame = null;
    busy = true;
    screen = "chapter-wait";
    app.innerHTML =
      '<main class="chapter-screen"><canvas id="waiting-map" aria-label="Votre carte tactique"></canvas><aside class="peer-reading" role="status">Votre compagnon poursuit sa conversation…</aside></main>';
    return;
  }
  busy = true;
  screen = "chapter";
  selected = null;
  hover = null;
  aim = null;
  app.innerHTML =
    '<main class="chapter-screen"><canvas id="story-map" aria-label="Mise en scène sur la carte tactique"></canvas><div id="chapter-overlay"></div></main>';
  const checkpoint = () => {
    try {
      localStorage.setItem(saveKey(), E.encode(s));
    } catch {
      /* retain last stable checkpoint */
    }
  };
  chapterDirector = new ChapterDirector(
    app.querySelector("#chapter-overlay")!,
    s,
    () => {
      const oldPage = s.chapter1!.pending!.page;
      const view = E.sessionView();
      const finished = E.advanceChapterLine(
        s,
        view.mode === "coop" ? view.owner : undefined,
        { id: s.chapter1!.pending!.id, page: oldPage },
      );
      if (!finished && s.chapter1?.pending?.page === oldPage) {
        checkpoint();
        return;
      }
      if (!finished) {
        chapterDirector!.refresh();
        checkpoint();
        return;
      }
      chapterDirector?.dispose();
      chapterDirector = undefined;
      chapterFrame = null;
      busy = false;
      if (finished === "meeting") E.merge(s);
      if (finished === "c1-recruit") {
        delete s.forestChapter!.talkActorId;
        origin = null;
        finishTurn();
        return;
      }
      // A group may discover the ruins only after both parties have already arrived.
      if (finished.startsWith("ruins-") || finished.startsWith("waiting-"))
        E.encounter(s);
      if (s.scene) {
        cinematic();
        return;
      }
      moved = s.committedMove === E.current(s)?.id;
      selected = E.current(s)?.owner === s.active ? E.current(s)!.id : null;
      if (s.encounterContinuation) {
        const pending = s.encounterContinuation;
        delete s.encounterContinuation;
        const actor = E.current(s),
          target = s.units.find((u) => u.id === pending.targetId);
        if (
          actor?.id === pending.actorId &&
          target &&
          E.canAttack(actor, target)
        )
          void fight(actor, target);
        else finishTurn();
      } else battleUI();
      save(true);
    },
    (time, frame) => {
      chapterFrame = frame;
      const canvas = app.querySelector<HTMLCanvasElement>("#story-map");
      if (canvas) renderMap(canvas, frame.owner, time);
      const peer = app.querySelector<HTMLCanvasElement>("#story-map-peer");
      if (peer) renderMap(peer, 2, time);
    },
    E.sessionView().mode === "coop"
      ? (E.sessionView() as { owner: 1 | 2 }).owner
      : undefined,
    (owner, choice) => {
      if (!E.controlsOwner(owner)) return;
      const resolved = E.votePatrol(s, owner, choice);
      checkpoint();
      if (resolved) cinematic();
      else chapterDirector!.refresh();
    },
    (owner, choice, revision) => {
      const view = E.sessionView();
      if (owner === undefined ? view.mode !== "local" : !E.controlsOwner(owner))
        return;
      const done = E.confirmPatrol(s, owner, { choice, revision });
      checkpoint();
      if (done) cinematic();
      else chapterDirector!.refresh();
    },
  );
  checkpoint();
}
function cinematic() {
  if (state?.scene?.startsWith("chapter1:")) {
    initiativeCleanup?.();
    initiativeCleanup = undefined;
    chapterCinematic();
    return;
  }
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
  return `<div class="unit-identity"><span class="eyebrow">${u.owner === 0 ? "ENNEMI" : `EXPÉDITION ${u.owner}`}${u.leader ? " · CHEF" : ""}</span><h2>${esc(u.name)}</h2><span>${E.className(u)} · Nv. ${u.level}</span></div><div class="hp-heading"><span>POINTS DE VIE</span><b>${u.hp}<small> / ${u.maxHp}</small></b></div><div class="bar hp"><i style="width:${(u.hp / u.maxHp) * 100}%"></i></div><div class="stats">${[
    [E.powerLabel(u) === "Puissance" ? "PUIS" : "FOR", u.strength],
    ["DÉF", u.defense],
    ["AGI", u.agility],
    ["INIT", E.effectiveInitiative(u)],
    ["PRÉC", u.accuracy],
    ["MVT", E.effectiveMove(u)],
  ]
    .map(
      ([n, v]) =>
        `<div tabindex="0" role="button" aria-label="${n} : ${v}" data-tooltip="${({ FOR: "Force : augmente les dégâts physiques.", PUIS: "Puissance : augmente les dégâts magiques et les soins.", DÉF: "Défense : réduit les dégâts reçus, en plus du couvert.", AGI: "Agilité : réduit la précision adverse ; 4 points d’écart donnent une seconde frappe.", INIT: "Initiative : détermine l’ordre de passage. Le chef reçoit +1 tant qu’il commande.", PRÉC: "Précision : augmente les chances de toucher.", MVT: "Mouvement : budget de déplacement, selon le coût du terrain." } as Record<string, string>)[String(n)]}"><span>${n}</span><b>${v}</b></div>`,
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
    )}</small></div>${u.owner !== 0 && u.statRole !== "ordinary" ? `<div class="xp-label"><span>EXPÉRIENCE</span><b>${u.xp} / 100</b></div><div class="bar xp"><i style="width:${u.xp}%"></i></div>` : ""}`;
}
function equipmentModal(u: Unit) {
  const modal = document.createElement("div");
  modal.className = "modal-back equipment-modal";
  modal.innerHTML = `<section class="modal"><h2>Équipement</h2><p>${esc(u.name)} · Arme active : ${E.weaponName(u)}</p><div class="equipment-list">${(
    u.carriedWeapons ?? []
  )
    .filter(
      (id) =>
        !(
          E.unitClass(u).weapons.includes("magic") &&
          E.hasSkill(u, "heal") &&
          E.weaponCatalog[id].category === "healing"
        ),
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
  if (
    E.chapterEnabled(s) &&
    s.merged &&
    u.leader &&
    E.distance(u, E.village.entry) <= 1
  ) {
    const prepared = E.preparedExpeditions(s).includes(u.owner as 1 | 2);
    html += button(
      prepared ? "Entrée préparée" : "Se préparer à rentrer",
      "prepare-entry",
      "",
      !E.canPrepareEntry(s, u),
    );
    if (!prepared && !E.canPrepareEntry(s, u))
      html +=
        '<small class="entry-warning">Écartez les ennemis des abords avant d’entrer.</small>';
  }
  if (E.canTalkGeraud(s, u)) html += button("Parler à Géraud", "talk-geraud");
  html += button("Équipement", "equipment");
  if (u.classId === "tracker")
    for (const id of u.carriedWeapons ?? []) {
      const w = E.weaponCatalog[id];
      if (w && id !== u.activeWeaponId)
        html += button(
          w.category === "axe" ? "Hache · corps à corps" : "Arc · distance",
          `quick-weapon-${id}`,
        );
    }
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
const battleArtImages = new Map<number, HTMLImageElement>();
function battleArtIndex(u: Unit) {
  return E.isForestMap(state!.mapId)
    ? 2
    : u.x <= 6
      ? 1
      : E.cell(u.x, u.y)?.terrain === "forest"
        ? 2
        : u.x >= 14 && u.x <= 20
          ? 0
          : 3;
}
async function preloadBattleArt(index: number) {
  let image = battleArtImages.get(index);
  if (!image) {
    image = new Image();
    image.src = assetBase + `assets/battle-${index}.png`;
    battleArtImages.set(index, image);
  }
  try {
    await image.decode();
  } catch {
    /* Keep the scenery fallback if loading fails. */
  }
}
const combatWarmKeys = new Set<string>();
let combatWarmPending = false;
function warmUpcomingCombat() {
  if (!state || screen !== "battle" || busy || combatWarmPending) return;
  const s = state,
    actor = E.current(s);
  if (!actor) return;
  const candidates = [
    actor,
    ...E.alive(s)
      .filter(
        (u) =>
          (u.owner === 0) !== (actor.owner === 0) && E.seen(s, s.active, u),
      )
      .sort((a, b) => E.distance(actor, a) - E.distance(actor, b))
      .slice(0, 2),
  ];
  const unit = candidates.find(
    (u) =>
      !combatWarmKeys.has(
        JSON.stringify([
          u.classId,
          u.gender,
          u.activeWeaponId,
          u.bearForm,
          u.fortified,
          u.combatSkinId,
          E.colorForOwner(s.teamColors, u.owner),
        ]),
      ),
  );
  if (!unit) return;
  const key = JSON.stringify([
    unit.classId,
    unit.gender,
    unit.activeWeaponId,
    unit.bearForm,
    unit.fortified,
    unit.combatSkinId,
    E.colorForOwner(s.teamColors, unit.owner),
  ]);
  combatWarmPending = true;
  const work = async () => {
    try {
      if (state !== s || screen !== "battle" || busy) return;
      await Promise.all([
        new CombatSceneV2([unit], [], s.teamColors).prepare(true),
        preloadBattleArt(battleArtIndex(unit)),
      ]);
      combatWarmKeys.add(key);
    } finally {
      combatWarmPending = false;
    }
    warmUpcomingCombat();
  };
  if ("requestIdleCallback" in window)
    window.requestIdleCallback(() => void work(), { timeout: 2000 });
  else setTimeout(() => void work(), 50);
}
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
  <div class="mission-objective">${s.forestChapter ? "Éliminer tous les ennemis" : s.merged ? (E.chapterEnabled(s) ? (E.preparedExpeditions(s).length ? "Tenez l’entrée sécurisée" : "Sécurisez l’entrée · Chefs : préparez-vous à rentrer") : "Repoussez les morts-vivants") : E.chapterEnabled(s) ? (E.chapterBeacon(s, s.active) ? "Rejoignez le sanctuaire en ruines" : "Trouvez un abri") : "Rejoignez le village des Veilleurs"}</div>
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
  if (!busy && showLeaderChoice()) return;
  if (u?.owner === 0 && !busy) void enemyTurn();
  else warmUpcomingCombat();
}
function showLeaderChoice() {
  const s = state!,
    owner = E.leadershipVacancies(s)[0];
  if (!owner) return false;
  const modal = document.createElement("div");
  modal.className = "modal-back leader-choice";
  const own = E.controlsOwner(owner);
  modal.innerHTML = `<section class="modal wood-sheet" role="dialog" aria-modal="true" aria-label="Choisir le nouveau chef"><h2>Un nouveau chef</h2><p>${own ? `Expédition ${owner} · Qui prend le commandement ?` : "L’autre expédition choisit son nouveau chef…"}</p>${
    own
      ? s.units
          .filter((u) => u.owner === owner && u.hp > 0 && !u.summonedBy)
          .map((u) =>
            button(
              `${esc(u.name)} · ${E.className(u)}`,
              `choose-leader-${u.id}`,
            ),
          )
          .join("")
      : ""
  }<small>Bonus de commandement : +1 Initiative. Le tour en cours est conservé.</small></section>`;
  app.append(modal);
  return true;
}
/** Entry point for a future authenticated Cloudflare transport; no network session is created here. */
export function applyCooperativeSnapshot(snapshot: Campaign, owner: 1 | 2) {
  chapterDirector?.dispose();
  chapterDirector = undefined;
  chapterFrame = null;
  E.setSessionView({ mode: "coop", owner });
  state = E.decode(E.encode(snapshot));
  state.active = owner;
  selected = null;
  origin = null;
  moved = state.committedMove === E.current(state)?.id;
  busy = false;
  observer = false;
  battleUI();
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
    canvas.addEventListener(
      "wheel",
      (e) => {
        if (!state || screen !== "battle" || state.chapter1?.pending) return;
        e.preventDefault();
        const r = canvas.getBoundingClientRect();
        const fx = (e.clientX - r.left) / r.width,
          fy = (e.clientY - r.top) / r.height;
        const oldCols = viewCols,
          oldRows = viewRows;
        zoom = Math.max(
          0.8,
          Math.min(
            3,
            zoom * Math.exp(-Math.max(-120, Math.min(120, e.deltaY)) * 0.0015),
          ),
        );
        const cols = Math.min(E.W, 30 / zoom, (E.H * r.width) / r.height);
        const rows = (cols * r.height) / r.width;
        for (const player of state.players) {
          player.camera.x += (oldCols - cols) * fx;
          player.camera.y += (oldRows - rows) * fy;
        }
        viewCols = cols;
        viewRows = rows;
        clampCamera(1);
        clampCamera(2);
      },
      { passive: false },
    );
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
  const sway = tacticalIdleSway(
    u.classId,
    u.gender,
    animation,
    frame,
    resolveClip(profile, "idle")?.frames.length,
  );
  if (sway) ctx.transform(1, 0, sway, 1, -sway * (size * 0.384), 0);
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
  durationMs?: number;
  restored?: number;
  target?: { x: number; y: number; hp: number; maxHp: number; before: number };
} | null = null;
/** Presentation of an already validated action; never advances initiative itself. */
async function playTacticalAction(
  sprite: Unit,
  animation: string,
  target?: Unit,
  restored?: number,
  hpBefore?: number,
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
    const durationMs =
      Math.max(
        (clip.frames.length / Math.max(1, clip.fps)) * 1000,
        ["heal", "bandage"].includes(animation)
          ? 1100
          : ["banner", "fortify", "transform"].includes(animation)
            ? 1100
            : 0,
      ) / speed;
    tacticalAction = {
      sprite,
      profile,
      visualAnimation,
      animation,
      durationMs,
      start: performance.now(),
      fps: clip.fps * speed,
      target: target && {
        x: target.x,
        y: target.y,
        hp: target.hp,
        maxHp: target.maxHp,
        before: hpBefore ?? target.hp - (restored ?? 0),
      },
      restored,
    };
    await new Promise((resolve) => setTimeout(resolve, durationMs));
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
  E.activateMap(state.mapId ?? "prologue");
  const bounds = canvas.getBoundingClientRect();
  if (!bounds.width || !bounds.height) return;
  const cols = Math.min(
      E.W,
      30 /
        ((canvas.id.startsWith("story-map") ? 1.65 : zoom) *
          (canvas.id.startsWith("story-map") ? (chapterFrame?.zoom ?? 1) : 1)),
      (E.H * bounds.width) / bounds.height,
    ),
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
  if (canvas.id.startsWith("story-map") || canvas.id === "waiting-map") {
    viewCols = cols;
    viewRows = rows;
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
    story = canvas.id.startsWith("story-map") ? chapterFrame : null,
    visible = new Set([...s.players[p - 1].visible, ...(story?.reveal ?? [])]),
    explored = new Set(s.players[p - 1].explored),
    cam = story
      ? {
          x: Math.max(
            0,
            Math.min(E.W - viewCols, story.center.x - viewCols / 2),
          ),
          y: Math.max(
            0,
            Math.min(E.H - viewRows, story.center.y - viewRows / 2),
          ),
        }
      : s.players[p - 1].camera;
  canvas.dataset.storyPositions = JSON.stringify(
    story?.actors.map((a) => ({
      id: a.unit.id,
      x: a.x,
      y: a.y,
      animation: a.animation,
    })) ?? [],
  );
  canvas.dataset.storyReveal = String(story?.reveal.length ?? 0);
  canvas.dataset.storyActors = (story?.actors ?? [])
    .map((a) => a.unit.id)
    .join(",");
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
  const hoveredAlly =
    !aim && hover !== null && canvas.id === "map" && screen === "battle"
      ? E.at(s, E.map[hover].x, E.map[hover].y)
      : undefined;
  const previewingAlly =
    !!hoveredAlly?.owner && (!fogEnabled || E.seen(s, p, hoveredAlly));
  if (canvas.id === "map" && screen === "battle") {
    const hovered =
      hover === null ? undefined : E.at(s, E.map[hover].x, E.map[hover].y);
    const ids = dangerAll[p - 1]
      ? undefined
      : hovered?.owner === 0
        ? [hovered.id]
        : [];
    const signature = JSON.stringify([
      p,
      ids,
      !fogEnabled,
      s.players[p - 1].visible,
      s.players[p - 1].explored,
      s.units.map((u) => [
        u.id,
        u.x,
        u.y,
        u.hp,
        E.effectiveMove(u),
        u.enemyAI?.awakened,
        u.range,
        u.minRange,
        u.classId,
        u.activeWeaponId,
      ]),
    ]);
    if (signature !== dangerSignature) {
      dangerSignature = signature;
      dangerFields = E.enemyFields(s, p, ids, !fogEnabled);
    }
    canvas.dataset.enemyMoveCount = String(dangerFields.moves.size);
    canvas.dataset.enemyAttackCount = String(dangerFields.attacks.size);
    canvas.dataset.enemyRanges = String(dangerFields.ids.length);
    canvas.dataset.enemyRangeMode = dangerAll[p - 1] ? "all" : "hover";
    for (const k of dangerFields.attacks) {
      const c = E.map[k];
      ctx.fillStyle = "#c83d4045";
      ctx.fillRect(c.x * 32 + 1, c.y * 32 + 1, 30, 30);
      ctx.strokeStyle = "#e1706688";
      ctx.lineWidth = 0.5;
      ctx.strokeRect(c.x * 32 + 2, c.y * 32 + 2, 28, 28);
    }
    for (const k of dangerFields.moves) {
      const c = E.map[k];
      ctx.fillStyle = "#d9a34a3c";
      ctx.fillRect(c.x * 32 + 2, c.y * 32 + 2, 28, 28);
      ctx.strokeStyle = "#e8bd7280";
      ctx.lineWidth = 0.6;
      ctx.strokeRect(c.x * 32 + 2, c.y * 32 + 2, 28, 28);
    }
  }
  if (previewingAlly && hoveredAlly) {
    const signature =
      dangerSignature +
      hoveredAlly.id +
      s.committedMove +
      JSON.stringify(hoveredAlly.carriedWeapons);
    if (signature !== allyFieldSignature) {
      allyFieldSignature = signature;
      allyPreview = E.alliedFields(s, p, hoveredAlly, !fogEnabled);
    }
    canvas.dataset.allyMoveCount = String(allyPreview!.moves.size);
    canvas.dataset.allyAttackCount = String(allyPreview!.attacks.size);
    canvas.dataset.allyHealCount = String(allyPreview!.heals.size);
    for (const [cells, color] of [
      [allyPreview!.attacks, "#e6535848"],
      [allyPreview!.heals, "#58b97c66"],
      [allyPreview!.moves, "#4bade34a"],
    ] as const)
      for (const k of cells) {
        const c = E.map[k];
        if (cells !== allyPreview!.moves && allyPreview!.moves.has(k)) continue;
        if (cells === allyPreview!.heals && allyPreview!.attacks.has(k)) {
          ctx.strokeStyle = "#6add91cc";
          ctx.lineWidth = 1.5;
          ctx.strokeRect(c.x * 32 + 2, c.y * 32 + 2, 28, 28);
        } else {
          ctx.fillStyle = color;
          ctx.fillRect(c.x * 32 + 1, c.y * 32 + 1, 30, 30);
        }
      }
  } else {
    canvas.dataset.allyMoveCount =
      canvas.dataset.allyAttackCount =
      canvas.dataset.allyHealCount =
        "0";
  }
  const sel = s.units.find((u) => u.id === selected),
    cur = E.current(s);
  if (
    sel &&
    sel.owner === p &&
    sel.id === cur?.id &&
    !busy &&
    !previewingAlly
  ) {
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
    !previewingAlly &&
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
    if (
      (!fogEnabled || visible.has(E.key(b.x, b.y))) &&
      !(
        tacticalAction?.animation === "banner" &&
        tacticalAction.sprite.x === b.x &&
        tacticalAction.sprite.y === b.y &&
        time - tacticalAction.start < (tacticalAction.durationMs ?? 1100) * 0.8
      )
    ) {
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
    if (story?.hideUnits) continue;
    if (fogEnabled && !E.seen(s, p, u)) continue;
    let x = u.x * 32,
      y = u.y * 32,
      frame = Math.floor(time / 600) % 2 === 0 ? 0 : 1;
    if (u.classId === "shaman" && u.gender === "female") {
      canvas.dataset.idleFrame = String(frame);
      canvas.dataset.idleTime = String(time);
    }
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
    const finalCapability =
      !!action &&
      ["banner", "fortify", "transform"].includes(action.animation) &&
      time - action.start > (action.durationMs ?? 1100) * 0.8;
    const mounted =
      E.unitClass(u).mounted || unitSpriteProfile(u)?.classId === "sans_rider";
    const spriteSize = mounted ? 52 : 38;
    drawSprite(
      ctx,
      finalCapability ? u : (action?.sprite ?? u),
      x + 16 - spriteSize / 2,
      y + 12 - spriteSize / 2 - 0.384 * (spriteSize - 38),
      spriteSize,
      frame,
      false,
      false,
      finalCapability
        ? "idle"
        : (action?.visualAnimation ??
            action?.animation ??
            (moveAnim?.id === u.id ? "move" : "idle")),
      finalCapability
        ? combatSkin(unitSpriteProfile(u))?.profile
        : action?.profile,
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
  if (fogEnabled && !E.isForestMap(s.mapId))
    mist.draw(ctx, visible, p, time, {
      x: cam.x * 32,
      y: cam.y * 32,
      width: viewCols * 32 + 1,
      height: viewRows * 32 + 1,
    });
  if (story?.glow || E.chapterBeacon(s, p)) {
    const x = E.ruinsCenter.x * 32,
      y = E.ruinsCenter.y * 32,
      r = 34 + Math.sin(time / 600) * 4;
    const glow = ctx.createRadialGradient(x, y, 0, x, y, r);
    glow.addColorStop(0, "#fff2b9ed");
    glow.addColorStop(0.22, "#f7d686c0");
    glow.addColorStop(0.6, "#e6ba5a55");
    glow.addColorStop(1, "#e1bb6a00");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const actor of story?.actors ?? []) {
    ctx.save();
    ctx.globalAlpha = actor.alpha ?? 1;
    drawSprite(
      ctx,
      actor.unit,
      actor.x * 32 - 3,
      actor.y * 32 - 7,
      E.unitClass(actor.unit).mounted ? 52 : 38,
      actor.frame,
      actor.flip,
      false,
      actor.animation,
    );
    ctx.restore();
  }
  if (story?.flash) {
    const f = story.flash;
    ctx.save();
    ctx.globalAlpha = f.strength;
    ctx.fillStyle = "#fff4cf";
    ctx.beginPath();
    ctx.arc(f.x * 32 + 16, f.y * 32, 24 * f.strength, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
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
  if (
    !s.forestChapter &&
    (!fogEnabled || visible.has(E.key(E.village.entry.x, E.village.entry.y)))
  ) {
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
      const p = Math.max(
          0,
          Math.min(1, ((time - tacticalAction.start) * speed) / 900),
        ),
        v = target.before + (target.hp - target.before) * (p * p * (3 - 2 * p));
      ctx.fillStyle = "#203324";
      ctx.fillRect(target.x * 32 - 5, target.y * 32 - 6, 42, 4);
      ctx.fillStyle = "#a8dda0";
      ctx.fillRect(
        target.x * 32 - 5,
        target.y * 32 - 6,
        (42 * v) / target.maxHp,
        4,
      );
      ctx.font = "6px Manrope";
      ctx.textAlign = "center";
      ctx.fillText(
        `${Math.round(v)}/${target.maxHp}`,
        target.x * 32 + 16,
        target.y * 32 - 8,
      );
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
  if (screen === "chapter") chapterDirector?.tick(time);
  if (screen === "chapter-wait") {
    const view = E.sessionView(),
      canvas = document.querySelector<HTMLCanvasElement>("#waiting-map");
    if (view.mode === "coop" && canvas) renderMap(canvas, view.owner, time);
  }
  if (combatAnim) renderCombat(time);
}
requestAnimationFrame(animation);
async function animateMove(u: Unit, x: number, y: number) {
  const s = state!,
    plan = E.path(s, u, x, y, false, true);
  if (!plan || plan.cost > E.effectiveMove(u)) return false;
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
  if (
    !state ||
    busy ||
    state.scene ||
    !E.controlsOwner(state.active) ||
    E.leadershipVacancies(state).length
  )
    return;
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
        const oldTargetHp = target.hp;
        const restored = E.healTarget(s, u, target);
        aim = null;
        await playTacticalAction(sprite, "heal", target, restored, oldTargetHp);
        const amount =
          sprite.level < E.unitClass(u).maxLevel ? E.tuning.healingXp : 0;
        const healResult: Battle = {
          strikes: [],
          xp: [
            {
              id: u.id,
              amount,
              before: sprite.xp,
              level: u.level > sprite.level,
            },
          ],
          levelGains:
            u.level > sprite.level ? { [u.id]: u.lastLevelGains ?? {} } : {},
        };
        await rewards(
          healResult,
          new Map([
            [
              u.id,
              {
                hp: sprite.hp,
                xp: sprite.xp,
                level: sprite.level,
                stats: statSnapshot(sprite),
              },
            ],
          ]),
          { restored, target: target.name },
        );
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
    if (
      !moved &&
      s.committedMove !== u.id &&
      p &&
      p.cost <= E.effectiveMove(u)
    ) {
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
  if (!E.controlsOwner(a.owner) || a.owner !== state?.active) return;
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
    `<span class="fe-weapon">${esc(E.weaponName(u))}${advantage ? `<i class="weapon-triangle ${advantage > 0 ? "advantage" : "disadvantage"}" aria-label="${advantage > 0 ? "Avantage" : "Désavantage"} d’arme">${advantage > 0 ? "↑" : "↓"}</i>` : ""}</span>`;
  modal.innerHTML = `<section class="modal forecast compact-forecast fe-forecast" aria-label="Prévision de combat" style="--forecast-left:${color(a)};--forecast-right:${color(b)}"><div class="fe-names"><header><strong>${esc(a.name)}</strong>${weapon(a, p.advantage)}</header><header><strong>${esc(b.name)}</strong>${weapon(b, q.advantage)}</header></div><div class="fe-stat-grid">${value(`${a.hp}/${a.maxHp}`)}<span>PV</span>${value(`${b.hp}/${b.maxHp}`)}${value(p.damage, p.strikes)}<span title="Dégâts">Dég.</span>${value(p.counter ? q.damage : "—", p.counter ? q.strikes : 1)}${value(`${p.hit}%`)}<span title="Précision">Préc.</span>${value(p.counter ? `${q.hit}%` : "—")}${value(`${p.crit}%`)}<span title="Critique">Crit.</span>${value(p.counter ? `${q.crit}%` : "—")}</div><div class="modal-actions">${button("Annuler", "close-modal")}${button("Attaquer", "confirm-attack-" + b.id, "primary")}</div></section>`;
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
      crit: ready ? p.crit : null,
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
  const beforeUnits = new Map(
    state!.units.map((u) => [
      u.id,
      { hp: u.hp, xp: u.xp, level: u.level, stats: statSnapshot(u) },
    ]),
  );
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
    // Even an unseen attacker can award XP to the allied unit that defended.
    if (result.xp.length)
      await rewards(
        result,
        beforeUnits,
        undefined,
        a.owner === 0 ? b.owner : a.owner,
      );
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
  const backdropIndex = battleArtIndex(a);
  await Promise.all([scene.prepare(), preloadBattleArt(backdropIndex)]);
  scene.groundedStage = true;
  screen = "combat";
  document.querySelector(".toast")?.remove();
  app.innerHTML = `<main class="combat-screen"><div class="combat-scene-bg" style="background-image:linear-gradient(#0a191c22,#0c1c1c77),url('${assetBase}assets/battle-${backdropIndex}.png')"></div><header><span class="eyebrow">LES RIVAGES DE L’OUBLI</span><span>CONFRONTATION</span></header><section class="duel-stage game-duel" style="--battle-art:url('${assetBase}assets/battle-${backdropIndex}.png')"><div class="combat-hud">${gameCombatHud(a, b, result)}</div><canvas id="combat" width="960" height="600"></canvas><div id="combat-result" aria-live="polite"></div></section><footer><span>CHAQUE FRAPPE PEUT CHANGER VOTRE DESTIN</span><span>VITESSE ×${speed}</span></footer></main>`;
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
  // The entire cinematic (including the final HP tween) has ended.
  selected = null;
  aim = null;
  targetingAttack = false;
  cardOpen = false;
  battleUI();
  await rewards(
    result,
    beforeUnits,
    undefined,
    a.owner === 0 ? b.owner : a.owner,
  );
  busy = false;
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
async function rewards(
  result: Battle,
  before = new Map<
    string,
    { hp: number; xp: number; level: number; stats?: StatSnapshot }
  >(),
  healing?: { restored: number; target: string },
  actingOwner = state!.active as number,
): Promise<void> {
  result = {
    ...result,
    xp: result.xp.filter((e) => {
      const u = state!.units.find((u) => u.id === e.id);
      return !!u && E.rewardVisible(state!, u, actingOwner);
    }),
  };
  if (!E.controlsOwner(actingOwner) || actingOwner !== state!.active) return;
  if (!result.xp.length && !healing) return;
  const levels = result.xp.filter((e) => {
    const u = state!.units.find((u) => u.id === e.id)!;
    return (before.get(u.id)?.level ?? u.level - (e.level ? 1 : 0)) < u.level;
  });
  const show = (
    html: string,
    label: string,
    animate = false,
    levelAnimation = false,
  ) =>
    new Promise<void>((done) => {
      pendingReward = done;
      const modal = document.createElement("div");
      modal.className =
        "modal-back rewards" +
        (levels.length
          ? levelAnimation
            ? " level-reward-side"
            : " xp-reward-pending"
          : "");
      modal.innerHTML = `<section class="modal compact-rewards v5-wood ${healing ? "healing-reward" : ""}" aria-label="${label}">${html}${animate && levels.length ? "" : button("Continuer", "close-reward", "primary", animate || levelAnimation)}</section>`;
      app.append(modal);
      if (levelAnimation)
        void animateLevelGains(modal).then(() => {
          const b = modal.querySelector<HTMLButtonElement>("button");
          if (b) b.disabled = false;
        });
      if (animate)
        Promise.all(
          result.xp.map((e) => {
            const u = state!.units.find((u) => u.id === e.id)!;
            return animateExperience(
              modal.querySelector<HTMLElement>(`[data-reward-id="${u.id}"]`)!,
              {
                before: e.before,
                after: u.xp,
                levelBefore:
                  before.get(u.id)?.level ?? u.level - (e.level ? 1 : 0),
                levelAfter: u.level,
              },
            );
          }),
        ).then(() => {
          if (levels.length) {
            modal.classList.replace("xp-reward-pending", "xp-reward-side");
            pendingReward = null;
            done();
            return;
          }
          const b = modal.querySelector<HTMLButtonElement>("button");
          if (b) b.disabled = false;
        });
    });
  await show(
    `<h2>${healing ? "Soins" : "Expérience gagnée"}</h2>${healing ? `<p class="restored-hp">${esc(healing.target)} · +${healing.restored} PV</p>` : ""}${result.xp
      .map((e) => {
        const u = state!.units.find((u) => u.id === e.id)!,
          level = before.get(u.id)?.level ?? u.level - (e.level ? 1 : 0);
        return `<div class="reward-unit" data-reward-id="${u.id}"><strong>${esc(u.name)} <span>+${e.amount} EXP</span></strong><div class="bar xp"><i style="width:${e.before}%"></i></div><small><span data-xp-value>${e.before} / 100 EXP</span> · <span data-xp-level>Niveau ${level}</span></small></div>`;
      })
      .join("")}`,
    healing ? "Résultats du soin" : "Résultats de l’affrontement",
    true,
  );
  if (levels.length)
    await show(
      `<h2>Niveau supérieur</h2>${levels
        .map((e) => {
          const u = state!.units.find((u) => u.id === e.id)!;
          return `<div class="level-gains"><strong>${esc(u.name)} · Niveau ${u.level}</strong><p>${gainText(result.levelGains?.[u.id]).replace("Force / Puissance", E.powerLabel(u)) || "Aucun gain de caractéristique."}</p>${levelRows(u, before.get(u.id)?.stats, result.levelGains?.[u.id])}</div>`;
        })
        .join("")}`,
      "Gains de niveau",
      false,
      true,
    );
}

function renderCombat(time: number) {
  const anim = combatAnim!,
    canvas = document.querySelector<HTMLCanvasElement>("#combat");
  if (!canvas) return;
  const bounds = canvas.getBoundingClientRect();
  const targetWidth = Math.max(
    960,
    Math.round((600 * bounds.width) / Math.max(1, bounds.height)),
  );
  if (canvas.width !== targetWidth) canvas.width = targetWidth;
  anim.scene.presentationWidth = targetWidth;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  anim.scene.draw(
    ctx,
    Math.max(0, (time - anim.start) * speed),
    (index) => {
      const strike = anim.battle.strikes[index];
      const oldHp = state!.units.find((u) => u.id === strike.defender)!.hp;
      E.applyStrike(state!, strike);
      audio();
      const attacker = state!.units.find((u) => u.id === strike.attacker)!,
        defender = state!.units.find((u) => u.id === strike.defender)!;
      const side =
        anim.scene.actors.find((a) => a.unit.id === attacker.id)?.side ?? 0;
      const left = side === 0 ? attacker : defender,
        right = side === 0 ? defender : attacker;
      const hud = document.querySelector(".combat-hud");
      if (hud) {
        if (
          !hud.querySelector(`#value-${CSS.escape(defender.id)}`) ||
          !hud.querySelector(`#value-${CSS.escape(attacker.id)}`)
        )
          hud.innerHTML = gameCombatHud(left, right, anim.battle);
        animateHp(hud, defender.id, oldHp, defender.hp, defender.maxHp, 650);
      }
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
      setTimeout(anim.done, 700);
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
  if (u.x !== plan.x || u.y !== plan.y) await animateMove(u, plan.x, plan.y);
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
    localStorage.setItem(saveKey(), E.encode(state));
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
  app.innerHTML = `<main class="summary-screen"><header class="brand">${mark}<span>LES TERRES ÉGARÉES<small>PROTOTYPE · BILAN TACTIQUE</small></span></header><section><h1>${s.forestChapter?.stage === "complete" ? "Chapitre 1 — Pour ne pas oublier" : s.chapter1?.complete ? "Prologue — Les Terres Égarées" : "Fin du test tactique"}</h1><p>${s.forestChapter?.stage === "complete" ? "Les recherches de la sorcière sont à l’abri. Les survivants ont récupéré leurs PV et se préparent à rencontrer les Écorcheurs. À suivre au chapitre 2." : s.chapter1?.complete ? "Les expéditions suivent la sorcière vers un autre lieu. Leur alliance reste fragile ; leur objectif est commun : comprendre les tempêtes rouges et trouver le chemin du retour. La route vers sa cachette forestière est ouverte." : "Les unités et leur progression sont conservées. Enregistrez ce bilan ou retournez au menu."}</p><div class="summary-units">${s.units
    .filter((u) => u.owner !== 0 && !u.summonedBy)
    .map(
      (u) =>
        `<article>${portrait(u)}<h2>${esc(u.name)}</h2><p>${E.className(u)} · Nv. ${u.level}</span><small>${esc(unitVisualNote(u))}</small><span> · ${u.hp} / ${u.maxHp} PV</p>${promotionMarkup(u)}</article>`,
    )
    .join(
      "",
    )}</div>${s.chapter1?.complete && !s.forestChapter ? button("Poursuivre · Chapitre 1", "continue-chapter-one", "primary") : ""}${s.developmentTest ? button("Recommencer la rencontre (test)", "restart-chapter-one") : ""}${button("Sauvegarder", "save", "primary")}${button("Menu principal", "title")}</section></main>`;
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
  modal.innerHTML = `<section class="modal"><span class="eyebrow">UNE HALTE DANS LA BRUME</span><h2>Votre aventure</h2><div class="pause-actions">${button("Reprendre", "close-modal", "primary")}<div class="pause-map-controls"><span>Carte · Expédition ${state!.active}</span>${E.canSwitchExpedition() ? [1, 2].map((p) => button(`Expédition ${p}`, `perspective-${p}`, state!.active === p ? "active" : "", busy)).join("") + button(observer ? "Vue simple" : "Deux expéditions côte à côte", "observer", "", busy) : ""}${button(fogEnabled ? "Retirer la brume (test)" : "Rétablir la brume", "toggle-fog", "", busy)}${state!.developmentTest && state!.forestChapter ? button("Recommencer la rencontre (test)", "restart-chapter-one") : ""}${button("Recentrer la carte", "recenter")}${E.canFinishBattleForTest(state!) ? button("Terminer le combat (test)", "finish-battle-test", "", busy) : ""}</div>${button("Sauvegarder", "save", "", busy || !!origin)}${button("Options", "options")}${button("Couleurs des équipes", "team-colors")}${button("Menu principal", "title")}</div><section class="pause-commands"><h3>Commandes</h3><dl><dt>Échap</dt><dd>Ouvrir / fermer ce menu</dd><dt>D</dt><dd>Afficher / masquer les déplacements et attaques des ennemis visibles</dd><dt>Souris</dt><dd>Survoler un ennemi pour voir ses portées</dd><dt>Glisser</dt><dd>Déplacer la carte</dd><dt>Flèches</dt><dd>Déplacer la caméra</dd>${E.canSwitchExpedition() ? "<dt>Tab</dt><dd>Changer d’expédition</dd>" : ""}</dl></section></section>`;
  app.append(modal);
}
app.addEventListener("click", async (e) => {
  const el = (e.target as HTMLElement).closest<HTMLElement>("[data-action]");
  if (!el || el.hasAttribute("disabled")) return;
  const action = el.dataset.action!;
  if (
    action === "dev-chapter-one" ||
    action === "restart-chapter-one" ||
    action === "resume-chapter-one"
  ) {
    if (!prototypeTools) return;
    chapterDirector?.dispose();
    chapterDirector = undefined;
    chapterFrame = null;
    initiativeCleanup?.();
    if (action === "resume-chapter-one")
      state = E.decode(localStorage.getItem("lte-chapter-one-test") || "");
    else if (
      action === "restart-chapter-one" &&
      localStorage.getItem("lte-chapter-one-start")
    )
      state = E.decode(localStorage.getItem("lte-chapter-one-start")!);
    else state = E.prepareChapterOneTest(E.createCampaign(["north", "knight"]));
    E.activateMap(state.mapId ?? "prologue");
    busy = false;
    origin = null;
    moved = false;
    selected = null;
    aim = null;
    cardOpen = false;
    if (state.scene) cinematic();
    else battleUI();
    return;
  }
  if (action === "continue-chapter-one") {
    if (!state || !state.chapter1?.complete || state.forestChapter) return;
    E.beginForestChapter(state);
    origin = null;
    busy = false;
    cinematic();
    return;
  }
  if (action === "talk-geraud") {
    if (!state || busy || !E.controlsOwner(state.active)) return;
    const u = E.current(state);
    if (!u || !E.canTalkGeraud(state, u)) return;
    E.talkGeraud(state, u);
    origin = null;
    aim = null;
    cinematic();
    return;
  }
  if (tacticalAction) return;
  if (action.startsWith("choose-leader-")) {
    const owner = E.leadershipVacancies(state!)[0];
    if (!owner || !E.controlsOwner(owner)) return;
    try {
      E.appointLeader(state!, owner, action.slice(14));
      save(true);
      battleUI();
    } catch (error) {
      toast((error as Error).message);
    }
    return;
  }
  if (document.querySelector(".leader-choice")) return;
  if (action.startsWith("creator-")) {
    if (screen !== "config") return;
    const owner = Number(action.split("-").at(-1));
    if (action === "creator-factions-ready") {
      creationFlow.step = 2;
      configure();
      return;
    }
    if (action === "creator-back") {
      if (creationFlow.step === 3) {
        creationFlow.step = 2;
        creationFlow.heroReady = [false, false];
        creationFlow.partyReady = [false, false];
      } else creationFlow = E.newCreationFlow();
      configure();
      return;
    }
    if (![0, 1].includes(owner) || !E.controlsOwner(owner + 1)) return;
    if (action.startsWith("creator-hero-ready-")) {
      const h = heroDrafts[owner];
      if (
        creationFlow.step !== 2 ||
        !h.name.trim() ||
        h.name.length > 32 ||
        !E.startingHeroClasses(h.faction).some((c) => c.id === h.classId)
      ) {
        toast("Choisissez un personnage de départ valide.");
        return;
      }
      creationFlow.heroReady[owner] = true;
      if (creationFlow.heroReady.every(Boolean)) creationFlow.step = 3;
    } else if (action.startsWith("creator-intro-")) {
      if (creationFlow.step !== 3) return;
      creationFlow.introPage[owner] = Math.min(
        2,
        creationFlow.introPage[owner] + 1,
      );
    } else if (action.startsWith("creator-party-ready-")) {
      if (creationFlow.step !== 3 || creationFlow.introPage[owner] < 2) return;
      try {
        E.validateCompanions(heroDrafts[owner].faction, companionDrafts[owner]);
        creationFlow.partyReady[owner] = true;
      } catch (error) {
        toast((error as Error).message);
        return;
      }
    }
    configure();
    return;
  }

  if (
    state &&
    screen === "battle" &&
    /^(wait$|prepare-entry$|attack-mode$|confirm-attack-|confirm-area-|skill-|equip-|quick-weapon-|heal$|promote-)/.test(
      action,
    ) &&
    !E.controlsOwner(E.current(state)?.owner ?? 0)
  )
    return;
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
  } else if (action.startsWith("quick-weapon-")) {
    const u = state && E.current(state);
    if (u)
      try {
        E.equipWeapon(state!, u, action.slice(13));
        battleUI();
      } catch (error) {
        toast((error as Error).message);
      }
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
      } else if (screen === "config")
        void paintCreatorSprites(app, heroDrafts, colors);
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
    document.querySelectorAll(".rewards").forEach((el) => el.remove());
    const done = pendingReward;
    pendingReward = null;
    done?.();
  } else if (action === "new") {
    if (state) save(true);
    state = null;
    creationFlow = E.newCreationFlow();
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
    if (screen !== "config" || creationFlow.step !== 1) return;
    const [, p, f] = action.split("-");
    const index = Number(p) - 1;
    factions[index] = f as Faction;
    factions[1 - index] = f === "north" ? "knight" : "north";
    factions.forEach((f, i) => {
      heroDrafts[i].faction = f;
      heroDrafts[i].classId = E.startingHeroClasses(f)[0].id;
      delete heroDrafts[i].weaponId;
    });
    companionDrafts = [[], []];
    configure();
  } else if (action === "begin") {
    if (
      creationFlow.step !== 3 ||
      !creationFlow.heroReady.every(Boolean) ||
      !creationFlow.partyReady.every(Boolean)
    )
      return;
    try {
      state = E.createCampaign(factions, heroDrafts, companionDrafts);
      E.setPlayableTeamColors(state, readTeamPreferences());
      E.beginPrologue(state);
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
    if (busy || !E.canSwitchExpedition()) return;
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
    if (!E.canSwitchExpedition()) return;
    observer = !observer;
    battleUI();
  } else if (action === "prepare-entry") {
    const u = E.current(state!);
    if (!u || u.owner !== state!.active || !E.controlsOwner(u.owner) || busy)
      return;
    try {
      E.prepareEntry(state!, u);
      origin = null;
      state!.committedMove = u.id;
      if (state!.scene) cinematic();
      else {
        toast("Le seuil est sécurisé. Gardons nos positions.");
        finishTurn();
      }
      save(true);
    } catch (error) {
      toast((error as Error).message);
    }
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
  if (document.querySelector(".leader-choice")) {
    if (e.key === "Escape") e.preventDefault();
    return;
  }
  if ((e.target as HTMLElement)?.matches("input,select,textarea")) return;
  if (
    e.key.toLowerCase() === "d" &&
    !e.ctrlKey &&
    !e.metaKey &&
    !e.altKey &&
    !e.repeat &&
    screen === "battle" &&
    state &&
    !state.scene &&
    !document.querySelector(".modal-back")
  ) {
    e.preventDefault();
    dangerAll[state.active - 1] = !dangerAll[state.active - 1];
    return;
  }
  if (e.code === "Space" && screen === "transition") {
    e.preventDefault();
    nextScene();
  }
  if (
    e.key === "Tab" &&
    E.canSwitchExpedition() &&
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

let creatorResizeFrame = 0;
window.addEventListener("resize", () => {
  if (screen !== "config") return;
  cancelAnimationFrame(creatorResizeFrame);
  creatorResizeFrame = requestAnimationFrame(() => {
    if (screen === "config")
      void paintCreatorSprites(app, heroDrafts, readTeamPreferences());
  });
});
