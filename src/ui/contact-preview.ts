import * as E from "../engine";
import {
  unitSpriteProfile,
  spriteImage,
  drawResourceFrame,
} from "../sprites/resources";
import { combatSkin } from "../sprites/combat-skins";
import { resolveClip } from "../sprites/catalog";
import { resourceRect, meleeContactDistance } from "../sprites/geometry";
import { combatHud } from "./combat-hud";
import {
  contactScenarios,
  contactSample,
  contactDuration,
  contactApproach,
  contactPositions,
  type ContactScenario,
} from "./contact-trial-model";
import { criticalImpact, drawCriticalImpact } from "./critical-impact";
import "./combat-hud.css";
import "./contact-preview.css";
export function openContactPreview(app: HTMLElement, back: () => void) {
  const unit = E.makeClassUnit(
    "contact-pillard",
    1,
    1,
    "raider",
    "Pillard",
    0,
    0,
    "male",
  );
  const profile = combatSkin(unitSpriteProfile(unit))!.profile;
  let kind: ContactScenario = "agility",
    elapsed = 0,
    speed = 1,
    running = false,
    paused = false,
    ready = false,
    disposed = false,
    raf = 0,
    last = performance.now();
  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  const background = new Image();
  background.src = import.meta.env.BASE_URL + "assets/battle-3.png";
  app.innerHTML = `<main class="contact-preview"><header><h1>Pillard contre Pillard</h1><button data-contact-back>Retour à l’accueil</button></header><aside class="contact-sidebar"><div class="contact-buttons">${Object.entries(
    contactScenarios,
  )
    .map(
      ([id, s]) =>
        `<button data-contact-scenario="${id}" disabled>${s.label}</button>`,
    )
    .join(
      "",
    )}</div><div class="contact-controls"><label>Vitesse <select data-contact-speed>${[0.25, 0.5, 1, 1.5, 2, 4].map((n) => `<option value="${n}" ${n === 1 ? "selected" : ""}>×${String(n).replace(".", ",")}</option>`).join("")}</select></label><button data-contact-pause disabled>Pause</button><button data-contact-replay disabled>Rejouer</button></div></aside><section class="contact-stage duel-stage">${combatHud(
    [
      {
        id: "contact-left",
        name: "Vous · Pillard",
        weapon: "Hache et bouclier",
        hp: 24,
        maxHp: 24,
        hit: null,
        damage: 4,
        color: [63, 132, 231],
      },
      {
        id: "contact-right",
        name: "Adversaire · Pillard",
        weapon: "Hache et bouclier",
        hp: 24,
        maxHp: 24,
        hit: null,
        damage: 4,
        color: [255, 45, 161],
      },
    ],
  )}<canvas width="960" height="480" aria-label="Échange au contact des deux Pillards" data-contact-canvas></canvas></section><p role="status" data-contact-status class="contact-sr-only">Chargement des sprites…</p><ol data-contact-events hidden></ol><p class="contact-note contact-sr-only">Scénarios imposés pour observer les animations. Une seule approche, aucun retour entre les coups ; attaque classique réutilisée pour chaque frappe et riposte. L’esquive utilise ses poses dédiées et un pas en arrière. Le dernier coup du quatrième scénario montre un critique par flash et secousse. Ces essais ne modifient ni votre partie ni ses règles.</p></main>`;
  const canvas = app.querySelector<HTMLCanvasElement>("[data-contact-canvas]")!,
    ctx = canvas.getContext("2d")!;
  const status = app.querySelector<HTMLElement>("[data-contact-status]")!;
  const pause = app.querySelector<HTMLButtonElement>("[data-contact-pause]")!;
  const replay = app.querySelector<HTMLButtonElement>("[data-contact-replay]")!;
  function start(id: ContactScenario) {
    kind = id;
    canvas.dataset.elapsed = "0";
    canvas.dataset.finished = "false";
    canvas.dataset.scenario = id;
    elapsed = 0;
    running = true;
    paused = false;
    last = performance.now();
    pause.disabled = false;
    pause.textContent = "Pause";
    replay.disabled = false;
    app
      .querySelectorAll("[data-contact-scenario]")
      .forEach((b) =>
        b.setAttribute(
          "aria-pressed",
          String((b as HTMLElement).dataset.contactScenario === id),
        ),
      );
    app.querySelector("[data-contact-events]")!.innerHTML = contactScenarios[
      id
    ].events
      .map((e) => `<li>${e.label}</li>`)
      .join("");
  }
  app.querySelector<HTMLButtonElement>("[data-contact-back]")!.onclick = () => {
    dispose();
    back();
  };
  app
    .querySelectorAll<HTMLButtonElement>("[data-contact-scenario]")
    .forEach(
      (b) =>
        (b.onclick = () => start(b.dataset.contactScenario as ContactScenario)),
    );
  app.querySelector<HTMLSelectElement>("[data-contact-speed]")!.onchange = (
    e,
  ) => {
    speed = Number((e.target as HTMLSelectElement).value);
    last = performance.now();
  };
  pause.onclick = () => {
    paused = !paused;
    last = performance.now();
    pause.textContent = paused ? "Reprendre" : "Pause";
  };
  replay.onclick = () => start(kind);
  function actor(
    side: 0 | 1,
    x: number,
    animation: string,
    progress: number,
    alpha = 1,
  ) {
    const clip =
      resolveClip(profile, animation) ?? resolveClip(profile, "idle")!;
    const name = resolveClip(profile, animation) ? animation : "idle";
    const count =
      animation === "block"
        ? Math.min(3, clip.frames.length)
        : clip.frames.length;
    const index =
      animation === "idle" || animation === "move"
        ? Math.floor(progress * clip.fps) % clip.frames.length
        : Math.min(count - 1, Math.floor(progress * count));
    const rect = resourceRect(clip, index)!;
    ctx.save();
    ctx.translate(x, 350);
    if (side === 1) ctx.scale(-1, 1);
    ctx.globalAlpha = alpha;
    // Constant anatomical size per source: raising the axe never shrinks the body.
    const reference =
      profile.referenceHeights?.[clip.source] ??
      resourceRect(clip, 0)?.bodyHeight ??
      rect.bodyHeight ??
      rect.height;
    drawResourceFrame(
      ctx,
      profile,
      name,
      index,
      -80,
      -160 * 0.96,
      160,
      160,
      true,
      side === 0 ? "blue" : "pink",
      "world",
      { scale: 136 / reference },
    );
    ctx.restore();
  }
  function draw(now: number) {
    if (disposed || !app.contains(canvas)) {
      dispose();
      return;
    }
    const dt = now - last;
    last = now;
    if (ready && running && !paused)
      elapsed = Math.min(
        contactDuration(kind),
        elapsed + Math.min(100, dt) * speed,
      );
    const sample = contactSample(kind, elapsed);
    const effect = criticalImpact(
      running || elapsed > 0
        ? sample.event.critical
          ? elapsed - (contactApproach + sample.index * 1150 + 480)
          : -1
        : -1,
      reducedMotion,
    );
    ctx.clearRect(0, 0, 960, 480);
    ctx.save();
    ctx.translate(effect.shakeX, effect.shakeY);
    ctx.imageSmoothingEnabled = false;
    if (background.complete && background.naturalWidth)
      ctx.drawImage(background, 0, 0, 960, 480);
    else {
      ctx.fillStyle = "#24352f";
      ctx.fillRect(0, 0, 960, 480);
    }
    if (ready) {
      const first = contactScenarios[kind].events[0].side;
      const gap = Math.max(
        95,
        Math.min(210, meleeContactDistance(profile, "attack", 136, 3)),
      );
      const positions = contactPositions(
        running || elapsed > 0 ? sample.approach : 0,
        gap,
        first,
      );
      const actions = ["idle", "idle"],
        progress = [elapsed / 1000, elapsed / 1000],
        offset = [0, 0];
      if (running && elapsed < contactApproach) {
        actions[0] = actions[1] = "move";
        progress[0] = progress[1] = elapsed / 1000;
      } else if ((running || elapsed > 0) && !sample.ending) {
        const { event: e, progress: p } = sample;
        actions[e.side] = p < 0.78 ? "attack" : "idle";
        progress[e.side] = p / 0.78;
        const target = 1 - e.side;
        if (e.outcome === "block" && p > 0.12 && p < 0.83) {
          actions[target] = "block";
          progress[target] = (p - 0.12) / 0.71;
        }
        if (p >= 0.42 && p < 0.82) {
          if (e.outcome === "hit") {
            actions[target] = sample.hp[target] === 0 ? "death" : "damage";
            progress[target] = (p - 0.42) / 0.4;
          }
        }
        if (e.outcome === "evade" && p >= 0.16 && p < 0.84) {
          actions[target] = "evade";
          progress[target] = (p - 0.16) / 0.68;
          offset[target] =
            (target === 0 ? -1 : 1) * Math.sin(progress[target] * Math.PI) * 60;
        }
      }
      for (const side of [0, 1] as const) {
        let alpha = 1;
        if (sample.hp[side] === 0) {
          actions[side] = "death";
          progress[side] = Math.max(
            0,
            (elapsed - (contactApproach + sample.index * 1150 + 480)) / 700,
          );
          alpha = Math.max(0, 1 - Math.max(0, progress[side] - 1));
        }
        actor(
          side,
          positions[side] + offset[side],
          actions[side],
          progress[side],
          alpha,
        );
      }
      if (
        running &&
        elapsed >= contactApproach &&
        !sample.ending &&
        sample.progress >= 0.42 &&
        sample.progress < 0.7
      ) {
        ctx.font = "bold 24px sans-serif";
        ctx.textAlign = "center";
        ctx.fillStyle = sample.event.outcome === "hit" ? "#ffe1a0" : "#d7f1ff";
        ctx.fillText(
          sample.event.outcome === "block"
            ? "PARADE"
            : sample.event.outcome === "evade"
              ? "ESQUIVE"
              : `−${sample.event.damage}`,
          positions[1 - sample.event.side],
          175,
        );
      }
      for (const side of [0, 1] as const) {
        app.querySelector(`[data-combat-value="${side}"]`)!.textContent =
          `${sample.hp[side]} / 24 PV`;
        (
          app.querySelector(`[data-combat-hp="${side}"]`) as HTMLElement
        ).style.width = `${(sample.hp[side] / 24) * 100}%`;
      }
      app
        .querySelectorAll("[data-contact-events] li")
        .forEach((li, i) =>
          li.classList.toggle("contact-applied", sample.applied.includes(i)),
        );
      if (effect.active)
        drawCriticalImpact(
          ctx,
          elapsed - (contactApproach + sample.index * 1150 + 480),
          positions[1 - sample.event.side],
          280,
          960,
          480,
          reducedMotion,
        );
      canvas.dataset.critical = String(effect.active);
      canvas.dataset.leftFrameSource =
        resolveClip(profile, actions[0])?.source ?? "";
      canvas.dataset.rightFrameSource =
        resolveClip(profile, actions[1])?.source ?? "";
      canvas.dataset.leftOffset = String(offset[0]);
      canvas.dataset.rightOffset = String(offset[1]);
      canvas.dataset.elapsed = String(elapsed);
      canvas.dataset.leftX = String(positions[0]);
      canvas.dataset.rightX = String(positions[1]);
      canvas.dataset.leftAction = actions[0];
      canvas.dataset.rightAction = actions[1];
      canvas.dataset.applied = String(sample.applied.length);
      canvas.dataset.finished = String(sample.done);
      canvas.dataset.scenario = kind;
      status.textContent =
        !running && elapsed === 0
          ? "Choisissez un scénario"
          : sample.done
            ? "Échange terminé"
            : paused
              ? "Pause"
              : elapsed < contactApproach
                ? "Approche"
                : sample.ending
                  ? "Fin de l’échange"
                  : sample.event.label;
      if (sample.done) {
        running = false;
        pause.disabled = true;
      }
    }
    ctx.restore();
    raf = requestAnimationFrame(draw);
  }
  async function load() {
    try {
      await Promise.all(
        [
          ...new Set(
            Object.keys(profile.clips).map(
              (n) => resolveClip(profile, n)!.source,
            ),
          ),
        ].map(async (source) => {
          const image = spriteImage(source);
          if (!image.complete)
            await new Promise<void>((yes, no) => {
              image.addEventListener("load", () => yes(), { once: true });
              image.addEventListener("error", no, { once: true });
            });
          if (!image.naturalWidth) throw Error(source);
        }),
      );
      if (disposed) return;
      ready = true;
      app
        .querySelectorAll<HTMLButtonElement>("[data-contact-scenario]")
        .forEach((b) => (b.disabled = false));
    } catch (error) {
      status.textContent = `Chargement impossible : ${String(error)}`;
    }
  }
  void load();
  raf = requestAnimationFrame(draw);
  function dispose() {
    disposed = true;
    cancelAnimationFrame(raf);
  }
  return dispose;
}
