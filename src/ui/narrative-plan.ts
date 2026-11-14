import initial from "../data/narrative-plan.json";
import "./narrative-plan.css";

export type NarrativePlan = typeof initial;
export const PLAN_KEY = "lte-narrative-plan-v1";
export const defaultPlan = (): NarrativePlan => structuredClone(initial);
export function validatePlan(value: unknown): NarrativePlan {
  if (!value || typeof value !== "object")
    throw Error("Le plan doit être un objet JSON.");
  const p = value as NarrativePlan;
  if (
    p.version !== 1 ||
    typeof p.notes !== "string" ||
    !Array.isArray(p.chapters) ||
    p.chapters.length !== initial.chapters.length
  )
    throw Error("Format invalide : version 1, notes et 14 chapitres requis.");
  const chapters = initial.chapters.map((base) => {
    const matches = p.chapters.filter((c) => c && c.id === base.id);
    if (matches.length !== 1)
      throw Error(`Chapitre manquant ou dupliqué : ${base.id}.`);
    const c = matches[0];
    if (
      [c.title, c.before, c.during, c.after].some(
        (s) => typeof s !== "string",
      ) ||
      c.optional !== base.optional
    )
      throw Error(
        `Champs invalides pour le chapitre ${base.id}. Le chapitre 10.5 doit rester facultatif.`,
      );
    return {
      id: base.id,
      title: c.title,
      optional: base.optional,
      before: c.before,
      during: c.during,
      after: c.after,
    };
  });
  return { version: 1, chapters, notes: p.notes };
}
const escape = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
const label = (c: NarrativePlan["chapters"][number]) =>
  `${c.id === "prologue" ? "Prologue" : `Chapitre ${c.id}`} — ${c.title}${c.optional ? " (facultatif)" : ""}`;

