# Chapitre II — Première proposition de terrain du camp du Royaume

Carte de 40 × 28 cases (1120 cases) consultable par **Carte du chapitre 2** sur l’accueil et **Voir la carte du camp** au bilan de l’introduction du chapitre II.

Cette proposition ne démarre pas encore une bataille : les compositions d’armées, objectifs, événements, prisonniers et recrutements restent à définir avec le joueur. Les dialogues de la grotte et leurs conditions ne sont pas modifiés.

## Disposition proposée

- Approche au sud-ouest et chemin de deux cases de large vers l’entrée sud.
- Palissade fermée autour du camp, deux tours encadrant l’entrée.
- Passage secondaire de deux cases à l’ouest.
- Cour et axes de circulation centraux.
- Baraquement au nord-ouest, réserve à l’ouest et village en bois de 3 × 3 cases au nord-est.
- Enclos vide au sud-est avec accès sur son côté ouest.
- Lisière irrégulière et bois autour de la clairière.

Les bâtiments ont des emprises infranchissables alignées sur des cases entières. L’enclos ne contient aucun personnage. Le marqueur d’arrivée est un repère de conception, pas un déploiement définitif d’unités. Le village possède une porte sur sa case centrale sud et trois cases praticables devant : sortie prévue des défenseurs, puis entrée du groupe après la victoire. Les séquences de bataille et d’entrée ne sont pas encore branchées à une armée.

## Consultation

Les commandes de zoom, la vue entière, la grille et les repères fonctionnent à la souris et au toucher. Le menu des lieux centre l’aperçu sur un repère. Survoler une case affiche son numéro ; toucher ou cliquer sur une case affiche son numéro, ses coordonnées (à partir de 1), le type de terrain, son accessibilité et le chemin depuis l’arrivée proposée. Les routes utilisent le calcul de chemin du moteur et les coûts réels des cases.

Les textures du sol, les arbres, l’eau et les montagnes proviennent de l’atlas régional existant. Les nouvelles palissades et le village en bois sont des images générées à partir de cet atlas de référence, puis intégrées dans un tileset complémentaire. Les autres constructions conservent leur dessin provisoire. Le plan et le rendu sont séparés pour faciliter leurs retouches.

L’aperçu ne lit ni n’écrit les sauvegardes et ne crée aucune unité. La carte active précédente est restaurée à sa fermeture. La progression du chapitre II reste au bilan précédent, en attente de définition de la bataille.

## Fichiers

- `src/data/kingdom-camp-map.ts` : cases, obstacles et repères.
- `src/ui/kingdom-camp-renderer.ts` : constructions et palissades.
- `src/ui/kingdom-camp.ts` et `.css` : consultation, zoom, grille, chemins et adaptation mobile.
- `src/game/active-map.ts` : chargement du terrain. Le moteur régional protégé `src/terrain.ts` reste inchangé ; l’aperçu utilise une extension dédiée.
- `src/main.ts` : accès depuis l’accueil et le bilan du chapitre II.
- `tests/camp-preview.spec.ts`, `tests/chapter-two-review.spec.ts`, `tests/chapter2-integration.test.ts`, `playwright.story-update.config.ts` : vérifications du terrain et des accès.

## Vérifications

**241 tests automatisés réussis.** Deux tests moteur supplémentaires vérifient la grille déterministe, les emprises bloquées, les passages vers chaque repère et la restauration exacte des anciennes cartes. Quatre parcours navigateur vérifient l’aperçu sur ordinateur et téléphone, la grille, le zoom, les cases bloquées, l’accès après les deux introductions et le retour au bilan sans toucher aux sauvegardes. Compilation du prototype et contrôle de ses ressources effectués.

## Tileset complémentaire — 26 novembre 2026

`public/assets/kingdom-camp/tileset.png` contient 8 colonnes et 7 lignes de cellules natives de 128 pixels (cases de jeu de 32 pixels). Les quatre premières lignes reprennent exactement les pixels de l’atlas du prologue, dont l’eau et les montagnes. Le village occupe les colonnes 1 à 3 et les lignes 4 à 6, en coordonnées partant de zéro. Les dix modules de palissade occupent les emplacements adjacents : lignes horizontales/verticales, quatre angles et quatre extrémités. Les zones vides sont transparentes.

Le village est dessiné comme une image continue sur neuf cases afin d’éviter les coutures. Sur la carte : emprise (28,7) à (30,9), porte en (29,9), approche sur les trois cases (28–30,10), coordonnées internes à partir de zéro. Les huit autres cases sont bloquées. La rivière longe l’ouest ; les montagnes occupent le bord nord-est.

`src/data/camp-tileset.ts` décrit le découpage. `scripts/build-camp-tileset.mjs` réalise uniquement l’extraction des cadres et l’assemblage technique, sans repeindre l’art. Sources originales conservées dans l’espace de travail : `/workspace/generated_images/exec-4eb1dfb8-d33d-49fe-85ab-c1f9278c1ccc.png` (village) et `/workspace/generated_images/exec-76c6bae8-e3f9-43a8-9f7b-7844309a6e7b.png` (palissades).

Commande de réexport : `node scripts/build-camp-tileset.mjs CHEMIN_VILLAGE.png CHEMIN_PALISSADES.png`.

Vérifications supplémentaires : neuf cases reliées, porte et approche accessibles, rivière continue infranchissable sans bloquer la vue, montagnes infranchissables et opaques ; dimensions réelles du PNG, transparence des modules, conservation exacte des pixels hérités du prologue ; aperçu sur ordinateur et téléphone et accès depuis les deux fins de chapitre I. **242 tests automatisés réussis.**
