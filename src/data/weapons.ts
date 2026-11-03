import type { WeaponCategory } from "./classes";
export type WeaponDefinition = {
  id: string;
  name: string;
  category: WeaponCategory;
  min: number;
  max: number;
  power: number;
  accuracy: number;
  attacks: number;
  rarity: "training" | "common" | "rare" | "legendary";
  visual: string;
  reload?: boolean;
  effective?: "mounted" | "flying" | "armored";
};
const w = (
  id: string,
  name: string,
  category: WeaponCategory,
  visual: string,
  extra: Partial<WeaponDefinition> = {},
): WeaponDefinition => ({
  id,
  name,
  category,
  visual,
  min: 1,
  max: 1,
  power: 0,
  accuracy: 0,
  attacks: 1,
  rarity: "common",
  ...extra,
});
export const weaponCatalog: Record<string, WeaponDefinition> =
  Object.fromEntries(
    [
      w("axe", "Hache", "axe", "axe"),
      w("axe_shield", "Hache et bouclier", "axe", "axe-shield"),
      w("sword_shield", "Épée et bouclier", "sword", "sword-shield"),
      w("sword", "Épée", "sword", "sword"),
      w("lance", "Lance", "lance", "lance", { effective: "mounted" }),
      w("lance_shield", "Lance et bouclier", "lance", "lance-shield", {
        effective: "mounted",
      }),
      w("bow", "Arc", "bow", "bow", { min: 2, max: 2, effective: "flying" }),
      w("crossbow", "Arbalète", "crossbow", "crossbow", {
        min: 2,
        max: 2,
        effective: "flying",
        reload: true,
      }),
      w("twin_axes", "Deux haches", "axe", "dual-axes", { attacks: 2 }),
      w("twin_swords", "Deux épées", "sword", "dual-swords", { attacks: 2 }),
      w("great_axe", "Grande hache à deux mains", "axe", "great-axe", {
        power: 3,
        effective: "armored",
      }),
      w("great_sword", "Grande épée à deux mains", "sword", "great-sword", {
        power: 3,
      }),
      w("spell", "Magie offensive", "magic", "spell", { max: 2 }),
      w("healing_focus", "Magie de soins", "healing", "healing", {
        min: 0,
        max: 2,
      }),
      w("banner_lance", "Bannière portée", "lance", "banner", {
        effective: "mounted",
      }),
      w("rusty_sword", "Lame rouillée", "sword", "rusty-sword"),
      w("training_axe", "Hache d’entraînement", "axe", "training-axe", {
        rarity: "training",
        power: -2,
      }),
      w("training_sword", "Épée d’entraînement", "sword", "training-sword", {
        rarity: "training",
        power: -2,
      }),
      w("training_lance", "Lance d’entraînement", "lance", "training-lance", {
        rarity: "training",
        power: -2,
      }),
    ].map((w) => [w.id, w]),
  );
