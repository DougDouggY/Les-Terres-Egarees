import "./tools.css";
import { createSandbox, trainingUnit } from "../game/sandbox";
import { initiativeOrder, stepInitiative } from "../game/initiative";
import { seen } from "../game/vision";
import { key } from "../game/map";
import { initiativeMarkup, bindInitiative } from "../ui/initiative-strip";
import { drawResourceFrame, unitSpriteProfile } from "../sprites/resources";
import { colorForOwner } from "../game/team-colors";
export function openInitiativePreview(app: HTMLElement, onBack: () => void) {
  const s = createSandbox();
  s.merged = false;
  for (let i = 0; i < 8; i++) {
    const u = trainingUnit(
      s,
      ["raider", "man_at_arms", "hunter", "skeleton"][i % 4],
      1,
      1,
      i < 2 ? 1 : i < 4 ? 2 : 0,
    );
    u.initiative = 20 - i;
    u.x = 28 + i;
    u.y = 20;
  }
  s.common.queue = initiativeOrder(s.units);
  s.players[0].visible = s.units
    .filter((_, i) => [0, 1, 4].includes(i))
    .map((u) => key(u.x, u.y));
  s.players[1].visible = s.units
    .filter((_, i) => [2, 3, 5].includes(i))
    .map((u) => key(u.x, u.y));
  let dispose: (() => void) | undefined,
    frame = 0,
    focus: string | undefined;
  function render() {
    dispose?.();
    app.innerHTML = `<main class="dev-screen"><header class="dev-top"><div><span class="dev-badge">INITIATIVE · SANS MISSION</span><h1>Barre d’initiative</h1></div><button data-back>Retour aux tests</button></header><div class="dev-controls"><button data-step>Activation suivante</button><button data-perspective="1">Perspective 1</button><button data-perspective="2">Perspective 2</button><button data-share>Partager la vision (test)</button></div><p>Cycle ${s.common.round} · Perspective ${s.active}. Une présence masquée reste « ? », même quand elle joue. Cliquez sur une silhouette connue pour la cadrer.</p><section class="initiative-demo compact-battle">${initiativeMarkup(s)}</section><canvas id="initiative-board" width="1000" height="260" aria-label="Unités visibles dans ce test indépendant"></canvas></main>`;
    dispose = bindInitiative(app, s);
    app.querySelector<HTMLElement>("[data-back]")!.onclick = onBack;
    app.querySelector<HTMLElement>("[data-step]")!.onclick = () => {
      stepInitiative(s);
      focus = undefined;
      render();
    };
    app.querySelectorAll<HTMLElement>("[data-perspective]").forEach(
      (b) =>
        (b.onclick = () => {
          s.active = Number(b.dataset.perspective) as 1 | 2;
          render();
        }),
    );
    app.querySelector<HTMLElement>("[data-share]")!.onclick = () => {
      s.merged = true;
      const v = [...new Set(s.players.flatMap((p) => p.visible))];
      s.players.forEach((p) => (p.visible = [...v]));
      render();
    };
    app.querySelectorAll<HTMLElement>('[data-action^="focus-"]').forEach(
      (b) =>
        (b.onclick = () => {
          focus = b.dataset.action!.slice(6);
        }),
    );
  }
  function draw() {
    const canvas = app.querySelector<HTMLCanvasElement>("#initiative-board");
    if (canvas) {
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#142923";
      ctx.fillRect(0, 0, 1000, 260);
      s.units.forEach((u, i) => {
        if (!seen(s, s.active, u)) return;
        const x = focus === u.id ? 460 : 40 + i * 110;
        drawResourceFrame(
          ctx,
          unitSpriteProfile(u),
          "idle",
          0,
          x,
          70,
          90,
          130,
          true,
          colorForOwner(s.teamColors, u.owner),
          "world",
        );
      });
    }
    frame = requestAnimationFrame(draw);
  }
  render();
  draw();
  return () => {
    dispose?.();
    cancelAnimationFrame(frame);
  };
}
