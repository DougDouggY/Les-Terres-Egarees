# Chapitre II — Essai de village à l’échelle des rues

## Version actuelle — 26 novembre 2026

La vue régionale avec un village miniature de 3 × 3 cases est remplacée par une **carte de 32 × 26 cases à échelle rapprochée**. Une case représente désormais un buisson, un puits, une caisse ou un petit élément du village. Cinq maisons individuelles sont disposées autour de rues et d’une petite place. Des jardins, tonneaux et quelques arbres complètent le décor ; un cours d’eau longe le bord est. Il n’y a ni montagnes, ni bosquets miniatures, ni enceinte extérieure, ni étiquettes dessinées sur le terrain.

Les quatre modèles de maison occupent chacun **5 × 5 cases entières**, avec une porte au centre de la façade sud. Les mêmes textures et proportions sont utilisées par les différents modèles. Les bâtiments ne dépassent pas leur emprise ; il ne s’agit pas de l’ancien village miniature agrandi.

## Essai des maisons

Dans **Carte du chapitre 2**, toucher une case d’une maison fait apparaître **Ouvrir la porte**. La porte s’ouvre, le toit est masqué et un petit intérieur de démonstration devient visible. Les cases intérieures sont alors praticables depuis la rue en passant par la porte. Les murs et la caisse intérieure restent bloquants. **Fermer la porte** restaure le bâtiment initial.

Ce sont des intérieurs de démonstration : ils servent à vérifier le cadrage, le découpage des cases et l’accès. Ils ne contiennent ni habitant, ni récompense, ni dialogue, ni règle de recrutement. Il n’y a pas encore d’armée ou de bataille associée. L’ouverture est une commande libre d’inspection de l’aperçu, pas une action de combat. Elle n’est pas enregistrée dans la campagne.

## Ressources

`public/assets/kingdom-camp/streets-tileset.png` est un nouveau tileset de **2560 × 768 pixels**, soit 20 colonnes et 6 lignes de cellules natives de 128 pixels, pour des cases de jeu de 32 pixels.

- Quatre maisons : quatre blocs de 5 × 5 cellules aux colonnes 0, 5, 10 et 15, ligne 0.
- Neuf éléments de décor, ligne 5 : buisson, puits, caisse, tonneau, arbre, potager, plancher, chemin et clôture basse.
- Le décor possède une vraie transparence. Les textures de sol remplissent leur case.
- Un buisson, un puits, une caisse et un tonneau occupent chacun une case ; un arbre occupe 2 × 2 cases. Les portes occupent chacune une case.

Les nouvelles images ont été générées à partir de l’atlas du prologue pour conserver les tons et le traitement peint des matériaux. Le fond blanc de la première planche d’accessoires a été retiré par l’outil de génération avant l’assemblage. L’assemblage ne repeint pas les illustrations et conserve leurs proportions.

`src/data/village-tileset.ts` décrit les cadres. Commande de réexport : `node scripts/build-village-tileset.mjs MAISONS.png ACCESSOIRES.png`.

Sources conservées séparément dans l’espace de travail :

- Maisons : `/workspace/generated_images/exec-4171cffd-a124-4575-98c5-e29f755b4d56.png`.
- Accessoires transparents : `/workspace/generated_images/exec-4fbe6dce-6d04-4c4c-8ff5-adef99239ae6.png`.

Les anciennes ressources restent disponibles pour comparaison, mais le village régional et les anciennes montagnes ne sont plus chargés dans cet aperçu.

## Accès et commandes

Accueil → **Carte du chapitre 2**, ou accès à la carte depuis le bilan de l’introduction. L’identifiant interne `kingdom-camp` est conservé.

Zoom initial ×2 sur la maison commune ; molette ou pincement, glissement souris/doigt, boutons +/−, vue entière et grille facultative. Le numéro de case et la possibilité de passage restent affichés après sélection. Un redimensionnement conserve le zoom choisi.

L’aperçu ne lit ni n’écrit les sauvegardes et ne crée aucune unité. En le quittant, la carte active précédente est restaurée. Les scènes, statistiques, mécaniques de combat et sprites des personnages ne sont pas modifiés.

## Vérifications

**243 tests automatisés réussis**, dont : coordonnées et emprises entières, cinq maisons sans chevauchement, accessoires hors des bâtiments, accès aux cinq façades, ouverture et fermeture indépendantes, entrée obligatoire par la porte, mobilier bloquant, restauration exacte des anciennes cartes, fermeture des maisons à la réouverture de l’aperçu, dimensions PNG réelles et cadres du tileset.

Quatre parcours navigateur : zoom molette et tactile, pincement sans agrandir la page web, glissement, conservation du zoom après redimensionnement, transparence effective du PNG, ouverture/fermeture du toit, sélection d’une case intérieure et chemin depuis l’arrivée, affichage sur téléphone et ordinateur, accès depuis les deux branches narratives et retour au bilan sans modifier les sauvegardes. Compilation et contrôle des ressources effectués.

## Fichiers de cette reprise

- `src/data/kingdom-camp-map.ts` : nouvelle disposition et géométrie des portes/intérieurs.
- `src/data/village-tileset.ts` : découpage des nouvelles ressources.
- `src/ui/kingdom-camp-renderer.ts`, `src/ui/kingdom-camp.ts` : dessin à l’échelle rapprochée et ouverture des maisons.
- `public/assets/kingdom-camp/streets-tileset.png`, `scripts/build-village-tileset.mjs` : atlas et assemblage.
- `tests/camp-preview.spec.ts`, `tests/chapter2-integration.test.ts` : vérifications.
