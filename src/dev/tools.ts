import { combatSkin } from "../sprites/combat-skins";
import {
  defaultRecolorSettings,
  recolorSettings,
  setRecolorSettings,
} from "../sprites/recolor";
import { requiredAnimations } from "../sprites/requirements";
import { TerrainRenderer } from "../terrain";
import { visualClasses } from "../sprites/visual-classes";
import {
  teamPalette,
  colorForOwner,
  setTeamColors,
  type TeamColor,
  type TeamColors,
} from "../game/team-colors";
import {
  readGalleryTeamPreferences as readTeamPreferences,
  writeGalleryTeamPreferences as writeTeamPreferences,
} from "../team-preferences";
import "./tools.css";
import {
  classes,
  categoryNames,
  skillNames,
  tuning,
  weaponTriangles,
  type Gender,
} from "../data/classes";
import { weaponCatalog } from "../data/weapons";
import {
  spriteCatalog,
  drawResourceFrame as drawFrame,
  resourceStatus,
  spriteImage,
  looseSpriteFiles,
} from "../sprites/resources";
import {
  animationNames,
  findProfile,
  resolveClip,
  animationStatus,
  statusNames,
  type SpriteProfile,
} from "../sprites/catalog";
const esc = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
export function openSystems(app: HTMLElement, onBack: () => void) {
  let selected = "raider";
  const render = () => {
    const c = classes[selected];
    app.innerHTML = `<main class="dev-screen"><header class="dev-top"><div><span class="dev-badge">DÉVELOPPEMENT UNIQUEMENT</span><h1>Classes et systèmes</h1></div><button data-dev-back>Retour au menu</button></header><div class="dev-note">Statistiques et bonus de test, à équilibrer. Les promotions Völva et Hamrammr sont configurées. Leurs ressources manquantes restent signalées.</div><div class="dev-layout"><aside class="dev-classes">${Object.values(
      classes,
    )
      .map(
        (x) =>
          `<button data-class="${x.id}" class="${x.id === selected ? "active" : ""}">${x.name}<small>${x.faction} · ${x.stage}</small></button>`,
      )
      .join(
        "",
      )}</aside><section><h1>${c.name}</h1><p>${c.role}</p><table class="dev-table"><tbody><tr><th>Niveaux</th><td>1–${c.maxLevel} · remise au niveau 1 après changement de classe</td></tr><tr><th>Statistiques initiales (test)</th><td>${Object.entries(
      c.stats,
    )
      .map(([k, v]) => `${k} ${v}`)
      .join(
        " · ",
      )}</td></tr><tr><th>Armes compatibles</th><td>${c.weapons.map((w) => categoryNames[w]).join(", ")}</td></tr><tr><th>Capacités immédiates</th><td>${c.skills.map((s) => skillNames[s]).join(", ") || "Aucune capacité particulière"}</td></tr><tr><th>Promotions configurées</th><td>${c.promotions.map((id) => classes[id].name).join(" · ") || (c.pendingPromotions ? "Deux voies à préciser" : c.stage === "recruit" ? "Exactement deux voies dans les données du personnage" : "—")}</td></tr><tr><th>Ressources graphiques</th><td>${spriteCatalog.profiles.filter((p) => p.classId === c.id).length} profil(s) réellement enregistré(s)</td></tr></tbody></table><h2>Portées et armes</h2><table class="dev-table"><tr><th>Arme</th><th>Portée</th><th>Attaques</th><th>Rareté</th></tr>${Object.values(
      weaponCatalog,
    )
      .filter((w) => c.weapons.includes(w.category))
      .map(
        (w) =>
          `<tr><td>${w.name}</td><td>${w.min}–${w.max}${c.skills.includes("long_range") && w.category === "bow" ? " (+1 de classe)" : ""}</td><td>${w.attacks}</td><td>${w.rarity}</td></tr>`,
      )
      .join(
        "",
      )}</table><h2>Triangles</h2>${weaponTriangles.map((r) => `<p>${r.map((x) => categoryNames[x]).join(" > ")} > ${categoryNames[r[0]]}</p>`).join("")}<p>Avantage de test : dégâts +${tuning.triangle.damage}, précision +${tuning.triangle.hit}. Les efficacités utilisent un bonus de test de ${tuning.effectiveDamage} dégâts.</p><details><summary>Configuration de test des capacités</summary><pre>${esc(JSON.stringify(tuning, null, 2))}</pre></details></section></div></main>`;
    app.querySelector("[data-dev-back]")!.addEventListener("click", onBack);
    app.querySelectorAll<HTMLElement>("[data-class]").forEach(
      (b) =>
        (b.onclick = () => {
          selected = b.dataset.class!;
          render();
        }),
    );
  };
  render();
  return () => {};
}
type Selection = {
  color: TeamColor;
  classId: string;
  gender: string;
  equipment: string;
  state: string;
  animation: string;
};
type Review = { status: string; comment: string };
export function openGallery(app: HTMLElement, onBack: () => void) {
  const initialRecolorSettings = recolorSettings();
  function drawResourceFrame(...args: Parameters<typeof drawFrame>) {
    const [ctx, , , , x, y, w, h] = args;
    ctx.save();
    if (mirrored) {
      ctx.translate(2 * x + w, 0);
      ctx.scale(-1, 1);
    }
    const r = drawFrame(...args);
    ctx.restore();
    if (groundLine) {
      ctx.strokeStyle = "#e7d297aa";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, y + h * 0.9);
      ctx.lineTo(x + w, y + h * 0.9);
      ctx.stroke();
    }
    return r;
  }
  const classes = visualClasses;
  const terrainImage = new Image();
  terrainImage.src = import.meta.env.BASE_URL + "assets/regional-tiles.png";
  const terrain = new TerrainRenderer(terrainImage);
  let renderMode = "tactical";
  let previewTerrain = "road",
    groundLine = true,
    mirrored = false;
  const previewLocations: Record<string, [number, number]> = {
    road: [31, 20],
    forest: [17, 17],
    coast: [5, 5],
    convoy: [50, 34],
  };
  let selection: Selection = {
      color: readTeamPreferences().player1,
      classId: "raider",
      gender: "male",
      equipment: "axe-shield",
      state: "default",
      animation: "idle",
    },
    zoom = 1,
    playing = true,
    started = performance.now(),
    paused = 0,
    frame = 0,
    raf = 0,
    compared: Selection[] = [];
  let teamColors = readTeamPreferences(),
    faction = "all",
    stage = "all";
  let reviews: Record<string, Review> = {};
  try {
    reviews = JSON.parse(localStorage.getItem("lte-sprite-reviews-v1") ?? "{}");
  } catch {}
  const getProfile = (s = selection) => {
    const p = findProfile(
      spriteCatalog.profiles,
      s.classId,
      s.gender,
      s.equipment,
      s.state,
    );
    return renderMode === "combat" ? combatSkin(p)?.profile : p;
  };
  const key = (s = selection) =>
    [renderMode, s.classId, s.gender, s.equipment, s.state, s.animation].join(
      ":",
    );
  const saveReview = () => {
    reviews[key()] = {
      status: (app.querySelector("#sprite-status") as HTMLSelectElement).value,
      comment: (app.querySelector("#sprite-comment") as HTMLTextAreaElement)
        .value,
    };
    localStorage.setItem("lte-sprite-reviews-v1", JSON.stringify(reviews));
  };
  const selectClass = (id: string) => {
    const c = classes[id],
      p = spriteCatalog.profiles.find((p) => p.classId === id);
    selection = {
      color: selection.color,
      classId: id,
      gender: p?.gender ?? "male",
      equipment:
        p?.equipment ??
        c.equipment?.[0] ??
        weaponCatalog[c.starter[0]]?.visual ??
        "",
      state: p?.state ?? c.visualStates[0],
      animation: "idle",
    };
    started = performance.now();
    paused = frame = 0;
  };
  function render() {
    const c = classes[selection.classId],
      p = getProfile(),
      clip = resolveClip(p, selection.animation),
      r = reviews[key()] ?? { status: "À examiner", comment: "" };
    const states = [
        ...new Set([
          ...c.visualStates,
          ...spriteCatalog.profiles
            .filter((p) => p.classId === c.id)
            .map((p) => p.state),
        ]),
      ],
      equipment = [
        ...new Set([
          ...(c.equipment ?? []),
          ...c.starter.map((w) => weaponCatalog[w].visual),
          ...spriteCatalog.profiles
            .filter((p) => p.classId === c.id)
            .map((p) => p.equipment),
        ]),
      ],
      animations = requiredAnimations(
        c,
        selection,
        Object.keys(p?.clips ?? {}),
      );
    app.innerHTML = `<main class="dev-screen sprite-gallery"><header class="dev-top"><div><span class="dev-badge">DÉVELOPPEMENT UNIQUEMENT</span><h1>Galerie des sprites</h1></div><button data-gallery-back>Retour au menu</button></header><p>Ressources tactiques réellement utilisées par le jeu, mutualisées par classe, sexe, équipement et état. Aucun visuel de remplacement n’est créé pour un élément manquant.</p><div class="dev-controls"><label>Faction<select id="gallery-faction">${[
      ["all", "Toutes"],
      ["north", "Vikings"],
      ["knight", "Chevaliers"],
      ["enemy", "Monstres"],
    ]
      .map(
        ([id, label]) =>
          `<option value="${id}" ${faction === id ? "selected" : ""}>${label}</option>`,
      )
      .join(
        "",
      )}</select></label><label>Classe / promotion<select id="gallery-stage">${[
      ["all", "Toutes"],
      ["base", "Classes de base"],
      ["advanced", "Promotions"],
      ["recruit", "Recrues"],
      ["enemy", "Monstres"],
    ]
      .map(
        ([id, label]) =>
          `<option value="${id}" ${stage === id ? "selected" : ""}>${label}</option>`,
      )
      .join(
        "",
      )}</select></label><label>Couleur de l’aperçu<select id="sprite-color">${Object.entries(
      teamPalette,
    )
      .map(
        ([id, color]) =>
          `<option value="${id}" ${selection.color === id ? "selected" : ""}>${color.name}</option>`,
      )
      .join(
        "",
      )}</select></label><button data-three-teams>Comparer J1 / J2 / ennemis</button></div><details class="dev-note"><summary>Préférences des couleurs de galerie</summary><div class="dev-controls">${(
      [
        ["player1", "Joueur 1"],
        ["player2", "Joueur 2"],
        ["enemies", "Ennemis"],
      ] as const
    )
      .map(
        ([key, label]) =>
          `<label>${label}<select data-team-color="${key}">${Object.entries(
            teamPalette,
          )
            .map(
              ([id, color]) =>
                `<option value="${id}" ${teamColors[key] === id ? "selected" : ""}>${color.name}</option>`,
            )
            .join("")}</select></label>`,
      )
      .join(
        "",
      )}</div><p id="gallery-color-error" role="alert"></p><p>Préférences d’aperçu indépendantes de la partie. Le rose est permis ici pour tous. En partie : Options → Couleurs des équipes.</p></details><p class="dev-note">${clip?.recolor === "magenta" ? "Recoloration sélective : seuls les matériaux d’équipe prévus changent." : "Ressource historique : masque de recoloration non préparé pour cette animation. Les couleurs de test ne modifient pas son image."}</p>${spriteCatalog.errors.length ? `<div class="dev-note">${spriteCatalog.errors.map(esc).join("<br>")}</div>` : ""}<div class="dev-layout"><aside class="dev-classes">${Object.values(
      classes,
    )
      .filter(
        (x) =>
          (faction === "all" || x.faction === faction) &&
          (stage === "all" || x.stage === stage),
      )
      .map(
        (x) =>
          `<button data-gallery-class="${x.id}" class="${x.id === c.id ? "active" : ""}">${x.name}<small>${x.faction === "north" ? "Vikings" : x.faction === "knight" ? "Chevaliers" : "Sans-Repos"} · ${x.stage === "advanced" ? "Promotion" : x.stage === "recruit" ? "Recrue" : x.stage === "base" ? "Classe de base" : "Ennemi"} · ${spriteCatalog.profiles.some((p) => p.classId === x.id) ? "ressource présente" : "sprite manquant"}</small>${Object.keys(reviews).some((k) => k.startsWith(x.id + ":") && reviews[k].status === "À corriger") ? "<small>⚑ À corriger</small>" : ""}</button>`,
      )
      .join(
        "",
      )}<p>Völva et Hamrammr : références masculines et forme d’ours dédiées ; les variantes manquantes restent vides.</p></aside><section><h1>${c.name}</h1><div class="dev-controls"><label>Ressources<select id="sprite-render-mode"><option value="tactical" ${renderMode === "tactical" ? "selected" : ""}>Sprites tactiques</option><option value="combat" ${renderMode === "combat" ? "selected" : ""}>Skins de combat V2</option></select></label><label>Variante<select id="sprite-gender">${["male", "female", ...(p?.gender === "any" ? ["any"] : [])].map((g) => `<option value="${g}" ${g === selection.gender ? "selected" : ""}>${g === "male" ? "Homme" : g === "female" ? "Femme" : "Non sexué"}</option>`).join("")}</select></label><label>Équipement<select id="sprite-equipment">${equipment.map((e) => `<option value="${e}" ${e === selection.equipment ? "selected" : ""}>${e}</option>`).join("")}</select></label><label>État<select id="sprite-state">${states.map((v) => `<option value="${v}" ${v === selection.state ? "selected" : ""}>${v === "carried" ? "Bannière portée" : v === "planted" ? "Bannière plantée" : v === "fortified" ? "Fortifié" : v === "bear" ? "Ours" : c.id === "hamrammr" ? "Humain" : "Standard"}</option>`).join("")}</select></label><label>Animation<select id="sprite-animation">${animations.map((id) => `<option value="${id}" ${id === selection.animation ? "selected" : ""}>${animationNames[id] ?? id} · ${statusNames[animationStatus(p, id)]}</option>`).join("")}</select></label><label>Zoom net<select id="sprite-zoom">${[1, 2, 3, 4, 5].map((n) => `<option value="${n}" ${zoom === n ? "selected" : ""}>×${n}</option>`).join("")}</select></label></div><p class="dev-note"><strong>${statusNames[animationStatus(p, selection.animation)]}</strong> · ${clip?.note ?? (clip && clip.frames.length === 1 ? "Pose statique : ce n’est pas une animation complète." : clip?.status === "provisional" ? "Séquence provisoire à retravailler." : !clip ? "Aucune ressource enregistrée." : "Séquence de poses distinctes.")} ${p?.note ?? ""}</p><div class="dev-controls"><label><input type="checkbox" id="ground-line" ${groundLine ? "checked" : ""}>Ligne de sol commune</label><label><input type="checkbox" id="mirror-sprites" ${mirrored ? "checked" : ""}>Inverser l’orientation</label><button data-export-library>Bilan des sprites et animations (JSON)</button><label>Terrain d’inspection<select id="preview-terrain">${[
      ["road", "Route près des ruines"],
      ["forest", "Forêt"],
      ["coast", "Côte"],
      ["convoy", "Route du convoi"],
    ]
      .map(
        ([id, name]) =>
          `<option value="${id}" ${previewTerrain === id ? "selected" : ""}>${name}</option>`,
      )
      .join(
        "",
      )}</select></label></div><div class="visual-map-preview"><canvas id="visual-map" width="280" height="280" aria-label="Aperçu visuel sur la carte validée, sans partie ni combat"></canvas><p>Échelle tactique · une case de 40 px<br>Lecture visuelle uniquement : aucune unité déployée, aucune partie lancée.</p></div><details class="recolor-tuning"><summary>Tolérance de recoloration HSV</summary><div class="dev-controls"><label>Teinte centrale<input id="mask-hue" type="number" min="0" max="359" value="${recolorSettings().hue}"></label><label>Tolérance de teinte (°)<input id="mask-tolerance" type="number" min="0" max="70" value="${recolorSettings().hueTolerance}"></label><label>Saturation minimale (%)<input id="mask-saturation" type="number" min="0" max="100" value="${Math.round(recolorSettings().saturation * 100)}"></label><label>Voisinage des contours (px)<input id="mask-distance" type="number" min="0" max="12" value="${recolorSettings().edgeDistance}"></label><button data-reset-mask>Rétablir la tolérance</button></div><p>Réglages d’aperçu : aucune image source retouchée. L’original et la version recolorée lisent exactement la même pose.</p></details><div class="sprite-preview"><div class="sprite-stage" data-main-stage>${clip ? `<div class="recolor-comparison"><figure><figcaption>Original</figcaption><canvas id="sprite-original" width="${128 * zoom}" height="${128 * zoom}"></canvas></figure><figure><figcaption>Recoloré</figcaption><canvas id="sprite-canvas" width="${128 * zoom}" height="${128 * zoom}"></canvas></figure></div>` : `<div class="sprite-missing"><strong>${p ? "Animation manquante" : "Sprite manquant"}</strong><p>${esc(c.name)} · ${esc(selection.gender)} · ${esc(selection.equipment)} · ${esc(selection.state)}<br>Aucune ressource substituée.</p></div>`}</div><div class="sprite-details"><div class="dev-controls"><button data-play ${clip ? "" : "disabled"}>${playing ? "Arrêter" : "Lancer"}</button><button data-replay ${clip ? "" : "disabled"}>Rejouer</button><button data-prev ${clip ? "" : "disabled"}>Image précédente</button><button data-next ${clip ? "" : "disabled"}>Image suivante</button></div><p id="sprite-frame">${clip ? `${clip.frames.length} image(s) · ${clip.fps} i/s` : "Aucune animation à lire"}</p><div class="resource-path">${clip ? `${esc(clip.source)} · ligne ${clip.row} · cellules ${clip.columns} × ${clip.rows}` : "Ressource non enregistrée"}</div>${p && "reuse" in (p.clips[selection.animation] ?? {}) ? "<p>Cette séquence réutilise explicitement une autre animation du même profil.</p>" : ""}<button data-pin>Ajouter à la comparaison (${compared.length}/4)</button><div class="sprite-review"><label>Statut<select id="sprite-status">${["À examiner", "Validé", "À corriger"].map((v) => `<option ${r.status === v ? "selected" : ""}>${v}</option>`).join("")}</select></label><label>Commentaire<textarea id="sprite-comment" maxlength="2000">${esc(r.comment)}</textarea></label></div><p>Suivi enregistré dans ce navigateur pour cette variante et cette animation.</p><button data-export>Exporter les signalements JSON</button></div></div><div class="sprite-compare">${compared.map((s, i) => `<article><h3>${classes[s.classId].name}</h3><p>${s.gender} · ${teamPalette[s.color].name} · ${s.state} · ${animationNames[s.animation] ?? s.animation}</p><div class="sprite-stage">${resolveClip(getProfile(s), s.animation) ? `<canvas data-compare="${i}" width="256" height="256"></canvas>` : '<div class="sprite-missing">Ressource manquante</div>'}</div><button data-remove="${i}">Retirer</button></article>`).join("")}</div><p>${Object.keys(looseSpriteFiles).length} fichier(s) d’image dans le dossier extensible. Les planches historiques sont référencées par leur description partagée ; les nouveaux fichiers .sprite.json sont découverts automatiquement.</p></section></div></main>`;
    for (const [id, key, factor] of [
      ["mask-hue", "hue", 1],
      ["mask-tolerance", "hueTolerance", 1],
      ["mask-saturation", "saturation", 0.01],
      ["mask-distance", "edgeDistance", 1],
    ] as const)
      app.querySelector<HTMLInputElement>("#" + id)!.oninput = (e) =>
        setRecolorSettings({
          [key]: Number((e.target as HTMLInputElement).value) * factor,
        });
    app.querySelector<HTMLElement>("[data-reset-mask]")!.onclick = () => {
      setRecolorSettings({ ...defaultRecolorSettings });
      render();
    };
    (app.querySelector("#preview-terrain") as HTMLSelectElement).onchange = (
      e,
    ) => {
      previewTerrain = (e.target as HTMLSelectElement).value;
    };
    app.querySelector<HTMLInputElement>("#ground-line")!.onchange = (e) =>
      (groundLine = (e.target as HTMLInputElement).checked);
    app.querySelector<HTMLInputElement>("#mirror-sprites")!.onchange = (e) =>
      (mirrored = (e.target as HTMLInputElement).checked);
    (app.querySelector("[data-export-library]") as HTMLButtonElement).onclick =
      () => {
        const rows = Object.values(classes).map((c) => ({
          id: c.id,
          classe: c.name,
          faction: c.faction,
          profils: spriteCatalog.profiles
            .filter((p) => p.classId === c.id)
            .map((p) => ({
              sexe: p.gender,
              equipement: p.equipment,
              etat: p.state,
              lot: p.lot,
              animations: Object.fromEntries(
                requiredAnimations(c, p, Object.keys(p.clips)).map((id) => [
                  id,
                  {
                    statut: statusNames[animationStatus(p, id)],
                    note: resolveClip(p, id)?.note ?? "",
                  },
                ]),
              ),
            })),
        }));
        const a = document.createElement("a");
        a.href = URL.createObjectURL(
          new Blob([JSON.stringify(rows, null, 2)], {
            type: "application/json",
          }),
        );
        a.download = "bilan-bibliotheque-sprites.json";
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 0);
      };
    (app.querySelector("#sprite-color") as HTMLSelectElement).onchange = (
      e,
    ) => {
      selection.color = (e.target as HTMLSelectElement).value as TeamColor;
      render();
    };
    (app.querySelector("#gallery-faction") as HTMLSelectElement).onchange = (
      e,
    ) => {
      faction = (e.target as HTMLSelectElement).value;
      render();
    };
    (app.querySelector("#gallery-stage") as HTMLSelectElement).onchange = (
      e,
    ) => {
      stage = (e.target as HTMLSelectElement).value;
      render();
    };
    (app.querySelector("[data-three-teams]") as HTMLButtonElement).onclick =
      () => {
        compared = [
          teamColors.player1,
          teamColors.player2,
          teamColors.enemies,
        ].map((color) => ({ ...selection, color }));
        render();
      };
    app
      .querySelectorAll<HTMLSelectElement>("[data-team-color]")
      .forEach((select) => {
        select.onchange = () => {
          try {
            const next = {
              ...teamColors,
              [select.dataset.teamColor!]: select.value,
            } as TeamColors;
            setTeamColors({}, next);
            teamColors = next;
            writeTeamPreferences(next);
            render();
          } catch (error) {
            app.querySelector("#gallery-color-error")!.textContent = (
              error as Error
            ).message;
            select.value =
              teamColors[select.dataset.teamColor as keyof TeamColors];
          }
        };
      });
    app.querySelector("[data-gallery-back]")!.addEventListener("click", onBack);
    app.querySelectorAll<HTMLElement>("[data-gallery-class]").forEach(
      (b) =>
        (b.onclick = () => {
          selectClass(b.dataset.galleryClass!);
          render();
        }),
    );
    for (const [id, field] of [
      ["sprite-gender", "gender"],
      ["sprite-equipment", "equipment"],
      ["sprite-state", "state"],
      ["sprite-animation", "animation"],
    ] as const)
      (app.querySelector("#" + id) as HTMLSelectElement).onchange = (e) => {
        selection[field] = (e.target as HTMLSelectElement).value;
        if (field === "state" && selection.classId === "standard_bearer")
          selection.equipment =
            selection.state === "planted" ? "sword" : "banner";
        if (field === "state" && selection.classId === "hamrammr")
          selection.equipment =
            selection.state === "bear" ? "claws" : "healing";
        started = performance.now();
        paused = frame = 0;
        render();
      };
    (app.querySelector("#sprite-render-mode") as HTMLSelectElement).onchange = (
      e,
    ) => {
      renderMode = (e.target as HTMLSelectElement).value;
      if (!resolveClip(getProfile(), selection.animation))
        selection.animation = "idle";
      frame = paused = 0;
      started = performance.now();
      render();
    };
    (app.querySelector("#sprite-zoom") as HTMLSelectElement).onchange = (e) => {
      zoom = Number((e.target as HTMLSelectElement).value);
      render();
    };
    (app.querySelector("[data-play]") as HTMLButtonElement).onclick = () => {
      if (playing) paused = performance.now() - started;
      else {
        if (clip?.loop === false && frame >= clip.frames.length - 1) {
          paused = frame = 0;
        }
        started = performance.now() - paused;
      }
      playing = !playing;
      render();
    };
    (app.querySelector("[data-replay]") as HTMLButtonElement).onclick = () => {
      started = performance.now();
      paused = frame = 0;
      playing = true;
      render();
    };
    for (const [id, delta] of [
      ["data-prev", -1],
      ["data-next", 1],
    ] as const)
      (app.querySelector("[" + id + "]") as HTMLButtonElement).onclick = () => {
        playing = false;
        frame = Math.max(0, frame + delta);
        paused = (frame / (clip?.fps ?? 1)) * 1000;
        render();
      };
    (app.querySelector("[data-pin]") as HTMLButtonElement).onclick = () => {
      if (compared.length < 4) {
        compared.push({ ...selection });
        render();
      }
    };
    app.querySelectorAll<HTMLElement>("[data-remove]").forEach(
      (b) =>
        (b.onclick = () => {
          compared.splice(Number(b.dataset.remove), 1);
          render();
        }),
    );
    (app.querySelector("#sprite-status") as HTMLSelectElement).onchange =
      saveReview;
    (app.querySelector("#sprite-comment") as HTMLTextAreaElement).oninput =
      saveReview;
    (app.querySelector("[data-export]") as HTMLButtonElement).onclick = () => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(
        new Blob([JSON.stringify(reviews, null, 2)], {
          type: "application/json",
        }),
      );
      a.download = "les-terres-egarees-sprite-reviews.json";
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 0);
    };
  }
  function tick(now: number) {
    const p = getProfile(),
      clip = resolveClip(p, selection.animation);
    if (playing && clip) {
      frame = Math.floor(((now - started) / 1000) * clip.fps);
      if (clip.loop === false && frame >= clip.frames.length) {
        frame = clip.frames.length - 1;
        paused = (frame / clip.fps) * 1000;
        playing = false;
        const play = app.querySelector("[data-play]");
        if (play) play.textContent = "Lancer";
      }
    }
    const canvas = app.querySelector<HTMLCanvasElement>("#sprite-canvas");
    if (canvas && clip) {
      const w = 128,
        h = 128;
      if (canvas.width !== w * zoom || canvas.height !== h * zoom) {
        canvas.width = w * zoom;
        canvas.height = h * zoom;
      }
      const ctx = canvas.getContext("2d")!;
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const status = resourceStatus(p, selection.animation);
      if (status === "broken") {
        const stage = app.querySelector("[data-main-stage]")!;
        stage.innerHTML =
          '<div class="sprite-missing">Fichier graphique introuvable</div>';
      } else
        drawResourceFrame(
          ctx,
          p,
          selection.animation,
          frame,
          0,
          0,
          canvas.width,
          canvas.height,
          true,
          selection.color,
        );
      const original = app.querySelector<HTMLCanvasElement>("#sprite-original");
      if (original) {
        if (
          original.width !== canvas.width ||
          original.height !== canvas.height
        ) {
          original.width = canvas.width;
          original.height = canvas.height;
        }
        const c = original.getContext("2d")!;
        c.clearRect(0, 0, original.width, original.height);
        drawResourceFrame(
          c,
          p,
          selection.animation,
          frame,
          0,
          0,
          original.width,
          original.height,
          true,
        );
      }
      const info = app.querySelector("#sprite-frame");
      if (info)
        info.textContent = `Image ${(clip.loop === false ? Math.min(frame, clip.frames.length - 1) : frame % clip.frames.length) + 1} / ${clip.frames.length} · ${clip.fps} i/s · ${playing ? "lecture" : "arrêt"}`;
    }
    const mapCanvas = app.querySelector<HTMLCanvasElement>("#visual-map");
    if (mapCanvas && terrainImage.complete && terrainImage.naturalWidth) {
      const surface = terrain.layer("regional", ["north", "knight"]);
      if (surface) {
        const ctx = mapCanvas.getContext("2d")!,
          [x, y] = previewLocations[previewTerrain];
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(
          surface,
          (x - 3) * 64,
          (y - 3) * 64,
          448,
          448,
          0,
          0,
          280,
          280,
        );
        ctx.strokeStyle = "#e4d9bb33";
        for (let i = 0; i <= 7; i++) {
          ctx.beginPath();
          ctx.moveTo(i * 40, 0);
          ctx.lineTo(i * 40, 280);
          ctx.moveTo(0, i * 40);
          ctx.lineTo(280, i * 40);
          ctx.stroke();
        }
        drawResourceFrame(
          ctx,
          p,
          selection.animation,
          frame,
          120,
          114,
          40,
          46,
          true,
          selection.color,
        );
      }
    }
    for (const s of compared) {
      const i = compared.indexOf(s),
        c = app.querySelector<HTMLCanvasElement>(`[data-compare="${i}"]`),
        clip = resolveClip(getProfile(s), s.animation);
      if (c && clip) {
        const ctx = c.getContext("2d")!;
        ctx.clearRect(0, 0, 256, 256);
        drawResourceFrame(
          ctx,
          getProfile(s),
          s.animation,
          playing ? Math.floor(((now - started) / 1000) * clip.fps) : frame,
          0,
          0,
          256,
          256,
          true,
          s.color,
        );
      }
    }
    raf = requestAnimationFrame(tick);
  }
  render();
  raf = requestAnimationFrame(tick);
  return () => {
    cancelAnimationFrame(raf);
    setRecolorSettings(initialRecolorSettings);
  };
}