export function openNarrativePlan(host: HTMLElement, back: () => void) {
  let saved = defaultPlan(),
    message = "";
  try {
    const raw = localStorage.getItem(PLAN_KEY);
    if (raw !== null) saved = validatePlan(JSON.parse(raw));
  } catch {
    message =
      "Le plan local est illisible. Les textes d’origine sont affichés ; aucune donnée locale n’a été remplacée.";
  }
  let draft = structuredClone(saved),
    selected = "prologue";
  let dirty = false;
  let importGeneration = 0;
  const announce = (text: string) => {
    host.querySelector<HTMLElement>("#plan-status")!.textContent = text;
  };
  const markDirty = () => {
    dirty = JSON.stringify(saved) !== JSON.stringify(draft);
    announce(
      dirty
        ? "Modifications non enregistrées."
        : "Aucune modification non enregistrée.",
    );
  };
  function render() {
    const c = draft.chapters.find((c) => c.id === selected);
    host.innerHTML = `<main class="narrative-plan"><header><div><span class="eyebrow">BIBLE NARRATIVE · ACTE I</span><h1>Le Plan</h1><p>Un espace de conception indépendant de vos parties.</p></div><button type="button" id="plan-back">Retour au menu principal</button></header><div class="plan-layout"><nav aria-label="Chapitres du Plan">${draft.chapters.map((c) => `<button type="button" data-plan-id="${c.id}" ${selected === c.id ? 'aria-current="page"' : ""}>${escape(label(c))}</button>`).join("")}<button type="button" data-plan-id="notes" ${selected === "notes" ? 'aria-current="page"' : ""}>Notes générales</button></nav><section class="plan-editor" aria-label="Éditeur de scénario"><h2>${c ? escape(label(c)) : "Notes générales"}</h2>${
      c
        ? `<label for="plan-title">Nom du chapitre<input id="plan-title" aria-label="Nom du chapitre" data-plan-field="title" value="${escape(c.title)}"></label>${(
            [
              ["before", "Avant le combat"],
              ["during", "Pendant le combat"],
              ["after", "Après le combat"],
            ] as const
          )
            .map(
              ([key, name]) =>
                `<label for="plan-${key}">${name}<textarea id="plan-${key}" aria-label="${name}" data-plan-field="${key}" rows="12">${escape(c[key])}</textarea></label>`,
            )
            .join("")}`
        : `<label for="plan-notes">Notes générales<textarea id="plan-notes" aria-label="Notes générales" data-plan-field="notes" rows="30">${escape(draft.notes)}</textarea></label>`
    }<div class="plan-actions"><button type="button" id="plan-save" class="primary">Enregistrer</button><button type="button" id="plan-cancel">Annuler les modifications non enregistrées</button><button type="button" id="plan-reset">${c ? "Réinitialiser ce chapitre" : "Réinitialiser les notes générales"}</button></div></section></div><footer><button type="button" id="plan-export">Exporter le plan complet en JSON</button><label class="plan-import">Importer un plan JSON<input type="file" id="plan-import" accept="application/json,.json"></label><p id="plan-status" role="status" aria-live="polite">${escape(message || (dirty ? "Modifications non enregistrées." : "Plan chargé."))}</p><p>L’enregistrement concerne tout le plan. L’export inclut les modifications affichées, même non enregistrées. Un import validé remplace le plan et l’enregistre.</p></footer></main>`;
    message = "";
    host.querySelectorAll<HTMLButtonElement>("[data-plan-id]").forEach(
      (b) =>
        (b.onclick = () => {
          selected = b.dataset.planId!;
          render();
        }),
    );
    host
      .querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
        "[data-plan-field]",
      )
      .forEach(
        (el) =>
          (el.oninput = () => {
            const key = el.dataset.planField!;
            if (key === "notes") draft.notes = el.value;
            else if (c)
              c[key as "title" | "before" | "during" | "after"] = el.value;
            markDirty();
          }),
      );
    host.querySelector<HTMLButtonElement>("#plan-save")!.onclick = () => {
      try {
        localStorage.setItem(PLAN_KEY, JSON.stringify(draft));
        saved = structuredClone(draft);
        dirty = false;
        message = "Plan enregistré dans ce navigateur.";
        render();
      } catch {
        announce(
          "Enregistrement impossible : stockage indisponible ou plein. Exportez le plan pour conserver vos modifications.",
        );
      }
    };
    host.querySelector<HTMLButtonElement>("#plan-cancel")!.onclick = () => {
      if (
        dirty &&
        !confirm("Annuler toutes les modifications non enregistrées du plan ?")
      )
        return;
      draft = structuredClone(saved);
      dirty = false;
      render();
    };
    host.querySelector<HTMLButtonElement>("#plan-reset")!.onclick = () => {
      if (
        !confirm(
          c
            ? "Restaurer les textes d’origine de ce chapitre ? Enregistrez ensuite pour conserver ce changement."
            : "Restaurer les notes d’origine ? Enregistrez ensuite pour conserver ce changement.",
        )
      )
        return;
      if (c)
        draft.chapters[draft.chapters.indexOf(c)] = structuredClone(
          initial.chapters.find((x) => x.id === selected)!,
        );
      else draft.notes = initial.notes;
      dirty = JSON.stringify(saved) !== JSON.stringify(draft);
      render();
    };
    host.querySelector<HTMLButtonElement>("#plan-back")!.onclick = () => {
      if (
        dirty &&
        !confirm("Quitter le Plan sans enregistrer les modifications ?")
      )
        return;
      importGeneration++;
      back();
    };
    host.querySelector<HTMLButtonElement>("#plan-export")!.onclick = () => {
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(draft, null, 2)], {
          type: "application/json",
        }),
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = "les-terres-egarees-plan.json";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      announce(
        "Plan complet exporté, y compris les modifications non enregistrées.",
      );
    };
    host.querySelector<HTMLInputElement>("#plan-import")!.onchange = async (
      e,
    ) => {
      const input = e.target as HTMLInputElement,
        file = input.files?.[0];
      if (!file) return;
      const generation = ++importGeneration;
      try {
        if (file.size > 5_000_000)
          throw Error("Fichier trop volumineux (maximum 5 Mo).");
        const imported = validatePlan(JSON.parse(await file.text()));
        if (
          generation !== importGeneration ||
          !host.querySelector("#plan-import")
        )
          return;
        if (
          !confirm(
            "Remplacer tout le plan local par ce fichier JSON ? Les modifications actuelles seront remplacées.",
          )
        )
          return;
        localStorage.setItem(PLAN_KEY, JSON.stringify(imported));
        draft = imported;
        saved = structuredClone(imported);
        dirty = false;
        message = "Plan importé et enregistré.";
        render();
      } catch (error) {
        announce(
          `Import refusé, plan conservé : ${error instanceof Error ? error.message : "fichier invalide ou stockage indisponible"}`,
        );
      } finally {
        input.value = "";
      }
    };
  }
  render();
}
