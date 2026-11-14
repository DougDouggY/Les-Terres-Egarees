import { castleExperimentPlan } from "../rendering/castle-experiment-layout";
import {
  loadCastleExperiment,
  renderCastleExperiment,
  renderCastleExperimentRoof,
  type CastleExperimentArt,
} from "../rendering/castle-experiment";
import {
  spriteCatalog,
  spriteImage,
  drawResourceFrame,
} from "../sprites/resources";
import { resolveClip } from "../sprites/catalog";
import {
  castlePlan,
  boardingPlan,
  createPlanState,
  doorAt,
  doorAvailable,
  openPlanDoor,
  roofVisible,
  planPath,
  planWalkable,
} from "../data/plan-maps";
import {
  renderPlanBase,
  renderPlanRoof,
  loadPlanArtwork,
  type PlanArtwork,
} from "../rendering/plan-renderer";
const T = 32;
const studies = {
  castle: castlePlan,
  castleNew: castleExperimentPlan,
  boarding: boardingPlan,
};
import "./tools.css";
import "./map-workshop.css";

export function openMapWorkshop(app: HTMLElement, onBack: () => void) {
  app.innerHTML = `<main class="dev-screen map-workshop"><header class="dev-top"><div><span class="dev-badge">CARTES TACTIQUES · HORS CAMPAGNE</span><h1>Atelier des cartes</h1><p>Plans validés · Château et abordage · Aperçus indépendants de la campagne.</p></div><button data-study-back>Retour aux tests</button></header><div class="study-layout"><aside class="study-sidebar"><button class="study-choice" data-study="castle" aria-pressed="true"><strong>01 · Le château oublié</strong><small>42 × 34 cases · portes et toits progressifs</small></button><button class="study-choice" data-study="castleNew" aria-pressed="false"><strong>02 · Château · Nouveau set EC</strong><small>Sol validé · nouveau décor</small></button><button class="study-choice" data-study="boarding" aria-pressed="false"><strong>03 · Abordage naval</strong><small>42 × 34 cases · deux passerelles</small></button><div class="study-note" data-castle-skin><button type="button" data-study-reveal>Tout révéler (aperçu)</button></div><div class="study-doors" data-study-doors></div><div class="study-doors" data-study-chests hidden></div><div class="study-note"><h2>Explorer le décor</h2><p>Cliquez une case praticable : le personnage suit le chemin indiqué. Cliquez une porte accessible, puis choisissez « Clé » ou « Détruire ».</p><p>Glissez pour déplacer la caméra. Molette ou sélecteur pour zoomer. Flèches : déplacer le personnage. Maj + flèches : déplacer la caméra.</p><p>Grille et collisions sont des aides facultatives. Un homme d’armes du jeu, sans ennemis. Vos sauvegardes de campagne restent indépendantes.</p></div></aside><section><div class="study-tools"><label>Zoom <select id="study-zoom" aria-label="Zoom"><option value="1">100 %</option><option value="1.5">150 %</option><option value="2" selected>200 %</option><option value="3">300 %</option><option value="4">400 %</option></select></label><label><input id="study-grid" type="checkbox">Grille</label><label><input id="study-collisions" type="checkbox">Collisions</label><button data-study-fit>Cadrer la carte</button><button data-study-reset>Réinitialiser</button><button data-study-export disabled>Exporter le PNG</button></div><div class="study-stage"><canvas id="study-canvas" tabindex="0" aria-label="Carte de test interactive" aria-describedby="study-cell-tooltip"></canvas><div id="study-cell-tooltip" class="study-cell-tooltip" role="tooltip" hidden></div></div><output class="study-status" aria-live="polite"></output><footer class="study-footer"><span data-study-dimensions></span><span>Textures validées · grille 32 px · export détaillé ×3</span></footer></section></div></main>`;
  const canvas = app.querySelector<HTMLCanvasElement>("#study-canvas")!,
    c = canvas.getContext("2d")!;
  const stage = app.querySelector<HTMLElement>(".study-stage")!;
  const cellTip = app.querySelector<HTMLDivElement>("#study-cell-tooltip")!;
  const hideCellTip = () => {
    cellTip.hidden = true;
  };
  function showCellTip(e: PointerEvent) {
    const k = cellAt(e);
    if (k < 0 || drag || e.pointerType === "touch") {
      hideCellTip();
      return;
    }
    cellTip.textContent = `Case ${k + 1}`;
    cellTip.hidden = false;
    const bounds = stage.getBoundingClientRect();
    cellTip.style.left = `${Math.max(4, Math.min(stage.clientWidth - cellTip.offsetWidth - 4, e.clientX - bounds.left + 12))}px`;
    cellTip.style.top = `${Math.max(4, Math.min(stage.clientHeight - cellTip.offsetHeight - 4, e.clientY - bounds.top + 12))}px`;
  }
  const grid = app.querySelector<HTMLInputElement>("#study-grid")!,
    collisions = app.querySelector<HTMLInputElement>("#study-collisions")!;
  const zoomSelect = app.querySelector<HTMLSelectElement>("#study-zoom")!;
  const status = app.querySelector<HTMLOutputElement>(".study-status")!;
  let map = studies.castle,
    state = createPlanState(map),
    art = renderPlanBase(state),
    roof = renderPlanRoof(state),
    outdoor: PlanArtwork | undefined,
    cursor = map.start,
    zoom = 2;
  let offsetX = 0,
    offsetY = 0,
    preview: number[] = [],
    route: number[] = [],
    timer = 0,
    disposed = false;
  let drag: {
    x: number;
    y: number;
    ox: number;
    oy: number;
    moved: boolean;
  } | null = null;
  const actor =
    spriteCatalog.profiles.find(
      (p) =>
        p.classId === "man_at_arms" &&
        p.gender === "male" &&
        p.equipment === "sword-shield",
    ) ?? spriteCatalog.profiles.find((p) => p.classId === "man_at_arms");
  let actorFrame = 0;
  const label = () => {
    app.querySelector("[data-study-dimensions]")!.textContent =
      `${map.name}${skin === "new" ? " · Nouveau set EC" : ""} · ${map.width} × ${map.height} · ${map.width * T} × ${map.height * T} px`;
  };
  let experiment: CastleExperimentArt | undefined;
  let skinRequest = 0;
  let skin: "approved" | "new" = "approved";
  const openedChests = new Set<number>();
  function refreshArt() {
    const useNew =
      map.id === "castle" && skin === "new" && outdoor && experiment;
    art = useNew
      ? renderCastleExperiment(state, outdoor!, experiment!, openedChests)
      : renderPlanBase(state, outdoor);
    roof = useNew
      ? renderCastleExperimentRoof(state, outdoor!, experiment!)
      : renderPlanRoof(state, outdoor);
    canvas.dataset.skin = useNew ? "new" : "approved";
  }
  const doorNames: Record<number, string> = {
    13: "Porte principale",
    14: "Armurerie",
    15: "Réserve",
    16: "Salle du trône",
    116: "Salle des gardes",
    117: "Bibliothèque",
    10003: "Cantine",
  };
  function toggleChest(id: number) {
    const o = map.objects.find((o) => o.type === "chest" && o.id === id);
    if (!o || skin !== "new" || roofVisible(state, o.y * map.width + o.x))
      return;
    if (openedChests.has(id)) openedChests.delete(id);
    else openedChests.add(id);
    refreshArt();
    chestPanel();
    draw();
    status.textContent = `Coffre de la case ${o.y * map.width + o.x + 1} ${openedChests.has(id) ? "ouvert" : "refermé"}.`;
  }
  function chestPanel() {
    const panel = app.querySelector<HTMLElement>("[data-study-chests]")!;
    panel.hidden = map.id !== "castle" || skin !== "new";
    if (panel.hidden) {
      panel.innerHTML = "";
      return;
    }
    const chests = map.objects.filter((o) => o.type === "chest");
    const visible = chests.filter(
      (o) => !roofVisible(state, o.y * map.width + o.x),
    );
    panel.innerHTML = `<h2>Coffres · avant / après</h2><p>Cliquez un coffre révélé ou utilisez ces boutons pour comparer ses deux états.</p><button data-chests-open ${visible.length ? "" : "disabled"}>Ouvrir les coffres visibles</button><button data-chests-close ${openedChests.size ? "" : "disabled"}>Tout refermer</button>${chests
      .map((o) => {
        const n = o.y * map.width + o.x + 1,
          open = openedChests.has(o.id);
        return `<div class="study-chest-row"><span>Case ${n} · ${open ? "ouvert" : "fermé"}</span><button data-chest="${o.id}" ${visible.includes(o) ? "" : "disabled"} aria-label="${open ? "Fermer" : "Ouvrir"} le coffre de la case ${n}">${open ? "Fermer" : "Ouvrir"}</button></div>`;
      })
      .join("")}`;
    panel
      .querySelectorAll<HTMLButtonElement>("[data-chest]")
      .forEach((b) => (b.onclick = () => toggleChest(Number(b.dataset.chest))));
    panel.querySelector<HTMLButtonElement>("[data-chests-open]")!.onclick =
      () => {
        for (const o of visible) openedChests.add(o.id);
        refreshArt();
        chestPanel();
        draw();
      };
    panel.querySelector<HTMLButtonElement>("[data-chests-close]")!.onclick =
      () => {
        openedChests.clear();
        refreshArt();
        chestPanel();
        draw();
      };
  }
  function doorPanel() {
    chestPanel();
    const panel = app.querySelector<HTMLElement>("[data-study-doors]")!;
    panel.hidden = map.id !== "castle";
    app.querySelector<HTMLElement>("[data-castle-skin]")!.hidden =
      map.id !== "castle";
    panel.innerHTML =
      map.id === "castle"
        ? `<h2>Portes du château</h2><p>Ouvrir avec une clé ou détruire produit la même ouverture. Actions libres dans cet aperçu.</p>${map.doors.map((o) => `<div class="study-door-row"><span>${doorNames[o.id] ?? o.name ?? "Porte"} · ${state.opened.has(o.id) ? "ouverte" : "fermée"}</span><button data-door="${o.id}" data-method="key" ${!doorAvailable(state, o) ? "disabled" : ""} aria-label="Clé — ${doorNames[o.id] ?? "Porte"}">Clé</button><button data-door="${o.id}" data-method="destroy" ${!doorAvailable(state, o) ? "disabled" : ""} aria-label="Détruire — ${doorNames[o.id] ?? "Porte"}">Détruire</button></div>`).join("")}`
        : "";
    panel.querySelectorAll<HTMLButtonElement>("[data-door]").forEach(
      (b) =>
        (b.onclick = () => {
          clearTimeout(timer);
          route = [];
          preview = [];
          if (
            openPlanDoor(
              state,
              Number(b.dataset.door),
              b.dataset.method as "key" | "destroy",
            )
          ) {
            refreshArt();
            doorPanel();
            draw();
            status.textContent = `${doorNames[Number(b.dataset.door)]} ouverte. Les espaces reliés sans porte fermée sont révélés.`;
          }
        }),
    );
  }
  const message = () => {
    status.textContent = `Personnage : colonne ${(cursor % map.width) + 1}, ligne ${Math.floor(cursor / map.width) + 1}. Cliquez une case pour tester son accès.`;
  };
  function draw() {
    if (disposed) return;
    c.imageSmoothingEnabled = false;
    c.fillStyle = "#0a1418";
    c.fillRect(0, 0, canvas.width, canvas.height);
    c.save();
    c.translate(Math.round(offsetX), Math.round(offsetY));
    c.scale(zoom, zoom);
    c.drawImage(art, 0, 0, map.width * T, map.height * T);
    if (collisions.checked)
      for (let k = 0; k < map.tiles.length; k++)
        if (!planWalkable(state, k) && !roofVisible(state, k)) {
          c.fillStyle = "#d76e5e66";
          c.fillRect((k % map.width) * T, Math.floor(k / map.width) * T, T, T);
          c.strokeStyle = "#edb0a9";
          c.lineWidth = 1;
          c.beginPath();
          const x = (k % map.width) * T,
            y = Math.floor(k / map.width) * T;
          c.moveTo(x + 12, y + 12);
          c.lineTo(x + 20, y + 20);
          c.moveTo(x + 20, y + 12);
          c.lineTo(x + 12, y + 20);
          c.stroke();
        }
    if (grid.checked) {
      c.strokeStyle = "#e9e2c044";
      c.lineWidth = 1 / zoom;
      c.beginPath();
      for (let x = 0; x <= map.width; x++) {
        c.moveTo(x * T, 0);
        c.lineTo(x * T, map.height * T);
      }
      for (let y = 0; y <= map.height; y++) {
        c.moveTo(0, y * T);
        c.lineTo(map.width * T, y * T);
      }
      c.stroke();
    }
    const path = route.length ? [cursor, ...route] : preview;
    if (path.length > 1) {
      c.strokeStyle = "#e7cd7c";
      c.lineWidth = 2;
      c.beginPath();
      path.forEach((k, i) => {
        const x = (k % map.width) * T + 16,
          y = Math.floor(k / map.width) * T + 16;
        i ? c.lineTo(x, y) : c.moveTo(x, y);
      });
      c.stroke();
    }
    const x = (cursor % map.width) * T + 16,
      y = Math.floor(cursor / map.width) * T + 16;
    drawResourceFrame(
      c,
      actor,
      route.length ? "move" : "idle",
      actorFrame,
      x - T / 2,
      y - T * 0.72,
      T,
      T * 1.15,
      true,
      "blue",
      "world",
    );
    canvas.dataset.character = actor ? `${actor.classId}:${cursor}` : "missing";
    c.drawImage(roof, 0, 0, map.width * T, map.height * T);
    if (grid.checked) {
      c.strokeStyle = "#e9e2c044";
      c.lineWidth = 1 / zoom;
      c.beginPath();
      for (let x = 0; x <= map.width; x++) {
        c.moveTo(x * T, 0);
        c.lineTo(x * T, map.height * T);
      }
      for (let y = 0; y <= map.height; y++) {
        c.moveTo(0, y * T);
        c.lineTo(map.width * T, y * T);
      }
      c.stroke();
    }
    c.restore();
  }
  function size() {
    canvas.width = Math.round(stage.clientWidth);
    canvas.height = Math.round(stage.clientHeight);
  }
  function center() {
    hideCellTip();
    offsetX = (canvas.width - map.width * T * zoom) / 2;
    offsetY = (canvas.height - map.height * T * zoom) / 2;
    draw();
  }
  function fit() {
    size();
    zoom = Math.max(
      0.5,
      Math.floor(
        Math.min(
          (canvas.width - 32) / (map.width * T),
          (canvas.height - 32) / (map.height * T),
        ) * 2,
      ) / 2,
    );
    syncZoom();
    center();
  }
  function syncZoom() {
    app.querySelector("option[data-fit]")?.remove();
    if (!Array.from(zoomSelect.options).some((o) => Number(o.value) === zoom)) {
      const o = new Option(`${zoom * 100} %`, String(zoom));
      o.dataset.fit = "true";
      zoomSelect.add(o);
    }
    zoomSelect.value = String(zoom);
  }
  function changeZoom(
    value: number,
    x = canvas.width / 2,
    y = canvas.height / 2,
  ) {
    hideCellTip();
    const next = Math.max(0.5, Math.min(4, value));
    offsetX = x - ((x - offsetX) * next) / zoom;
    offsetY = y - ((y - offsetY) * next) / zoom;
    zoom = next;
    syncZoom();
    draw();
  }
  function cellAt(e: PointerEvent) {
    const bounds = canvas.getBoundingClientRect(),
      x = Math.floor((e.clientX - bounds.left - offsetX) / zoom / T),
      y = Math.floor((e.clientY - bounds.top - offsetY) / zoom / T);
    return x < 0 || y < 0 || x >= map.width || y >= map.height
      ? -1
      : y * map.width + x;
  }
  function move(to: number) {
    clearTimeout(timer);
    route = [];
    preview = [];
    const chest = map.objects.find(
      (o) =>
        o.type === "chest" &&
        to % map.width >= o.x &&
        to % map.width < o.x + o.w &&
        Math.floor(to / map.width) >= o.y &&
        Math.floor(to / map.width) < o.y + o.h,
    );
    if (chest && skin === "new" && !roofVisible(state, to)) {
      toggleChest(chest.id);
      return;
    }
    const door = doorAt(map, to);
    if (door && !state.opened.has(door.id)) {
      status.textContent = doorAvailable(state, door)
        ? `${doorNames[door.id]} : choisissez Clé ou Détruire dans le panneau des portes.`
        : "Cette porte est encore cachée. Ouvrez d’abord les accès qui y conduisent.";
      app.querySelector<HTMLElement>(`[data-door="${door.id}"]`)?.focus();
      draw();
      return;
    }
    const path = planPath(state, cursor, to);
    if (!path) {
      status.textContent =
        "Case inaccessible : mur, obstacle, toit fermé, bastingage ou eau. Le personnage reste sur une case praticable.";
      draw();
      return;
    }
    route = path.slice(1);
    status.textContent = `Chemin praticable : ${route.length} case${route.length > 1 ? "s" : ""}.`;
    function step() {
      if (disposed) return;
      if (route.length) {
        cursor = route.shift()!;
        actorFrame++;
        draw();
        timer = window.setTimeout(step, 75);
      } else {
        message();
        draw();
      }
    }
    step();
  }
  app.querySelectorAll<HTMLButtonElement>("[data-study]").forEach((b) => {
    b.onclick = async () => {
      const request = ++skinRequest;
      const choice = b.dataset.study as keyof typeof studies;
      status.textContent = "Chargement de la carte…";
      try {
        if (choice === "castleNew" && !experiment)
          experiment = await loadCastleExperiment();
        if (disposed || request !== skinRequest) return;
        clearTimeout(timer);
        route = [];
        preview = [];
        map = studies[choice];
        skin = choice === "castleNew" ? "new" : "approved";
        state = createPlanState(map);
        openedChests.clear();
        refreshArt();
        cursor = map.start;
        doorPanel();
        app
          .querySelectorAll("[data-study]")
          .forEach((el) => el.setAttribute("aria-pressed", String(el === b)));
        label();
        message();
        fit();
      } catch (error) {
        if (!disposed && request === skinRequest)
          status.textContent = `Carte actuelle conservée. ${String(error)}`;
      }
    };
  });
  app.querySelector<HTMLButtonElement>("[data-study-reveal]")!.onclick = () => {
    clearTimeout(timer);
    route = [];
    preview = [];
    for (let pass = 0; pass < map.doors.length; pass++)
      for (const door of map.doors) openPlanDoor(state, door.id, "key");
    refreshArt();
    doorPanel();
    draw();
    status.textContent =
      "Toutes les salles sont révélées pour comparer le décor. Réinitialiser rétablit les portes et les toits.";
  };
  app.querySelector<HTMLButtonElement>("[data-study-back]")!.onclick = onBack;
  app.querySelector<HTMLButtonElement>("[data-study-fit]")!.onclick = fit;
  app.querySelector<HTMLButtonElement>("[data-study-reset]")!.onclick = () => {
    clearTimeout(timer);
    route = [];
    preview = [];
    cursor = map.start;
    state = createPlanState(map);
    openedChests.clear();
    refreshArt();
    doorPanel();
    message();
    fit();
  };
  app.querySelector<HTMLButtonElement>("[data-study-export]")!.onclick = () => {
    const a = document.createElement("a");
    a.download = `plan-${map.id}-${canvas.dataset.skin}-${map.width}x${map.height}.png`;
    const exported = document.createElement("canvas");
    exported.width = art.width;
    exported.height = art.height;
    const ec = exported.getContext("2d")!;
    ec.drawImage(art, 0, 0);
    ec.drawImage(roof, 0, 0);
    a.href = exported.toDataURL("image/png");
    a.click();
  };
  grid.onchange = collisions.onchange = draw;
  zoomSelect.onchange = () => changeZoom(Number(zoomSelect.value));
  canvas.onpointerdown = (e) => {
    hideCellTip();
    canvas.focus();
    canvas.setPointerCapture(e.pointerId);
    drag = {
      x: e.clientX,
      y: e.clientY,
      ox: offsetX,
      oy: offsetY,
      moved: false,
    };
  };
  canvas.onpointermove = (e) => {
    showCellTip(e);
    if (drag) {
      const dx = e.clientX - drag.x,
        dy = e.clientY - drag.y;
      if (Math.abs(dx) + Math.abs(dy) > 4) drag.moved = true;
      if (drag.moved) {
        offsetX = drag.ox + dx;
        offsetY = drag.oy + dy;
        preview = [];
        draw();
      }
    } else if (!route.length) {
      preview = planPath(state, cursor, cellAt(e)) ?? [];
      draw();
    }
  };
  canvas.onpointerup = (e) => {
    if (drag && !drag.moved) move(cellAt(e));
    drag = null;
    if (canvas.hasPointerCapture(e.pointerId))
      canvas.releasePointerCapture(e.pointerId);
  };
  canvas.onpointercancel = () => {
    hideCellTip();
    drag = null;
  };
  canvas.onpointerleave = () => {
    hideCellTip();
    if (!drag) {
      preview = [];
      draw();
    }
  };
  canvas.onwheel = (e) => {
    e.preventDefault();
    const r = canvas.getBoundingClientRect();
    changeZoom(
      zoom + (e.deltaY < 0 ? 0.5 : -0.5),
      e.clientX - r.left,
      e.clientY - r.top,
    );
  };
  canvas.onkeydown = (e) => {
    hideCellTip();
    const dirs: Record<string, [number, number]> = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
    };
    const d = dirs[e.key];
    if (!d) return;
    e.preventDefault();
    if (e.shiftKey) {
      offsetX -= d[0] * T * zoom;
      offsetY -= d[1] * T * zoom;
      draw();
      return;
    }
    if (route.length) return;
    const x = (cursor % map.width) + d[0],
      y = Math.floor(cursor / map.width) + d[1];
    if (
      x >= 0 &&
      y >= 0 &&
      x < map.width &&
      y < map.height &&
      planWalkable(state, y * map.width + x)
    )
      move(y * map.width + x);
  };
  const observer = new ResizeObserver(() => {
    size();
    center();
  });
  observer.observe(stage);
  label();
  message();
  doorPanel();
  fit();
  void Promise.all([
    loadPlanArtwork(),
    ...["idle", "move"].map(async (animation) => {
      const clip = resolveClip(actor, animation);
      if (!clip)
        throw Error(`Animation du personnage manquante : ${animation}`);
      await spriteImage(clip.source).decode();
    }),
  ])
    .then(([image]) => {
      if (disposed) return;
      outdoor = image;
      refreshArt();
      draw();
      canvas.dataset.ready = "true";
      app.querySelector<HTMLButtonElement>("[data-study-export]")!.disabled =
        false;
    })
    .catch((error) => {
      if (!disposed) status.textContent = String(error);
    });
  return () => {
    disposed = true;
    clearTimeout(timer);
    observer.disconnect();
  };
}
