/** Presentation only: never writes engine state. New targets continue from the shown value. */
const active = new WeakMap<Element, number>();
export function animateValue(
  el: HTMLElement,
  from: number,
  to: number,
  duration: number,
  paint: (value: number) => void,
  done?: () => void,
) {
  const old = active.get(el);
  if (old) cancelAnimationFrame(old);
  const start = performance.now();
  function tick(now: number) {
    if (!el.isConnected) {
      active.delete(el);
      return;
    }
    const t = Math.min(1, (now - start) / duration),
      ease = t * t * (3 - 2 * t);
    paint(from + (to - from) * ease);
    if (t < 1) active.set(el, requestAnimationFrame(tick));
    else {
      active.delete(el);
      done?.();
    }
  }
  paint(from);
  active.set(el, requestAnimationFrame(tick));
}
export function animateHp(
  root: Element,
  id: string,
  before: number,
  after: number,
  max: number,
  duration = 650,
) {
  const text = root.querySelector<HTMLElement>(`#value-${CSS.escape(id)}`),
    bar = root.querySelector<HTMLElement>(`#hp-${CSS.escape(id)}`);
  if (!text || !bar) return;
  const shown = Number(text.dataset.shown ?? before);
  bar.style.transition = "none";
  animateValue(text, shown, after, duration, (value) => {
    text.dataset.shown = String(value);
    text.textContent = `${Math.round(value)} / ${max} PV`;
    bar.style.width = `${Math.max(0, (value / max) * 100)}%`;
  });
}
export type XpPresentation = {
  before: number;
  after: number;
  levelBefore: number;
  levelAfter: number;
};
export function xpSegments(x: XpPresentation) {
  const parts: { from: number; to: number; level: number }[] = [];
  let from = x.before;
  for (let level = x.levelBefore; level < x.levelAfter; level++) {
    parts.push({ from, to: 100, level });
    from = 0;
  }
  parts.push({ from, to: x.after, level: x.levelAfter });
  return parts;
}
export function animateExperience(root: HTMLElement, x: XpPresentation) {
  const bar = root.querySelector<HTMLElement>(".xp i")!,
    text = root.querySelector<HTMLElement>("[data-xp-value]")!,
    level = root.querySelector<HTMLElement>("[data-xp-level]")!;
  const parts = xpSegments(x);
  return new Promise<void>((resolve) => {
    function step(i: number) {
      if (!root.isConnected) {
        resolve();
        return;
      }
      const p = parts[i];
      level.textContent = `Niveau ${p.level}`;
      bar.style.transition = "none";
      animateValue(
        root,
        p.from,
        p.to,
        Math.max(650, Math.abs(p.to - p.from) * 14),
        (v) => {
          bar.style.width = v + "%";
          text.textContent = `${Math.round(v)} / 100 EXP`;
          root.dataset.xpShown = String(v);
        },
        () => {
          if (i + 1 < parts.length) {
            root.classList.add("xp-level-flash");
            setTimeout(() => {
              root.classList.remove("xp-level-flash");
              step(i + 1);
            }, 450);
          } else resolve();
        },
      );
    }
    step(0);
  });
}
