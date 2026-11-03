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
  origin: { x: number; y: number } | null = null,
  moved = false,
  busy = false,
  hover: number | null = null,
  observer = false,
  fogEnabled = true,
  showGrid = false,
  terrainStyle: TerrainStyle = "regional",
  panel = "army1",
  speed = Number(localStorage.getItem("lte-speed") || 1),
  sound = localStorage.getItem("lte-sound") !== "off";
let pendingReward: (() => void) | null = null;
let toastTimer: ReturnType<typeof setTimeout>;
const zoom = 1.65;
const viewCols = 30 / zoom,
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
const sprites = new Image(),
  attacks = new Image(),
  regional = new Image();
regional.src = assetBase + "assets/regional-tiles.png?v=1";
attacks.src = assetBase + "assets/attacks.png";
sprites.src = assetBase + "assets/sprites.png";
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
  screen = "title";
  state = null;
  app.innerHTML = `<main class="title-screen"><div class="title-art"></div><div class="mist mist-a"></div><div class="mist mist-b"></div><header class="brand">${mark}<span>LES TERRES ÉGARÉES<small>UN RÉCIT DE BRUME ET DE CENDRES</small></span><span class="edition">CHAPITRE I · LES RIVAGES DE L’OUBLI</span></header><section class="title-copy"><div class="eyebrow"><span></span> UN TACTICAL RPG NARRATIF</div><h1>LES TERRES<br><em>ÉGARÉES</em></h1><p class="tagline">Deux expéditions. Deux histoires.<br>Un même piège.</p><div class="title-actions">${button("Nouvelle aventure <span>→</span>", "new", "primary")}${button("Continuer <span>→</span>", "continue", "quiet", !localStorage.getItem("lte-save"))}${button("Options <span>≡</span>", "options", "quiet")}</div><div class="title-note"><span class="small-diamond">◇</span> UNE AVENTURE SOLO · DEUX DESTINS À GUIDER</div></section><aside class="chapter-card"><span class="eyebrow">01 / LES RIVAGES DE L’OUBLI</span><h2>La brume n’oublie<br>aucun naufragé.</h2><p>Au-delà des cartes connues,<br>quelque chose vous attend.</p><div class="line"></div><span class="card-meta">STRATÉGIE AU TOUR PAR TOUR <span>✦</span> DARK FANTASY</span></aside><footer class="title-footer"><span>UNE TERRE INCONNUE. UNE ALLIANCE IMPROBABLE.</span><span>FRANÇAIS <i>◆</i> SAUVEGARDE LOCALE</span></footer><div class="grain"></div></main>`;
}
function options() {
  const modal = document.createElement("div");
  modal.className = "modal-back";
  modal.innerHTML = `<section class="modal"><span class="eyebrow">VOTRE AVENTURE</span><h2>Options</h2><label>Vitesse des combats<select id="speed"><option value="1">Cinématique</option><option value="2">Rapide ×2</option><option value="5">Express ×5</option></select></label><label>Effets sonores<input id="sound" type="checkbox" ${sound ? "checked" : ""}></label><p>Effets sonores des combats et de l’orage.</p>${button("Enregistrer", "close-options", "primary")}</section>`;
  app.append(modal);
  (document.querySelector("#speed") as HTMLSelectElement).value = String(speed);
}
function configure() {
  screen = "config";
  app.innerHTML = `<main class="config-screen"><div class="config-bg"></div><header class="brand">${mark}<span>LES TERRES ÉGARÉES<small>LES RIVAGES DE L’OUBLI</small></span>${button("← Retour", "title", "back")}</header><section class="config-heading"><span class="eyebrow">DEUX EXPÉDITIONS · UNE SEULE AVENTURE</span><h1>Choisissez vos origines.</h1><p>Vous guiderez les deux groupes. Leurs destins se rejoindront dans la brume.</p></section><div class="faction-grid">${[1, 2].map((p) => `<section class="faction-card"><div class="faction-image" style="background-image:url('${assetBase}assets/scene-${factions[p - 1] === "north" ? (p === 1 ? 4 : 20) : p === 1 ? 6 : 25}.png')"></div><div class="faction-content"><span class="eyebrow">EXPÉDITION ${p} <span class="player-dot p${p}"></span></span><h2>${factions[p - 1] === "north" ? (p === 1 ? "Les Enfants du fjord" : "Les Voiles de cendre") : p === 1 ? "La Compagnie d’ambre" : "Les Lames de l’aube"}</h2><p>${factions[p - 1] === "north" ? "La mer vous a tout pris. Votre courage vous appartient encore." : "Vous cherchiez une fortune. La brume vous a offert un autre destin."}</p><div class="segmented">${button("Vikings", `faction-${p}-north`, factions[p - 1] === "north" ? "chosen" : "")}${button("Chevaliers", `faction-${p}-knight`, factions[p - 1] === "knight" ? "chosen" : "")}</div><div class="unit-pair">${factions[p - 1] === "north" ? "Hache & bouclier <span>·</span> Arc de frêne" : "Épée & écu <span>·</span> Arbalète"}</div></div></section>`).join("")}</div><div class="config-bottom"><p>Chaque expédition possède son chef, ses unités et son champ de vision.<br><span>Changez de perspective à tout moment avec la touche Tab.</span></p>${button("Prendre la route <span>→</span>", "begin", "primary")}</div></main>`;
}
type Shot = { image: number; speaker: string; text: string };
function shots(): Shot[] {
  const s = state!,
    scene = s.scene!,
    p = scene === "intro2" ? 2 : 1,
    f = s.factions[p - 1],
    leader = s.units.find((u) => u.owner === p && u.leader)!.name;
  const variant = p === 2 ? "Une autre bannière, un autre équipage. " : "";
  if (scene === "intro2")
    return f === "north"
      ? [
          {
            image: 16,
            speaker: leader,
            text: "Au nord, une autre bannière avait quitté le fjord. Bryn et Solveig cherchaient une terre où recommencer.",
          },
          {
            image: 17,
            speaker: "LE DÉPART",
            text: "Ils chargèrent les dernières réserves et confièrent leur destin à la mer.",
          },
          {
            image: 18,
            speaker: "LA TRAVERSÉE",
            text: "La nuit emporta les étoiles. Devant eux, la mer devint un mur.",
          },
          {
            image: 19,
            speaker: "LE NAUFRAGE",
            text: "Le ciel se déchira. Le rivage surgit dans la foudre, puis le bois se brisa.",
          },
          {
            image: 20,
            speaker: leader,
            text: "Rassemblez ce qui peut encore servir. Nous ne mourrons pas sur cette plage.",
          },
          {
            image: 21,
            speaker: leader,
            text: "Un monastère, au-delà de la brume. Il nous faut un abri.",
          },
        ]
      : [
          {
            image: 22,
            speaker: leader,
            text: "Maël et Alix avaient accepté un dernier contrat : intercepter un convoi et disparaître avant l’aube.",
          },
          {
            image: 23,
            speaker: "L’EMBUSCADE",
            text: "Une route, quelques chariots, une cargaison sans escorte digne de ce nom. Tout semblait simple.",
          },
          {
            image: 24,
            speaker: "LA TEMPÊTE",
            text: "Sous les arbres, l’orage transforma les sentiers en torrents. La compagnie perdit son chemin.",
          },
          {
            image: 25,
            speaker: leader,
            text: "Cette route… Nous ne sommes pas passés ici hier. Où sommes-nous ?",
          },
          {
            image: 26,
            speaker: leader,
            text: "Le convoi. Mais ils sont tous morts… Qui a pu faire cela ?",
          },
          {
            image: 27,
            speaker: leader,
            text: "Derrière le chariot ! Ce mort se relève. Aux armes !",
          },
        ];
  if (scene.startsWith("intro"))
    return f === "north"
      ? [
          {
            image: p === 1 ? 1 : 4,
            speaker: `EXPÉDITION ${p} · ${leader}`,
            text:
              variant +
              "Au-delà des mers connues, les hommes du Nord cherchaient de nouvelles terres, des richesses et la gloire.",
          },
          {
            image: 2,
            speaker: "LE DÉPART",
            text: "Une nouvelle expédition prit la mer, guidée par les étoiles et la promesse de terres lointaines.",
          },
          {
            image: 3,
            speaker: "LA TRAVERSÉE",
            text: "La mer se souleva. Au loin, aucune côte. Au-dessus, plus une étoile.",
          },
          {
            image: 11,
            speaker: "LA TEMPÊTE",
            text: "Mais cette nuit-là, même les étoiles semblèrent abandonner les hommes.",
          },
          {
            image: 4,
            speaker: "LE NAUFRAGE",
            text: "À l’aube, seuls les débris et quelques survivants atteignirent une plage inconnue.",
          },
          {
            image: 5,
            speaker: leader,
            text: "Un monastère… S’il reste des vivres là-dedans, on pourra tenir quelques jours.",
          },
        ]
      : [
          {
            image: p === 1 ? 6 : 7,
            speaker: `EXPÉDITION ${p} · ${leader}`,
            text:
              variant +
              "Dans un royaume déchiré par les guerres, certaines compagnies ne servaient plus de couronne. Seulement celui qui payait le mieux.",
          },
          {
            image: 7,
            speaker: "LE CONTRAT",
            text: "Un convoi chargé d’or devait traverser la forêt. Une embuscade simple. Un dernier contrat.",
          },
          {
            image: 8,
            speaker: "LA NUIT",
            text: "Sous les arbres, la tempête les surprit. Le tonnerre étouffa jusqu’au bruit de leurs pas.",
          },
          {
            image: 5,
            speaker: "LE MATIN",
            text: "Au matin, la route était méconnaissable. Une brume épaisse avait avalé le monde.",
          },
          {
            image: 9,
            speaker: leader,
            text: "Personne ne nous a devancés. Alors qui les a tués ?",
          },
          {
            image: 10,
            speaker: leader,
            text: "Ce cadavre… Il bouge. Aux armes !",
          },
        ];
  if (scene === "storm")
    return [
      {
        image: 11,
        speaker: "LE RETOUR DE L’ORAGE",
        text:
          s.factions[s.active - 1] === "north"
            ? "Encore ces éclairs… Ce n’est pas une tempête ordinaire."
            : "Ce tonnerre… C’est le même que cette nuit.",
      },
    ];
  if (scene === "horde")
    return [
      {
        image: 11,
        speaker: "NOUVEL OBJECTIF · ATTEINDRE LE SANCTUAIRE",
        text: "Des silhouettes apparaissent sur les chemins extérieurs. Au centre, des cris humains percent la brume. Il faut avancer.",
      },
    ];
  if (scene === "meeting")
    return [
      "Attendez… Des hommes vivants ?",
      "Qui êtes-vous ? Et que faites-vous ici ?",
      "Nous cherchons à quitter cet endroit.",
      "Alors nous cherchons la même chose.",
      "On discutera après. Pour l’instant, il faut survivre !",
      "Très bien. Vos hommes sur le flanc gauche, les miens sur le droit !",
    ].map((text, i) => ({
      image:
        s.factions[0] === "north"
          ? s.factions[1] === "north"
            ? 28
            : 31
          : s.factions[1] === "north"
            ? 30
            : 29,
      speaker: s.units.find(
        (u) => u.owner === (i % 2 === 0 ? 1 : 2) && u.leader,
      )!.name,
      text,
    }));
  return [
    {
      image: 13,
      speaker: "LE REPLI",
      text: "Au loin, d’autres silhouettes approchent. Les survivants gagnent le sanctuaire et barricadent les accès.",
    },
    {
      image: 14,
      speaker: "LES TERRES ÉGARÉES",
      text: "Deux expéditions. Deux histoires. Un même piège.",
    },
  ];
}
function cinematic() {
  screen = "cinematic";
  const s = state!,
    list = shots(),
    shot = list[s.scenePage];
  app.innerHTML = `<main class="cinematic"><div class="cinema-image" style="background-image:url('${assetBase}assets/scene-${shot.image}.png')"></div><header><span class="eyebrow">${s.scene?.startsWith("intro") ? `PROLOGUE · EXPÉDITION ${s.scene === "intro2" ? 2 : 1}` : "LES RIVAGES DE L’OUBLI"}</span><span>${String(s.scenePage + 1).padStart(2, "0")} <i>/ ${String(list.length).padStart(2, "0")}</i></span></header><section class="dialogue"><span class="eyebrow">${esc(shot.speaker)}</span><p>${esc(shot.text)}</p><div class="dialogue-bottom"><span>${list.map((_, i) => `<i class="${i === s.scenePage ? "on" : ""}"></i>`).join("")}</span>${button(s.scenePage === list.length - 1 ? "Poursuivre →" : "Suite →", "next-scene", "primary")}</div></section><span class="cinema-key">ESPACE POUR CONTINUER</span></main>`;
  if (s.scene === "storm") audio("storm");
}
function nextScene() {
  if (!state) return;
  const s = state;
  if (++s.scenePage < shots().length) {
    cinematic();
    return;
  }
  const scene = s.scene;
  s.scene = null;
  s.scenePage = 0;
  if (scene === "intro1") {
    s.players[0].intro = 6;
    s.scene = "intro2";
    cinematic();
    return;
  }
  if (scene === "intro2") {
    s.players[1].intro = 6;
    s.phase = "battle";
    selected = E.current(s)?.id ?? null;
  }
  if (scene === "meeting") E.merge(s);
  if (scene === "ending") {
    s.phase = "camp";
    s.inventory[1].count = s.units.filter(
      (u) => u.owner === 0 && u.hp === 0,
    ).length;
    camp();
    save(true);
    return;
  }
  battleUI();
  save(true);
}
function portrait(u: Unit, large = false) {
  const pi = kindRow(u.kind) + (u.owner === 2 ? 4 : 0);
  return `<div class="portrait ${large ? "large" : ""} kind-${u.kind}">${u.owner === 0 ? `<div class="sprite-portrait" style="--row:4"></div>` : `<img src="${assetBase}assets/portrait-${pi}.png" alt="Portrait de ${u.name}">`}<span class="portrait-frame"></span></div>`;
}
const kindRow = (k: Kind) =>
  ["shield", "bow", "sword", "crossbow", "skeleton"].indexOf(k);
