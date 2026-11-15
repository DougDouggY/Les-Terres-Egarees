import { ManualSaves } from "../game/manual-saves";
import { activateMap } from "../game/active-map";
import { decode, encode } from "../game/save";
import type { Campaign } from "../game/types";
const esc = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
const legacyLabel = (key: string) =>
  ({
    "lte-save": "Ancienne partie",
    "lte-chapter-one-test": "Ancien test du chapitre 1",
    "lte-chapter-one-start": "Ancien début du chapitre 1",
  })[key] ?? "Ancienne sauvegarde";
export function openSaveManager(
  state: Campaign | null,
  onLoad: (s: Campaign) => void,
) {
  document.querySelector(".save-manager")?.remove();
  const modal = document.createElement("div");
  modal.className = "modal-back save-manager";
  document.body.append(modal);
  const store = new ManualSaves(localStorage);
  // Capture a stable copy; opening the manager never changes the running campaign.
  let snapshot: Campaign | null = null,
    snapshotError = "";
  if (state)
    try {
      snapshot = JSON.parse(encode(structuredClone(state)));
    } catch (e) {
      snapshotError = (e as Error).message;
    }
  let pending: {
    id: string;
    action: "delete" | "overwrite" | "legacy-delete";
  } | null = null;
  const render = (error = "") => {
    let slots: ReturnType<ManualSaves["list"]> = [];
    try {
      slots = store.list();
    } catch (e) {
      error = (e as Error).message;
    }
    modal.innerHTML = `<section class="modal save-dialog" role="dialog" aria-modal="true" aria-label="Sauvegardes manuelles"><header><h2>Sauvegardes manuelles</h2><button data-slot-close aria-label="Fermer les sauvegardes">✕</button></header><p class="save-error" role="status">${esc(error || snapshotError)}</p>${snapshot ? '<form data-slot-create><label>Nom de la sauvegarde<input name="name" maxlength="64" placeholder="Officielle" required></label><button class="primary">Créer une sauvegarde</button></form>' : ""}<div class="save-slots">${slots.map((s) => `<article data-slot="${esc(s.id)}"><strong>${esc(s.name)}</strong><small>${esc(s.chapter)} · ${esc(s.progression)}<br><time>${new Date(s.updatedAt).toLocaleString("fr-FR")}</time></small>${pending?.id === s.id ? `<div role="alert"><p>${pending.action === "delete" ? "Supprimer" : "Écraser"} « ${esc(s.name)} » ?</p><button data-slot-confirm>Confirmer</button><button data-slot-cancel>Annuler</button></div>` : `<div class="save-slot-actions"><button data-slot-load>Charger</button><button data-slot-rename>Renommer</button>${snapshot ? "<button data-slot-overwrite>Écraser</button>" : ""}<button class="save-delete" data-slot-delete aria-label="Supprimer ${esc(s.name)}"><span aria-hidden="true">🗑</span> Supprimer</button></div>`}</article>`).join("") || "<p>Aucune sauvegarde manuelle.</p>"}</div>${[
      "lte-save",
      "lte-chapter-one-test",
      "lte-chapter-one-start",
    ]
      .filter((k) => localStorage.getItem(k))
      .map(
        (k) =>
          `<article class="legacy-save"><span>${esc(legacyLabel(k))}</span><button data-slot-legacy="${k}">Charger sans modifier</button>${pending?.action === "legacy-delete" && pending.id === k ? `<div role="alert"><p>Supprimer « ${esc(legacyLabel(k))} » ?</p><button data-slot-confirm>Confirmer</button><button data-slot-cancel>Annuler</button></div>` : `<button class="save-delete" data-slot-legacy-delete="${k}" aria-label="Supprimer ${esc(legacyLabel(k))}">Supprimer</button>`}</article>`,
      )
      .join("")}</section>`;
    modal
      .querySelector("[data-slot-close]")!
      .addEventListener("click", () => modal.remove());
    modal.querySelector("form")?.addEventListener("submit", (e) => {
      e.preventDefault();
      run(() => {
        store.create(
          new FormData(e.target as HTMLFormElement).get("name") as string,
          snapshot!,
        );
      });
    });
  };
  const run = (f: () => void) => {
    try {
      f();
      pending = null;
      if (modal.isConnected) render();
    } catch (e) {
      activateMap(state?.mapId ?? "prologue");
      render((e as Error).message);
    }
  };
  modal.addEventListener("click", (e) => {
    const b = (e.target as Element).closest<HTMLButtonElement>("button");
    if (!b) return;
    const id = b.closest<HTMLElement>("[data-slot]")?.dataset.slot;
    if (b.hasAttribute("data-slot-load"))
      run(() => {
        const s = store.load(id!);
        modal.remove();
        onLoad(s);
      });
    if (b.dataset.slotLegacy)
      run(() => {
        const s = decode(localStorage.getItem(b.dataset.slotLegacy!)!);
        modal.remove();
        onLoad(s);
      });
    if (
      b.hasAttribute("data-slot-delete") ||
      b.hasAttribute("data-slot-overwrite")
    ) {
      pending = {
        id: id!,
        action: b.hasAttribute("data-slot-delete") ? "delete" : "overwrite",
      };
      render();
    }
    if (b.dataset.slotLegacyDelete) {
      pending = { id: b.dataset.slotLegacyDelete, action: "legacy-delete" };
      render();
    }
    if (b.hasAttribute("data-slot-cancel")) {
      pending = null;
      render();
    }
    if (b.hasAttribute("data-slot-confirm") && pending)
      run(() => {
        if (pending!.action === "legacy-delete") {
          if (
            ![
              "lte-save",
              "lte-chapter-one-test",
              "lte-chapter-one-start",
            ].includes(pending!.id)
          )
            throw Error("Sauvegarde inconnue");
          localStorage.removeItem(pending!.id);
        } else if (pending!.action === "delete")
          store.delete(pending!.id, true);
        else store.overwrite(pending!.id, snapshot!, true);
      });
    if (b.hasAttribute("data-slot-rename")) {
      const row = b.closest("article")!,
        slot = store.list().find((s) => s.id === id)!;
      const form = document.createElement("form");
      form.innerHTML = `<label>Nouveau nom<input name="name" value="${esc(slot.name)}" maxlength="64" required></label><button>Enregistrer le nom</button><button type="button" data-slot-cancel>Annuler</button>`;
      row.querySelector(".save-slot-actions")!.replaceWith(form);
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        run(() => store.rename(id!, new FormData(form).get("name") as string));
      });
      form.querySelector("input")!.focus();
    }
  });
  modal.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      modal.remove();
    }
    if (e.key === "Tab") {
      const controls = Array.from(
        modal.querySelectorAll<HTMLElement>("button:not([disabled]),input"),
      );
      const first = controls[0],
        last = controls.at(-1);
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    }
    e.stopPropagation();
  });
  render();
  modal.querySelector<HTMLButtonElement>("[data-slot-close]")!.focus();
}
