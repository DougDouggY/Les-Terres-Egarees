import { baseBalance, promotionBonuses, rules } from "./balance";
export type Gender = "male" | "female";
export type WeaponCategory =
  "sword" | "axe" | "lance" | "bow" | "crossbow" | "magic" | "healing";
export type SkillId =
  | "dual"
  | "pierce"
  | "parry"
  | "intercept"
  | "bandage"
  | "heal"
  | "forest_move"
  | "long_range"
  | "charge"
  | "banner"
  | "fortify"
  | "summon"
  | "area"
  | "transform"
  | "buff"
  | "defense_aura";
export type ClassDefinition = {
  stats: {
    hp: number;
    strength: number;
    defense: number;
    agility: number;
    initiative: number;
    move: number;
    vision: number;
    accuracy: number;
  };
  id: string;
  name: string;
  femaleName?: string;
  faction: "north" | "knight" | "enemy";
  stage: "base" | "advanced" | "recruit" | "enemy";
  weapons: WeaponCategory[];
  starter: string[];
  promotions: string[];
  skills: SkillId[];
  maxLevel: number;
  pendingPromotions?: number;
  mounted?: boolean;
  armored?: boolean;
  flying?: boolean;
  visualStates: string[];
  role: string;
};
const c = (
  id: string,
  name: string,
  faction: ClassDefinition["faction"],
  weapons: WeaponCategory[],
  starter: string[],
  promotions: string[] = [],
  skills: SkillId[] = [],
  extra: Partial<ClassDefinition> = {},
): ClassDefinition => ({
  stats:
    id === "skeleton"
      ? {
          hp: 19,
          strength: 8,
          defense: 3,
          agility: 5,
          initiative: 7,
          move: 4,
          vision: 6,
          accuracy: 78,
        }
      : {
          hp: ["bow", "crossbow"].includes(weapons[0])
            ? 25
            : ["magic", "healing"].includes(weapons[0])
              ? 24
              : 36,
          strength: ["bow", "crossbow", "magic", "healing"].includes(weapons[0])
            ? 11
            : 13,
          defense: ["bow", "crossbow", "magic", "healing"].includes(weapons[0])
            ? 3
            : 7,
          agility: weapons[0] === "bow" ? 11 : 7,
          initiative:
            weapons[0] === "bow"
              ? 15
              : weapons[0] === "crossbow"
                ? 12
                : ["magic", "healing"].includes(weapons[0])
                  ? 11
                  : 10,
          move: extra.mounted
            ? 6
            : ["bow", "crossbow", "magic", "healing"].includes(weapons[0])
              ? 5
              : 4,
          vision: skills.includes("forest_move") ? 8 : 6,
          accuracy: weapons[0] === "bow" || weapons[0] === "crossbow" ? 90 : 94,
        },
  id,
  name,
  faction,
  weapons,
  starter,
  promotions,
  skills,
  stage: "base",
  maxLevel: 20,
  visualStates: ["default"],
  role: "",
  ...extra,
});
const adv = { stage: "advanced" } as const;
export const classes: Record<string, ClassDefinition> = Object.fromEntries(
  [
    c(
      "north_warrior",
      "Guerrier du Nord",
      "north",
      ["axe"],
      ["axe"],
      ["berserker", "ironbreaker"],
      [],
      { role: "Hache" },
    ),
    c("berserker", "Berserker", "north", ["axe"], ["twin_axes"], [], ["dual"], {
      ...adv,
      role: "Deux haches · attaques multiples",
    }),
    c(
      "ironbreaker",
      "Brise-fer",
      "north",
      ["axe"],
      ["great_axe"],
      [],
      ["pierce"],
      { ...adv, role: "Grande hache · pénétration d’armure" },
    ),
    c(
      "raider",
      "Pillard",
      "north",
      ["axe", "sword"],
      ["axe_shield", "sword_shield"],
      ["huscarl", "clan_healer"],
      [],
      { role: "Hache ou épée · bouclier" },
    ),
    c(
      "huscarl",
      "Huscarl",
      "north",
      ["axe", "sword"],
      ["axe_shield", "sword_shield"],
      [],
      ["parry", "intercept"],
      {
        ...adv,
        armored: true,
        role: "Parade · interception des attaques visant un allié adjacent",
      },
    ),
    c(
      "clan_healer",
      "Guérisseur du clan",
      "north",
      ["axe", "sword"],
      ["axe_shield", "sword_shield"],
      [],
      ["bandage"],
      { ...adv, role: "Bouclier · bandages non magiques" },
    ),
    c(
      "nordic_blade",
      "Lame nordique",
      "north",
      ["sword"],
      ["sword"],
      ["drengr", "honor_guard"],
      [],
      { role: "Épée" },
    ),
    c("drengr", "Drengr", "north", ["sword"], ["twin_swords"], [], ["dual"], {
      ...adv,
      role: "Deux épées · attaques multiples",
    }),
    c(
      "honor_guard",
      "Garde d’honneur",
      "north",
      ["sword"],
      ["sword_shield"],
      [],
      ["parry"],
      { ...adv, armored: true, role: "Épée et bouclier · parade" },
    ),
    c(
      "hunter",
      "Chasseur",
      "north",
      ["bow"],
      ["bow"],
      ["master_hunter", "tracker"],
      [],
      { role: "Arc · portée 2" },
    ),
    c(
      "master_hunter",
      "Grand chasseur",
      "north",
      ["bow"],
      ["bow"],
      [],
      ["long_range"],
      { ...adv, role: "Arc · précision supérieure · portée 2–3" },
    ),
    c(
      "tracker",
      "Traqueur",
      "north",
      ["bow", "axe"],
      ["bow", "axe"],
      [],
      ["forest_move"],
      { ...adv, role: "Arc et hache · vision et mobilité forestière" },
    ),
    c(
      "shaman",
      "Chaman",
      "north",
      ["healing"],
      ["healing_focus"],
      [],
      ["heal"],
      { role: "Magie de soins uniquement" },
    ),
    c(
      "man_at_arms",
      "Homme d’armes",
      "knight",
      ["sword"],
      ["sword_shield"],
      ["guard_knight", "cavalry"],
      [],
      { role: "Épée et bouclier" },
    ),
    c(
      "guard_knight",
      "Chevalier de la garde",
      "knight",
      ["sword"],
      ["sword_shield"],
      [],
      ["parry"],
      { ...adv, armored: true, role: "Parade · protection et défense" },
    ),
    c(
      "cavalry",
      "Cavalier",
      "knight",
      ["sword"],
      ["sword_shield"],
      [],
      ["charge"],
      { ...adv, mounted: true, role: "Épée et bouclier à cheval · charge" },
    ),
    c(
      "spearman",
      "Lancier",
      "knight",
      ["lance"],
      ["lance"],
      ["royal_guard", "mounted_spearman", "standard_bearer"],
      [],
      { role: "Lance" },
    ),
    c(
      "royal_guard",
      "Garde royal",
      "knight",
      ["lance"],
      ["lance_shield"],
      [],
      ["parry"],
      { ...adv, armored: true, role: "Lance et bouclier · défense" },
    ),
    c(
      "mounted_spearman",
      "Lancier monté",
      "knight",
      ["lance"],
      ["lance"],
      [],
      ["charge"],
      { ...adv, mounted: true, role: "Lance à cheval · charge" },
    ),
    c(
      "standard_bearer",
      "Porte-étendard",
      "knight",
      ["lance", "sword"],
      ["banner_lance", "sword"],
      [],
      ["banner"],
      {
        ...adv,
        visualStates: ["carried", "planted"],
        role: "Bannière portée puis plantée · soutien de zone",
      },
    ),
    c(
      "crossbowman",
      "Arbalétrier",
      "knight",
      ["crossbow"],
      ["crossbow"],
      ["ranger", "pavise_crossbowman"],
      [],
      { role: "Arbalète" },
    ),
    c(
      "ranger",
      "Rôdeur",
      "knight",
      ["crossbow", "sword"],
      ["crossbow", "sword"],
      [],
      ["forest_move"],
      { ...adv, role: "Arbalète et épée · vision et mobilité forestière" },
    ),
    c(
      "pavise_crossbowman",
      "Arbalétrier à pavois",
      "knight",
      ["crossbow"],
      ["crossbow"],
      [],
      ["fortify"],
      {
        ...adv,
        visualStates: ["default", "fortified"],
        role: "Pavois personnel · tir et rechargement en position fortifiée",
      },
    ),
    c(
      "swordsman",
      "Épéiste",
      "knight",
      ["sword"],
      ["sword"],
      ["duelist", "executioner"],
      [],
      { role: "Épée" },
    ),
    c(
      "duelist",
      "Duelliste",
      "knight",
      ["sword"],
      ["twin_swords"],
      [],
      ["dual"],
      { ...adv, role: "Deux épées · attaques multiples" },
    ),
    c(
      "executioner",
      "Exécuteur",
      "knight",
      ["sword"],
      ["great_sword"],
      [],
      [],
      { ...adv, role: "Grande épée à deux mains · coups puissants" },
    ),
    c(
      "sorcerer",
      "Sorcier",
      "knight",
      ["magic", "healing"],
      ["spell", "healing_focus"],
      ["necromancer", "archmage"],
      ["heal"],
      { role: "Magie offensive et magie de soins" },
    ),
    c(
      "necromancer",
      "Nécromancien",
      "knight",
      ["magic", "healing"],
      ["spell", "healing_focus"],
      [],
      ["heal", "summon"],
      { ...adv, role: "Magie, soins et invocations temporaires limitées" },
    ),
    c(
      "archmage",
      "Archimage",
      "knight",
      ["magic", "healing"],
      ["spell", "healing_focus"],
      [],
      ["heal", "area"],
      { ...adv, role: "Magie, soins et attaques de zone" },
    ),
    c(
      "young_viking",
      "Jeune Viking",
      "north",
      ["axe", "sword"],
      ["training_axe"],
      [],
      [],
      {
        stage: "recruit",
        maxLevel: 10,
        role: "Armes d’entraînement · deux voies définies par le personnage",
      },
    ),
    c(
      "squire",
      "Écuyer",
      "knight",
      ["sword", "lance"],
      ["training_sword"],
      [],
      [],
      {
        stage: "recruit",
        maxLevel: 10,
        femaleName: "Écuyère",
        role: "Épée légère · deux voies définies par le personnage",
      },
    ),
    c(
      "skeleton",
      "Squelette maudit",
      "enemy",
      ["sword"],
      ["rusty_sword"],
      [],
      [],
      { stage: "enemy", role: "Ressource ennemie existante du prototype" },
    ),
  ].map((d) => [d.id, d]),
);
export const baseClasses = (faction: "north" | "knight") =>
  Object.values(classes).filter(
    (c) => c.faction === faction && c.stage === "base",
  );
