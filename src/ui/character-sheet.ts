import * as E from "../engine";
import type { Unit } from "../game/types";
const esc = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
const stories: Record<string, string> = {
  Astrid:
    "Chasseuse du clan, elle sait lire les traces que les autres ne remarquent pas.",
  Solveig:
    "Les remèdes du clan passent entre ses mains. Elle veille discrètement sur ses compagnons.",
  Bryn: "Habitué aux traversées difficiles, il préfère tenir sa place auprès des siens.",
  Runa: "Vive et attentive, elle compte sur son adresse pour revenir des expéditions.",
  Håkon:
    "Guerrier du Nord, il avance avec la détermination de ceux qui protègent leur clan.",
  Gaspard:
    "Arbalétrier de la compagnie, il préfère prendre le temps de viser juste.",
  Armand:
    "Lancier de la compagnie, il veille à garder la ligne auprès de ses compagnons.",
  Ysilde:
    "Femme d’armes de la compagnie, elle oppose sa garde aux dangers du chemin.",
  Amaury:
    "Épéiste de la compagnie, il fait confiance à son adresse et à sa lame.",
  Maëlys:
    "Sorcière rencontrée près du sanctuaire, elle connaît les chemins de ces terres.",
  Géraud: "Écuyer de Valdren, il apprend encore le métier des armes.",
};
const classTexts: Record<string, string> = {
  man_at_arms:
    "Combattant protégé par son armure et son bouclier, solide au premier rang.",
  spearman:
    "Combattant à la lance, utile pour tenir une position et affronter les cavaliers.",
  crossbowman: "Tireur à l’arbalète, dangereux contre les cibles à distance.",
  swordsman: "Épéiste agile qui privilégie la vitesse et la précision.",
  raider: "Guerrier à la hache et au bouclier, capable de tenir la ligne.",
  north_warrior: "Guerrier à la hache qui privilégie la force de ses frappes.",
  nordic_blade: "Combattant vif qui mise sur son adresse et sa rapidité.",
  hunter: "Archer qui tire parti de la distance et du terrain.",
  shaman: "Soigneur du clan, il soutient ses compagnons avec sa magie.",
  sorcerer:
    "Mage capable de lancer une magie offensive et de soigner ses alliés.",
  volva: "Mage du Nord qui associe magie offensive, soins et soutien.",
  hamrammr: "Soigneur capable de prendre une forme animale pour combattre.",
  squire:
    "Apprenti encore peu aguerri, qui progresse par l’expérience du combat.",
  young_viking:
    "Jeune combattant qui apprend à manier les armes au fil des expéditions.",
};
const tip = (text: string, body: string) =>
  `<span class="character-tip" tabindex="0" data-character-tip="${esc(text)}">${body}</span>`;
export function biography(u: Unit, campaign?: E.Campaign) {
  if (u.id === "geraud")
    return u.owner === 0
      ? "Écuyer de Valdren, il apprend encore le métier des armes."
      : "Ancien écuyer de Valdren, il apprend encore le maniement des armes. Il se souvient des tempêtes rouges et croit toujours à leur existence.";
  if (u.id === "story-witch") {
    if (campaign?.forestChapter?.completed.includes("c1-cave"))
      return "Sorcière étudiant les tempêtes rouges, elle combat l’oubli grâce à ses notes. Sa sœur est prisonnière de Valdren.";
    if (campaign?.chapter1?.witchNamed || campaign?.forestChapter)
      return "Sorcière qui enquête sur les tempêtes rouges et cherche un moyen de quitter ces terres.";
    return "Une sorcière rencontrée près du sanctuaire, qui semble en savoir davantage sur ces terres.";
  }

  return (
    (Object.hasOwn(stories, u.name) ? stories[u.name] : undefined) ??
    (u.leader
      ? "À la tête de son groupe, cette personne veille sur ses compagnons."
      : u.owner
        ? "Membre de la compagnie, ce combattant partage les dangers de l’expédition."
        : "Soldat de cette troupe, dont le parcours demeure inconnu.")
  );
}
export function classDescription(u: Unit) {
  const c = E.unitClass(u);
  return (
    classTexts[c.id] ??
    `${E.className(u)} : ${c.mounted ? "combattant monté" : "combattant"} utilisant ${c.weapons.map((w) => E.categoryNames[w].toLowerCase()).join(" et ")}.`
  );
}
export type CharacterTab = "inventory" | "stats";
export function characterItems(u: Unit) {
  return [
    ...(u.carriedWeapons ?? []).map((id) => ({
      id,
      name: E.weaponCatalog[id]?.name ?? "Objet inconnu",
    })),
    ...(u.potions > 0 ? [{ id: "bandages", name: "Bandages" }] : []),
  ];
}
const icon = (category: string) =>
  `<svg class="item-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="${category === "bandages" ? "M4 8h16v8H4z M8 4v16 M16 4v16" : category === "bow" || category === "crossbow" ? "M5 3Q23 12 5 21L10 12z M3 12h18" : category === "magic" || category === "healing" ? "M12 2l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" : "M17 2l5 1-2 5-10 10-4-4z M5 12l7 7 M3 21l5-5"}"/></svg>`;
