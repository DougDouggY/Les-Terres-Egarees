import { baseClasses } from "../game/classes";
import { weaponCatalog } from "../data/weapons";
export type ContactVariant = {
  id: string;
  cls: string;
  gender: "male" | "female";
  weapon: string;
  label: string;
  name: string;
  status: string;
  faction: "north" | "knight";
};
const known: Record<string, string> = {
  "north_warrior:female:axe": "north-warrior-female",
  "north_warrior:male:axe": "north-warrior",
  "raider:male:axe_shield": "male",
  "raider:female:axe_shield": "female",
  "raider:male:sword_shield": "male-sword",
  "raider:female:sword_shield": "female-sword",
  "hunter:female:bow": "huntress",
};
const names: Record<string, string> = {
  north_warrior: "Guerrière du Nord",
  raider: "Pillarde",
  hunter: "Chasseuse",
  shaman: "Chamane",
  man_at_arms: "Femme d’armes",
  spearman: "Lancière",
  crossbowman: "Arbalétrière",
  swordsman: "Épéiste",
  sorcerer: "Sorcière",
};
export const contactRoster: ContactVariant[] = [];
for (const faction of ["north", "knight"] as const)
  for (const cls of baseClasses(faction))
    for (const weapon of cls.starter) {
      // Offensive casters keep their identity and staff for healing; expose healing as an action, not a duplicate unit.
      if (
        cls.weapons.includes("magic") &&
        weaponCatalog[weapon].category === "healing"
      )
        continue;
      for (const gender of ["male", "female"] as const) {
        const key = `${cls.id}:${gender}:${weapon}`,
          id = known[key] ?? `${cls.id}-${gender}-${weapon}`;
        const name =
          gender === "female" ? (names[cls.id] ?? cls.name) : cls.name;
        const fresh =
          faction === "knight" &&
          (["man_at_arms", "swordsman", "spearman", "sorcerer"].includes(
            cls.id,
          ) ||
            (gender === "female" &&
              ["crossbowman", "sorcerer"].includes(cls.id)));
        contactRoster.push({
          id,
          cls: cls.id,
          gender,
          weapon,
          name,
          label: `${name} · ${gender === "male" ? "H" : "F"} · ${weaponCatalog[weapon].name}`,
          status:
            faction === "north"
              ? (cls.id === "hunter" && gender === "male") ||
                (cls.id === "nordic_blade" && gender === "female")
                ? "Nouveau · à tester"
                : "Visuel validé · animations à tester"
              : fresh
                ? "Nouveau · à tester"
                : "Référence conservée · à tester",
          faction,
        });
      }
    }
contactRoster.sort((a, b) =>
  a.id === "north-warrior-female"
    ? -1
    : b.id === "north-warrior-female"
      ? 1
      : 0,
);