function unitCard(u: Unit) {
  return `${portrait(u, true)}<div class="unit-identity"><span class="eyebrow">${u.owner === 0 ? "LES MAUDITS" : `EXPÉDITION ${u.owner}`}${u.leader ? " · CHEF" : ""}</span><h2>${u.name}</h2><span>${E.names[u.kind]} · Nv. ${u.level}</span></div><div class="hp-heading"><span>POINTS DE VIE</span><b>${u.hp}<small> / ${u.maxHp}</small></b></div><div class="bar hp"><i style="width:${(u.hp / u.maxHp) * 100}%"></i></div><div class="stats">${[
    ["FOR", u.strength],
    ["DÉF", u.defense],
    ["AGI", u.agility],
    ["INIT", u.initiative],
    ["PRÉC", u.accuracy],
    ["MVT", u.move],
  ]
    .map(
      ([n, v]) =>
        `<div tabindex="0" role="button" aria-label="${n} : ${v}" data-tooltip="${({ FOR: "Force : augmente les dégâts physiques.", DÉF: "Défense : réduit les dégâts reçus, en plus du couvert.", AGI: "Agilité : réduit la précision adverse ; 4 points d’écart donnent une seconde frappe.", INIT: "Initiative : détermine l’ordre de passage, indépendamment de l’agilité.", PRÉC: "Précision : augmente les chances de toucher.", MVT: "Mouvement : budget de déplacement, selon le coût du terrain." } as Record<string, string>)[String(n)]}"><span>${n}</span><b>${v}</b></div>`,
    )
    .join(
      "",
    )}</div><div class="equipment"><span>ARME ÉQUIPÉE</span><strong>${E.weapons[u.kind]}</strong><small>Portée ${u.minRange}–${u.range} cases</small></div><div class="xp-label"><span>EXPÉRIENCE</span><b>${u.xp} / 100</b></div><div class="bar xp"><i style="width:${u.xp}%"></i></div>`;
}
function battleUI() {
  if (!state) return;
  const s = state;
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
  app.innerHTML = `<main class="battle-screen compact-battle"><header class="battle-header"><a class="mini-brand" data-action="pause">${mark}<span>LES TERRES ÉGARÉES</span></a><div class="mission-name"><strong>${s.merged ? "Repoussez les morts-vivants" : "Rejoignez le village des Veilleurs"}</strong><span>ROUND ${E.front(s).round} · ${s.merged ? "ALLIANCE" : `EXPÉDITION ${s.active}`}</span></div><div class="perspectives">${[1, 2].map((p) => button(`EXPÉDITION ${p}`, `perspective-${p}`, s.active === p ? "active" : "")).join("")}</div><button class="icon-button" data-action="observer" aria-label="Observation côte à côte">◫</button>${button("☰", "pause", "icon-button")}</header>
  <div class="battle-layout"><section class="map-section">
  <div class="map-heading"><span>${factionName(s.factions[s.active - 1])} · Secteurs ≈ 100 m</span><div class="map-tools">${button("Recentrer", "recenter")}${button(fogEnabled ? "Retirer la brume (test)" : "Rétablir la brume", "toggle-fog")}${button(`Grille ${showGrid ? "active" : "masquée"}`, "toggle-grid")}</div></div>
  <div class="canvas-wrap ${observer ? "observing" : ""}"><canvas id="map" width="1920" height="1280" aria-label="Carte tactique. Glissez pour explorer, cliquez pour sélectionner ou déplacer." tabindex="0"></canvas>${observer ? '<canvas id="map2" width="1920" height="1280" aria-label="Vue de l’autre expédition en observation"></canvas>' : ""}
  <div class="map-compass">N<br>✦</div><div class="map-status">${!fogEnabled ? "INSPECTION SANS BRUME · VISION LOGIQUE CONSERVÉE" : ""}</div>
  <div id="map-tooltip" class="map-tooltip" hidden></div>
  ${cardOpen && sel && E.seen(s, s.active, sel) ? `<section class="unit-window" aria-label="Fiche de ${esc(sel.name)}"><button class="close-unit" data-action="close-unit" aria-label="Fermer la fiche">×</button>${unitCard(sel)}</section>` : ""}
  </div>
  <div class="activation-bar"><div><span class="eyebrow">${busy ? "ACTION EN COURS" : own ? "À VOUS DE JOUER" : u?.owner === 0 ? "TOUR ENNEMI" : `EXPÉDITION ${u?.owner}`}</span><strong>${u?.owner === 0 && !E.seen(s, s.active, u) ? "Une présence dans la brume" : (u?.name ?? "")}</strong><small>Clic : unité / destination · Glisser : déplacer la carte</small></div><div class="turn-actions">${sel && own && sel.id === u?.id ? `${button("Attaquer", "attack-mode", "", busy)}${button(`Potion (${sel.potions})`, "heal", "", busy || !sel.potions || sel.hp === sel.maxHp)}${button("Annuler", "cancel", "", busy)}` : ""}${own ? button("Attendre", "wait", "primary", busy) : u?.owner !== 0 ? button(`Voir expédition ${u?.owner} →`, `perspective-${u?.owner}`, "primary") : ""}</div></div>
  </section></div><footer class="battle-footer"><span>Glisser · Explorer la carte <i>◆</i> Flèches · Caméra <i>◆</i> Tab · Expédition</span><span>${button("Sauvegarder", "save", "text-button", busy || !!origin)} ${button("Règles du combat", "rules", "text-button")}</span></footer></main>`;
  bindCanvas();
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
    info.innerHTML = `<strong>${esc(unit.name)}</strong><span>${unit.hp} / ${unit.maxHp} PV</span><div class="bar hp"><i style="width:${(100 * unit.hp) / unit.maxHp}%"></i></div>`;
  } else
    info.innerHTML = `<strong>${terrainNames[t.terrain]}</strong><span>${t.walk ? `Déplacement ${t.cost} · Défense +${t.defense}` : "Infranchissable"}</span>`;
}
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
      const was = drag;
      drag = null;
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
) {
  const sheet = attack ? attacks : sprites;
  if (!sheet.complete || !sheet.naturalWidth) return;
  const sw = sheet.width / 8,
    sh = sheet.height / 5;
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.translate(x + size / 2, y + size / 2);
  if (flip) ctx.scale(-1, 1);
  ctx.drawImage(
    sheet,
    frame * sw,
    kindRow(u.kind) * sh,
    sw,
    sh,
    -size / 2,
    -size * 0.72,
    size,
    size * 1.15,
  );
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
    index: number;
    start: number;
    applied: boolean;
    done: () => void;
  } | null = null;
