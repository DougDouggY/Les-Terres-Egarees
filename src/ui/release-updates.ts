/** Detect new deployments without silently reloading an unsaved game. */
export function installReleaseUpdates(options: {
  revision: string;
  base: string;
  canReload: () => boolean;
}) {
  let pending: Promise<void> | undefined,
    latest: string | undefined,
    banner: HTMLElement | undefined;
  function show(message = "Une nouvelle version du jeu est disponible.") {
    if (!banner) {
      banner = document.createElement("aside");
      banner.className = "release-update";
      banner.setAttribute("role", "status");
      const text = document.createElement("p");
      text.dataset.releaseMessage = "";
      const button = document.createElement("button");
      button.textContent = "Actualiser le jeu";
      button.dataset.releaseRefresh = "";
      button.onclick = () => {
        if (!options.canReload()) {
          show(
            "Sauvegardez votre partie et revenez à l’accueil pour actualiser sans perdre votre progression.",
          );
          return;
        }
        const url = new URL(location.href);
        url.searchParams.set("v", latest || String(Date.now()));
        location.replace(url.href);
      };
      banner.append(text, button);
      document.body.append(banner);
    }
    banner.querySelector("p")!.textContent = message;
  }
  async function check() {
    if (pending) return pending;
    pending = (async () => {
      try {
        const url = new URL(
          "release.json",
          new URL(options.base, location.href),
        );
        url.searchParams.set("check", String(Date.now()));
        const response = await fetch(url, { cache: "no-store" });
        if (!response.ok) return;
        const data = await response.json();
        if (
          typeof data.revision === "string" &&
          data.revision !== options.revision
        ) {
          latest = data.revision;
          show();
        }
      } catch {
        /* Offline checking must not interrupt the game. */
      } finally {
        pending = undefined;
      }
    })();
    return pending;
  }
  const preloadError = (event: Event) => {
    event.preventDefault();
    show(
      "Le chargement a échoué. Actualisez le jeu depuis l’accueil pour charger la version publiée.",
    );
    void check();
  };
  const visible = () => {
    if (document.visibilityState === "visible") void check();
  };
  window.addEventListener("vite:preloadError", preloadError);
  window.addEventListener("focus", visible);
  document.addEventListener("visibilitychange", visible);
  const timer = setInterval(() => void check(), 60000);
  void check();
  return {
    check,
    dispose() {
      clearInterval(timer);
      window.removeEventListener("vite:preloadError", preloadError);
      window.removeEventListener("focus", visible);
      document.removeEventListener("visibilitychange", visible);
      banner?.remove();
    },
  };
}
