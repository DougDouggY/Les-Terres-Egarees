# Chapitre II — Première proposition de terrain du camp du Royaume

Carte de 40 × 28 cases (1120 cases) consultable par **Carte du chapitre 2** sur l’accueil et **Voir la carte du camp** au bilan de l’introduction du chapitre II.

Cette proposition ne démarre pas encore une bataille : les compositions d’armées, objectifs, événements, prisonniers et recrutements restent à définir avec le joueur. Les dialogues de la grotte et leurs conditions ne sont pas modifiés.

## Disposition proposée

- Approche au sud-ouest et chemin de deux cases de large vers l’entrée sud.
- Palissade fermée autour du camp, deux tours encadrant l’entrée.
- Passage secondaire de deux cases à l’ouest.
- Cour et axes de circulation centraux.
- Baraquement au nord-ouest, réserve à l’ouest et tente de commandement au nord-est.
- Enclos vide au sud-est avec accès sur son côté ouest.
- Lisière irrégulière et bois autour de la clairière.

Les bâtiments ont des emprises infranchissables alignées sur des cases entières. L’enclos ne contient aucun personnage. Le marqueur d’arrivée est un repère de conception, pas un déploiement définitif d’unités.

## Consultation

Les commandes de zoom, la vue entière, la grille et les repères fonctionnent à la souris et au toucher. Le menu des lieux centre l’aperçu sur un repère. Survoler une case affiche son numéro ; toucher ou cliquer sur une case affiche son numéro, ses coordonnées (à partir de 1), le type de terrain, son accessibilité et le chemin depuis l’arrivée proposée. Les routes utilisent le calcul de chemin du moteur et les coûts réels des cases.

Les textures du sol et les arbres proviennent de l’atlas régional existant ; les constructions et clôtures sont une couche de dessin déterministe, sans nouvelle image générée. Le plan et le rendu sont séparés pour faciliter leurs retouches.

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
