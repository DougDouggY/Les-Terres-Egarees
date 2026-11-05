import { CombatSceneV2 } from "../ui/combat-v2";
import "./tools.css";
import * as E from "../engine";
import { createSandbox, trainingUnit } from "../game/sandbox";
import { TerrainRenderer } from "../terrain";
import {
  warmSprites,
  unitSpriteProfile,
  drawResourceFrame,
} from "../sprites/resources";
import { resolveClip, strikeAnimation } from "../sprites/catalog";
import { meleeContactDistance } from "../sprites/geometry";
import { combatPose, linkedStrikes } from "../ui/combat-timeline";
import {
  attackEffect,
  drawSpell,
  drawArrow,
  drawHealing,
  preloadEffects,
} from "../ui/combat-effects";

const esc = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
/** Fixtures only: no campaign creation, saves, events, or changes to map data. */
export function openCombatArena(
  app: HTMLElement,
  onBack: () => void,
  mode: "arena" | "parry",
) {
  const parry = mode === "parry";
  let scene: CombatSceneV2 | undefined;
  let movement:
    | { steps: number[]; start: number; destination: { x: number; y: number } }
    | undefined;
  let s = createSandbox(),
    classId = "man_at_arms",
    battle: E.Battle | undefined,
    index = 0,
    started = 0,
    applied = false,
    loading = false,
    disposed = false,
    revision = 0,
    raf = 0,
    last = 0,
    paused = false,
    speed = 1,
    healing = -Infinity,
    camera = { x: 24, y: 15 },
    lastMap = -Infinity,
    dragging = false;
  const sheet = new Image(),
    background = new Image();
  sheet.src = import.meta.env.BASE_URL + "assets/regional-tiles.png";
  background.src = import.meta.env.BASE_URL + "assets/battle-3.png";
  const terrain = new TerrainRenderer(sheet);
  const candidates = Object.values(E.classes).filter((c) => {
    if (!parry) return true;
    const fixture = createSandbox();
    return E.hasShield(trainingUnit(fixture, c.id));
  });
  const hero = () => s.units[0],
    enemy = () => s.units[1];
  function setStatus(text: string) {
    const el = app.querySelector("#arena-status");
    if (el) el.textContent = text;
  }
  function updateHp() {
    app.querySelectorAll<HTMLElement>("[data-arena-hp]").forEach((el) => {
      const u = s.units[Number(el.dataset.arenaHp)];
      el.textContent = `${u.name} · ${u.hp} / ${u.maxHp} PV`;
    });
  }
  function reset() {
    revision++;
    loading = false;
    battle = undefined;
    movement = undefined;
    scene = undefined;
    paused = false;
    healing = -Infinity;
    s = createSandbox();
    s.sandboxFlat = false;
    const a = trainingUnit(s, classId),
      b = trainingUnit(s, "raider", 1, 1, 0);
    const c = E.map
      .filter((c) => c.walk && c.terrain === "road")
      .sort(
        (a, b) =>
          E.distance(a, { x: 29, y: 20 }) - E.distance(b, { x: 29, y: 20 }),
      )
      .find((c) => E.cell(c.x + Math.max(1, a.minRange), c.y)?.walk)!;
    a.x = c.x;
    a.y = c.y;
    b.x = c.x + Math.max(1, a.minRange);
    b.y = c.y;
    b.hp = b.maxHp = parry ? b.maxHp : 10000;
    camera = { x: Math.max(0, a.x - 6), y: Math.max(0, a.y - 4) };
    s.common.queue = [a.id, b.id];
    s.common.index = 0;
    render();
    lastMap = -Infinity;
    void prepare();
  }
  async function prepare() {
    const ticket = ++revision;
    loading = true;
    controls();
    setStatus("Chargement des sprites…");
    scene = new CombatSceneV2(s.units, [], s.teamColors);
    await scene.prepare();
    if (disposed || ticket !== revision) return false;
    loading = false;
    controls();
    setStatus(
      parry
        ? "Prêt : parade réussie, puis riposte."
        : "Cliquez sur l’ennemi pour l’attaquer, ou sur une case libre pour déplacer votre unité.",
    );
    return true;
  }
  function controls() {
    app
      .querySelectorAll<HTMLButtonElement>(
        "[data-arena-attack],[data-arena-heal],[data-bear]",
      )
      .forEach(
        (b) =>
          (b.disabled =
            loading ||
            !!movement ||
            (b.hasAttribute("data-arena-attack") ? false : !!battle)),
      );
    const b = app.querySelector<HTMLButtonElement>("[data-arena-pause]");
    if (b) {
      b.disabled = !battle || index >= battle.strikes.length;
      b.textContent = paused ? "Reprendre" : "Pause";
    }
  }
  function render() {
    app.innerHTML = `<main class="combat-lab-simple ${parry ? "parry-lab" : "map-lab"}"><header class="arena-toolbar"><strong>${parry ? "Tester les parades" : "Arène · chapitre 1"}</strong><label>Classe<select id="arena-class">${candidates.map((c) => `<option value="${c.id}" ${c.id === classId ? "selected" : ""}>${esc(c.name)}</option>`).join("")}</select></label>${!parry ? `<label>Arme<select id="arena-weapon">${(hero().carriedWeapons ?? []).map((id) => `<option value="${id}" ${id === hero().activeWeaponId ? "selected" : ""}>${esc(E.weaponCatalog[id].name)}</option>`).join("")}</select></label>` : ""}${classId === "hamrammr" && !parry ? `<button data-bear>${hero().bearForm ? "Forme humaine" : "Forme d’ours"}</button>` : ""}<button data-arena-back>Retour</button></header><section class="arena-field">${!parry ? '<canvas id="arena-map" width="1200" height="760" aria-label="Carte du chapitre 1 · arène indépendante"></canvas>' : ""}<div class="arena-duel" ${!parry && !battle ? "hidden" : ""}><canvas id="arena-duel" width="960" height="600" aria-label="Combat de test"></canvas><div class="arena-hp"><span data-arena-hp="0"></span><span data-arena-hp="1"></span></div></div></section><footer class="arena-controls"><button data-arena-attack>${parry ? "Jouer / Rejouer la parade" : E.activeWeapon(hero()).category === "healing" ? "Tester le soin" : "Attaquer / Rejouer"}</button>${!parry ? "<button data-arena-heal>Soigner mon unité</button>" : ""}<button data-arena-pause disabled>Pause</button><label>Vitesse<select id="arena-speed"><option value="1">Normale</option><option value="0.5">Ralenti</option><option value="0.25">Très lent</option></select></label><span id="arena-status" role="status"></span></footer></main>`;
    updateHp();
    controls();
    app.querySelector<HTMLElement>("[data-arena-back]")!.onclick = onBack;
    app.querySelector<HTMLSelectElement>("#arena-class")!.onchange = (e) => {
      classId = (e.target as HTMLSelectElement).value;
      reset();
    };
    const weaponSelect = app.querySelector<HTMLSelectElement>("#arena-weapon");
    if (weaponSelect)
      weaponSelect.onchange = () => {
        E.equipWeapon(s, hero(), weaponSelect.value);
        battle = undefined;
        render();
        void prepare();
      };
    const speedSelect = app.querySelector<HTMLSelectElement>("#arena-speed")!;
    speedSelect.value = String(speed);
    speedSelect.onchange = () => {
      const now = performance.now(),
        next = Number(speedSelect.value);
      started = now - ((now - started) * speed) / next;
      if (Number.isFinite(healing))
        healing = now - ((now - healing) * speed) / next;
      speed = next;
    };
    app.querySelector<HTMLElement>("[data-arena-attack]")!.onclick = () =>
      void attack();
    app
      .querySelector<HTMLElement>("[data-arena-heal]")
      ?.addEventListener("click", heal);
    app.querySelector<HTMLElement>("[data-arena-pause]")!.onclick = () => {
      paused = !paused;
      controls();
    };
    app
      .querySelector<HTMLElement>("[data-bear]")
      ?.addEventListener("click", async () => {
        if (loading || battle) return;
        try {
          E.transformBear(s, hero());
          render();
          await prepare();
        } catch (e) {
          setStatus((e as Error).message);
        }
      });
    bindMap();
  }
  function heal() {
    if (loading || (battle && index < battle.strikes.length)) return;
    hero().hp = hero().maxHp;
    scene = new CombatSceneV2(s.units, [], s.teamColors);
    void scene.prepare();
    battle = undefined;
    healing = performance.now();
    paused = false;
    app.querySelector<HTMLElement>(".arena-duel")!.hidden = false;
    updateHp();
    controls();
    setStatus("Unité soignée · outil de test.");
  }
  async function attack() {
    if (loading || movement) return;
    battle = undefined;
    if (E.activeWeapon(hero()).category === "healing") {
      heal();
      return;
    }
    if (hero().hp <= 0) hero().hp = hero().maxHp;
    if (E.activeWeapon(hero()).reload) hero().crossbowLoaded = true;
    const a = hero(),
      b = enemy();
    if (parry) {
      // Choose a real successful parry and immediate counter, without modifying
      // class statistics, hit chances, shield rules or the campaign RNG.
      a.hp = a.maxHp;
      b.hp = b.maxHp;
      for (let seed = 1; seed <= 2000; seed++) {
        const trial = structuredClone(s);
        trial.seed = seed;
        const result = E.resolve(trial, trial.units[1], trial.units[0]);
        if (
          result.strikes[0]?.blocked &&
          result.strikes[1]?.attacker === a.id &&
          result.strikes[1]?.parryCounter &&
          result.strikes[1]?.hit
        ) {
          battle = { ...result, strikes: result.strikes.slice(0, 2) };
          break;
        }
      }
      if (!battle) {
        setStatus("Aucune parade trouvée pour cet équipement.");
        return;
      }
    } else {
      if (!E.canAttack(a, b)) {
        setStatus("Cible hors de portée : approchez-vous sur la carte.");
        return;
      }
      if (b.hp <= 0) b.hp = 10000;
      try {
        battle = E.resolve(s, a, b);
      } catch (e) {
        setStatus((e as Error).message);
        return;
      }
    }
    const ticket = ++revision;
    loading = true;
    controls();
    const nextScene = new CombatSceneV2(s.units, battle.strikes, s.teamColors);
    await nextScene.prepare();
    if (disposed || ticket !== revision) return;
    scene = nextScene;
    loading = false;
    index = 0;
    applied = false;
    paused = false;
    healing = -Infinity;
    started = performance.now();
    app.querySelector<HTMLElement>(".arena-duel")!.hidden = false;
    controls();
    setStatus(
      parry
        ? "Attaque adverse → parade → riposte immédiate"
        : "Échange en cours…",
    );
  }
  function bindMap() {
    const canvas = app.querySelector<HTMLCanvasElement>("#arena-map");
    if (!canvas) return;
    let drag: { x: number; y: number; cx: number; cy: number } | undefined;
    canvas.onpointerdown = (e) => {
      drag = { x: e.clientX, y: e.clientY, cx: camera.x, cy: camera.y };
      dragging = false;
      canvas.setPointerCapture(e.pointerId);
    };
    canvas.onpointermove = (e) => {
      if (!drag) return;
      const r = canvas.getBoundingClientRect();
      const cols = 14,
        rows = (cols * r.height) / r.width;
      const dx = e.clientX - drag.x,
        dy = e.clientY - drag.y;
      if (Math.hypot(dx, dy) > 5) dragging = true;
      if (dragging) {
        camera.x = Math.max(
          0,
          Math.min(E.W - cols, drag.cx - (dx / r.width) * cols),
        );
        camera.y = Math.max(
          0,
          Math.min(E.H - rows, drag.cy - (dy / r.height) * rows),
        );
        lastMap = -Infinity;
      }
    };
    canvas.onpointerup = (e) => {
      if (canvas.hasPointerCapture(e.pointerId))
        canvas.releasePointerCapture(e.pointerId);
      const was = drag;
      drag = undefined;
      if (!was || dragging || loading || battle) return;
      const r = canvas.getBoundingClientRect(),
        cols = 14,
        rows = (cols * r.height) / r.width;
      const x = Math.floor(camera.x + ((e.clientX - r.left) / r.width) * cols),
        y = Math.floor(camera.y + ((e.clientY - r.top) / r.height) * rows);
      if (x === enemy().x && y === enemy().y) {
        void attack();
        return;
      }
      if (movement) return;
      const path = E.path(s, hero(), x, y);
      if (!path || path.cost > hero().move) {
        setStatus("Case inaccessible pendant ce déplacement.");
        return;
      }
      movement = {
        steps: path.steps,
        start: performance.now(),
        destination: { x, y },
      };
      controls();
      lastMap = -Infinity;
    };
    canvas.onpointercancel = () => {
      drag = undefined;
      dragging = false;
    };
  }
  function drawMap(now: number) {
    const c = app.querySelector<HTMLCanvasElement>("#arena-map");
    if (!c || now - lastMap < (movement ? 25 : 100)) return;
    const layer = terrain.layer("regional", s.factions);
    if (!layer) return;
    lastMap = now;
    const ctx = c.getContext("2d")!,
      r = c.getBoundingClientRect(),
      cols = 14,
      rows = (cols * r.height) / r.width;
    c.width = Math.round(r.width * Math.min(2, devicePixelRatio));
    c.height = Math.round(r.height * Math.min(2, devicePixelRatio));
    ctx.setTransform(c.width / (cols * 32), 0, 0, c.height / (rows * 32), 0, 0);
    ctx.translate(-camera.x * 32, -camera.y * 32);
    ctx.drawImage(layer, 0, 0);
    for (const u of s.units) {
      let x = u.x,
        y = u.y,
        animation = "idle",
        frame = Math.floor(now / 600) % 2,
        flip = false;
      if (movement && u.id === hero().id) {
        const progress = Math.max(0, (now - movement.start) / 180),
          i = Math.min(movement.steps.length - 1, Math.floor(progress)),
          a = E.map[movement.steps[i]],
          b = E.map[movement.steps[Math.min(i + 1, movement.steps.length - 1)]],
          fraction = Math.min(1, progress - i);
        x = a.x + (b.x - a.x) * fraction;
        y = a.y + (b.y - a.y) * fraction;
        flip = b.x < a.x;
        animation = "move";
        frame = Math.floor(now / 130) % 2;
        if (progress >= movement.steps.length - 1) {
          try {
            E.move(s, u, movement.destination.x, movement.destination.y);
          } catch (e) {
            setStatus((e as Error).message);
          }
          movement = undefined;
          controls();
        }
      }
      ctx.save();
      if (flip) {
        ctx.translate((x * 32 + 16) * 2, 0);
        ctx.scale(-1, 1);
      }
      const size =
        E.unitClass(u).mounted || unitSpriteProfile(u)?.classId === "sans_rider"
          ? 52
          : 38;
      drawResourceFrame(
        ctx,
        unitSpriteProfile(u),
        animation,
        frame,
        x * 32 + 16 - size / 2,
        y * 32 + 12 - size / 2 - 0.384 * (size - 38),
        size,
        size * 1.15,
        true,
        E.colorForOwner(s.teamColors, u.owner),
        "world",
      );
      ctx.restore();
    }
    c.dataset.moving = String(!!movement);
    c.dataset.cameraX = String(camera.x);
    c.dataset.cameraY = String(camera.y);
    c.dataset.viewCols = "14";
    c.dataset.viewRows = String(rows);
    c.dataset.heroX = String(hero().x);
    c.dataset.heroY = String(hero().y);
    c.dataset.unitCount = String(s.units.length);
  }
  function drawDuel(now: number) {
    const canvas = app.querySelector<HTMLCanvasElement>("#arena-duel");
    if (!canvas || !scene) return;
    canvas.height = 600;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, 960, 600);
    ctx.imageSmoothingEnabled = false;
    if (background.complete && background.naturalWidth)
      ctx.drawImage(background, 0, 0, 960, 600);
    else {
      ctx.fillStyle = "#203329";
      ctx.fillRect(0, 0, 960, 600);
    }
    const elapsed = (now - started) * speed;
    scene.draw(
      ctx,
      battle ? elapsed : 0,
      (index) => {
        const hit = battle!.strikes[index];
        E.applyStrike(s, hit);
        updateHp();
        setStatus(
          hit.blocked
            ? "Parade réussie"
            : hit.parryCounter
              ? "Riposte immédiate"
              : hit.hit
                ? `Impact · −${hit.damage} PV`
                : "Esquive",
        );
      },
      () => {
        if (!battle) return;
        battle = undefined;
        controls();
        setStatus("Terminé · vous pouvez rejouer.");
        if (!parry)
          app.querySelector<HTMLElement>(".arena-duel")!.hidden = true;
        lastMap = -Infinity;
      },
    );
    if (Number.isFinite(healing)) {
      const t = (now - healing) * speed;
      drawHealing(ctx, t, 250, 475, 180);
      if (t > 1200) {
        healing = -Infinity;
        if (!parry)
          app.querySelector<HTMLElement>(".arena-duel")!.hidden = true;
      }
    }
  }

  function tick(now: number) {
    if (disposed) return;
    if (paused) {
      started += now - last;
      if (Number.isFinite(healing)) healing += now - last;
    }
    last = now;
    drawMap(now);
    drawDuel(now);
    raf = requestAnimationFrame(tick);
  }
  reset();
  raf = requestAnimationFrame(tick);
  return () => {
    disposed = true;
    revision++;
    cancelAnimationFrame(raf);
    terrain.reset();
  };
}