export const skillNames: Record<SkillId, string> = {
  dual: "Deux armes",
  pierce: "Pénétration d’armure",
  parry: "Parade",
  intercept: "Interception",
  bandage: "Bandages",
  heal: "Soins",
  forest_move: "Mobilité forestière",
  long_range: "Tir à longue portée",
  charge: "Charge",
  banner: "Planter la bannière",
  fortify: "Se fortifier",
  summon: "Invocation temporaire",
  area: "Attaque de zone",
  transform: "Transformation en ours",
  buff: "Amélioration",
  defense_aura: "Aura de défense",
};
export const categoryNames: Record<WeaponCategory, string> = {
  sword: "Épée",
  axe: "Hache",
  lance: "Lance",
  bow: "Arc",
  crossbow: "Arbalète",
  magic: "Magie offensive",
  healing: "Soins magiques",
};
export const weaponTriangles: WeaponCategory[][] = [
  ["sword", "axe", "lance"],
  ["bow", "crossbow", "magic"],
];
/** Explicitly provisional values for exercising the systems; none are final balance. */
export const tuning = {
  provisional: true,
  healingXp: 25,
  triangle: rules.triangle,
  effectiveDamage: rules.effectiveDamage,
  parry: rules.parry,
  pierce: "floor(defense/3)",
  charge: { minimumSteps: rules.chargeSteps, damage: rules.chargeDamage },
  banner: rules.banner,
  paviseDefense: rules.paviseDefense,
  heal: {
    base: rules.healBase,
    magicRange: rules.healRange,
    bandageRange: 1,
    bandagePower: rules.bandageHeal,
  },
  summon: {
    limit: rules.summons.limit,
    turns: rules.summons.duration,
    template: "skeleton",
  },
  area: { radius: rules.areaRadius, friendlyFire: false, counter: false },
  reloadConsumesAction: false,
};

