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
) {
  if (!asset)
    return `<div class="identity-fallback" role="img" aria-label="Portrait indisponible pour ${esc(name)}">${esc(name.slice(0, 1))}<small>Portrait indisponible</small></div>`;
  return `<img class="identity-portrait${flip ? " identity-mirror" : ""}" src="${import.meta.env?.BASE_URL ?? "/"}${esc(asset)}" alt="Portrait de ${esc(name)}">`;
}
