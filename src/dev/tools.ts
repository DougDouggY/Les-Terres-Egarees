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
  drawResourceFrame,
  resourceStatus,
  spriteImage,
  looseSpriteFiles,
} from "../sprites/resources";
import {
  animationNames,
  findProfile,
  resolveClip,
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
    app.innerHTML = `<main class="dev-screen"><header class="dev-top"><div><span class="dev-badge">DÉVELOPPEMENT UNIQUEMENT</span><h1>Classes et systèmes</h1></div><button data-dev-back>Retour au menu</button></header><div class="dev-note">Statistiques et bonus de test, à équilibrer. Les promotions du Chaman ne sont pas définies : aucune capacité ni identité supplémentaire n’est inventée.</div><div class="dev-layout"><aside class="dev-classes">${Object.values(
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
  classId: string;
  gender: string;
  equipment: string;
  state: string;
  animation: string;
};
type Review = { status: string; comment: string };
export function openGallery(app: HTMLElement, onBack: () => void) {
  let selection: Selection = {
      classId: "raider",
      gender: "male",
      equipment: "axe-shield",
      state: "default",
      animation: "idle",
    },
    zoom = 3,
    playing = true,
    started = performance.now(),
    paused = 0,
    frame = 0,
    raf = 0,
    compared: Selection[] = [];
  let reviews: Record<string, Review> = {};
  try {
    reviews = JSON.parse(localStorage.getItem("lte-sprite-reviews-v1") ?? "{}");
  } catch {}
  const getProfile = (s = selection) =>
    findProfile(
      spriteCatalog.profiles,
      s.classId,
      s.gender,
      s.equipment,
      s.state,
    );
  const key = (s = selection) =>
    [s.classId, s.gender, s.equipment, s.state, s.animation].join(":");
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
      classId: id,
      gender: p?.gender ?? "male",
      equipment: p?.equipment ?? weaponCatalog[c.starter[0]].visual,
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
          ...c.starter.map((w) => weaponCatalog[w].visual),
          ...spriteCatalog.profiles
            .filter((p) => p.classId === c.id)
            .map((p) => p.equipment),
        ]),
      ],
      animations = [
        ...new Set([
          ...Object.keys(animationNames),
          ...Object.keys(p?.clips ?? {}),
        ]),
      ];
    app.innerHTML = `<main class="dev-screen sprite-gallery"><header class="dev-top"><div><span class="dev-badge">DÉVELOPPEMENT UNIQUEMENT</span><h1>Galerie des sprites</h1></div><button data-gallery-back>Retour au menu</button></header><p>Ressources tactiques réellement utilisées par le jeu, mutualisées par classe, sexe, équipement et état. Aucun visuel de remplacement n’est créé pour un élément manquant.</p>${spriteCatalog.errors.length ? `<div class="dev-note">${spriteCatalog.errors.map(esc).join("<br>")}</div>` : ""}<div class="dev-layout"><aside class="dev-classes">${Object.values(
      classes,
    )
      .map(
        (x) =>
          `<button data-gallery-class="${x.id}" class="${x.id === c.id ? "active" : ""}">${x.name}<small>${x.faction === "north" ? "Vikings" : x.faction === "knight" ? "Chevaliers" : "Ressource ennemie existante"} · ${x.stage === "advanced" ? "Promotion" : x.stage === "recruit" ? "Recrue" : x.stage === "base" ? "Classe de base" : "Ennemi"} · ${spriteCatalog.profiles.some((p) => p.classId === x.id) ? "ressource présente" : "sprite manquant"}</small>${Object.keys(reviews).some((k) => k.startsWith(x.id + ":") && reviews[k].status === "À corriger") ? "<small>⚑ À corriger</small>" : ""}</button>`,
      )
      .join(
        "",
      )}<p>Chaman : deux promotions à définir, sans sprite ni caractéristiques inventés.</p></aside><section><h1>${c.name}</h1><div class="dev-controls"><label>Variante<select id="sprite-gender">${["male", "female", ...(p?.gender === "any" ? ["any"] : [])].map((g) => `<option value="${g}" ${g === selection.gender ? "selected" : ""}>${g === "male" ? "Homme" : g === "female" ? "Femme" : "Non sexué"}</option>`).join("")}</select></label><label>Équipement<select id="sprite-equipment">${equipment.map((e) => `<option value="${e}" ${e === selection.equipment ? "selected" : ""}>${e}</option>`).join("")}</select></label><label>État<select id="sprite-state">${states.map((v) => `<option value="${v}" ${v === selection.state ? "selected" : ""}>${v === "carried" ? "Bannière portée" : v === "planted" ? "Bannière plantée" : v === "fortified" ? "Fortifié" : "Standard"}</option>`).join("")}</select></label><label>Animation<select id="sprite-animation">${animations.map((id) => `<option value="${id}" ${id === selection.animation ? "selected" : ""}>${animationNames[id] ?? id} · ${resolveClip(p, id) ? "disponible" : "manquante"}</option>`).join("")}</select></label><label>Zoom net<select id="sprite-zoom">${[1, 2, 3, 4, 5].map((n) => `<option value="${n}" ${zoom === n ? "selected" : ""}>×${n}</option>`).join("")}</select></label></div><div class="sprite-preview"><div class="sprite-stage" data-main-stage>${clip ? `<canvas id="sprite-canvas" width="${128 * zoom}" height="${128 * zoom}"></canvas>` : `<div class="sprite-missing"><strong>${p ? "Animation manquante" : "Sprite manquant"}</strong><p>${esc(c.name)} · ${esc(selection.gender)} · ${esc(selection.equipment)} · ${esc(selection.state)}<br>Aucune ressource substituée.</p></div>`}</div><div class="sprite-details"><div class="dev-controls"><button data-play ${clip ? "" : "disabled"}>${playing ? "Arrêter" : "Lancer"}</button><button data-replay ${clip ? "" : "disabled"}>Rejouer</button><button data-prev ${clip ? "" : "disabled"}>Image précédente</button><button data-next ${clip ? "" : "disabled"}>Image suivante</button></div><p id="sprite-frame">${clip ? `${clip.frames.length} image(s) · ${clip.fps} i/s` : "Aucune animation à lire"}</p><div class="resource-path">${clip ? `${esc(clip.source)} · ligne ${clip.row} · cellules ${clip.columns} × ${clip.rows}` : "Ressource non enregistrée"}</div>${p && "reuse" in (p.clips[selection.animation] ?? {}) ? "<p>Cette séquence réutilise l’animation d’attaque, comme le jeu.</p>" : ""}<button data-pin>Ajouter à la comparaison (${compared.length}/4)</button><div class="sprite-review"><label>Statut<select id="sprite-status">${["À examiner", "Validé", "À corriger"].map((v) => `<option ${r.status === v ? "selected" : ""}>${v}</option>`).join("")}</select></label><label>Commentaire<textarea id="sprite-comment" maxlength="2000">${esc(r.comment)}</textarea></label></div><p>Suivi enregistré dans ce navigateur pour cette variante et cette animation.</p><button data-export>Exporter les signalements JSON</button></div></div><div class="sprite-compare">${compared.map((s, i) => `<article><h3>${classes[s.classId].name}</h3><p>${s.gender} · ${s.state} · ${animationNames[s.animation] ?? s.animation}</p><div class="sprite-stage">${resolveClip(getProfile(s), s.animation) ? `<canvas data-compare="${i}" width="256" height="256"></canvas>` : '<div class="sprite-missing">Ressource manquante</div>'}</div><button data-remove="${i}">Retirer</button></article>`).join("")}</div><p>${Object.keys(looseSpriteFiles).length} fichier(s) d’image dans le dossier extensible. Les planches historiques sont référencées par leur description partagée ; les nouveaux fichiers .sprite.json sont découverts automatiquement.</p></section></div></main>`;
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
            selection.state === "planted" ? "sword" : "lance";
        started = performance.now();
        paused = frame = 0;
        render();
      };
    (app.querySelector("#sprite-zoom") as HTMLSelectElement).onchange = (e) => {
      zoom = Number((e.target as HTMLSelectElement).value);
      render();
    };
    (app.querySelector("[data-play]") as HTMLButtonElement).onclick = () => {
      if (playing) paused = performance.now() - started;
      else started = performance.now() - paused;
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
    if (playing && clip)
      frame = Math.floor(((now - started) / 1000) * clip.fps);
    const canvas = app.querySelector<HTMLCanvasElement>("#sprite-canvas");
    if (canvas && clip) {
      const image = spriteImage(clip.source),
        w = image.naturalWidth ? image.naturalWidth / clip.columns : 128,
        h = image.naturalHeight ? image.naturalHeight / clip.rows : 128;
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
        );
      const info = app.querySelector("#sprite-frame");
      if (info)
        info.textContent = `Image ${(frame % clip.frames.length) + 1} / ${clip.frames.length} · ${clip.fps} i/s · ${playing ? "lecture" : "arrêt"}`;
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
        );
      }
    }
    raf = requestAnimationFrame(tick);
  }
  render();
  raf = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(raf);
}
