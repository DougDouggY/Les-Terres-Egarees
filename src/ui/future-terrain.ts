import {
  campaignTerrainDrafts,
  LANDSCAPE_ASSETS,
} from "../data/landscape-drafts";
import {
  landscapeLayers,
  landscapePassable,
} from "../rendering/landscape-draft-renderer";
import { futureTerrainMaps } from "../data/future-terrain-maps";
import "./kingdom-camp.css";
/** Independent terrain review: never activates a campaign map or writes saves. */
export function openFutureTerrain(host: HTMLElement, back: () => void) {
  const maps = [...futureTerrainMaps(), ...campaignTerrainDrafts()];
  let current = maps[0],
    zoom = 1,
    cx = 576,
    cy = 448,
    night = false,
    grid = false,
    interiors = false,
    showObjects = true,
    disposed = false;
  host.innerHTML = `<main class="camp-preview"><header><div><small>TERRAINS D’ESSAI · HORS CAMPAGNE</small><h1>Les prochaines cartes</h1></div><button data-return>Retour</button></header><nav><select aria-label="Terrain"><option value="0">III · Abords du château</option><option value="1">IV · Ravitaillement</option><option value="2">V · Le convoi</option><option value="3">VI · La forteresse</option></select><button data-fit>Vue entière</button><button data-zoom="-1" aria-label="Dézoomer">−</button><output></output><button data-zoom="1" aria-label="Zoomer">+</button><label><input type="checkbox" data-grid> Grille</label><label><input type="checkbox" data-night> Nuit</label><label data-landscape hidden><input type="checkbox" data-interiors> Intérieurs et portes ouverts</label><label data-landscape hidden><input type="checkbox" data-objects checked> Décor mobile</label><a data-doors data-landscape hidden download>Portes PNG</a><a data-objects-export data-landscape hidden download>Objets PNG</a><button data-castle>Explorer le château validé</button><a data-export download>Exporter la carte</a><details><summary>Tilesets</summary>${["camp", "castle", "wilds"].map((k, i) => `<a href="${import.meta.env.BASE_URL}assets/future-terrain/${k}.png" target="_blank" rel="noopener">${["Bois et paille", "Pierre et château", "Forêt et ravitaillement"][i]}</a>`).join(" · ")} · <a href="${import.meta.env.BASE_URL}assets/chapter-5-6/fortress-materials.png" target="_blank" rel="noopener">Fortifications</a> · <a href="${import.meta.env.BASE_URL}assets/chapter-5-6/objects-atlas.png" target="_blank" rel="noopener">Objets séparés</a> · <a href="${import.meta.env.BASE_URL}assets/chapter-5-6/index.html" target="_blank" rel="noopener">Ressources V–VI</a></details></nav><section class="camp-scroll"><canvas tabindex="0" aria-label="Terrain d’essai"></canvas></section><footer><p data-status>Terrains à valider · aucun ennemi ni événement de campagne ajouté.</p><p>Glisser : déplacer · Molette / pincer : zoomer · Toucher : numéro de case.</p></footer></main>`;
  const canvas = host.querySelector("canvas")!,
    c = canvas.getContext("2d")!,
    stage = host.querySelector<HTMLElement>(".camp-scroll")!,
    status = host.querySelector<HTMLElement>("[data-status]")!;
  const images = new Map<string, HTMLImageElement>();
  let rendered: HTMLCanvasElement | undefined;
  let doorLayer: HTMLCanvasElement | undefined,
    objectLayer: HTMLCanvasElement | undefined;
  const rebuild = () => {
    const image = images.get(current.atlas);
    if (!image) return;
    rendered = document.createElement("canvas");
    rendered.width = current.width * 64;
    rendered.height = current.height * 64;
    let r = rendered.getContext("2d")!;
    host
      .querySelectorAll<HTMLElement>("[data-landscape]")
      .forEach((e) => (e.hidden = !current.layout));
    doorLayer = objectLayer = undefined;
    if (current.layout) {
      const layers = landscapeLayers(current, images, interiors);
      rendered = layers.ground;
      doorLayer = layers.doors;
      objectLayer = layers.objects;
      r = rendered.getContext("2d")!;
    } else {
      const sw = image.width / 4,
        sh = image.height / 4;
      const grass = images.get("wilds")!;
      const lane = current.atlas === "castle" ? 2 : 1;
      const mask = document.createElement("canvas");
      mask.width = rendered.width;
      mask.height = rendered.height;
      const mc = mask.getContext("2d")!;
      mc.fillStyle = "white";
      current.tiles.forEach((t, k) => {
        const x = (k % current.width) * 64,
          y = Math.floor(k / current.width) * 64;
        if (t === lane || t === 16)
          r.drawImage(grass, 0, 0, 256, 256, x, y, 64, 64);
        else if (current.atlas === "castle" && t === 4)
          r.drawImage(image, 0, 256 + 100, 256, 156, x, y, 64, 64);
        else if (current.atlas === "castle" && t === 5)
          r.drawImage(image, 256 + 100, 256, 70, 256, x, y, 64, 64);
        else
          r.drawImage(
            image,
            (t % 4) * sw,
            Math.floor(t / 4) * sh,
            sw,
            sh,
            x,
            y,
            64,
            64,
          );
        if (t === lane) mc.fillRect(x, y, 64, 64);
      });
      const path = document.createElement("canvas");
      path.width = rendered.width;
      path.height = rendered.height;
      const pc = path.getContext("2d")!,
        sample = document.createElement("canvas");
      sample.width = sample.height = 128;
      sample
        .getContext("2d")!
        .drawImage(
          image,
          (lane % 4) * sw,
          Math.floor(lane / 4) * sh,
          sw,
          sh,
          0,
          0,
          128,
          128,
        );
      pc.fillStyle = pc.createPattern(sample, "repeat")!;
      pc.fillRect(0, 0, path.width, path.height);
      pc.globalCompositeOperation = "destination-in";
      pc.filter = "blur(5px)";
      pc.drawImage(mask, 0, 0);
      r.drawImage(path, 0, 0);
    }
    if (night) {
      r.fillStyle = "#071b4080";
      r.fillRect(0, 0, rendered.width, rendered.height);
    }
    for (const [selector, layer, suffix] of [
      ["[data-doors]", doorLayer, "portes"],
      ["[data-objects-export]", objectLayer, "objets"],
    ] as const) {
      if (!layer) continue;
      if (night) {
        const ctx = layer.getContext("2d")!;
        ctx.globalCompositeOperation = "source-atop";
        ctx.fillStyle = "#071b4080";
        ctx.fillRect(0, 0, layer.width, layer.height);
        ctx.globalCompositeOperation = "source-over";
      }
      const a = host.querySelector<HTMLAnchorElement>(selector)!;
      a.href = layer.toDataURL();
      a.download = `${current.id}-${suffix}${interiors ? "-ouverts" : ""}.png`;
    }
    const link = host.querySelector<HTMLAnchorElement>("[data-export]")!;
    link.href = rendered.toDataURL();
    link.download = `${current.id}${night ? "-nuit" : ""}.png`;
    canvas.dataset.map = current.id;
    canvas.dataset.ready = "true";
    draw();
  };
  function draw() {
    if (disposed) return;
    const w = stage.clientWidth,
      h = stage.clientHeight;
    canvas.width = w * devicePixelRatio;
    canvas.height = h * devicePixelRatio;
    c.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    c.fillStyle = "#0d1511";
    c.fillRect(0, 0, w, h);
    c.save();
    c.translate(w / 2 - cx * zoom, h / 2 - cy * zoom);
    c.scale(zoom, zoom);
    if (rendered)
      c.drawImage(rendered, 0, 0, current.width * 32, current.height * 32);
    if (doorLayer)
      c.drawImage(doorLayer, 0, 0, current.width * 32, current.height * 32);
    if (showObjects && objectLayer)
      c.drawImage(objectLayer, 0, 0, current.width * 32, current.height * 32);
    if (grid) {
      c.strokeStyle = "#ffffff44";
      c.lineWidth = 1 / zoom;
      for (let x = 0; x <= current.width; x++) {
        c.beginPath();
        c.moveTo(x * 32, 0);
        c.lineTo(x * 32, current.height * 32);
        c.stroke();
      }
      for (let y = 0; y <= current.height; y++) {
        c.beginPath();
        c.moveTo(0, y * 32);
        c.lineTo(current.width * 32, y * 32);
        c.stroke();
      }
    }
    c.restore();
    host.querySelector("output")!.textContent = `${Math.round(zoom * 100)} %`;
    canvas.dataset.zoom = String(zoom);
  }
  function fit() {
    zoom = Math.min(
      stage.clientWidth / (current.width * 32),
      stage.clientHeight / (current.height * 32),
    );
    cx = current.width * 16;
    cy = current.height * 16;
    draw();
  }
  const changeZoom = (z: number) => {
    zoom = Math.min(5, Math.max(0.25, z));
    draw();
  };
  host.querySelector<HTMLSelectElement>("select")!.onchange = (e) => {
    current = maps[Number((e.target as HTMLSelectElement).value)];
    rebuild();
    fit();
  };
  host.querySelector<HTMLButtonElement>("[data-return]")!.onclick = back;
  host.querySelector<HTMLButtonElement>("[data-fit]")!.onclick = fit;
  host
    .querySelectorAll<HTMLButtonElement>("[data-zoom]")
    .forEach(
      (b) =>
        (b.onclick = () =>
          changeZoom(zoom * (b.dataset.zoom === "1" ? 1.25 : 0.8))),
    );
  host.querySelector<HTMLInputElement>("[data-grid]")!.onchange = (e) => {
    grid = (e.target as HTMLInputElement).checked;
    draw();
  };
  host.querySelector<HTMLInputElement>("[data-night]")!.onchange = (e) => {
    night = (e.target as HTMLInputElement).checked;
    rebuild();
  };
  host.querySelector<HTMLInputElement>("[data-interiors]")!.onchange = (e) => {
    interiors = (e.target as HTMLInputElement).checked;
    rebuild();
  };
  host.querySelector<HTMLInputElement>("[data-objects]")!.onchange = (e) => {
    showObjects = (e.target as HTMLInputElement).checked;
    draw();
  };
  let childCleanup: (() => void) | undefined;
  host.querySelector<HTMLButtonElement>("[data-castle]")!.onclick =
    async () => {
      const { openMapWorkshop } = await import("../dev/map-workshop");
      if (disposed) return;
      observer.disconnect();
      childCleanup = openMapWorkshop(host, () => {
        childCleanup?.();
        childCleanup = openFutureTerrain(host, back);
      });
      host
        .querySelector<HTMLButtonElement>('[data-study="castleNew"]')
        ?.click();
    };
  canvas.onwheel = (e) => {
    e.preventDefault();
    changeZoom(zoom * Math.exp(-e.deltaY * 0.0015));
  };
  const pointers = new Map<number, { x: number; y: number }>();
  let lastDistance = 0,
    dragged = false;
  canvas.style.touchAction = "none";
  canvas.onpointerdown = (e) => {
    canvas.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    dragged = false;
    lastDistance = 0;
  };
  canvas.onpointermove = (e) => {
    const prev = pointers.get(e.pointerId);
    if (!prev) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const points = [...pointers.values()];
    if (points.length === 2) {
      const d = Math.hypot(
        points[0].x - points[1].x,
        points[0].y - points[1].y,
      );
      if (lastDistance) changeZoom((zoom * d) / lastDistance);
      lastDistance = d;
      dragged = true;
    } else {
      const dx = e.clientX - prev.x,
        dy = e.clientY - prev.y;
      if (Math.abs(dx) + Math.abs(dy) > 2) dragged = true;
      cx -= dx / zoom;
      cy -= dy / zoom;
      draw();
    }
  };
  canvas.onpointerup = (e) => {
    pointers.delete(e.pointerId);
    lastDistance = 0;
    if (dragged) return;
    const b = canvas.getBoundingClientRect(),
      x = Math.floor((cx + (e.clientX - b.left - b.width / 2) / zoom) / 32),
      y = Math.floor((cy + (e.clientY - b.top - b.height / 2) / zoom) / 32);
    if (x >= 0 && y >= 0 && x < current.width && y < current.height)
      status.textContent = `Case ${y * current.width + x + 1} · ${(current.layout ? !landscapePassable(current, interiors, x, y) : current.blocked[y * current.width + x]) ? "Obstacle" : "Praticable"} · ${current.title}`;
  };
  canvas.onpointercancel = (e) => {
    pointers.delete(e.pointerId);
    lastDistance = 0;
  };
  const observer = new ResizeObserver(draw);
  observer.observe(stage);
  fit();
  void Promise.all(
    Object.entries({
      castle: "assets/future-terrain/castle.png",
      wilds: "assets/future-terrain/wilds.png",
      ...LANDSCAPE_ASSETS,
    }).map(async ([key, path]) => {
      const image = new Image();
      image.src = import.meta.env.BASE_URL + path;
      await image.decode();
      images.set(key, image);
    }),
  )
    .then(() => {
      if (!disposed) rebuild();
    })
    .catch(() => {
      if (!disposed)
        status.textContent =
          "Impossible de charger le terrain. Revenez à l’accueil pour réessayer.";
    });
  return () => {
    disposed = true;
    observer.disconnect();
    childCleanup?.();
  };
}
