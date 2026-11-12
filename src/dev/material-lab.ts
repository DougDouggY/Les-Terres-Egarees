import {
  materialSample,
  materialPath,
  materialWalkable,
} from "./material-samples";
import {
  loadMaterialImages,
  renderMaterialSample,
  MATERIAL_PIXELS as P,
} from "./material-renderer";
import "./tools.css";
import "./material-lab.css";
export function openMaterialLab(app: HTMLElement, onBack: () => void) {
  app.innerHTML = `<main class="dev-screen material-lab"><header class="dev-top"><div><span class="dev-badge">ASSEMBLAGES RÉELS · VALIDATION DES MATÉRIAUX</span><h1>Échantillons des nouveaux tilesets</h1><p>Les deux cartes complètes restent inchangées. Ces fragments servent uniquement à juger les textures et leurs raccords.</p></div><button data-material-back>Retour aux tests</button></header><div class="material-toolbar"><button data-material="castle" aria-pressed="true">Pierre & ardoise</button><button data-material="boarding" aria-pressed="false">Bois & mer</button><label>Zoom <select aria-label="Zoom des matériaux"><option value="0.5">50 %</option><option value="0.75">75 %</option><option value="1" selected>100 %</option><option value="1.5">150 %</option></select></label><label><input type="checkbox" data-material-grid>Grille</label><label><input type="checkbox" data-material-collisions>Collisions</label><label data-roof-label><input type="checkbox" data-material-roof>Toit de la salle haute</label><button data-material-door>Fermer la porte</button><button data-material-export>Exporter le fragment</button></div><p class="material-note">10 × 8 cases · grille logique 32 px · textures illustrées à 96 px par case pour examiner les détails. Cliquez le sol pour tester un chemin ; glissez les barres de défilement pour explorer au zoom.</p><div class="material-stage"><canvas data-material-canvas aria-label="Fragment de matériaux interactif"></canvas></div><output aria-live="polite">Chargement des atlas illustrés…</output></main>`;
  const canvas = app.querySelector<HTMLCanvasElement>(
      "[data-material-canvas]",
    )!,
    ctx = canvas.getContext("2d")!,
    status = app.querySelector("output")!;
  const grid = app.querySelector<HTMLInputElement>("[data-material-grid]")!,
    collisions = app.querySelector<HTMLInputElement>(
      "[data-material-collisions]",
    )!,
    roof = app.querySelector<HTMLInputElement>("[data-material-roof]")!,
    zoom = app.querySelector<HTMLSelectElement>("select")!;
  let disposed = false,
    map = materialSample("castle"),
    cursor = map.start,
    route: number[] = [],
    art: HTMLCanvasElement | undefined;
  let images: Awaited<ReturnType<typeof loadMaterialImages>> | undefined;
  function draw() {
    if (!images || disposed) return;
    art = renderMaterialSample(map, images, roof.checked);
    canvas.width = art.width;
    canvas.height = art.height;
    canvas.style.width = `${art.width * Number(zoom.value)}px`;
    canvas.style.height = `${art.height * Number(zoom.value)}px`;
    ctx.drawImage(art, 0, 0);
    if (collisions.checked)
      map.tiles.forEach((t, k) => {
        if (
          !materialWalkable(t, map.doorOpen) &&
          !(
            roof.checked &&
            map.id === "castle" &&
            !map.doorOpen &&
            Math.floor(k / map.width) < 2 &&
            k % map.width < 8
          )
        ) {
          ctx.fillStyle = "#ed655344";
          ctx.fillRect(
            (k % map.width) * P,
            Math.floor(k / map.width) * P,
            P,
            P,
          );
        }
      });
    if (grid.checked) {
      ctx.strokeStyle = "#f4e2b780";
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x <= map.width; x++) {
        ctx.moveTo(x * P, 0);
        ctx.lineTo(x * P, canvas.height);
      }
      for (let y = 0; y <= map.height; y++) {
        ctx.moveTo(0, y * P);
        ctx.lineTo(canvas.width, y * P);
      }
      ctx.stroke();
    }
    if (route.length > 1) {
      ctx.strokeStyle = "#f3df91";
      ctx.lineWidth = 3;
      ctx.beginPath();
      route.forEach((k, i) => {
        const x = (k % map.width) * P + P / 2,
          y = Math.floor(k / map.width) * P + P / 2;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      });
      ctx.stroke();
    }
    const x = (cursor % map.width) * P + P / 2,
      y = Math.floor(cursor / map.width) * P + P / 2;
    ctx.strokeStyle = "#ffedb0";
    ctx.lineWidth = 2;
    ctx.strokeRect(x - 8, y - 8, 16, 16);
  }
  app.querySelector<HTMLButtonElement>("[data-material-back]")!.onclick =
    onBack;
  app.querySelectorAll<HTMLButtonElement>("[data-material]").forEach(
    (b) =>
      (b.onclick = () => {
        map = materialSample(b.dataset.material as "castle" | "boarding");
        cursor = map.start;
        route = [];
        roof.checked = false;
        app.querySelector<HTMLElement>("[data-material-door]")!.hidden =
          map.id !== "castle";
        app.querySelector<HTMLElement>("[data-material-door]")!.textContent =
          "Fermer la porte";
        app.querySelector<HTMLElement>("[data-roof-label]")!.hidden =
          map.id !== "castle";
        app
          .querySelectorAll("[data-material]")
          .forEach((el) => el.setAttribute("aria-pressed", String(el === b)));
        draw();
        status.textContent =
          "Choisissez une case praticable pour vérifier le déplacement.";
      }),
  );
  grid.onchange = collisions.onchange = zoom.onchange = draw;
  roof.onchange = () => {
    if (roof.checked) {
      cursor = 4 * map.width + 1;
      map.doorOpen = false;
      app.querySelector<HTMLElement>("[data-material-door]")!.textContent =
        "Ouvrir la porte";
    } else {
      map.doorOpen = true;
      app.querySelector<HTMLElement>("[data-material-door]")!.textContent =
        "Fermer la porte";
    }
    route = [];
    cursor = map.start;
    draw();
  };
  app.querySelector<HTMLButtonElement>("[data-material-door]")!.onclick =
    () => {
      map.doorOpen = !map.doorOpen;
      route = [];
      cursor = map.start;
      roof.checked = !map.doorOpen;
      app.querySelector<HTMLElement>("[data-material-door]")!.textContent =
        map.doorOpen ? "Fermer la porte" : "Ouvrir la porte";
      draw();
      status.textContent = map.doorOpen
        ? "Porte ouverte : salle haute découverte et accessible."
        : "Porte fermée. Le toit peut être affiché pour inspecter la salle couverte.";
    };
  canvas.onclick = (e) => {
    if (!images) return;
    const b = canvas.getBoundingClientRect(),
      x = Math.floor(((e.clientX - b.left) / b.width) * map.width),
      y = Math.floor(((e.clientY - b.top) / b.height) * map.height),
      to = y * map.width + x;
    if (x < 0 || y < 0 || x >= map.width || y >= map.height) return;
    const hidden = (k: number) =>
      roof.checked &&
      !map.doorOpen &&
      map.id === "castle" &&
      k % map.width < 8 &&
      Math.floor(k / map.width) < 2;
    const path = materialPath(map, cursor, to, hidden);
    if (!path || path.some(hidden)) {
      route = [];
      status.textContent =
        "Case inaccessible : mur, pilier, bastingage, eau ou toit.";
    } else {
      route = path;
      cursor = to;
      status.textContent = `Chemin praticable : ${path.length - 1} cases. Repère ${x + 1}, ${y + 1}.`;
    }
    draw();
  };
  app.querySelector<HTMLButtonElement>("[data-material-export]")!.onclick =
    () => {
      if (!art) return;
      const a = document.createElement("a");
      a.href = art.toDataURL();
      a.download = `echantillon-${map.id}${roof.checked ? "-toiture" : ""}.png`;
      a.click();
    };
  void loadMaterialImages()
    .then((result) => {
      if (disposed) return;
      images = result;
      draw();
      canvas.dataset.ready = "true";
      status.textContent =
        "Atlas illustrés chargés. Cliquez une case pour tester les déplacements.";
    })
    .catch((error) => {
      if (!disposed) status.textContent = String(error);
    });
  return () => {
    disposed = true;
  };
}
