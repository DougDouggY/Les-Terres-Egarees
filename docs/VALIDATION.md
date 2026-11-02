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
