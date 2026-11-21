import { encode, decode } from "./save";
import type { Campaign } from "./types";
export const manualSaveKey = "lte-manual-saves-v1";
export type SaveSlot = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  formatVersion: 1;
  chapter: string;
  progression: string;
  payload: string;
};
type Store = Pick<Storage, "getItem" | "setItem">;
/** Reads never migrate or write. A single atomic storage write preserves the previous catalogue on quota errors. */
export class ManualSaves {
  constructor(private storage: Store) {}
  list(): SaveSlot[] {
    const raw = this.storage.getItem(manualSaveKey);
    if (!raw) return [];
    const data = JSON.parse(raw);
    if (
      !data ||
      data.version !== 1 ||
      !Array.isArray(data.slots) ||
      data.slots.some(
        (s: SaveSlot) =>
          !s ||
          typeof s.id !== "string" ||
          !s.id ||
          typeof s.chapter !== "string" ||
          typeof s.progression !== "string" ||
          typeof s.createdAt !== "string" ||
          typeof s.updatedAt !== "string" ||
          !Number.isFinite(Date.parse(s.updatedAt)) ||
          typeof s.name !== "string" ||
          typeof s.payload !== "string" ||
          s.formatVersion !== 1,
      ) ||
      new Set(data.slots.map((s: SaveSlot) => s.id)).size !== data.slots.length
    )
      throw Error(
        "Format de sauvegarde inconnu : les données sont conservées.",
      );
    return data.slots;
  }
  private write(slots: SaveSlot[]) {
    this.storage.setItem(manualSaveKey, JSON.stringify({ version: 1, slots }));
  }
  private name(name: string) {
    const n = name.trim();
    if (!n || n.length > 64)
      throw Error("Saisissez un nom de 1 à 64 caractères.");
    return n;
  }
  create(name: string, state: Campaign) {
    const slots = this.list(),
      now = new Date().toISOString();
    const slot: SaveSlot = {
      id: crypto.randomUUID(),
      name: this.name(name),
      createdAt: now,
      updatedAt: now,
      formatVersion: 1,
      ...this.snapshot(state),
    };
    this.write([...slots, slot]);
    return slot;
  }
  private snapshot(state: Campaign) {
    return {
      payload: encode(structuredClone(state)),
      chapter: state.unitReview
        ? "Essai temporaire des unités"
        : state.forestChapter
          ? "Chapitre 1 — Pour ne pas oublier"
          : "Prologue — Les Terres Égarées",
      progression: `Tour ${state.common.round} · ${state.phase} · ${state.forestChapter?.stage ?? state.chapter1?.pending?.id ?? "Carte tactique"}`,
    };
  }
  load(id: string) {
    const slot = this.list().find((s) => s.id === id);
    if (!slot) throw Error("Sauvegarde introuvable.");
    return decode(slot.payload);
  }
  rename(id: string, name: string) {
    const slots = this.list(),
      slot = slots.find((s) => s.id === id);
    if (!slot) throw Error("Sauvegarde introuvable.");
    slot.name = this.name(name);
    this.write(slots);
  }
  overwrite(id: string, state: Campaign, confirmed: boolean) {
    if (!confirmed) throw Error("Confirmation nécessaire.");
    const slots = this.list(),
      slot = slots.find((s) => s.id === id);
    if (!slot) throw Error("Sauvegarde introuvable.");
    Object.assign(slot, this.snapshot(state), {
      updatedAt: new Date().toISOString(),
    });
    this.write(slots);
  }
  delete(id: string, confirmed: boolean) {
    if (!confirmed) throw Error("Confirmation nécessaire.");
    this.write(this.list().filter((s) => s.id !== id));
  }
}