classes.shaman.promotions = ["volva", "hamrammr"];
delete classes.shaman.pendingPromotions;
classes.volva = c(
  "volva",
  "Völva",
  "north",
  ["magic", "healing"],
  ["spell", "healing_focus"],
  [],
  ["heal", "buff"],
  {
    stage: "advanced",
    role: "Magie offensive, soins et améliorations",
    visualStates: ["default"],
  },
);
classes.hamrammr = c(
  "hamrammr",
  "Hamrammr",
  "north",
  ["healing", "sword"],
  ["healing_focus", "claws"],
  [],
  ["heal", "transform"],
  {
    stage: "advanced",
    role: "Soins humains et transformation temporaire en ours",
    visualStates: ["default", "bear"],
  },
);
classes.huscarl.skills = ["parry", "intercept"];
classes.honor_guard.skills = ["parry", "defense_aura"];
classes.cavalry.skills = [];
classes.mounted_spearman.skills = ["charge"];
for (const [id, data] of Object.entries(baseBalance)) {
  const [hp, strength, defense, agility, accuracy, move, vision, initiative] =
    data.stats;
  classes[id].stats = {
    hp,
    strength,
    defense,
    agility,
    accuracy,
    move,
    vision,
    initiative,
  };
}
for (const c of Object.values(classes).filter((c) => c.stage === "advanced")) {
  const origin = Object.values(classes).find((b) =>
    b.promotions.includes(c.id),
  );
  if (!origin) continue;
  const b = promotionBonuses[c.id] ?? [];
  c.stats = {
    ...origin.stats,
    hp: origin.stats.hp + (b[0] ?? 0),
    strength: origin.stats.strength + (b[1] ?? 0),
    defense: origin.stats.defense + (b[2] ?? 0),
    agility: origin.stats.agility + (b[3] ?? 0),
    initiative: origin.stats.initiative + (b[4] ?? 0),
    accuracy: origin.stats.accuracy + (b[6] ?? 0),
    move: c.mounted ? 8 : origin.stats.move + (b[7] ?? 0),
  };
}

classes.cavalry.role = "Épée et bouclier à cheval · déplacement 8";

// Playable enemy definitions bind the existing Sans-Repos atlases to their real weapons.
for (const [id, name, category, weapon] of [
  ["sans_axe", "Squelette hacheur", "axe", "axe"],
  ["sans_spear", "Squelette lancier", "lance", "lance"],
  ["sans_archer", "Archer squelette", "bow", "bow"],
] as const) {
  classes[id] = {
    ...classes.skeleton,
    id,
    name,
    weapons: [category],
    starter: [weapon],
    skills: [],
    promotions: [],
    stats: { ...classes.skeleton.stats },
  };
}
