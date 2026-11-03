import { classes } from "../data/classes";
/** Appearance-only entries. No statistics, spawns, equipment inventories or combat rules. */
const undead = [
  ["sans_axe", "Squelette hacheur", "axe"],
  ["sans_spear", "Squelette lancier", "lance"],
  ["sans_archer", "Archer décharné", "bow"],
  ["sans_crossbow", "Arbalétrier décharné", "crossbow"],
  ["sans_guard", "Garde en armure", "sword-shield"],
  ["sans_rider", "Cavalier spectral", "lance"],
  ["sans_necromancer", "Nécromancien ennemi", "spell"],
] as const;
export type VisualClass = Pick<
  (typeof classes)[string],
  | "id"
  | "name"
  | "faction"
  | "stage"
  | "visualStates"
  | "skills"
  | "starter"
  | "role"
> & { equipment?: string[]; offensive?: boolean };
export const visualClasses: Record<string, VisualClass> = {
  ...classes,
  shaman: { ...classes.shaman, offensive: false },
  skeleton: { ...classes.skeleton, name: "Squelette épéiste" },
  ...Object.fromEntries(
    undead.map(([id, name, equipment]) => [
      id,
      {
        id,
        name,
        faction: "enemy",
        stage: "enemy",
        visualStates: ["default"],
        skills: id === "sans_necromancer" ? ["summon"] : [],
        starter: [],
        equipment: [equipment],
        role: "Sans-Repos · définition visuelle uniquement",
      },
    ]),
  ),
};
