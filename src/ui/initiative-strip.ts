import type { Campaign } from "../game/types";
import { globalInitiative, initiativeOrder } from "../game/initiative";
import { seen } from "../game/vision";
import { drawResourceFrame, unitSpriteProfile } from "../sprites/resources";
import { colorForOwner } from "../game/team-colors";

/** Unknown entries contain no identity, faction, position or focus action in the DOM. */
export function initiativeMarkup(s: Campaign) {
  const f = globalInitiative(s);
  const cycles = [
    ...(s.previousInitiative ? [s.previousInitiative] : []),
    f,
    { round: f.round + 1, queue: initiativeOrder(s.units), index: 0 },
  ];
  const esc = (v: string) =>
    v.replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c]!,
    );
  return `<nav class="initiative-strip" aria-label="Ordre d’initiative"><button class="initiative-arrow" data-initiative-step="-1" aria-label="Initiative précédente">‹</button><div class="initiative-window"><div class="initiative-track">${cycles
    .map(
      (cycle, n) =>
        `${n ? '<span class="initiative-cycle" role="separator" aria-label="Nouveau cycle"></span>' : ""}${cycle.queue
          .map((id, i) => {
            const u = s.units.find((u) => u.id === id);
            if (!u || u.hp <= 0) return "";
            const known = seen(s, s.active, u),
              current = cycle === f && i === f.index;
            return `<button class="initiative-entry${current ? " current" : ""}" ${current ? 'aria-current="step"' : ""} ${known ? `data-action="focus-${esc(u.id)}" title="${esc(u.name)}"` : 'aria-label="Présence dans la brume" title="Présence dans la brume"'}>${known ? `<canvas data-initiative="${esc(u.id)}" width="64" height="64" aria-hidden="true"></canvas>` : '<span aria-hidden="true">?</span>'}</button>`;
          })
          .join("")}`,
    )
    .join(
      "",
    )}</div></div><button class="initiative-arrow" data-initiative-step="1" aria-label="Initiative suivante">›</button></nav>`;
}
let previousToken = "",
  previousCenter = 0;
export function bindInitiative(root: HTMLElement, s: Campaign) {
  const nav = root.querySelector<HTMLElement>(".initiative-strip");
  if (!nav) return;
  const viewport = nav.querySelector<HTMLElement>(".initiative-window")!,
    track = nav.querySelector<HTMLElement>(".initiative-track")!;
  const entries = Array.from(
    track.querySelectorAll<HTMLElement>(".initiative-entry"),
  );
  let selected = Math.max(
    0,
    entries.findIndex((e) => e.classList.contains("current")),
  );
  const f = globalInitiative(s),
    token = `${f.round}:${f.index}:${f.queue[f.index]}:${s.active}`;
  const arrows = Array.from(
    nav.querySelectorAll<HTMLButtonElement>("[data-initiative-step]"),
  );
  const center = (animate = false) => {
    const e = entries[selected];
    if (!e) return;
    const next = viewport.clientWidth / 2 - e.offsetLeft - e.offsetWidth / 2;
    track.style.transform = `translateX(${next}px)`;
    if (
      animate &&
      token !== previousToken &&
      previousToken &&
      !matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      track.animate(
        [
          {
            transform: `translateX(${next + (e.offsetLeft - previousCenter)}px)`,
          },
          { transform: `translateX(${next}px)` },
        ],
        { duration: 280, easing: "ease-out" },
      );
    }
    previousCenter = e.offsetLeft;
    previousToken = token;
    arrows[0].disabled = selected === 0;
    arrows[1].disabled = selected === entries.length - 1;
  };
  for (const b of arrows)
    b.onclick = () => {
      selected = Math.max(
        0,
        Math.min(
          entries.length - 1,
          selected + Number(b.dataset.initiativeStep),
        ),
      );
      center();
    };
  track.style.transition = "none";
  center(true);
  requestAnimationFrame(() => {
    track.style.transition = "";
  });
  const observer = new ResizeObserver(() => center());
  observer.observe(viewport);
  // One rendered pose, redrawn only to accommodate asynchronous image loading.
  let disposed = false;
  const draw = () => {
    if (disposed) return;
    for (const c of Array.from(
      nav.querySelectorAll<HTMLCanvasElement>("[data-initiative]"),
    )) {
      const u = s.units.find((u) => u.id === c.dataset.initiative);
      if (!u || !seen(s, s.active, u)) continue;
      const ctx = c.getContext("2d")!;
      ctx.clearRect(0, 0, 64, 64);
      drawResourceFrame(
        ctx,
        unitSpriteProfile(u),
        "idle",
        0,
        3,
        3,
        58,
        58,
        true,
        colorForOwner(s.teamColors, u.owner),
      );
    }
  };
  draw();
  const timer = setInterval(draw, 250);
  return () => {
    disposed = true;
    clearInterval(timer);
    observer.disconnect();
  };
}
