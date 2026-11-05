import "./tools.css";
export function openTestHub(app: HTMLElement, onBack: () => void) {
  app.innerHTML = `<main class="dev-screen simple-test-hub"><header class="dev-top"><div><span class="dev-badge">TESTS INDÉPENDANTS · AUCUNE CAMPAGNE</span><h1>Tests de combat</h1></div><button data-tests-back>Retour au menu</button></header><div class="test-cards"><article><h2>Parade et riposte</h2><p>Choisissez une classe équipée d’un bouclier : attaque adverse, parade réussie et riposte immédiate.</p><button data-action="dev-parries">Tester les parades</button></article><article><h2>Arène du chapitre 1</h2><p>Un seul personnage, une classe modifiable à tout moment et un ennemi à 10 000 PV sur la carte validée.</p><button data-action="dev-arena">Tester sur la carte du chapitre 1</button></article><article><h2>Comparateur V2</h2><p>Classes, skins, armes, scénarios, ralenti et diagnostic des ancres.</p><button data-action="dev-comparator">Comparer toutes les animations</button></article></div></main>`;
  app.querySelector<HTMLElement>("[data-tests-back]")!.onclick = onBack;
  return () => {};
}
