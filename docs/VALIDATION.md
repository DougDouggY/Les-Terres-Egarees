# Validation exécutée

- Installation verrouillée : `npm ci --offline --cache /workspace/.npm-cache --no-audit --no-fund`, réussie.
- `npm run build` : TypeScript et compilation Vite réussis.
- `npm test` : 23 tests, aucun échec ni test ignoré.
- Missions simulées en respectant visibilité, déplacements et IA :

| Factions              | Activations jusqu’à la victoire | Survivants |
| --------------------- | ------------------------------: | ---------: |
| Viking / Viking       |                              51 |          4 |
| Viking / Chevalier    |                              54 |          4 |
| Chevalier / Viking    |                              45 |          4 |
| Chevalier / Chevalier |                              59 |          4 |

Les quatre variantes comprennent des frappes après la fusion des initiatives.

- `npm run test:e2e` : parcours navigateur réel de la mission, incluant un combat commun, le camp, la carte du monde, la sauvegarde et sa reprise.
- `node tests/ui-smoke.mjs` : quatre configurations contrôlées dans Chromium, avec Tab, observation côte à côte et deux caméras indépendantes. Aucune erreur JavaScript ou réponse HTTP en échec. Le serveur de développement doit déjà être lancé pour ce script.
- Version de production lancée avec `npm run preview`, puis parcourue dans Chromium depuis l’accueil jusqu’à la carte après les deux introductions : aucune erreur constatée. Ce serveur de vérification a été arrêté ensuite.

Le serveur de développement reste lancé sur le port 5173 dans la machine préparée. Les processus ne sont pas garantis de survivre à une restauration : les instructions de redémarrage sont enregistrées dans `start_skill`.

La configuration cloud a été enregistrée en brouillon (`install_script`, `start_skill`). Elle n’a pas été publiée automatiquement.

## Retours visuels — seconde passe

25 tests de règles/carte/sauvegarde réussis. Les quatre variantes restent gagnables
(54, 52, 58 et 62 activations, quatre survivants). Deux tests navigateur réussis :
mission complète et contrôle pixel du brouillard (animation, raccords entre cases,
indépendance des perspectives, réapparition hors de portée). Inspection des captures
du nouveau sanctuaire et de la brume. Aucune génération d'images effectuée.

Les références externes fournies sont bloquées par le réseau : comparaison
exacte des styles et des formules reportée, voir FEEDBACK.md.

## Régression sélection et traversée des alliés

26 tests de règles réussis, incluant les quatre simulations complètes.
Test de sélection reproduit en échec avec « Cannot access c before initialization »,
puis réussi après correction : brume texturée maintenue et ennemis visibles
toujours dessinés. Trois tests navigateur ciblés : brume continue, sélection
réelle, déplacement réel à travers un allié avec destination finale libre.
Compilation GitHub Pages validée.

## Atelier visuel et monastère — révision 3

Les rendus fondu, continu et varié sont réellement différents dans les tests
pixel et restent basés sur la même carte logique. Le mode sans brume et la grille
ont été activés/désactivés dans Chromium ; la campagne sérialisée reste identique.
Les captures `artifacts/terrain-blended.png`, `terrain-continuous.png` et
`terrain-varied.png` permettent de comparer la carte entière.

Les tests couvrent aussi les huit variantes d’herbe, leur distribution stable,
les trois pièces du monastère, ses portes/brèches et les quatre orientations des
escaliers. Les anciennes sauvegardes sont migrées sans perte de progression et
la visibilité est recalculée selon les nouveaux murs.

Bilan de cette passe : 28 tests de règles réussis, quatre contrôles navigateur
ciblés réussis et parcours complet de la mission réussi jusqu'au camp puis à la
reprise de sauvegarde. Le premier parcours intégral avait atteint la limite de
180 s en rendu logiciel ; après suppression du filtre global redondant et réduction
des rafraîchissements inutiles au repos, le parcours est passé en environ 2 min 15 s.
Le test intégral dispose d'un délai de 240 s pour les machines sans accélération.

## Carte régionale (révision 4)

- 27 tests moteur/simulations passent ; victoire des quatre combinaisons de factions en 42 à 53 activations.
- Parcours Chromium complet : introductions, combat, rencontre, combat commun, victoire, camp, sauvegarde et reprise (41 tours).
- Inspection sans brume et grille sans mutation de campagne ; sélection avec brume animée et ennemis visibles ; passage à travers un allié : vérifiés dans Chromium.
- Après adoucissement des textures, les quatre tests de rendu/brume/déplacement repassent. Capture : `artifacts/terrain-regional.png`.
- Compilation TypeScript/Vite avec la base GitHub Pages validée.

## Carte agrandie et interface contextuelle (révision 5)

- 29 tests moteur/simulations passent. Les quatre combinaisons de factions terminent la mission en 68 à 83 activations, avec quatre survivants.
- La connexité de toutes les cases praticables est vérifiée par un parcours complet du graphe ; les chemins pondérés et le passage entre alliés conservent leurs tests dédiés.
- Chromium : brume animée, sélection avec ennemis visibles, passage entre alliés, rendu de brume identique après cadrage, glisser sans déplacement d’unité, caméras indépendantes, survol terrain/PV, fiche et aide de statistique, entrée sud du village et inspection sans mutation de campagne validés.
- Captures : `artifacts/connected-woods.png`, `artifacts/unit-window.png`, `artifacts/terrain-regional.png`.
- Terrain et brume sont dessinés uniquement dans le cadre de caméra ; le cache du terrain et les masques de visibilité conservent les coordonnées monde.
- Parcours Chromium complet réussi en 52 activations : introductions, annulation, combats, rencontre, combat commun, victoire, camp, carte du monde et reprise de sauvegarde (environ 2 min 48 s en rendu logiciel).
- Le pilote navigateur attend explicitement un tour humain et vérifie le nom de l’unité active ; il supporte les cinématiques qui interrompent un changement de perspective. Les changements de front utilisent le raccourci Tab officiel.
- Après les derniers ajustements de cadrage et de libellés, les sept tests navigateur ciblés repassent ; compilation de production avec la base GitHub Pages validée.

## Carte sur tout le viewport et forêts peintes raccordées

- 29 tests moteur passent ; aucun changement de carte logique, de départ ou de sauvegarde.
- Huit scénarios navigateur ciblés passent : brume, sélection, déplacement entre alliés, cadrage, fiche, glisser, village et viewport.
- La carte occupe au moins 99 % de la largeur et de la hauteur sur 1907 × 882, 1280 × 600, 1024 × 450 et 390 × 844. Cases carrées et tampon Canvas au bon rapport ; aucune barre de défilement de page.
- Deux vues d’observation : chacune occupe une demi-largeur et toute la hauteur, avec des cases carrées.
- Parcours complet réussi jusqu’au camp et à la reprise (52 activations, environ 2 minutes).
- Après ajustement des panneaux flottants, les trois scénarios viewport/interaction repassent. Compilation avec la base GitHub Pages validée.
- Captures : `artifacts/fullscreen-1907.png`, `artifacts/fullscreen-1280.png`, `artifacts/connected-woods.png`.
