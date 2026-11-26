# Chapitre II — Terrain naturel aux abords du village

## Version actuelle — 26 novembre 2026

Le camp rectangulaire a été remplacé, à la demande du joueur, par un terrain ouvert de **40 × 28 cases** : clairières, plusieurs bois irréguliers, un petit cours d’eau à l’ouest, trois groupes montagneux et un village en bois au nord-est. Il n’y a plus de baraquements, réserve, tours, enceinte extérieure ni enclos. Aucun nom de lieu n’est dessiné sur la carte.

Le village reste une image continue sur neuf cases, comme la ruine du prologue. Sa porte est sur la case centrale sud, avec trois cases praticables devant. Les huit autres cases sont bloquées. Les défenseurs doivent en sortir et le groupe y entrer après la victoire ; la bataille et ces séquences restent à définir. Aucun intérieur de maison ni recrutement n’a été ajouté.

## Accès et caméra

Accès par **Carte du chapitre 2** sur l’accueil, ou **Voir la carte du camp** au bilan de l’introduction du chapitre II (libellé de compatibilité). L’identifiant interne `kingdom-camp` est conservé.

L’aperçu utilise maintenant une caméra dans un canevas à la taille de la fenêtre, au lieu de redimensionner une grande image dans une zone défilante.

- Zoom initial ×2 sur le village : 64 pixels par case à l’écran.
- Molette, boutons +/− ou pincement à deux doigts ; limite haute ×6.
- Zoom autour du pointeur ou du centre du geste.
- Glissement à la souris ou au doigt pour déplacer la caméra ; le glissement ne sélectionne pas une case.
- **Vue entière** pour consulter l’ensemble ; **Voir le village** pour revenir à son approche en gros plan.
- Le redimensionnement de la fenêtre conserve le zoom choisi.
- Grille facultative. Le numéro de case reste disponible au survol et au toucher ; le calcul de chemin réutilise les coûts du moteur.

L’aperçu ne lit ni n’écrit les sauvegardes, ne crée aucune unité et restaure exactement la carte précédente à sa fermeture. Le prologue et son moteur de rendu protégé restent inchangés.

## Ressources

Le terrain, les arbres, l’eau et les montagnes reprennent les ressources régionales du prologue. Le village utilise l’illustration déjà intégrée.

`public/assets/kingdom-camp/tileset.png` : 8 colonnes et 7 lignes de cellules natives de 128 pixels, destinées à des cases de jeu de 32 pixels. Les quatre premières lignes reprennent les pixels de l’atlas du prologue. Le village occupe les colonnes 1 à 3 et les lignes 4 à 6, en coordonnées à partir de zéro. Les modules de palissade sont conservés dans cette ressource, mais ne sont plus dessinés sur la carte.

`src/data/camp-tileset.ts` décrit le découpage. `scripts/build-camp-tileset.mjs` réalise l’assemblage technique. Sources générées conservées séparément : `/workspace/generated_images/exec-4eb1dfb8-d33d-49fe-85ab-c1f9278c1ccc.png` (village) et `/workspace/generated_images/exec-76c6bae8-e3f9-43a8-9f7b-7844309a6e7b.png` (palissades).

## Vérifications

**242 tests automatisés réussis.** La grille est déterministe, les accès au village sont connectés, les neuf cases sont liées, le cours d’eau reste infranchissable sans bloquer la vue, les montagnes sont bloquantes et opaques. Aucune case de mur n’existe hors de l’emprise du village et aucune ancienne construction n’est conservée.

Quatre parcours navigateur couvrent la molette, le zoom ancré, le glissement souris, le pincement et le déplacement tactiles réels via Chromium, l’absence de zoom de la page web, la conservation du zoom après redimensionnement, les boutons, les cases bloquées/praticables, l’absence d’étiquettes, les deux introductions et le retour au bilan sans toucher aux sauvegardes. Compilation du prototype et contrôle des ressources effectués.

## Fichiers de cette correction

- `src/data/kingdom-camp-map.ts` : nouveau terrain naturel et suppression des anciennes constructions.
- `src/ui/kingdom-camp-renderer.ts` : paysage et village uniquement.
- `src/ui/kingdom-camp.ts`, `src/ui/kingdom-camp.css` : caméra, interactions et interface sans étiquettes.
- `tests/camp-preview.spec.ts`, `tests/chapter2-integration.test.ts` : gestes et contraintes du nouveau terrain.