export function characterPage(
  u: Unit,
  tab: CharacterTab,
  itemId?: string,
  canManage = false,
) {
  const items = characterItems(u),
    chosen =
      items.find((i) => i.id === itemId) ??
      items.find((i) => i.id === u.activeWeaponId) ??
      items[0];
  const header = `<header class="character-page-title"><button data-action="character-tab" aria-label="Onglet précédent">‹</button><h2>${tab === "inventory" ? "Inventaire" : "Statistiques"}</h2><button data-action="character-tab" aria-label="Onglet suivant">›</button></header>`;
  if (tab === "stats") {
    // A readable visual scale, independent of the engine’s safety caps.
    const stats: [string, number, number, string][] = [
      [
        E.powerLabel(u) === "Puissance" ? "PUIS" : "FOR",
        u.strength,
        30,
        "Force ou puissance : augmente les dégâts et la puissance des soins.",
      ],
      ["DEF", u.defense, 30, "Défense : réduit les dégâts physiques reçus."],
      [
        "AGI",
        E.effectiveAgility(u),
        30,
        "Agilité : aide à esquiver et à enchaîner les attaques.",
      ],
      [
        "INIT",
        E.effectiveInitiative(u),
        30,
        "Initiative : détermine l’ordre de passage.",
      ],
      ["PRÉC", u.accuracy, 100, "Précision : améliore les chances de toucher."],
      [
        "MVT",
        E.effectiveMove(u),
        10,
        "Mouvement : distance parcourue selon le terrain.",
      ],
    ];
    stats.push([
      "VUE",
      u.vision,
      10,
      "Vision : permet de repérer les alentours dans le brouillard.",
    ]);
    if (E.hasShield(u) || u.parryPoints)
      stats.push([
        "PAR",
        u.parryPoints ?? 0,
        E.parryMaximum(u),
        "Parade : augmente les chances de bloquer avec le bouclier.",
      ]);
    return (
      header +
      `<div class="character-statistics">${stats.map(([label, value, max, help]) => `<div class="character-stat-row">${tip(help, esc(label))}<div class="character-stat-meter" role="meter" aria-label="${label}" aria-valuemin="0" aria-valuemax="${Math.max(max, value)}" aria-valuenow="${value}"><i style="width:${Math.max(0, Math.min(100, (value / max) * 100))}%"></i><b>${value}</b></div></div>`).join("")}</div>`
    );
  }
  let details = '<p class="character-empty">Aucun objet transporté.</p>';
  if (chosen) {
    if (chosen.id === "bandages")
      details = `<h3>Bandages</h3><p>Rend ${E.rules.bandageHeal} PV.</p>${canManage && u.hp < u.maxHp ? '<button class="character-use" data-action="heal">Utiliser</button>' : ""}`;
    else {
      const w = E.weaponCatalog[chosen.id];
      const values =
        w.category === "healing"
          ? `<div><span>Soin</span><b>${E.rules.healBase + u.strength} PV</b></div>`
          : `<div><span>Dégâts</span><b>${w.power}</b></div><div>${tip("Bonus de précision apporté par cette arme.", "Précision")}<b>${w.accuracy > 0 ? "+" : ""}${w.accuracy}</b></div>`;
      const shield = w.visual.includes("shield");
      const special = [
        w.effective
          ? `Efficace contre ${w.effective === "mounted" ? "les cavaliers" : w.effective === "flying" ? "les unités volantes" : "les unités en armure"}.`
          : "",
        w.attacks > 1 ? "Deux frappes avec deux armes." : "",
      ]
        .filter(Boolean)
        .join(" ");
      details = `<h3>${esc(w.name)}</h3><div class="character-item-values">${values}${shield ? `<div><span>Parade</span><b>${u.parryPoints ?? 0}</b></div>` : ""}${w.agilityPenalty ? `<div><span>Agilité</span><b>−${w.agilityPenalty}</b></div>` : ""}</div>${special ? `<p>${special}</p>` : ""}${canManage && chosen.id !== u.activeWeaponId && E.compatibleWeapon(u, chosen.id) && !(w.category === "healing" && E.unitClass(u).weapons.includes("magic")) ? `<button class="character-use" data-action="equip-${esc(chosen.id)}">Prendre en main</button>` : ""}`;
    }
  }
  return (
    header +
    `<div class="character-item-list" role="group" aria-label="Objets transportés">${items.map((item) => `<button data-action="character-item-${esc(item.id)}" class="character-item ${chosen?.id === item.id ? "selected" : ""}" aria-pressed="${chosen?.id === item.id}"><span class="item-cursor" aria-hidden="true">${item.id === u.activeWeaponId ? "▸" : "·"}</span>${icon(item.id === "bandages" ? "bandages" : (E.weaponCatalog[item.id]?.category ?? "sword"))}<span>${esc(item.name)}</span>${item.id === "bandages" ? `<b>×${u.potions}</b>` : ""}</button>`).join("")}</div><section class="character-item-details" aria-label="Détails de l’objet" aria-live="polite">${details}</section>`
  );
}
export function characterSheet(
  u: Unit,
  canManage = false,
  campaign?: E.Campaign,
) {
  const playable = u.owner !== 0 && u.statRole !== "ordinary";
  return `<div class="character-sheet" data-character-unit="${esc(u.id)}" data-character-tab="inventory"><aside class="character-profile"><div class="character-portrait-slot" role="img" aria-label="Emplacement du portrait"></div><h2>${tip(biography(u, campaign), esc(u.name))}</h2><p class="character-class">${tip(classDescription(u), esc(E.className(u)))}</p><dl><div><dt>Niv</dt><dd>${u.level}</dd></div>${playable ? `<div><dt>EXP</dt><dd>${u.xp}<small>/100</small></dd></div>` : ""}<div class="character-health"><dt>PV</dt><dd>${u.hp}<small>/${u.maxHp}</small></dd></div></dl></aside><section class="character-pages">${characterPage(u, "inventory", undefined, canManage)}</section></div>`;
}
