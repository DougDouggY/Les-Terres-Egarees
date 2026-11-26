import { activateMap, currentMapId, map, W, H } from "../game/active-map";
import {
  CAMP_W,
  CAMP_H,
  campStart,
  campLandmarks,
  campBuildings,
} from "../data/kingdom-camp-map";
import { gridPath } from "../game/grid-path";
import { CampTerrainRenderer } from "./kingdom-camp-renderer";
import "./kingdom-camp.css";

export function openKingdomCamp(host: HTMLElement, back: () => void) {
  const previous = currentMapId;
  activateMap("kingdom-camp");
  let disposed = false,
    zoom = 1,
    grid = true,
    labels = true;
  let selected = campStart.y * CAMP_W + campStart.x;
  const start = selected;
  host.innerHTML = `<main class="camp-preview"><header><div><small>CHAPITRE II · PROPOSITION DE TERRAIN</small><h1>Le camp du Royaume</h1></div><button data-camp-back>Retour</button></header><nav aria-label="Affichage de la carte"><button data-camp-fit>Vue entière</button><button data-camp-zoom="-" aria-label="Dézoomer">−</button><output data-camp-scale></output><button data-camp-zoom="+" aria-label="Zoomer">+</button><label><input type="checkbox" data-camp-grid checked> Grille</label><label><input type="checkbox" data-camp-labels checked> Repères</label><select aria-label="Aller à un lieu" data-camp-place>${campLandmarks.map((p, i) => `<option value="${i}">${p.name}</option>`).join("")}</select></nav><section class="camp-scroll"><canvas width="1280" height="896" data-camp-canvas aria-label="Carte du camp du Royaume, 40 colonnes et 28 lignes. Touchez une case pour vérifier le passage."></canvas></section><footer><p data-camp-status role="status">Chargement du terrain…</p><p>Carte de terrain à valider · touchez une case pour tester le passage depuis l’arrivée. Enclos vide ; unités, objectifs et événements à définir.</p></footer></main>`;
  const canvas = host.querySelector<HTMLCanvasElement>("[data-camp-canvas]")!,
    ctx = canvas.getContext("2d")!;
  const viewport = host.querySelector<HTMLElement>(".camp-scroll")!;
  const atlas = new Image();
  atlas.src = import.meta.env.BASE_URL + "assets/regional-tiles.png?v=1";
  const renderer = new CampTerrainRenderer(atlas);
  const status = host.querySelector<HTMLElement>("[data-camp-status]")!;
  let layer: HTMLCanvasElement | null = null;
  const description = (k: number) => {
    const c = map[k];
    const building = campBuildings.find(
      (b) => c.x >= b.x && c.x < b.x + b.w && c.y >= b.y && c.y < b.y + b.h,
    );
    return `Case ${k + 1} · (${c.x + 1}, ${c.y + 1}) · ${building?.name ?? ({ wall: "Palissade", earth: "Terre", road: "Chemin", grass: "Herbe", forest: "Lisière", tree: "Bois dense", rock: "Roche" } as Record<string, string>)[c.terrain] ?? c.terrain} · ${c.walk ? "Praticable" : "Infranchissable"}`;
  };
  function paint() {
    if (disposed || !layer) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(layer, 0, 0, canvas.width, canvas.height);
    if (grid) {
      ctx.strokeStyle = "#ede1ae30";
      ctx.lineWidth = 0.6;
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
    if (labels) {
      ctx.font = "bold 12px sans-serif";
      ctx.textAlign = "center";
      for (const p of campLandmarks) {
        const x = (p.x + 0.5) * 32,
          y = (p.y + 0.5) * 32;
        ctx.fillStyle = "#111d1de8";
        const width = ctx.measureText(p.name).width + 14;
        ctx.fillRect(x - width / 2, y - 24, width, 20);
        ctx.fillStyle = "#f6e9be";
        ctx.fillText(p.name, x, y - 10);
      }
    }
    const c = map[selected];
    const path = c.walk
      ? gridPath(W, H, start, selected, (k) =>
          map[k].walk ? map[k].cost : null,
        )
      : null;
    if (path) {
      ctx.strokeStyle = "#70d3cf";
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (const [i, k] of [start, ...path.steps].entries()) {
        const x = ((k % CAMP_W) + 0.5) * 32,
          y = (Math.floor(k / CAMP_W) + 0.5) * 32;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.stroke();
    }
    ctx.strokeStyle = path ? "#b3ffff" : "#ff9c7c";
    ctx.lineWidth = 3;
    ctx.strokeRect(c.x * 32 + 2, c.y * 32 + 2, 28, 28);
    status.textContent =
      description(selected) +
      (path
        ? ` · Passage accessible (${path.steps.length} cases)`
        : " · Aucun passage depuis l’arrivée");
    canvas.dataset.selected = String(selected + 1);
    canvas.dataset.reachable = String(!!path);
    canvas.dataset.grid = String(grid);
  }
  function resize(fit = false) {
    if (fit)
      zoom = Math.min(
        (viewport.clientWidth - 16) / 1280,
        (viewport.clientHeight - 16) / 896,
        1,
      );
    zoom = Math.max(0.2, Math.min(2, zoom));
    canvas.style.width = `${1280 * zoom}px`;
    canvas.style.height = `${896 * zoom}px`;
    host.querySelector("[data-camp-scale]")!.textContent =
      `${Math.round(zoom * 100)} %`;
  }
  host.querySelector("[data-camp-back]")!.addEventListener("click", back);
  host
    .querySelector("[data-camp-fit]")!
    .addEventListener("click", () => resize(true));
  for (const b of Array.from(
    host.querySelectorAll<HTMLButtonElement>("[data-camp-zoom]"),
  ))
    b.onclick = () => {
      zoom *= b.dataset.campZoom === "+" ? 1.3 : 1 / 1.3;
      resize();
    };
  host.querySelector<HTMLInputElement>("[data-camp-grid]")!.onchange = (e) => {
    grid = (e.target as HTMLInputElement).checked;
    paint();
  };
  host.querySelector<HTMLInputElement>("[data-camp-labels]")!.onchange = (
    e,
  ) => {
    labels = (e.target as HTMLInputElement).checked;
    paint();
  };
  host.querySelector<HTMLSelectElement>("[data-camp-place]")!.onchange = (
    e,
  ) => {
    const p = campLandmarks[Number((e.target as HTMLSelectElement).value)];
    selected = p.y * CAMP_W + p.x;
    paint();
    viewport.scrollTo({
      left: (p.x + 0.5) * 32 * zoom - viewport.clientWidth / 2,
      top: (p.y + 0.5) * 32 * zoom - viewport.clientHeight / 2,
      behavior: "smooth",
    });
  };
  const point = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect();
    const x = Math.floor(((e.clientX - r.left) / r.width) * CAMP_W),
      y = Math.floor(((e.clientY - r.top) / r.height) * CAMP_H);
    return x >= 0 && y >= 0 && x < CAMP_W && y < CAMP_H ? y * CAMP_W + x : null;
  };
  canvas.onpointermove = (e) => {
    const k = point(e);
    if (k !== null) canvas.title = description(k);
  };
  canvas.onpointerup = (e) => {
    const k = point(e);
    if (k !== null) {
      selected = k;
      paint();
    }
  };
  const observer = new ResizeObserver(() => resize(true));
  observer.observe(viewport);
  void atlas
    .decode()
    .then(() => {
      if (disposed) return;
      layer = renderer.layer("regional", ["north", "knight"]);
      resize(true);
      paint();
      canvas.dataset.ready = "true";
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
    activateMap(previous);
  };
}
