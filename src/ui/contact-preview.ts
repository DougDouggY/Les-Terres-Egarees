import * as E from "../engine";
import { contactRoster } from "./contact-roster";
import {
  unitSpriteProfile,
  spriteImage,
  drawResourceFrame,
} from "../sprites/resources";
import { combatSkin } from "../sprites/combat-skins";
import { illustratedWeaponPoint } from "../sprites/weapon-point";
import { resolveClip } from "../sprites/catalog";
import { resourceRect, anatomicalContactGap } from "../sprites/geometry";
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
import { drawParryImpact, parryImpactDuration } from "./parry-impact";
import {
  drawArrow,
  drawSpell,
  drawHealing,
  preloadEffects,
} from "./combat-effects";
import "./combat-hud.css";
import "./contact-preview.css";
export function openContactPreview(app: HTMLElement, back: () => void) {
  const variants = contactRoster;
  function prepare(v: (typeof variants)[number]) {
    const u = E.makeClassUnit(
      "contact-preview",
      1,
      1,
      v.cls,
      v.name,
      0,
      0,
      v.gender,
    );
    u.activeWeaponId = v.weapon;
    E.syncWeapon(u);
    return {
      ...v,
      mapProfile: unitSpriteProfile(u)!,
      profile: combatSkin(unitSpriteProfile(u))!.profile,
      weaponName: E.activeWeapon(u).name,
      shield: E.hasShield(u),
      ranged: ["bow", "crossbow", "magic", "healing"].includes(
        E.activeWeapon(u).category,
      ),
      category: E.activeWeapon(u).category,
    };
  }
  const choices = variants.map(prepare);
  let selected = choices[0],
    profile = selected.profile,
    loadingVersion = 0;
  let demo: string | undefined;
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
  app.innerHTML = `<main class="contact-preview"><header><h1><span data-contact-title>${selected.name} contre ${selected.name}</span> <small class="contact-version">Classes de base</small></h1><button data-contact-back>Retour à l’accueil</button></header><aside class="contact-sidebar"><label class="contact-character">Personnage<select data-contact-character>${(
    ["north", "knight"] as const
  )
    .map(
      (f) =>
        `<optgroup label="${f === "north" ? "Vikings de base" : "Chevaliers de base"}">${choices
          .filter((v) => v.faction === f)
          .map((v) => `<option value="${v.id}">${v.label}</option>`)
          .join("")}</optgroup>`,
    )
    .join(
      "",
    )}</select></label><a class="contact-compare" href="${import.meta.env.BASE_URL}validation/vikings/index.html" target="_blank" rel="noopener">Comparer les gabarits ↗</a><a class="contact-compare" href="${import.meta.env.BASE_URL}validation/chevaliers/index.html" target="_blank" rel="noopener">Comparer les Chevaliers ↗</a><div class="contact-buttons">${Object.entries(
    contactScenarios,
  )
    .map(
      ([id, s]) =>
        `<button data-contact-scenario="${id}" ${selected.category === "healing" || (!selected.shield && ["parry", "double-parry"].includes(id)) ? "hidden" : ""} disabled>${s.label}</button>`,
    )
    .join(
      "",
    )}</div><div class="contact-controls"><label>Animation isolée <select data-contact-animation></select></label><button data-contact-play-animation disabled>Voir l’animation</button><label>Vitesse <select data-contact-speed>${[0.25, 0.5, 1, 1.5, 2, 4].map((n) => `<option value="${n}" ${n === 1 ? "selected" : ""}>×${String(n).replace(".", ",")}</option>`).join("")}</select></label><button data-contact-pause disabled>Pause</button><button data-contact-replay disabled>Rejouer</button></div></aside><section class="contact-stage duel-stage">${combatHud(
    [
      {
        id: "contact-left",
        name: `Vous · ${selected.name}`,
        weapon: selected.weaponName,
        hp: 24,
        maxHp: 24,
        hit: null,
        damage: 4,
        color: [63, 132, 231],
      },
      {
        id: "contact-right",
        name: `Adversaire · ${selected.name}`,
        weapon: selected.weaponName,
        hp: 24,
        maxHp: 24,
        hit: null,
        damage: 4,
        color: [255, 45, 161],
      },
    ],
  )}<canvas width="960" height="480" aria-label="Animations des classes de base" data-contact-canvas></canvas></section><p role="status" data-contact-status class="contact-sr-only">Chargement des sprites…</p><ol data-contact-events hidden></ol><p class="contact-note contact-sr-only">Scénarios imposés pour observer les animations. Une seule approche, aucun retour entre les coups ; attaque classique réutilisée pour chaque frappe et riposte. L’esquive utilise ses poses dédiées et un pas en arrière. Le dernier coup du quatrième scénario montre un critique par flash et secousse. Ces essais ne modifient ni votre partie ni ses règles.</p></main>`;
  const canvas = app.querySelector<HTMLCanvasElement>("[data-contact-canvas]")!,
    ctx = canvas.getContext("2d")!;
  const status = app.querySelector<HTMLElement>("[data-contact-status]")!;
  const pause = app.querySelector<HTMLButtonElement>("[data-contact-pause]")!;
  const replay = app.querySelector<HTMLButtonElement>("[data-contact-replay]")!;
  function start(id: ContactScenario) {
    if (
      !ready ||
      selected.category === "healing" ||
      (!selected.shield && ["parry", "double-parry"].includes(id))
    )
      return;
    demo = undefined;
    app.querySelector("[data-contact-title]")!.textContent =
      `${selected.name} contre ${selected.name}`;
    app.querySelectorAll(".duel-nameplates strong")[1].textContent =
      `Adversaire · ${selected.name}`;
    kind = id;
    canvas.dataset.elapsed = "0";
    canvas.dataset.critical = "false";
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
  app.querySelector<HTMLSelectElement>("[data-contact-character]")!.onchange = (
    e,
  ) => {
    selected = choices.find(
      (v) => v.id === (e.target as HTMLSelectElement).value,
    )!;
    profile = selected.profile;
    demo = undefined;
    if (!selected.shield && ["parry", "double-parry"].includes(kind))
      kind = "agility";
    app
      .querySelectorAll<HTMLButtonElement>("[data-contact-scenario]")
      .forEach((b) => {
        b.hidden =
          selected.category === "healing" ||
          (!selected.shield &&
            ["parry", "double-parry"].includes(b.dataset.contactScenario!));
        b.setAttribute("aria-pressed", "false");
      });
    running = false;
    paused = false;
    elapsed = 0;
    pause.disabled = replay.disabled = true;
    pause.textContent = "Pause";
    canvas.dataset.character = selected.id;
    canvas.dataset.elapsed = "0";
    canvas.dataset.critical = "false";
    canvas.dataset.finished = "false";
    app.querySelector("[data-contact-title]")!.textContent =
      `${selected.name} contre ${selected.name}`;
    app
      .querySelectorAll(".duel-nameplates strong")
      .forEach(
        (label, i) =>
          (label.textContent = `${i === 0 ? "Vous" : "Adversaire"} · ${selected.name}`),
      );
    app
      .querySelectorAll(".duel-weapon > strong")
      .forEach((label) => (label.textContent = selected.weaponName));
    app.querySelector("[data-contact-events]")!.replaceChildren();
    refreshAnimations();
    void load();
  };
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
  replay.onclick = () => (demo ? playAnimation(demo) : start(kind));
  const extra = app.querySelector<HTMLSelectElement>(
    "[data-contact-animation]",
  )!;
  const extraPlay = app.querySelector<HTMLButtonElement>(
    "[data-contact-play-animation]",
  )!;
  function refreshAnimations() {
    const labels: Record<string, string> = {
      "map-idle": "Attente carte / introduction",
      idle: "Attente",
      move: "Pas rapides",
      attack: "Attaque",
      block: "Parade",
      evade: "Esquive",
      damage: "Blessure",
      death: "Chute",
      reload: "Rechargement",
      heal: "Soins",
    };
    extra.innerHTML = Object.entries(labels)
      .filter(
        ([name]) =>
          (name === "map-idle" || !!resolveClip(profile, name)) &&
          (name !== "block" || selected.shield) &&
          (name !== "attack" || selected.category !== "healing"),
      )
      .map(([name, label]) => `<option value="${name}">${label}</option>`)
      .join("");
    if (selected.category === "healing") extra.value = "heal";
    else if (resolveClip(profile, "reload")) extra.value = "reload";
  }
  function playAnimation(name: string) {
    if (
      !ready ||
      !(name === "map-idle"
        ? resolveClip(selected.mapProfile, "idle")
        : resolveClip(profile, name))
    )
      return;
    demo = name;
    app.querySelectorAll(".duel-nameplates strong")[1].textContent =
      `${name === "heal" ? "Allié" : "Adversaire"} · ${selected.name}`;
    app.querySelector("[data-contact-title]")!.textContent =
      name === "heal"
        ? `${selected.name} · soins`
        : `${selected.name} · animation isolée`;
    elapsed = 0;
    running = true;
    paused = false;
    last = performance.now();
    pause.disabled = false;
    replay.disabled = false;
    pause.textContent = "Pause";
    app.querySelector("[data-contact-events]")!.replaceChildren();
    app
      .querySelectorAll("[data-contact-scenario]")
      .forEach((b) => b.setAttribute("aria-pressed", "false"));
  }
  extraPlay.onclick = () => playAnimation(extra.value);
  refreshAnimations();
  function actor(
    side: 0 | 1,
    x: number,
    animation: string,
    progress: number,
    alpha = 1,
  ) {
    const drawing = demo === "map-idle" ? selected.mapProfile : profile;
    const clip =
      resolveClip(drawing, animation) ?? resolveClip(drawing, "idle")!;
    const name = resolveClip(drawing, animation) ? animation : "idle";
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
      drawing.referenceHeights?.[clip.source] ??
      resourceRect(clip, 0)?.bodyHeight ??
      rect.bodyHeight ??
      rect.height;
    drawResourceFrame(
      ctx,
      drawing,
      name,
      index,
      -80,
      -160 * 0.96,
      160,
      160,
      true,
      side === 0 ? "blue" : "pink",
      "world",
      { scale: 136 / reference, idleTime: progress * 1000 },
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
        demo ? 2400 : contactDuration(kind),
        elapsed + Math.min(100, dt) * speed,
      );
    const sample = contactSample(kind, elapsed);
    if (demo) {
      sample.hp =
        demo === "heal"
          ? [24, elapsed >= 1200 ? 20 : 12]
          : demo === "damage"
            ? [elapsed >= 900 ? 20 : 24, 24]
            : demo === "death"
              ? [elapsed >= 900 ? 0 : 24, 24]
              : [24, 24];
      sample.event = { side: 0, outcome: "hit", damage: 0, label: demo };
      sample.approach = 0;
      sample.index = 0;
      sample.progress = Math.min(1, Math.max(0, (elapsed - 250) / 1600));
      sample.ending = elapsed >= 2100;
      sample.done = elapsed >= 2400;
      sample.applied = [];
    }
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
      const gap = anatomicalContactGap(profile, profile, 136);
      const positions = contactPositions(
        running || elapsed > 0 ? sample.approach : 0,
        gap,
        first,
        selected.ranged,
        selected.ranged,
      );
      const actions = ["idle", "idle"],
        progress = [elapsed / 1000, elapsed / 1000],
        offset = [0, 0];
      if (demo) {
        actions[0] =
          demo === "map-idle"
            ? "idle"
            : demo === "death" || !sample.ending
              ? demo
              : "idle";
        progress[0] =
          demo === "idle" || demo === "map-idle" || demo === "move"
            ? elapsed / 1000
            : sample.progress;
      } else if (running && elapsed < contactApproach) {
        if (!selected.ranged) actions[0] = actions[1] = "move";
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
        if (sample.hp[side] === 0 && !demo) {
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
        !demo &&
        ["bow", "crossbow"].includes(selected.category) &&
        running &&
        elapsed >= contactApproach &&
        !sample.ending
      ) {
        const from = sample.event.side,
          to = 1 - from;
        drawArrow(
          ctx,
          ((sample.progress - 0.3) / 0.12) * 100 - 100,
          { x: positions[from], y: 285 },
          { x: positions[to] + offset[to], y: 285 },
        );
      }
      if (
        selected.category === "magic" &&
        !demo &&
        running &&
        elapsed >= contactApproach &&
        !sample.ending
      ) {
        const from = sample.event.side,
          to = 1 - from;
        drawSpell(
          ctx,
          "fire",
          sample.progress * 1150 - 480,
          illustratedWeaponPoint(
            profile,
            "attack",
            resolveClip(profile, "attack")?.impactFrame ?? 3,
            positions[from],
            350,
            136,
            from === 0 ? 1 : -1,
          ),
          { x: positions[to] + offset[to], y: 285 },
          110,
          illustratedWeaponPoint(
            profile,
            actions[from],
            Math.floor(
              progress[from] *
                (resolveClip(profile, actions[from])?.frames.length ?? 1),
            ),
            positions[from],
            350,
            136,
            from === 0 ? 1 : -1,
          ),
        );
      }
      if (demo === "heal" && running)
        drawHealing(ctx, elapsed - 500, positions[1], 350);
      if (
        !demo &&
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
      const parryAge = elapsed - (contactApproach + sample.index * 1150 + 480);
      const parrying =
        (running || elapsed > 0) &&
        sample.event.outcome === "block" &&
        parryAge >= 0 &&
        parryAge < parryImpactDuration;
      if (parrying) {
        const side = 1 - sample.event.side;
        drawParryImpact(
          ctx,
          parryAge,
          positions[side] + (side === 0 ? 18 : -18),
          280,
          110,
          reducedMotion,
        );
      }
      canvas.dataset.parry = String(parrying);
      canvas.dataset.critical = String(effect.active);
      canvas.dataset.leftFrameSource =
        resolveClip(
          demo === "map-idle" ? selected.mapProfile : profile,
          actions[0],
        )?.source ?? "";
      canvas.dataset.rightFrameSource =
        resolveClip(
          demo === "map-idle" ? selected.mapProfile : profile,
          actions[1],
        )?.source ?? "";
      canvas.dataset.leftOffset = String(offset[0]);
      canvas.dataset.rightOffset = String(offset[1]);
      canvas.dataset.profile = `${profile.classId}:${profile.gender}:${profile.equipment}`;
      canvas.dataset.elapsed = String(elapsed);
      canvas.dataset.leftX = String(positions[0]);
      canvas.dataset.rightX = String(positions[1]);
      canvas.dataset.leftAction = actions[0];
      canvas.dataset.rightAction = actions[1];
      canvas.dataset.applied = String(sample.applied.length);
      canvas.dataset.finished = String(sample.done);
      canvas.dataset.scenario = demo ? `pose-${demo}` : kind;
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
    const version = ++loadingVersion;
    ready = false;
    extraPlay.disabled = true;
    status.textContent = "Chargement des sprites…";
    app
      .querySelectorAll<HTMLButtonElement>("[data-contact-scenario]")
      .forEach((b) => (b.disabled = true));
    try {
      await Promise.all(
        [
          ...new Set([
            resolveClip(selected.mapProfile, "idle")!.source,
            ...Object.keys(profile.clips).map(
              (n) => resolveClip(profile, n)!.source,
            ),
          ]),
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
      if (disposed || version !== loadingVersion) return;
      ready = true;
      extraPlay.disabled = false;
      await preloadEffects();
      if (disposed || version !== loadingVersion) return;
      app
        .querySelectorAll<HTMLButtonElement>("[data-contact-scenario]")
        .forEach((b) => (b.disabled = b.hidden));
    } catch (error) {
      if (disposed || version !== loadingVersion) return;
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
