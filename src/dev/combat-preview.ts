import { resourceScale } from "../sprites/geometry";
import { combatHud } from "../ui/combat-hud";
import "../ui/combat-hud.css";
import "./tools.css";
import { findProfile, resolveClip } from "../sprites/catalog";
import {
  spriteCatalog,
  drawResourceFrame,
  spriteImage,
} from "../sprites/resources";
import layouts from "../assets/tactical/atlas-layout.json";
import {
  trialPose,
  trialDuration,
  type TrialKind,
  type TrialGeometry,
  type TrialActor,
} from "../ui/combat-trial";
const pair = [
  { id: "man_at_arms", name: "Homme d’armes", equipment: "sword-shield" },
  { id: "raider", name: "Pillard", equipment: "axe-shield" },
];
const size = 160,
  ground = 350;
/** Two buttons, two deterministic review scenes. No campaign, resolver, RNG or saved party. */
export function openCombatPreview(app: HTMLElement, onBack: () => void) {
  let hero = 0,
    kind: TrialKind = "two-attacks",
    elapsed = 0,
    running = false,
    paused = false,
    speed = 1,
    last = performance.now(),
    raf = 0,
    disposed = false,
    ready = false;
  const background = new Image();
  background.src = import.meta.env.BASE_URL + "assets/battle-3.png";
  const profile = (side: 0 | 1) => {
    const c = pair[side === 0 ? hero : 1 - hero];
    return findProfile(
      spriteCatalog.profiles,
      c.id,
      "male",
      c.equipment,
      "default",
    )!;
  };
  function front(side: 0 | 1, animation: string, index: number) {
    const c = resolveClip(profile(side), animation)!;
    const i = Math.min(index, c.frames.length - 1),
      row = c.cells?.[i]?.row ?? c.row,
      column = c.cells?.[i]?.column ?? c.frames[i];
    const layout = layouts[c.source as keyof typeof layouts],
      f = layout.frames.find((f) => f.row === row && f.column === column)!;
    return (
      (f.x + f.width - f.anchorX) *
      resourceScale(profile(side), c, size, size, "world")
    );
  }
  function geometry(): TrialGeometry {
    const gap = 420,
      leftAdvance = Math.max(
        0,
        Math.min(
          320,
          gap - front(0, "attack", 3) - front(1, "combat_idle", 0) + 8,
        ),
      ),
      rightAdvance = Math.max(
        0,
        Math.min(320, gap - front(1, "attack", 3) - front(0, "block", 1) + 8),
      );
    return {
      left: 270,
      right: 690,
      leftAdvance,
      rightAdvance,
      counterAdvance: Math.max(
        0,
        gap -
          rightAdvance -
          front(0, "counter", 2) -
          front(1, "combat_idle", 0) +
          8,
      ),
    };
  }
  function render() {
    const a = pair[hero],
      b = pair[1 - hero];
    app.innerHTML = `<main class="dev-screen combat-preview"><header class="dev-top"><div><span class="dev-badge">DEUX COMBATTANTS · VALIDATION VISUELLE</span><h1>Essai des combats</h1></div><button data-preview-back>Retour au menu</button></header><p>Homme d’armes et Pillard : nouvelles poses d’attaque, de parade et de riposte. Les autres classes attendent votre validation.</p><div class="trial-buttons"><button data-trial="two-attacks">1 · Seconde attaque par agilité</button><button data-trial="parry">2 · Parade, riposte et votre tour</button></div><div class="trial-settings"><label>Votre personnage<select id="trial-hero"><option value="0" ${hero === 0 ? "selected" : ""}>Homme d’armes</option><option value="1" ${hero === 1 ? "selected" : ""}>Pillard</option></select></label><label>Vitesse<select id="trial-speed"><option value="0.5" ${speed === 0.5 ? "selected" : ""}>Ralenti ×0,5</option><option value="1" ${speed === 1 ? "selected" : ""}>Normale</option><option value="2" ${speed === 2 ? "selected" : ""}>Rapide ×2</option></select></label><button data-trial-pause disabled>Pause</button></div><section class="trial-scene duel-stage" aria-label="Essai visuel des deux combattants">${combatHud(
      [
        {
          id: "trial-0",
          name: a.name,
          weapon: hero === 0 ? "Épée et bouclier" : "Hache et bouclier",
          hp: 24,
          maxHp: 24,
          hit: 100,
          damage: 4,
          color: [63, 132, 231],
        },
        {
          id: "trial-1",
          name: b.name,
          weapon: hero === 0 ? "Hache et bouclier" : "Épée et bouclier",
          hp: 24,
          maxHp: 24,
          hit: 100,
          damage: 4,
          color: [255, 45, 161],
        },
      ],
    )}<canvas id="trial-canvas" width="960" height="480" aria-label="Animation de combat avec pieds ancrés"></canvas></section><p id="trial-status" role="status">Chargement des nouvelles poses…</p><ol id="trial-events" aria-label="Impacts de l’essai"></ol><p class="trial-note">Essai visuel scénarisé : avantage d’agilité simulé et PV de démonstration, aucune partie ni sauvegarde modifiée. Arme simple : attaque, retour, riposte adverse, retour, puis seconde attaque par agilité. Les doubles armes seront validées séparément. La réaction aux dégâts utilise encore une pose unique.</p></main>`;
    app.querySelector<HTMLElement>("[data-preview-back]")!.onclick = onBack;
    app.querySelectorAll<HTMLButtonElement>("[data-trial]").forEach((b) => {
      b.disabled = !ready;
      b.onclick = () => {
        kind = b.dataset.trial as TrialKind;
        elapsed = 0;
        running = true;
        paused = false;
        last = performance.now();
        app.querySelector<HTMLElement>("#trial-events")!.replaceChildren();
        const pause =
          app.querySelector<HTMLButtonElement>("[data-trial-pause]")!;
        pause.disabled = false;
        pause.textContent = "Pause";
      };
    });
    app.querySelector<HTMLSelectElement>("#trial-hero")!.onchange = (e) => {
      hero = Number((e.target as HTMLSelectElement).value);
      running = false;
      elapsed = 0;
      render();
    };
    app.querySelector<HTMLSelectElement>("#trial-speed")!.onchange = (e) =>
      (speed = Number((e.target as HTMLSelectElement).value));
    app.querySelector<HTMLButtonElement>("[data-trial-pause]")!.onclick = (
      e,
    ) => {
      paused = !paused;
      (e.currentTarget as HTMLButtonElement).textContent = paused
        ? "Reprendre"
        : "Pause";
    };
  }
  function drawActor(
    ctx: CanvasRenderingContext2D,
    side: 0 | 1,
    actor: TrialActor,
    hurt: boolean,
  ) {
    ctx.save();
    ctx.translate(actor.x, ground);
    if (side === 1) ctx.scale(-1, 1);
    if (hurt) ctx.filter = "brightness(1.6)";
    drawResourceFrame(
      ctx,
      profile(side),
      actor.action,
      actor.frame,
      -size / 2,
      -size * 0.96,
      size,
      size,
      true,
      side === 0 ? "blue" : "pink",
      "world",
    );
    ctx.restore();
  }
  function tick(now: number) {
    if (disposed) return;
    const dt = Math.max(0, now - last);
    last = now;
    if (ready && running && !paused)
      elapsed = Math.min(trialDuration(kind), elapsed + dt * speed);
    const canvas = app.querySelector<HTMLCanvasElement>("#trial-canvas");
    if (canvas) {
      const ctx = canvas.getContext("2d")!;
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, 960, 480);
      if (background.complete && background.naturalWidth)
        ctx.drawImage(background, 0, 0, 960, 480);
      else {
        ctx.fillStyle = "#203329";
        ctx.fillRect(0, 0, 960, 480);
      }
      const pose = ready ? trialPose(kind, elapsed, geometry()) : undefined;
      if (pose) {
        if (!running && elapsed === 0) {
          pose.left = {
            x: 270,
            action: "combat_idle",
            frame: Math.floor(now / 500) % 2,
          };
          pose.right = {
            x: 690,
            action: "combat_idle",
            frame: Math.floor(now / 500) % 2,
          };
          pose.stage = "Choisissez un essai";
          pose.phase = "ready";
        }
        ctx.save();
        if (pose.impact) ctx.translate(Math.sin(now * 0.16) * 2, 0);
        drawActor(
          ctx,
          0,
          pose.left,
          pose.impact?.target === 0 && pose.impact.damage > 0,
        );
        drawActor(
          ctx,
          1,
          pose.right,
          pose.impact?.target === 1 && pose.impact.damage > 0,
        );
        if (pose.impact) {
          const target = pose.impact.target === 0 ? pose.left : pose.right,
            x = target.x + (pose.impact.target === 0 ? 42 : -42);
          ctx.strokeStyle = pose.impact.damage === 0 ? "#c5e7ff" : "#ffe19d";
          ctx.lineWidth = 3;
          for (let i = 0; i < 8; i++) {
            const angle = (i * Math.PI) / 4;
            ctx.beginPath();
            ctx.moveTo(x, ground - 85);
            ctx.lineTo(
              x + Math.cos(angle) * 22,
              ground - 85 + Math.sin(angle) * 22,
            );
            ctx.stroke();
          }
        }
        ctx.restore();
        canvas.dataset.phase = pose.phase;
        canvas.dataset.leftAction = pose.left.action;
        canvas.dataset.rightAction = pose.right.action;
        canvas.dataset.leftX = String(pose.left.x);
        canvas.dataset.rightX = String(pose.right.x);
        canvas.dataset.elapsed = String(elapsed);
        for (const side of [0, 1] as const) {
          app.querySelector<HTMLElement>(
            `[data-combat-hp="${side}"]`,
          )!.style.width = `${(pose.hp[side] / 24) * 100}%`;
          app.querySelector(`[data-combat-value="${side}"]`)!.textContent =
            `${pose.hp[side]} / 24 PV`;
        }
        app.querySelector("#trial-status")!.textContent = paused
          ? `Pause · ${pose.stage}`
          : pose.stage;
        const list = app.querySelector("#trial-events")!;
        if (list.children.length !== pose.events.length)
          list.innerHTML = pose.events
            .map(
              (e) =>
                `<li data-impact="${e.id}">${e.label} · ${e.damage === 0 ? "0 dégât" : `−${e.damage} PV`}</li>`,
            )
            .join("");
        if (pose.done) {
          running = false;
          app.querySelector<HTMLButtonElement>("[data-trial-pause]")!.disabled =
            true;
        }
      }
    }
    raf = requestAnimationFrame(tick);
  }
  render();
  raf = requestAnimationFrame(tick);
  const sources = [
    ...new Set(
      pair.flatMap((_, side) =>
        [
          "attack",
          "counter",
          "block",
          "combat_idle",
          "combat_move",
          "combat_damage",
        ].map((a) => resolveClip(profile(side as 0 | 1), a)!.source),
      ),
    ),
  ];
  Promise.all(
    sources.map(
      (source) =>
        new Promise<void>((resolve) => {
          const image = spriteImage(source);
          if (image.complete && image.naturalWidth) {
            resolve();
            return;
          }
          image.addEventListener("load", () => resolve(), { once: true });
          image.addEventListener(
            "error",
            () => {
              if (!disposed)
                app.querySelector("#trial-status")!.textContent =
                  "Une planche est introuvable.";
            },
            { once: true },
          );
        }),
    ),
  ).then(() => {
    if (disposed) return;
    ready = true;
    app
      .querySelectorAll<HTMLButtonElement>("[data-trial]")
      .forEach((b) => (b.disabled = false));
  });
  return () => {
    disposed = true;
    cancelAnimationFrame(raf);
  };
}
