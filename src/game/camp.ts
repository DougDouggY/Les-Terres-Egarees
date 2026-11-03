import type { Campaign } from "./types";
export type BuildingId = "infirmary" | "workshop" | "palisade";
export type CampProgress = {
  levels: Record<BuildingId, number>;
  completed: string[];
  active: { id: string; step: 0 | 1 | 2; result?: string } | null;
  weaponsImproved: boolean;
};
export const buildings: Record<
  BuildingId,
  { name: string; stages: string[]; benefits: string[] }
> = {
  infirmary: {
    name: "Infirmerie",
    stages: ["Chapelle éventrée", "Abri de soins", "Infirmerie restaurée"],
    benefits: [
      "Des couvertures, des plantes et un lieu sec sont nécessaires.",
      "Repos collectif : +12 PV contre 1 vivre.",
      "Repos collectif : tous les PV contre 1 vivre.",
    ],
  },
  workshop: {
    name: "Atelier",
    stages: ["Atelier effondré", "Établi remis en service", "Forge restaurée"],
    benefits: [
      "Récupérez les poutres et les outils du convoi.",
      "Préparer des potions avec les plantes du camp.",
      "Affûter une fois les armes de tous les survivants : Force +1.",
    ],
  },
  palisade: {
    name: "Enceinte",
    stages: ["Brèches ouvertes", "Accès consolidés", "Enceinte sécurisée"],
    benefits: [
      "Reconnaître les accès et trouver du bois.",
      "Les blessures des sorties sont réduites de 2 PV.",
      "Blessures réduites de 2 PV et 1 vivre supplémentaire par sortie.",
    ],
  },
};
type Choice = {
  id: string;
  label: string;
  detail: string;
  rewards: Record<string, number>;
  injury: number;
};
export type CampMission = {
  id: string;
  name: string;
  building: BuildingId;
  tier: 1 | 2;
  place: string;
  brief: string;
  scene: string;
  choices: Choice[];
};
const choice = (
  id: string,
  label: string,
  detail: string,
  rewards: Record<string, number>,
  injury = 0,
): Choice => ({ id, label, detail, rewards, injury });
export const campMissions: CampMission[] = [
  {
    id: "herbs",
    name: "Les herbes du vallon",
    building: "infirmary",
    tier: 1,
    place: "Vallon des sources",
    brief:
      "Les blessés dorment sous la pluie. Des plantes et des toiles propres permettraient de rendre une aile de la chapelle habitable.",
    scene:
      "Dans le vallon, des plantes poussent près d’un ruisseau. Plus bas, un ancien jardin médicinal disparaît sous les ronces.",
    choices: [
      choice(
        "edge",
        "Cueillir le long du ruisseau",
        "Sortie prudente : 3 plantes et 1 vivre.",
        { "Plantes médicinales": 3, "Vivres récupérés": 1 },
      ),
      choice(
        "garden",
        "Descendre dans le jardin",
        "5 plantes, mais l’éclaireur risque 4 PV de blessure.",
        { "Plantes médicinales": 5 },
        4,
      ),
    ],
  },
  {
    id: "dispensary",
    name: "Le dispensaire oublié",
    building: "infirmary",
    tier: 2,
    place: "Ancien dispensaire",
    brief:
      "L’abri est ouvert, mais il manque encore des lits et du matériel pour soigner les blessures graves.",
    scene:
      "Des lits démontables et des armoires de remèdes encombrent le dispensaire. Le chemin est trop étroit pour tout emporter.",
    choices: [
      choice(
        "beds",
        "Ramener les lits et les couvertures",
        "2 plantes et 2 vivres ; une infirmerie enfin au sec.",
        { "Plantes médicinales": 2, "Vivres récupérés": 2 },
      ),
      choice(
        "remedies",
        "Sauver les réserves de remèdes",
        "5 plantes ; traversée des décombres : risque de 3 PV.",
        { "Plantes médicinales": 5 },
        3,
      ),
    ],
  },
  {
    id: "convoy",
    name: "Les poutres du convoi",
    building: "workshop",
    tier: 1,
    place: "Route de l’embuscade",
    brief:
      "Sous les chariots brisés restent des poutres, des ferrures et des outils. Leur récupération remettrait l’établi du camp en service.",
    scene:
      "Un chariot menace de s’effondrer. Vous pouvez démonter les pièces accessibles ou soulever son essieu pour récupérer davantage de métal.",
    choices: [
      choice(
        "wood",
        "Démonter les poutres accessibles",
        "4 bois et 2 ferrures, sans blessure.",
        { "Bois de charpente": 4, "Ferrures récupérées": 2 },
      ),
      choice(
        "axle",
        "Récupérer l’essieu sous les débris",
        "2 bois et 4 ferrures ; risque de 4 PV.",
        { "Bois de charpente": 2, "Ferrures récupérées": 4 },
        4,
      ),
    ],
  },
  {
    id: "forge",
    name: "La forge ensevelie",
    building: "workshop",
    tier: 2,
    place: "Forge des Veilleurs",
    brief:
      "L’établi fonctionne. Un soufflet, une enclume et des pinces permettraient de rétablir une véritable forge.",
    scene:
      "L’enclume et les outils sont prisonniers d’une toiture tombée. Les archives de l’artisan sont encore accessibles dans une annexe.",
    choices: [
      choice(
        "tools",
        "Sortir l’enclume et les outils",
        "5 ferrures ; effort dangereux : risque de 3 PV.",
        { "Ferrures récupérées": 5 },
        3,
      ),
      choice(
        "plans",
        "Récupérer les plans et les outils légers",
        "3 ferrures et les plans de l’artisan.",
        { "Ferrures récupérées": 3, "Plans d’artisan": 1 },
      ),
    ],
  },
  {
    id: "woodcutters",
    name: "Le chemin des bûcherons",
    building: "palisade",
    tier: 1,
    place: "Lisière des Veilleurs",
    brief:
      "Les accès du refuge sont ouverts au vent et aux rôdeurs. Du bois et un chemin reconnu permettraient de fermer les premières brèches.",
    scene:
      "Des troncs coupés bordent un ancien sentier. Vous pouvez charger immédiatement le bois ou reconnaître un passage moins exposé.",
    choices: [
      choice(
        "logs",
        "Charger les troncs abandonnés",
        "5 bois ; transport difficile : risque de 2 PV.",
        { "Bois de charpente": 5 },
        2,
      ),
      choice(
        "path",
        "Reconnaître un passage sûr",
        "3 bois et 2 vivres, sans blessure.",
        { "Bois de charpente": 3, "Vivres récupérés": 2 },
      ),
    ],
  },
  {
    id: "quarry",
    name: "La carrière des Veilleurs",
    building: "palisade",
    tier: 2,
    place: "Carrière abandonnée",
    brief:
      "Les accès tiennent. Des pierres taillées permettraient de consolider durablement le mur d’enceinte.",
    scene:
      "Des blocs sont prêts au chargement. Plus loin, un chariot de carrier contient des pierres plus légères et quelques ferrures.",
    choices: [
      choice(
        "blocks",
        "Ramener les blocs taillés",
        "4 pierres ; risque de 3 PV.",
        { "Pierres taillées": 4 },
        3,
      ),
      choice(
        "cart",
        "Démonter le chariot du carrier",
        "2 pierres et 2 ferrures, sans blessure.",
        { "Pierres taillées": 2, "Ferrures récupérées": 2 },
      ),
    ],
  },
];
export function createCampProgress(): CampProgress {
  return {
    levels: { infirmary: 0, workshop: 0, palisade: 0 },
    completed: [],
    active: null,
    weaponsImproved: false,
  };
}
export function ensureCamp(s: Campaign) {
  return (s.camp ??= createCampProgress());
}
export function campStock(s: Campaign, name: string) {
  return s.inventory.find((i) => i.name === name)?.count ?? 0;
}
function addStock(s: Campaign, name: string, amount: number) {
  let item = s.inventory.find((i) => i.name === name);
  if (!item && amount < 0) throw Error("Ressources insuffisantes");
  if (!item) {
    item = { name, count: 0 };
    s.inventory.push(item);
  }
  if (item.count + amount < 0) throw Error("Ressources insuffisantes");
  item.count += amount;
}
function note(s: Campaign, text: string) {
  s.history.push(text);
  for (const p of s.players) p.journal.push(text);
}
function atCamp(s: Campaign) {
  if (s.phase !== "camp") throw Error("Action disponible uniquement au camp");
  return ensureCamp(s);
}
export function availableCampMissions(s: Campaign) {
  const c = ensureCamp(s);
  return campMissions.filter(
    (m) => !c.completed.includes(m.id) && c.levels[m.building] === m.tier - 1,
  );
}
export function beginCampMission(s: Campaign, id: string) {
  const c = atCamp(s);
  if (c.active) throw Error("Une sortie est déjà en cours");
  const m = availableCampMissions(s).find((m) => m.id === id);
  if (!m) throw Error("Sortie indisponible");
  c.active = { id, step: 0 };
  note(s, `Sortie choisie : ${m.name}.`);
}
export function exploreCampMission(s: Campaign) {
  const c = atCamp(s);
  if (c.active?.step !== 0) throw Error("Aucune sortie à explorer");
  c.active.step = 1;
}
export function resolveCampMission(s: Campaign, id: string) {
  const c = atCamp(s),
    a = c.active;
  if (!a || a.step !== 1) throw Error("Aucun choix en attente");
  const m = campMissions.find((m) => m.id === a.id)!,
    o = m.choices.find((o) => o.id === id);
  if (!o || c.completed.includes(m.id) || c.levels[m.building] !== m.tier - 1)
    throw Error("Choix indisponible");
  const secure = c.levels.palisade >= 2;
  const scout = s.units
    .filter((u) => u.owner !== 0 && u.hp > 0)
    .sort((a, b) => b.agility - a.agility || a.id.localeCompare(b.id))[0];
  if (!scout) throw Error("Aucun survivant pour cette sortie");
  const injury = Math.min(
    Math.max(0, o.injury - (c.levels.palisade >= 1 ? 2 : 0)),
    Math.max(0, scout.hp - 1),
  );
  scout.hp -= injury;
  for (const [name, amount] of Object.entries(o.rewards))
    addStock(s, name, amount);
  if (secure) addStock(s, "Vivres récupérés", 1);
  c.levels[m.building] = m.tier;
  c.completed.push(m.id);
  if (!s.world.includes(m.place)) s.world.push(m.place);
  const result = `${buildings[m.building].stages[m.tier]}. ${Object.entries(
    o.rewards,
  )
    .map(([n, v]) => `${n} +${v}`)
    .join(
      " · ",
    )}.${secure ? " Enceinte sécurisée : 1 vivre supplémentaire." : ""}${injury ? ` ${scout.name} revient avec ${injury} PV de blessure.` : " Tous les survivants reviennent sans nouvelle blessure."}`;
  a.step = 2;
  a.result = result;
  note(s, `${m.name} : ${result}`);
  return result;
}
export function returnToCamp(s: Campaign) {
  const c = atCamp(s);
  if (c.active?.step !== 2) throw Error("La sortie n’est pas terminée");
  c.active = null;
}
function service(s: Campaign, b: BuildingId, level = 1) {
  const c = atCamp(s);
  if (c.active || c.levels[b] < level) throw Error("Service indisponible");
  return c;
}
export function restAtCamp(s: Campaign) {
  const c = service(s, "infirmary");
  const units = s.units.filter(
    (u) => u.owner !== 0 && u.hp > 0 && u.hp < u.maxHp,
  );
  if (!units.length) throw Error("Aucune blessure à soigner");
  addStock(s, "Vivres récupérés", -1);
  for (const u of units)
    u.hp = c.levels.infirmary >= 2 ? u.maxHp : Math.min(u.maxHp, u.hp + 12);
  note(s, "Les survivants se reposent à l’infirmerie.");
}
export function prepareCampPotions(s: Campaign) {
  service(s, "workshop");
  const units = s.units.filter(
    (u) => u.owner !== 0 && u.hp > 0 && u.potions < 3,
  );
  if (!units.length) throw Error("Les réserves de potions sont déjà pleines");
  addStock(s, "Plantes médicinales", -1);
  for (const u of units) u.potions++;
  note(s, "L’atelier prépare des potions pour les survivants.");
}
export function improveCampWeapons(s: Campaign) {
  const c = service(s, "workshop", 2);
  if (c.weaponsImproved) throw Error("Les armes sont déjà affûtées");
  addStock(s, "Ferrures récupérées", -2);
  for (const u of s.units.filter((u) => u.owner !== 0 && u.hp > 0))
    u.strength++;
  c.weaponsImproved = true;
  note(s, "La forge affûte les armes des survivants : Force +1.");
}
