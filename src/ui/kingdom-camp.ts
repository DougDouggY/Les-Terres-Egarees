import { villageTileset as campTileset } from "../data/village-tileset";
import {
  activateMap,
  currentMapId,
  map as activeMap,
} from "../game/active-map";
import {
  CAMP_W as ORIGINAL_W,
  CAMP_H as ORIGINAL_H,
  campStart as originalStart,
  campVillage as originalVillage,
  campBuildings as originalBuildings,
  campHouseAt as originalHouseAt,
  setCampHouseOpen,
} from "../data/kingdom-camp-map";
import {
  militaryCamp,
  militaryBuildingAt,
  militaryVisitCell,
} from "../data/kingdom-camp-military";
import { MilitaryCampRenderer } from "./kingdom-camp-military-renderer";
import { gridPath } from "../game/grid-path";
import { CampTerrainRenderer } from "./kingdom-camp-renderer";
import "./kingdom-camp.css";

type CampVersion = "original" | "military";
export function openKingdomCamp(host: HTMLElement, back: () => void) {
  let cleanup: (() => void) | undefined;
  const switchVersion = (version: CampVersion) => {
    cleanup?.();
    cleanup = mountCamp(host, back, version, switchVersion);
  };
  switchVersion("original");
  return () => cleanup?.();
}
function mountCamp(
  host: HTMLElement,
  back: () => void,
  version: CampVersion,
  switchVersion: (version: CampVersion) => void,
) {
  const previous = currentMapId;
  if (version === "original") activateMap("kingdom-camp");
  const proposed = version === "military" ? militaryCamp() : null;
  const CAMP_W = proposed?.width ?? ORIGINAL_W,
    CAMP_H = proposed?.height ?? ORIGINAL_H;
  const map = proposed?.cells ?? activeMap,
    campStart = proposed?.start ?? originalStart;
  const campBuildings = proposed?.buildings ?? originalBuildings,
    campVillage = proposed?.buildings[0] ?? originalVillage;
  const campHouseAt = (x: number, y: number) =>
    proposed ? militaryBuildingAt(proposed, x, y) : originalHouseAt(x, y);
  let disposed = false,
    zoom = 2,
    grid = true;
  const camera = {
    x: (campVillage.x + campVillage.w / 2) * 32,
    y: (campVillage.y + campVillage.h / 2) * 32,
  };
  let selected = campStart.y * CAMP_W + campStart.x;
  const start = selected;
  let route = gridPath(CAMP_W, CAMP_H, start, selected, (k) =>
    map[k].walk ? map[k].cost : null,
  );
  host.innerHTML = `<main class="camp-preview"><header><div><small>CHAPITRE II · TERRAIN</small><h1>${proposed ? "Le petit campement · Variante militaire" : "Le petit campement"}</h1></div><button data-camp-back>Retour</button></header><nav aria-label="Affichage de la carte"><label>Version du camp <select data-camp-version aria-label="Version du camp"><option value="original" ${!proposed ? "selected" : ""}>Originale · intérieurs</option><option value="military" ${proposed ? "selected" : ""}>Militaire · visites extérieures</option></select></label><button data-camp-fit>Vue entière</button><button data-camp-village>Voir les bâtiments</button><button data-camp-zoom="-" aria-label="Dézoomer">−</button><output data-camp-scale></output><button data-camp-zoom="+" aria-label="Zoomer">+</button><label><input type="checkbox" data-camp-grid checked> Grille</label><button data-camp-door hidden>Ouvrir la porte</button></nav><section class="camp-scroll"><canvas data-camp-canvas tabindex="0" aria-label="Carte du chapitre 2. Glissez pour déplacer la vue ; molette ou pincement pour zoomer."></canvas></section><footer><p data-camp-status role="status"></p><p>Glisser : déplacer · Molette / pincer : zoomer · Toucher une case : numéro et passage</p></footer></main>`;
  const canvas = host.querySelector<HTMLCanvasElement>("[data-camp-canvas]")!,
    ctx = canvas.getContext("2d")!;
  const viewport = host.querySelector<HTMLElement>(".camp-scroll")!,
    status = host.querySelector<HTMLElement>("[data-camp-status]")!;
  const atlas = new Image(),
    architecture = new Image(),
    construction = new Image(),
    life = new Image(),
    stone = new Image(),
    houses = new Image(),
    burnedHouses = new Image();
  atlas.src = import.meta.env.BASE_URL + "assets/regional-tiles.png?v=1";
  architecture.src = import.meta.env.BASE_URL + campTileset.source;
  construction.src =
    import.meta.env.BASE_URL + "assets/future-terrain/camp.png";
  const renderer = new CampTerrainRenderer(atlas, architecture, construction);
  if (proposed) {
    burnedHouses.src =
      import.meta.env.BASE_URL +
      "assets/kingdom-camp/compact-buildings-burned.png";
    houses.src =
      import.meta.env.BASE_URL + "assets/kingdom-camp/compact-buildings.png";
    life.src =
      import.meta.env.BASE_URL + "assets/kingdom-camp/military-life.png";
    stone.src =
      import.meta.env.BASE_URL + "assets/chapter-5-6/fortress-materials.png";
  }
  const militaryRenderer = proposed
    ? new MilitaryCampRenderer(
        proposed,
        atlas,
        architecture,
        life,
        stone,
        houses,
        burnedHouses,
      )
    : null;
  const drawLayer = () =>
    militaryRenderer
      ? militaryRenderer.layer(visited)
      : renderer.layer("regional", ["north", "knight"], opened);
  let layer: HTMLCanvasElement | null = null;
  const opened = new Set<string>();
  const visited = new Set<string>();
  const doorButton = host.querySelector<HTMLButtonElement>("[data-camp-door]")!;
  const size = () => ({ w: viewport.clientWidth, h: viewport.clientHeight });
  const fitZoom = () => {
    const { w, h } = size();
    return Math.min(w / (CAMP_W * 32), h / (CAMP_H * 32));
  };
  const describe = (k: number) => {
    const c = map[k];
    return `Case ${k + 1} · (${c.x + 1}, ${c.y + 1}) · ${campHouseAt(c.x, c.y)?.name ?? ({ water: "Eau", sand: "Rive", grass: "Herbe", road: "Chemin", forest: "Lisière", tree: "Forêt", rock: "Montagne" } as Record<string, string>)[c.terrain] ?? c.terrain} · ${c.walk ? "Praticable" : "Infranchissable"}`;
  };
  function clamp() {
    const { w, h } = size();
    for (const [axis, extent, view] of [
      ["x", CAMP_W * 32, w / zoom],
      ["y", CAMP_H * 32, h / zoom],
    ] as const)
      camera[axis] =
        view >= extent
          ? extent / 2
          : Math.max(view / 2, Math.min(extent - view / 2, camera[axis]));
  }
  function paint() {
    if (disposed) return;
    clamp();
    const { w, h } = size(),
      dpr = Math.min(window.devicePixelRatio || 1, 2);
    const pw = Math.round(w * dpr),
      ph = Math.round(h * dpr);
    if (canvas.width !== pw || canvas.height !== ph) {
      canvas.width = pw;
      canvas.height = ph;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = "#0d1511";
    ctx.fillRect(0, 0, w, h);
    if (layer) {
      ctx.save();
      ctx.translate(w / 2, h / 2);
      ctx.scale(zoom, zoom);
      ctx.translate(-camera.x, -camera.y);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(layer, 0, 0, CAMP_W * 32, CAMP_H * 32);
      if (grid) {
        ctx.strokeStyle = "#ede1ae40";
        ctx.lineWidth = 0.7 / zoom;
        ctx.beginPath();
        for (let x = 0; x <= CAMP_W; x++) {
          ctx.moveTo(x * 32, 0);
          ctx.lineTo(x * 32, CAMP_H * 32);
        }
        for (let y = 0; y <= CAMP_H; y++) {
          ctx.moveTo(0, y * 32);
          ctx.lineTo(CAMP_W * 32, y * 32);
        }
        ctx.stroke();
      }
      if (route) {
        ctx.strokeStyle = "#70d3cf";
        ctx.lineWidth = 2 / zoom;
        ctx.beginPath();
        route.steps.forEach((k, i) => {
          const x = ((k % CAMP_W) + 0.5) * 32,
            y = (Math.floor(k / CAMP_W) + 0.5) * 32;
          i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        });
        ctx.stroke();
      }
      const c = map[selected];
      ctx.strokeStyle = route ? "#b3ffff" : "#ff9c7c";
      ctx.lineWidth = 2 / zoom;
      ctx.strokeRect(c.x * 32 + 1, c.y * 32 + 1, 30, 30);
      ctx.restore();
    }
    const house = campHouseAt(map[selected].x, map[selected].y);
    doorButton.hidden = !house;
    if (house)
      doorButton.textContent = proposed
        ? visited.has(house.id)
          ? "Bâtiment visité"
          : "Visiter · aperçu"
        : opened.has(house.id)
          ? "Fermer la porte"
          : "Ouvrir la porte";
    doorButton.disabled =
      !!proposed && (!route || (!!house && visited.has(house.id)));
    canvas.dataset.visitedBuildings = String(visited.size);
    canvas.dataset.openHouses = String(opened.size);
    canvas.dataset.buildingCount = String(campBuildings.length);
    canvas.dataset.scale = proposed
      ? "camp-military-visits"
      : "camp-layered-buildings";
    canvas.dataset.variant = version;
    canvas.dataset.mapWidth = String(CAMP_W);
    canvas.dataset.mapHeight = String(CAMP_H);
    status.textContent =
      (proposed && house
        ? `${house.name} · ${visited.has(house.id) ? "Bâtiment incendié" : "Bâtiment fermé"} · Accès de visite à l’entrée`
        : describe(selected)) +
      (route
        ? ` · Passage accessible (${Math.max(0, route.steps.length - 1)} cases)`
        : " · Aucun passage depuis l’arrivée");
    host.querySelector("[data-camp-scale]")!.textContent =
      `${Math.round(zoom * 100)} %`;
    Object.assign(canvas.dataset, {
      selected: String(selected + 1),
      reachable: String(!!route),
      grid: String(grid),
      zoom: String(zoom),
      cameraX: String(camera.x),
      cameraY: String(camera.y),
      cellSize: String(32 * zoom),
    });
  }
  function local(e: { clientX: number; clientY: number }) {
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }
  function world(p: { x: number; y: number }) {
    const { w, h } = size();
    return {
      x: camera.x + (p.x - w / 2) / zoom,
      y: camera.y + (p.y - h / 2) / zoom,
    };
  }
  function zoomAt(next: number, point: { x: number; y: number }) {
    const { w, h } = size();
    // Wheel events quantize fractional CSS coordinates; keep the visual centre fixed.
    point = {
      x: Math.abs(point.x - w / 2) < 0.75 ? w / 2 : point.x,
      y: Math.abs(point.y - h / 2) < 0.75 ? h / 2 : point.y,
    };
    const anchor = world(point);
    zoom = Math.max(Math.min(fitZoom(), 0.2), Math.min(6, next));
    camera.x = anchor.x - (point.x - w / 2) / zoom;
    camera.y = anchor.y - (point.y - h / 2) / zoom;
    paint();
  }
  function calculateRoute() {
    const building = proposed
      ? militaryBuildingAt(proposed, map[selected].x, map[selected].y)
      : undefined;
    const target =
      proposed && building ? militaryVisitCell(proposed, building) : selected;
    return map[target].walk
      ? gridPath(CAMP_W, CAMP_H, start, target, (k) =>
          map[k].walk ? map[k].cost : null,
        )
      : null;
  }
  function select(p: { x: number; y: number }) {
    const a = world(p),
      x = Math.floor(a.x / 32),
      y = Math.floor(a.y / 32);
    if (x < 0 || y < 0 || x >= CAMP_W || y >= CAMP_H) return;
    selected = y * CAMP_W + x;
    route = calculateRoute();
    paint();
  }
  doorButton.onclick = () => {
    const house = campHouseAt(map[selected].x, map[selected].y);
    if (!house || !layer) return;
    if (proposed) {
      if (!route || visited.has(house.id)) return;
      visited.add(house.id);
      layer = drawLayer();
      paint();
      const building = proposed.buildings.find((b) => b.id === house.id)!;
      host.querySelector("[data-camp-visit-dialog]")?.remove();
      const dialog = document.createElement("div");
      dialog.className = "modal-back";
      dialog.dataset.campVisitDialog = "";
      dialog.innerHTML = `<section class="modal" role="dialog" aria-modal="true" aria-labelledby="camp-visit-title"><h2 id="camp-visit-title">${building.name}</h2><p>${building.description}</p><p>Visite effectuée depuis l’entrée, sans entrer dans le bâtiment : il est désormais incendié. Les récompenses et sorties d’ennemis restent à définir.</p><button type="button" data-close-visit>Retour à la carte</button></section>`;
      host.append(dialog);
      const close =
        dialog.querySelector<HTMLButtonElement>("[data-close-visit]")!;
      close.onclick = () => dialog.remove();
      close.focus();
      return;
    }
    const open = !opened.has(house.id);
    setCampHouseOpen(map, house.id, open);
    if (open) opened.add(house.id);
    else opened.delete(house.id);
    layer = drawLayer();
    route = map[selected].walk
      ? gridPath(CAMP_W, CAMP_H, start, selected, (k) =>
          map[k].walk ? map[k].cost : null,
        )
      : null;
    paint();
  };
  host.querySelector<HTMLSelectElement>("[data-camp-version]")!.onchange = (
    e,
  ) => switchVersion((e.target as HTMLSelectElement).value as CampVersion);
  host.querySelector("[data-camp-back]")!.addEventListener("click", back);
  host.querySelector("[data-camp-fit]")!.addEventListener("click", () => {
    zoom = fitZoom();
    camera.x = CAMP_W * 16;
    camera.y = CAMP_H * 16;
    paint();
  });
  host.querySelector("[data-camp-village]")!.addEventListener("click", () => {
    zoom = 2;
    camera.x = (campVillage.x + campVillage.w / 2) * 32;
    camera.y = (campVillage.y + campVillage.h / 2) * 32;
    paint();
  });
  for (const b of Array.from(
    host.querySelectorAll<HTMLButtonElement>("[data-camp-zoom]"),
  ))
    b.onclick = () => {
      const { w, h } = size();
      zoomAt(zoom * (b.dataset.campZoom === "+" ? 1.3 : 1 / 1.3), {
        x: w / 2,
        y: h / 2,
      });
    };
  host.querySelector<HTMLInputElement>("[data-camp-grid]")!.onchange = (e) => {
    grid = (e.target as HTMLInputElement).checked;
    paint();
  };
  canvas.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      zoomAt(zoom * Math.exp(-e.deltaY * 0.0015), local(e));
    },
    { passive: false },
  );
  const pointers = new Map<number, { x: number; y: number }>();
  let moved = false,
    dragDistance = 0;
  canvas.onpointerdown = (e) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    if (!pointers.size) {
      moved = false;
      dragDistance = 0;
    }
    pointers.set(e.pointerId, local(e));
    canvas.setPointerCapture(e.pointerId);
    if (pointers.size > 1) moved = true;
  };
  canvas.onpointermove = (e) => {
    const p = local(e),
      old = pointers.get(e.pointerId);
    if (!old) {
      if (e.pointerType === "mouse") {
        const a = world(p),
          x = Math.floor(a.x / 32),
          y = Math.floor(a.y / 32);
        canvas.title =
          x >= 0 && y >= 0 && x < CAMP_W && y < CAMP_H
            ? describe(y * CAMP_W + x)
            : "";
      }
      return;
    }
    if (pointers.size === 1) {
      const dx = p.x - old.x,
        dy = p.y - old.y;
      dragDistance += Math.hypot(dx, dy);
      if (dragDistance > 4) moved = true;
      camera.x -= dx / zoom;
      camera.y -= dy / zoom;
      pointers.set(e.pointerId, p);
      paint();
    } else {
      const other = Array.from(pointers.entries()).find(
        ([id]) => id !== e.pointerId,
      )![1];
      const oldMid = { x: (old.x + other.x) / 2, y: (old.y + other.y) / 2 },
        newMid = { x: (p.x + other.x) / 2, y: (p.y + other.y) / 2 };
      const anchor = world(oldMid),
        distance = Math.hypot(old.x - other.x, old.y - other.y);
      const { w, h } = size();
      if (distance > 1) {
        zoom = Math.max(
          Math.min(fitZoom(), 0.2),
          Math.min(
            6,
            (zoom * Math.hypot(p.x - other.x, p.y - other.y)) / distance,
          ),
        );
        camera.x = anchor.x - (newMid.x - w / 2) / zoom;
        camera.y = anchor.y - (newMid.y - h / 2) / zoom;
      }
      pointers.set(e.pointerId, p);
      moved = true;
      paint();
    }
  };
  canvas.onpointerup = (e) => {
    if (!pointers.has(e.pointerId)) return;
    const tap = !moved && pointers.size === 1;
    pointers.delete(e.pointerId);
    if (tap) select(local(e));
  };
  canvas.onpointercancel = (e) => {
    pointers.delete(e.pointerId);
    moved = true;
  };
  const key = (e: KeyboardEvent) => {
    const dir = (
      {
        ArrowLeft: [-1, 0],
        ArrowRight: [1, 0],
        ArrowUp: [0, -1],
        ArrowDown: [0, 1],
      } as Record<string, number[]>
    )[e.key];
    if (!dir) return;
    e.preventDefault();
    camera.x += (dir[0] * 96) / zoom;
    camera.y += (dir[1] * 96) / zoom;
    paint();
  };
  canvas.addEventListener("keydown", key);
  const observer = new ResizeObserver(paint);
  observer.observe(viewport);
  paint();
  void Promise.all([
    atlas.decode(),
    architecture.decode(),
    construction.decode(),
    ...(proposed
      ? [life.decode(), stone.decode(), houses.decode(), burnedHouses.decode()]
      : []),
  ])
    .then(() => {
      if (disposed) return;
      layer = drawLayer();
      if (proposed) {
        zoom = fitZoom();
        camera.x = CAMP_W * 16;
        camera.y = CAMP_H * 16;
      }
      paint();
      canvas.dataset.ready = "true";
      canvas.dataset.tileset = campTileset.source;
    })
    .catch(() => {
      if (!disposed)
        status.textContent =
          "Impossible de charger les textures du terrain. Revenez à l’accueil puis réessayez.";
    });
  return () => {
    if (disposed) return;
    disposed = true;
    observer.disconnect();
    pointers.clear();
    if (!proposed) activateMap(previous);
  };
}
