# Nettoyage Legacy et fiche de référence

À la demande du joueur, suppression de `public/assets/sprites.png`, `public/assets/attacks.png` et `src/assets/tactical/legacy.sprite.json`. Retrait de leurs entrées de découpe et d'ancrage, de la règle CSS `.sprite-portrait`, du filtre de combat devenu inutile et des deux entrées de ressources protégées dont la suppression est désormais explicitement autorisée. Les anciens tests concernés utilisent maintenant Team Sample.

Les planches Team Sample et toutes les planches actives de carte/combat sont conservées. Les 89 profils, leurs évolutions et leurs ressources actives restent présents. L'esquive cohérente du Pillard était déjà manquante : aucune nouvelle animation n'est inventée et aucun sprite d'un autre personnage n'est substitué.

## Fiche du Pillard masculin hache-bouclier

Fichiers dans `docs/references/pillard-masculin-hache-bouclier.{png,pdf,html,json}` : une fiche visuelle, un PDF, une version autonome HTML et un manifeste des sources/cellules. Ils restent de la documentation ; le jeu ne les charge pas.

La fiche réunit 40 poses référencées dans les séquences actives (certaines sont répétées), sans les versions historiques remplacées. Carte et combat sont séparés, chaque animation porte son nom, sa source et l'ordre de ses poses. Palette de jeu bleue pour présenter les différentes planches avec la même couleur d'équipe. Les originaux ne sont pas modifiés. Le damier indique la transparence et ne fait pas partie des sprites.

À fournir : une esquive cohérente, idéalement avec départ, retrait et retour. Facultatif : critique distinct de l'attaque et chute animée plus progressive. Les quatre poses de marche de combat et les trois poses référencées de dégâts figurent maintenant dans la fiche.

La fiche n'est pas un atlas directement importable. Pour refaire un personnage, conserver une seule identité et les mêmes proportions sur l'ensemble des animations, avec assez de marge autour de l'arme. Fournir les PNG originaux transparents, la grille, l'ordre des poses et les gestes propres à la classe (soins, bannière, transformation, etc.).

Régénération avec le serveur Vite actif sur 5173 : `node scripts/export-character-reference.mjs`.

## Vérifications

- `npm test` : 42 tests visuels et 149 tests systèmes réussis.
- Deux tests historiques directement concernés par le changement de source, rejoués séparément : réussis.
- Parcours navigateur complet des introductions des deux factions : réussi.
- Builds public et prototype : réussis.
- Contrôle visuel de la fiche exportée ; aucune pose vide, fichier autonome sans ressource réseau nécessaire.

Un lancement exploratoire des suites historiques complètes `phase1.test.ts` et `team-colors.test.ts`, qui ne font pas partie de `npm test`, a également révélé des assertions devenues obsolètes sur la carte, les factions identiques et d'anciens comportements. Ces suites anciennes ne sont pas déclarées entièrement validées ; seuls les deux tests de ressources touchés ont été adaptés et rejoués. Les mécaniques actuelles n'ont pas été modifiées pour satisfaire leurs anciennes attentes.
