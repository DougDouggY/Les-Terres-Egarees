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
const studies = { castle: castlePlan, boarding: boardingPlan };
import "./tools.css";
import "./map-workshop.css";

export function openMapWorkshop(app: HTMLElement, onBack: () => void) {
  app.innerHTML = `<main class="dev-screen map-workshop"><header class="dev-top"><div><span class="dev-badge">CARTES TACTIQUES · HORS CAMPAGNE</span><h1>Atelier des cartes</h1><p>Plans validés · Château et abordage · Aperçus indépendants de la campagne.</p></div><button data-study-back>Retour aux tests</button></header><div class="study-layout"><aside class="study-sidebar"><button class="study-choice" data-study="castle" aria-pressed="true"><strong>01 · Le château oublié</strong><small>42 × 34 cases · portes et toits progressifs</small></button><button class="study-choice" data-study="boarding" aria-pressed="false"><strong>02 · Abordage naval</strong><small>42 × 34 cases · deux passerelles</small></button><div class="study-doors" data-study-doors></div><div class="study-note"><h2>Explorer le décor</h2><p>Cliquez une case praticable : le curseur suit le chemin indiqué. Le losange est un repère de test. Cliquez une porte accessible, puis choisissez « Clé » ou « Détruire ».</p><p>Glissez pour déplacer la caméra. Molette ou sélecteur pour zoomer. Flèches : déplacer le curseur. Maj + flèches : déplacer la caméra.</p><p>Grille et collisions sont des aides facultatives. Aucun personnage ni aucune sauvegarde de campagne ne sont utilisés.</p></div></aside><section><div class="study-tools"><label>Zoom <select id="study-zoom" aria-label="Zoom"><option value="1">100 %</option><option value="1.5">150 %</option><option value="2" selected>200 %</option><option value="3">300 %</option><option value="4">400 %</option></select></label><label><input id="study-grid" type="checkbox">Grille</label><label><input id="study-collisions" type="checkbox">Collisions</label><button data-study-fit>Cadrer la carte</button><button data-study-reset>Réinitialiser</button><button data-study-export disabled>Exporter le PNG</button></div><div class="study-stage"><canvas id="study-canvas" tabindex="0" aria-label="Carte de test interactive"></canvas></div><output class="study-status" aria-live="polite"></output><footer class="study-footer"><span data-study-dimensions></span><span>Textures validées · grille 32 px · export détaillé ×3</span></footer></section></div></main>`;
  const canvas = app.querySelector<HTMLCanvasElement>("#study-canvas")!,
    c = canvas.getContext("2d")!;
  const stage = app.querySelector<HTMLElement>(".study-stage")!;
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
  const label = () => {
    app.querySelector("[data-study-dimensions]")!.textContent =
      `${map.name} · ${map.width} × ${map.height} · ${map.width * T} × ${map.height * T} px`;
  };
  function refreshArt() {
    art = renderPlanBase(state, outdoor);
    roof = renderPlanRoof(state, outdoor);
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
  function doorPanel() {
    const panel = app.querySelector<HTMLElement>("[data-study-doors]")!;
    panel.hidden = map.id !== "castle";
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
    status.textContent = `Repère : colonne ${(cursor % map.width) + 1}, ligne ${Math.floor(cursor / map.width) + 1}. Cliquez une case pour tester son accès.`;
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
    c.fillStyle = "#122b2bc9";
    c.fillRect(x - 7, y - 7, 14, 14);
    c.strokeStyle = "#f9dda0";
    c.lineWidth = 1.5;
    c.beginPath();
    c.moveTo(x, y - 8);
    c.lineTo(x + 7, y);
    c.lineTo(x, y + 8);
    c.lineTo(x - 7, y);
    c.closePath();
    c.stroke();
    c.fillStyle = "#f9dda0";
    c.fillRect(x - 1, y - 1, 2, 2);
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
        "Case inaccessible : mur, obstacle, toit fermé, bastingage ou eau. Le repère reste sur une case praticable.";
      draw();
      return;
    }
    route = path.slice(1);
    status.textContent = `Chemin praticable : ${route.length} case${route.length > 1 ? "s" : ""}.`;
    function step() {
      if (disposed) return;
      if (route.length) {
        cursor = route.shift()!;
        draw();
        timer = window.setTimeout(step, 75);
      } else {
        message();
        draw();
      }
    }
    step();
  }
  app.querySelectorAll<HTMLButtonElement>("[data-study]").forEach(
    (b) =>
      (b.onclick = () => {
        clearTimeout(timer);
        route = [];
        preview = [];
        map = studies[b.dataset.study as keyof typeof studies];
        state = createPlanState(map);
        refreshArt();
        cursor = map.start;
        doorPanel();
        app
          .querySelectorAll("[data-study]")
          .forEach((el) => el.setAttribute("aria-pressed", String(el === b)));
        label();
        message();
        fit();
      }),
  );
  app.querySelector<HTMLButtonElement>("[data-study-back]")!.onclick = onBack;
  app.querySelector<HTMLButtonElement>("[data-study-fit]")!.onclick = fit;
  app.querySelector<HTMLButtonElement>("[data-study-reset]")!.onclick = () => {
    clearTimeout(timer);
    route = [];
    preview = [];
    cursor = map.start;
    state = createPlanState(map);
    refreshArt();
    doorPanel();
    message();
    fit();
  };
  app.querySelector<HTMLButtonElement>("[data-study-export]")!.onclick = () => {
    const a = document.createElement("a");
    a.download = `plan-${map.id}-${map.width}x${map.height}.png`;
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
    drag = null;
  };
  canvas.onpointerleave = () => {
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
  void loadPlanArtwork()
    .then((image) => {
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
