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
      .find((c) => E.cell(c.x + 1, c.y)?.walk)!;
    a.x = c.x;
    a.y = c.y;
    b.x = c.x + 1;
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
    await Promise.all([
      warmSprites(s.units, s.teamColors, [
        "idle",
        "move",
        "attack",
        "counter",
        "attack_offhand",
        "block",
        "damage",
        "death",
        "heal",
        "transform",
        "combat_idle",
        "combat_move",
        "combat_damage",
      ]),
      preloadEffects(),
    ]);
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
          (b.disabled = loading || (!!battle && index < battle.strikes.length)),
      );
    const b = app.querySelector<HTMLButtonElement>("[data-arena-pause]");
    if (b) {
      b.disabled = !battle || index >= battle.strikes.length;
      b.textContent = paused ? "Reprendre" : "Pause";
    }
  }
  function render() {
    app.innerHTML = `<main class="combat-lab-simple ${parry ? "parry-lab" : "map-lab"}"><header class="arena-toolbar"><strong>${parry ? "Tester les parades" : "Arène · chapitre 1"}</strong><label>Classe<select id="arena-class">${candidates.map((c) => `<option value="${c.id}" ${c.id === classId ? "selected" : ""}>${esc(c.name)}</option>`).join("")}</select></label>${classId === "hamrammr" && !parry ? `<button data-bear>${hero().bearForm ? "Forme humaine" : "Forme d’ours"}</button>` : ""}<button data-arena-back>Retour</button></header><section class="arena-field">${!parry ? '<canvas id="arena-map" width="1200" height="760" aria-label="Carte du chapitre 1 · arène indépendante"></canvas>' : ""}<div class="arena-duel" ${!parry && !battle ? "hidden" : ""}><canvas id="arena-duel" width="960" height="480" aria-label="Combat de test"></canvas><div class="arena-hp"><span data-arena-hp="0"></span><span data-arena-hp="1"></span></div></div></section><footer class="arena-controls"><button data-arena-attack>${parry ? "Jouer / Rejouer la parade" : E.activeWeapon(hero()).category === "healing" ? "Tester le soin" : "Attaquer / Rejouer"}</button>${!parry ? "<button data-arena-heal>Soigner mon unité</button>" : ""}<button data-arena-pause disabled>Pause</button><label>Vitesse<select id="arena-speed"><option value="1">Normale</option><option value="0.5">Ralenti</option><option value="0.25">Très lent</option></select></label><span id="arena-status" role="status"></span></footer></main>`;
    updateHp();
    controls();
    app.querySelector<HTMLElement>("[data-arena-back]")!.onclick = onBack;
    app.querySelector<HTMLSelectElement>("#arena-class")!.onchange = (e) => {
      classId = (e.target as HTMLSelectElement).value;
      reset();
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
    battle = undefined;
    healing = performance.now();
    paused = false;
    app.querySelector<HTMLElement>(".arena-duel")!.hidden = false;
    updateHp();
    controls();
    setStatus("Unité soignée · outil de test.");
  }
  async function attack() {
    if (loading || (battle && index < battle.strikes.length)) return;
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
      // Move only the arena's target into the equipped weapon's legal range.
      const cell = E.map
        .filter(
          (c) =>
            c.walk &&
            E.distance(a, c) >= a.minRange &&
            E.distance(a, c) <= a.range &&
            E.los(a, c),
        )
        .sort((c, d) => E.distance(c, b) - E.distance(d, b))[0];
      if (!cell) {
        setStatus("Déplacez votre unité vers une zone dégagée.");
        return;
      }
      b.x = cell.x;
      b.y = cell.y;
      if (b.hp <= 0) b.hp = 10000;
      try {
        battle = E.resolve(s, a, b);
      } catch (e) {
        setStatus((e as Error).message);
        return;
      }
    }
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
      if (E.cell(x, y)?.walk) {
        hero().x = x;
        hero().y = y;
        lastMap = -Infinity;
      }
    };
    canvas.onpointercancel = () => {
      drag = undefined;
      dragging = false;
    };
  }
  function drawMap(now: number) {
    const c = app.querySelector<HTMLCanvasElement>("#arena-map");
    if (!c || now - lastMap < 100) return;
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
      drawResourceFrame(
        ctx,
        unitSpriteProfile(u),
        "idle",
        Math.floor(now / 600) % 2,
        u.x * 32 - 3,
        u.y * 32 - 8,
        38,
        44,
        true,
        E.colorForOwner(s.teamColors, u.owner),
        "world",
      );
    }
    c.dataset.heroX = String(hero().x);
    c.dataset.heroY = String(hero().y);
    c.dataset.unitCount = String(s.units.length);
  }
  function drawDuel(now: number) {
    const canvas = app.querySelector<HTMLCanvasElement>("#arena-duel");
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, 960, 480);
    ctx.imageSmoothingEnabled = false;
    if (background.complete && background.naturalWidth)
      ctx.drawImage(background, 0, 0, 960, 480);
    else {
      ctx.fillStyle = "#203329";
      ctx.fillRect(0, 0, 960, 480);
    }
    const hit = battle?.strikes[index],
      a = hit && s.units.find((u) => u.id === hit.attacker),
      t = (now - started) * speed,
      size = 160,
      homes = [270, 690],
      xs = [...homes];
    let pose: ReturnType<typeof combatPose> | undefined,
      impact = Infinity;
    if (hit && a) {
      const profile = unitSpriteProfile(a),
        action = strikeAnimation(profile, hit),
        clip = resolveClip(profile, action),
        ranged = a.range > 1;
      const instantReply = parry && index === 1;
      pose = combatPose(
        t,
        clip?.frames.length ?? 1,
        clip?.fps ?? 8,
        ranged,
        hit.counter,
        clip?.impactFrame,
        {
          linkedBefore:
            instantReply || linkedStrikes(battle?.strikes[index - 1], hit),
          linkedAfter:
            (parry && index === 0) ||
            linkedStrikes(hit, battle?.strikes[index + 1]),
        },
      );
      impact = pose.impact;
      const side = a.id === hero().id ? 0 : 1,
        contact = meleeContactDistance(profile, action, size);
      xs[side] += (side === 0 ? 1 : -1) * pose.travel * (420 - contact);
      if (instantReply) {
        const incoming = battle!.strikes[0],
          incomingContact = meleeContactDistance(
            unitSpriteProfile(enemy()),
            strikeAnimation(unitSpriteProfile(enemy()), incoming),
            size,
          );
        const returnStart = pose.approach + pose.attack + pose.recovery;
        const remaining = 1 - Math.max(0, Math.min(1, (t - returnStart) / 360));
        xs[1] =
          homes[0] +
          incomingContact +
          (420 - incomingContact) * (1 - remaining);
        xs[0] = homes[0] + (incomingContact - contact) * remaining;
      }
      canvas.dataset.contactDistance = String(contact);
      canvas.dataset.actorDistance = String(Math.abs(xs[1] - xs[0]));
      canvas.dataset.phase = pose.animation;
      canvas.dataset.impact = String(impact);
      canvas.dataset.elapsed = String(t);
      if (t >= impact && !applied) {
        E.applyStrike(s, hit);
        applied = true;
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
      }
    }
    for (const [side, u] of s.units.entries()) {
      const attacking = a?.id === u.id,
        p = unitSpriteProfile(u);
      let action =
        attacking && pose
          ? ["attack", "counter"].includes(pose.animation)
            ? strikeAnimation(p, hit!)
            : pose.animation
          : hit && t >= impact
            ? hit.blocked
              ? "block"
              : hit.hit
                ? "damage"
                : "evade"
            : "idle";
      if (Number.isFinite(healing) && side === 0)
        action = E.activeWeapon(u).category === "healing" ? "heal" : "idle";
      const clip = resolveClip(p, action),
        frame = attacking
          ? (pose?.index ?? 0)
          : Math.min(
              (clip?.frames.length ?? 1) - 1,
              Math.floor((Math.max(0, t - impact) * (clip?.fps ?? 8)) / 1000),
            );
      ctx.save();
      ctx.translate(xs[side], 350);
      if (side === 1) ctx.scale(-1, 1);
      drawResourceFrame(
        ctx,
        p,
        clip ? action : "idle",
        Number.isFinite(frame) ? frame : 0,
        -size / 2,
        -size * 0.96,
        size,
        size,
        true,
        E.colorForOwner(s.teamColors, u.owner),
        "world",
      );
      ctx.restore();
    }
    if (a && hit) {
      const kind = attackEffect(a),
        side = a.id === hero().id ? 0 : 1,
        from = { x: homes[side], y: 280 },
        to = { x: homes[1 - side], y: 280 };
      if (kind) drawSpell(ctx, kind, t - impact, from, to, 110);
      else if (a.range > 1) drawArrow(ctx, t - impact, from, to);
    }
    if (Number.isFinite(healing)) {
      drawHealing(ctx, (now - healing) * speed, 270, 350, 180);
      if ((now - healing) * speed > 1200) {
        healing = -Infinity;
        if (!parry)
          app.querySelector<HTMLElement>(".arena-duel")!.hidden = true;
      }
    }
    if (pose && t > pose.total) {
      index++;
      applied = false;
      started = now;
      canvas.dataset.strikeIndex = String(index);
      if (index >= battle!.strikes.length) {
        battle = undefined;
        controls();
        setStatus("Terminé · vous pouvez rejouer.");
        if (!parry)
          app.querySelector<HTMLElement>(".arena-duel")!.hidden = true;
        lastMap = -Infinity;
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