const mist = new Mist(E.W, E.H);
const terrain = new TerrainRenderer(regional);
let reachSignature = "",
  reachCache = new Map<number, { cost: number; steps: number[] }>();
function movementField(s: Campaign, u: Unit) {
  const signature =
    s.units.map((t) => `${t.id}:${t.x},${t.y},${t.hp}`).join("|") + u.id;
  if (signature !== reachSignature) {
    reachSignature = signature;
    reachCache = E.reachable(s, u);
  }
  return reachCache;
}
let attackSignature = "",
  attackCache = new Set<number>();
function attackField(
  u: Unit,
  reach: Map<number, { cost: number; steps: number[] }>,
) {
  const signature = reachSignature + u.id + u.x + "," + u.y + ":" + moved;
  if (signature !== attackSignature) {
    attackSignature = signature;
    attackCache = E.attackCells(u, reach.keys());
  }
  return attackCache;
}
function renderMap(canvas: HTMLCanvasElement, p: 1 | 2, time: number) {
  if (!state) return;
  const s = state,
    ctx = canvas.getContext("2d")!,
    visible = new Set(s.players[p - 1].visible),
    explored = new Set(s.players[p - 1].explored),
    cam = s.players[p - 1].camera;
  canvas.dataset.cameraX = String(cam.x);
  canvas.dataset.cameraY = String(cam.y);
  canvas.dataset.viewCols = String(viewCols);
  canvas.dataset.viewRows = String(viewRows);
  ctx.setTransform(2, 0, 0, 2, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.fillStyle = "#71858a";
  ctx.fillRect(0, 0, 960, 640);
  ctx.save();
  ctx.scale(zoom, zoom);
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
      if (!visible.has(k)) continue;
      const c = E.map[k];
      ctx.fillStyle = "#4bade34a";
      ctx.fillRect(c.x * 32 + 1, c.y * 32 + 1, 30, 30);
      ctx.strokeStyle = "#72ceee70";
      ctx.strokeRect(c.x * 32 + 1, c.y * 32 + 1, 30, 30);
    }
    for (const k of attackField(sel, reach)) {
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
      frame = 1 + (Math.floor(time / 130) % 2);
    }
    ctx.fillStyle =
      u.owner === 1 ? "#66bfbe" : u.owner === 2 ? "#d8b577" : "#c56059";
    ctx.globalAlpha = 0.8;
    ctx.beginPath();
    ctx.ellipse(x + 16, y + 24, 11, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    drawSprite(ctx, u, x, y - 2, 32, frame);
    ctx.fillStyle = "#14201c";
    ctx.fillRect(x + 3, y + 29, 26, 3);
    ctx.fillStyle = u.owner === 0 ? "#c87e6a" : "#8ebe99";
    ctx.fillRect(x + 3, y + 29, (26 * u.hp) / u.maxHp, 3);
    if (u.id === cur?.id) {
      ctx.strokeStyle = "#ecd5a0";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x + 1, y + 1, 30, 30);
    }
    if (selected === u.id) {
      ctx.strokeStyle = "#ecddac";
      ctx.lineWidth = 2;
      ctx.strokeRect(x - 1, y - 1, 34, 34);
    }
  }
  if (fogEnabled)
    mist.draw(ctx, visible, p, time, {
      x: cam.x * 32,
      y: cam.y * 32,
      width: viewCols * 32 + 1,
      height: viewRows * 32 + 1,
    });
  if (!fogEnabled || visible.has(E.key(E.village.entry.x, E.village.entry.y))) {
    ctx.font = "7px Georgia";
    ctx.textAlign = "center";
    ctx.fillStyle = "#e4dbb8";
    ctx.shadowColor = "#10251a";
    ctx.shadowBlur = 5;
    ctx.fillText(
      "VILLAGE DÉTRUIT DES VEILLEURS",
      E.village.entry.x * 32 + 16,
      E.village.y * 32 - 6,
    );
    ctx.shadowBlur = 0;
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
  if (hover !== null && (!fogEnabled || visible.has(hover))) {
    const c = E.map[hover];
    ctx.strokeStyle = "#f0ead190";
    ctx.lineWidth = 1;
    ctx.strokeRect(c.x * 32, c.y * 32, 32, 32);
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
    if (a) renderMap(a, state!.active, time);
    if (b) renderMap(b, (3 - state!.active) as 1 | 2, time);
  }
  if (combatAnim) renderCombat(time);
}
requestAnimationFrame(animation);
async function animateMove(u: Unit, x: number, y: number) {
  const s = state!,
    p = E.path(s, u, x, y);
  if (!p || p.cost > u.move) return false;
  busy = true;
  moveAnim = {
    id: u.id,
    steps: p.steps,
    start: performance.now(),
    duration: Math.max(160, (p.steps.length * 130) / speed),
  };
  if (screen === "battle") battleUI();
  await new Promise((r) => setTimeout(r, moveAnim!.duration));
  E.move(s, u, x, y);
  moveAnim = null;
  busy = false;
  return true;
}
async function clickCell(x: number, y: number) {
  if (!state || busy || state.scene) return;
  const s = state,
    u = E.current(s),
    target = E.at(s, x, y);
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
    selected = target.id;
    cardOpen = true;
    battleUI();
    return;
  }
  if (selected === u?.id && u?.owner === s.active) {
    const p = E.path(s, u, x, y);
    if (
      !moved &&
      p &&
      p.cost <= u.move &&
      s.players[s.active - 1].visible.includes(E.key(x, y))
    ) {
      origin = { x: u.x, y: u.y };
      await animateMove(u, x, y);
      moved = true;
      if (E.encounter(s)) {
        origin = null;
        moved = false;
        selected = null;
        cinematic();
      } else battleUI();
    } else toast("Cette case n’est pas accessible pendant cette activation.");
  }
}
function cancel() {
  if (busy) return;
  if (origin && state) {
    const u = E.current(state)!;
    Object.assign(u, origin);
    E.visibility(state);
  }
  origin = null;
  moved = false;
  selected = null;
  document.querySelector(".modal-back")?.remove();
  if (state?.phase === "battle") battleUI();
}
function finishTurn() {
  if (!state || busy) return;
  origin = null;
  moved = false;
  selected = null;
  E.advance(state);
  battleUI();
  if (!state.scene) save(true);
}
function preview(a: Unit, b: Unit) {
  const p = E.forecast(a, b),
    q = E.forecast(b, a);
  const modal = document.createElement("div");
  modal.className = "modal-back";
  modal.innerHTML = `<section class="modal forecast"><span class="eyebrow">PRÉVISION DE COMBAT</span><h2>${a.name} <i>contre</i> ${b.name}</h2><div class="forecast-units"><div>${portrait(a, true)}<strong>${E.weapons[a.kind]}</strong><b>${p.damage} ${p.strikes === 2 ? "× 2" : ""}</b><span>DÉGÂTS · ${p.hit}% PRÉCISION</span><small>${p.crit}% CRITIQUE</small></div><span class="versus">VS</span><div>${portrait(b, true)}<strong>${E.weapons[b.kind]}</strong><b>${p.counter ? q.damage : "—"}</b><span>${p.counter ? `${q.hit}% PRÉCISION` : "HORS DE PORTÉE"}</span><small>${p.counter ? "CONTRE-ATTAQUE POSSIBLE" : "AUCUNE CONTRE-ATTAQUE"}</small></div></div><p>Le couvert réduit les dégâts. Une différence d’agilité de 4 permet deux frappes.</p><div class="modal-actions">${button("Annuler", "close-modal")}${button("Engager le combat", "confirm-attack-" + b.id, "primary")}</div></section>`;
  app.append(modal);
}
async function fight(a: Unit, b: Unit) {
  if (busy) return;
  busy = true;
  origin = null;
  moved = false;
  const result = E.resolve(state!, a, b);
  screen = "combat";
  app.innerHTML = `<main class="combat-screen"><div class="combat-scene-bg" style="background-image:linear-gradient(#0a191c22,#0c1c1c77),url('${assetBase}assets/battle-${a.x <= 6 ? 1 : E.cell(a.x, a.y)?.terrain === "forest" ? 2 : a.x >= 14 && a.x <= 20 ? 0 : 3}.png')"></div><header><span class="eyebrow">LES RIVAGES DE L’OUBLI</span><span>CONFRONTATION</span></header><div class="combat-names"><section><span>${E.weapons[a.kind]}</span><h2>${a.name}</h2><div class="bar hp"><i id="hp-${a.id}" style="width:${(a.hp / a.maxHp) * 100}%"></i></div><b id="value-${a.id}">${a.hp} / ${a.maxHp}</b></section><span class="crossed">×</span><section><span>${E.weapons[b.kind]}</span><h2>${b.name}</h2><div class="bar hp"><i id="hp-${b.id}" style="width:${(b.hp / b.maxHp) * 100}%"></i></div><b id="value-${b.id}">${b.hp} / ${b.maxHp}</b></section></div><canvas id="combat" width="1200" height="600"></canvas><div id="combat-result" aria-live="polite"></div><footer><span>CHAQUE FRAPPE PEUT CHANGER VOTRE DESTIN</span><span>VITESSE ×${speed}</span></footer></main>`;
  await new Promise<void>((done) => {
    combatAnim = {
      battle: result,
      index: 0,
      start: performance.now() + 400 / speed,
      applied: false,
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
    toast(`${u.name} · Niveau ${u.level} ! PV +3 · Force +1 · Défense +1`);
  }
  E.log(state!, `${a.name} affronte ${b.name}.`);
  finishTurn();
}
function rewards(result: Battle): Promise<void> {
  if (!result.xp.length) return Promise.resolve();
  return new Promise((done) => {
    pendingReward = done;
    const modal = document.createElement("div");
    modal.className = "modal-back rewards";
    modal.innerHTML = `<section class="modal"><span class="eyebrow">APRÈS L’AFFRONTEMENT</span><h2>Chaque épreuve vous façonne.</h2>${result.xp
      .map((e) => {
        const u = state!.units.find((u) => u.id === e.id)!;
        return `<div class="reward-unit">${portrait(u)}<div><strong>${u.name} <span>+${e.amount} EXP</span></strong><div class="bar xp"><i data-progress="${u.xp}" style="width:${e.before}%"></i></div><small>${u.xp} / 100 EXP · Niveau ${u.level}</small>${e.level ? `<div class="level-up"><span class="eyebrow">NIVEAU ${u.level}</span><b>PV +3 &nbsp; Force +1 &nbsp; Défense +1</b></div>` : ""}</div></div>`;
      })
      .join(
        "",
      )}${button("Reprendre la bataille", "close-reward", "primary")}</section>`;
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
    s = state!,
    canvas = document.querySelector<HTMLCanvasElement>("#combat");
  if (!canvas) return;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, 1200, 600);
  ctx.imageSmoothingEnabled = false;
  const strike = anim.battle.strikes[anim.index];
  if (!strike) {
    const done = anim.done;
    combatAnim = null;
    done();
    return;
  }
  const attacker = s.units.find((u) => u.id === strike.attacker)!,
    defender = s.units.find((u) => u.id === strike.defender)!,
    left = s.units.find((u) => u.id === anim.battle.strikes[0].attacker)!,
    right = s.units.find((u) => u.id === anim.battle.strikes[0].defender)!,
    t = (time - anim.start) * speed;
  const ranged = attacker.range > 1,
    attLeft = attacker.id === left.id;
  const walking = t < 0 || (!ranged && (t < 240 || (t > 900 && t < 1300)));
  const af = walking
    ? 1 + (Math.floor(time / 85) % 2)
    : t < 140
      ? 0
      : t < 260
        ? 1
        : t < 400
          ? 2
          : t < 520
            ? 3
            : t < 700
              ? 4
              : t < 840
                ? 5
                : t < 1000
                  ? 6
                  : 7;
  const df =
    t < 500 ? 0 : t < 800 ? (strike.hit ? (strike.blocked ? 5 : 6) : 5) : 0;
  const travel =
    ranged || t < 0
      ? 0
      : t < 240
        ? (t / 240) * 610
        : t < 900
          ? 610
          : Math.max(0, 1 - (t - 900) / 400) * 610;
  const entry = Math.max(0, Math.min(1, (t + 400) / 400));
  ctx.globalAlpha =
    left.hp === 0 && t > 800 ? Math.max(0, 1 - (t - 800) / 650) : 1;
  drawSprite(
    ctx,
    left,
    t < 0 ? -100 + 220 * entry : attLeft ? 120 + travel : 120,
    195,
    210,
    left.hp === 0 && t > 800
      ? 7
      : t < 0
        ? 1 + (Math.floor(time / 85) % 2)
        : attLeft
          ? af
          : df,
    false,
    t >= 0 && attLeft && !walking && left.hp > 0,
  );
  ctx.globalAlpha =
    right.hp === 0 && t > 800 ? Math.max(0, 1 - (t - 800) / 650) : 1;
  drawSprite(
    ctx,
    right,
    t < 0 ? 1200 - 335 * entry : !attLeft ? 865 - travel : 865,
    195,
    210,
    right.hp === 0 && t > 800
      ? 7
      : t < 0
        ? 1 + (Math.floor(time / 85) % 2)
        : attLeft
          ? df
          : af,
    true,
    t >= 0 && !attLeft && !walking && right.hp > 0,
  );
  ctx.globalAlpha = 1;
  if (ranged && t > 520 && t < 620) {
    const progress = (t - 520) / 100;
    ctx.fillStyle = "#e8d8ae";
    const x = attLeft ? 310 + progress * 560 : 865 - progress * 560;
    ctx.fillRect(x, 280, 38, 3);
    ctx.beginPath();
    ctx.moveTo(x + (attLeft ? 38 : 0), 281);
    ctx.lineTo(x + (attLeft ? 28 : 10), 276);
    ctx.lineTo(x + (attLeft ? 28 : 10), 286);
    ctx.fill();
  }
  if (t >= 620 && !anim.applied) {
    anim.applied = true;
    E.applyStrike(s, strike);
    audio();
    const hp = document.querySelector<HTMLElement>("#hp-" + defender.id),
      value = document.querySelector("#value-" + defender.id);
    if (hp) hp.style.width = `${(defender.hp / defender.maxHp) * 100}%`;
    if (value) value.textContent = `${defender.hp} / ${defender.maxHp}`;
    const r = document.querySelector("#combat-result");
    if (r)
      r.innerHTML = `<span class="${strike.critical ? "critical" : ""}">${strike.hit ? (strike.critical ? "CRITIQUE · " : "") + (strike.blocked ? "PARADE · " : "") + "−" + strike.damage : "ESQUIVE"}</span>`;
  }
  if (t >= 620 && t < 800 && strike.hit) {
    ctx.strokeStyle = strike.critical ? "#ffe091" : "#f3e9c5";
    ctx.lineWidth = 4;
    const x = attLeft ? 900 : 270;
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI) / 4;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(angle) * 12, 280 + Math.sin(angle) * 12);
      ctx.lineTo(
        x + Math.cos(angle) * ((t - 600) / 5),
        280 + Math.sin(angle) * ((t - 600) / 5),
      );
      ctx.stroke();
    }
  }
  if (t > 1400) {
    anim.index++;
    anim.start = time;
    anim.applied = false;
  }
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
    origin = null;
    moved = false;
    if (state.phase === "camp") camp();
    else battleUI();
  } catch {
    toast("Cette sauvegarde est absente ou incompatible.");
  }
}
function camp() {
  screen = "camp";
  const s = state!;
  app.innerHTML = `<main class="camp-screen"><div class="camp-bg"></div><header class="brand">${mark}<span>LE SANCTUAIRE<small>LE CAMP DES SURVIVANTS</small></span><span class="edition">CHAPITRE I · MISSION ACCOMPLIE</span></header><section class="camp-heading"><span class="eyebrow">UNE TRÊVE DANS LA BRUME</span><h1>Enfin, un feu.</h1><p>Le monde a disparu. Vos histoires continuent.</p></section><div class="camp-layout"><nav class="camp-nav">${[
    ["army1", "Armée 1"],
    ["army2", "Armée 2"],
    ["characters", "Personnages"],
    ["inventory", "Inventaire"],
    ["world", "Carte du monde"],
  ]
    .map(([id, label]) =>
      button(label, "camp-" + id, panel === id ? "active" : ""),
    )
    .join(
      "",
    )}${button("Sauvegarder", "save")}${button("Menu principal", "title")}</nav><section class="camp-panel">${campPanel()}</section></div></main>`;
}
function campPanel() {
  const s = state!;
  if (panel === "world")
    return `<span class="eyebrow">L’ATLAS DES TERRES ÉGARÉES</span><h2>Au-delà de la brume</h2><div class="world-map"><img src="${assetBase}assets/scene-15.png" alt="Carte peinte de la côte et des montagnes, largement couverte de brume"><div class="world-fog"></div>${button("⚑ Sanctuaire", "place-sanctuary", "place known")}${button("Côte des naufragés", "place-coast", "place coast")}${button("Ruines des Veilleurs", "place-ruins", "place ruins")}${button("?", "place-unknown", "place unknown")}${button("?", "place-unknown", "place unknown unknown2")}${button("?", "place-unknown", "place unknown unknown3")}</div><p>Le sanctuaire est votre seul refuge. Les routes lointaines sont encore inconnues.</p>`;
  if (panel === "inventory")
    return `<span class="eyebrow">LES RÉSERVES COMMUNES</span><h2>Inventaire</h2>${s.inventory.map((i) => `<div class="inventory-row"><span>${i.name}</span><b>× ${i.count}</b></div>`).join("")}<p>Chaque survivant conserve ses potions et son équipement personnel. Les ressources du camp serviront aux prochains chapitres.</p>`;
  const owner = panel === "army2" ? 2 : 1,
    units =
      panel === "characters"
        ? s.units.filter((u) => u.owner !== 0)
        : s.units.filter((u) => u.owner === owner);
  return `<span class="eyebrow">${panel === "characters" ? "LES DEUX EXPÉDITIONS" : factionName(s.factions[owner - 1])}</span><h2>${panel === "characters" ? "Les visages de l’alliance" : `Expédition ${owner}`}</h2><div class="camp-units">${units.map((u) => `<button class="camp-unit ${u.hp === 0 ? "fallen" : ""}" data-action="sheet-${u.id}">${portrait(u, true)}<span><strong>${u.name}</strong><small>${E.names[u.kind]} · Nv. ${u.level}</small><b>${u.hp === 0 ? "Tombé au combat" : `${u.hp} / ${u.maxHp} PV`}</b><span class="bar xp"><i style="width:${u.xp}%"></i></span><small>${u.xp} EXP · Expédition ${u.owner}</small></span></button>`).join("")}</div><p>Sélectionnez un personnage pour consulter sa fiche. Les niveaux, blessures et équipements sont conservés.</p>${panel === "characters" ? `<table class="comparison"><thead><tr><th>Personnage</th><th>FOR</th><th>DÉF</th><th>AGI</th><th>INIT</th></tr></thead><tbody>${units.map((u) => `<tr><td>${u.name}</td><td>${u.strength}</td><td>${u.defense}</td><td>${u.agility}</td><td>${u.initiative}</td></tr>`).join("")}</tbody></table>` : ""}`;
}
function defeat() {
  screen = "defeat";
  app.innerHTML = `<main class="defeat"><span class="eyebrow">LA BRUME A REPRIS SES DROITS</span><h1>Le dernier feu<br>s’est éteint.</h1><p>Les deux chefs sont tombés. Vos expéditions n’ont plus de guide.</p>${button("Reprendre la sauvegarde", "continue", "primary", !localStorage.getItem("lte-save"))}${button("Nouvelle aventure", "new")}</main>`;
}
function pause() {
  const modal = document.createElement("div");
  modal.className = "modal-back";
  modal.innerHTML = `<section class="modal"><span class="eyebrow">UNE HALTE DANS LA BRUME</span><h2>Votre aventure</h2><div class="pause-actions">${button("Reprendre", "close-modal", "primary")}${button("Sauvegarder", "save", "", busy || !!origin)}${button("Options", "options")}${button("Menu principal", "title")}</div></section>`;
  app.append(modal);
}
app.addEventListener("click", async (e) => {
  const el = (e.target as HTMLElement).closest<HTMLElement>("[data-action]");
  if (!el || el.hasAttribute("disabled")) return;
  const action = el.dataset.action!;
  if (action === "toggle-fog") {
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
    localStorage.setItem("lte-speed", String(speed));
    localStorage.setItem("lte-sound", sound ? "on" : "off");
    el.closest(".modal-back")?.remove();
  } else if (action.startsWith("faction-")) {
    const [, p, f] = action.split("-");
    factions[Number(p) - 1] = f as Faction;
    configure();
  } else if (action === "begin") {
    state = E.createCampaign(factions);
    mist.reset();
    terrain.reset();
    selected = null;
    origin = null;
    moved = false;
    cinematic();
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
      selected = u.id;
      cardOpen = true;
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
    modal.innerHTML = `<section class="modal"><span class="eyebrow">LES LOIS DE CES TERRES</span><h2>Règles du combat</h2><p>Une activation par unité et par round, par initiative décroissante. En cas d’égalité : identifiant stable.</p><p>Dégâts = Force − Défense − couvert (minimum 1). Précision = précision de l’attaquant − 2 × agilité adverse, entre 25 et 98 %. Critique : moitié de l’agilité, minimum 2 %, dégâts ×3.</p><p>Un écart d’agilité de 4 permet une seconde frappe. Une contre-attaque exige une cible vivante, la bonne portée et une ligne de vue libre.</p><p>Les deux chefs morts entraînent la défaite. Après la rencontre, les champs de vision sont partagés et un nouveau round complet commence.</p>${button("Compris", "close-modal", "primary")}</section>`;
    app.append(modal);
  } else if (action.startsWith("camp-")) {
    panel = action.slice(5);
    camp();
  } else if (action.startsWith("sheet-")) {
    const u = state!.units.find((u) => u.id === action.slice(6))!;
    const m = document.createElement("div");
    m.className = "modal-back";
    m.innerHTML = `<section class="modal sheet">${unitCard(u)}${button("Fermer", "close-modal", "primary")}</section>`;
    app.append(m);
  } else if (action.startsWith("place-")) {
    toast(
      action === "place-unknown"
        ? "Une région encore inconnue. La suite de l’aventure reste à découvrir."
        : action === "place-sanctuary"
          ? "Sanctuaire des Veilleurs · Votre camp actuel."
          : action === "place-coast"
            ? "Côte des naufragés · Le rivage de votre arrivée."
            : "Ruines des Veilleurs · La première bataille de votre alliance.",
    );
  }
});
window.addEventListener("keydown", (e) => {
  if ((e.target as HTMLElement)?.matches("input,select,textarea")) return;
  if (e.code === "Space" && screen === "cinematic") {
    e.preventDefault();
    nextScene();
  }
  if (e.key === "Tab" && screen === "battle" && !busy) {
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
      if (selected) cancel();
      else pause();
    }
  }
  if (screen === "battle" && e.key.startsWith("Arrow")) {
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
