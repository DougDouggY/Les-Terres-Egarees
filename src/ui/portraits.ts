const esc = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
export function portraitMarkup(
  asset: string | undefined,
  name: string,
  flip = false,
  teamColor?: string,
) {
  if (!asset)
    return `<div class="identity-fallback" role="img" aria-label="Portrait indisponible pour ${esc(name)}">${esc(name.slice(0, 1))}<small>Portrait indisponible</small></div>`;
  return `<img class="identity-portrait${flip ? " identity-mirror" : ""}" data-team-color="${esc(teamColor ?? "")}" src="${import.meta.env?.BASE_URL ?? "/"}${esc(asset)}" alt="Portrait de ${esc(name)}">`;
}

/** Names are only exposed on hover, focus or a temporary touch interaction. */
export function dialoguePortraitMarkup(
  asset: string | undefined,
  name: string,
  flip = false,
  teamColor?: string,
) {
  return `<span class="dialogue-portrait-identity" tabindex="0" role="button" aria-label="${esc(name)}" data-portrait-name="${esc(name)}">${portraitMarkup(asset, name, flip, teamColor)}<span class="portrait-name-tooltip" role="tooltip">${esc(name)}</span></span>`;
}
export function installPortraitNames() {
  let timer = 0;
  const show = (el: HTMLElement) => {
    document
      .querySelectorAll(".portrait-name-visible")
      .forEach((n) => n.classList.remove("portrait-name-visible"));
    el.classList.add("portrait-name-visible");
    clearTimeout(timer);
    timer = window.setTimeout(
      () => el.classList.remove("portrait-name-visible"),
      2000,
    );
  };
  document.addEventListener(
    "pointerdown",
    (e) => {
      document.documentElement.classList.toggle(
        "portrait-touch-mode",
        e.pointerType === "touch",
      );
      (e.target as Element)
        .closest<HTMLElement>(".dialogue-portrait-identity")
        ?.classList.toggle("portrait-name-touch", e.pointerType === "touch");
    },
    true,
  );
  document.addEventListener(
    "click",
    (e) => {
      const el = (e.target as Element).closest<HTMLElement>(
        ".dialogue-portrait-identity",
      );
      if (el) {
        e.stopPropagation();
        show(el);
      }
    },
    true,
  );
  document.addEventListener(
    "pointerout",
    (e) => {
      if (e.pointerType !== "mouse") return;
      const el = (e.target as Element).closest<HTMLElement>(
        ".dialogue-portrait-identity",
      );
      if (
        el &&
        !(e.relatedTarget instanceof Node && el.contains(e.relatedTarget))
      )
        el.classList.remove("portrait-name-visible");
    },
    true,
  );
  document.addEventListener("keydown", (e) => {
    document.documentElement.classList.remove("portrait-touch-mode");
    const el = (e.target as Element).closest<HTMLElement>(
      ".dialogue-portrait-identity",
    );
    if (el && ["Enter", " "].includes(e.key)) {
      e.preventDefault();
      e.stopPropagation();
      el.classList.remove("portrait-name-touch");
      show(el);
    }
  });
}
