import "./tools.css";
export function openTestHub(app: HTMLElement, onBack: () => void) {
  app.innerHTML = `<main class="dev-screen"><header class="dev-top"><div><span class="dev-badge">TESTS INDÉPENDANTS · AUCUNE CAMPAGNE</span><h1>Tests de combat</h1></div><button data-tests-back>Retour au menu</button></header><p>Choisissez un test. Les unités et points de vie de ces scènes sont indépendants de votre partie.</p><div class="test-cards">${[
    [
      "dev-combat-preview",
      "Attaque et parade",
      "Deux combattants : attaque, retour, riposte et seconde attaque par agilité.",
    ],
    [
      "dev-workshop",
      "Toutes les classes",
      "Armes, animations, niveaux et échange réel.",
    ],
    [
      "dev-workshop-dual",
      "Deux armes",
      "Enchaînements du Duelliste et seconde main.",
    ],
    [
      "dev-workshop-ranged",
      "Arc et arbalète",
      "Projectiles physiques et rechargement.",
    ],
    [
      "dev-workshop-heal",
      "Soins alliés",
      "Chaman et allié blessé : geste, lumière et récupération de PV.",
    ],
    [
      "dev-workshop-fire",
      "Boule de feu",
      "Sort de la Sorcière, projectile et impact.",
    ],
    [
      "dev-workshop-lightning",
      "Éclairs vikings",
      "Magie offensive de la Völva.",
    ],
    [
      "dev-initiative",
      "Barre d’initiative",
      "Ordre commun, centrage, cycles et deux visions indépendantes.",
    ],
    [
      "dev-sprites",
      "Galerie des sprites",
      "Lecture image par image et comparaison des ressources.",
    ],
  ]
    .map(
      ([action, title, description]) =>
        `<article><h2>${title}</h2><p>${description}</p><button data-action="${action}">Ouvrir : ${title}</button></article>`,
    )
    .join("")}</div></main>`;
  app.querySelector<HTMLElement>("[data-tests-back]")!.onclick = onBack;
  return () => {};
}
