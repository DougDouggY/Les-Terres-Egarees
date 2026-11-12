# Cartes complètes : château et abordage

## Accès

Branche : `work`. Dans la version de développement ou prototype :
**Tests de combat → Explorer les deux cartes**.

L'atelier propose les deux cartes de **42 × 34 cases** avec zoom, déplacement de
caméra, grille, collisions, déplacement d'un repère, commandes de portes et export
PNG. Les mini-tests artistiques restent accessibles séparément via
**Tester les textures assemblées**. Aucun accès à une campagne ni à ses
sauvegardes n'est nécessaire. Aucun ennemi, combat scénarisé ou dialogue n'est
ajouté ; ces cartes ne sont pas insérées dans la progression narrative ici.

## Plan et positions

`src/data/tactical-plans.json` reste une copie identique au fichier fourni.
La grille fixe les sols et les murs ; conformément à l'arbitrage confirmé par
l'auteur, `objects` a priorité pour les portes, les objets et les tapis.

Cela conserve notamment la porte d'armurerie `(9, 21)`, la porte du trône sur
3 cases `(20, 6–8)`, le trône de 2 × 3 cases et les deux tapis d'objet. Aucun
ancien tapis généré du raster n'est réintroduit. Les tapis restent praticables,
avec un coût de 1 ; les objets solides qui les chevauchent restent des obstacles.
La cantine est un seul espace en L, sans cloison ajoutée à la jonction.

Les navires occupent les rectangles `(1, 0, 18, 34)` et `(23, 0, 18, 34)`.
Les deux espaces de passerelle sont exactement `(19, 6, 4, 3)` et
`(19, 24, 4, 3)`. Les planches se prolongent graphiquement sur les cases de bord
et une case de pont pleine de chaque navire pour assurer leur ancrage. Les
objets et les cases de collision du JSON ne sont pas déplacés.

## Textures validées et rendu

Les cartes complètes utilisent les mêmes atlas illustrés que les mini-tests :
sol bleu, piliers blancs, murs horizontaux avec face visible, murs latéraux en
pierre claire pleine, pont adouci, mer aux bords fondus, barrières fines en relief
et planches épaisses. Le rendu procédural de la première tentative n'est plus
utilisé par les cartes complètes.

Les coordonnées logiques et la navigation restent sur une grille de **32 unités**.
Le décor conserve **96 texels par case**, comme l'échantillon validé : l'export
natif est **4032 × 3264**, et le zoom à 300 % permet d'examiner cette résolution
sans lissage. Les vues d'ensemble exportées par l'audit mesurent 1344 × 1088.
Il ne s'agit pas d'un fond de carte fixe : chaque matériau, mur et objet est
composé suivant la grille et les rectangles du plan.

Les mêmes rectangles sources sont partagés avec les mini-tests. La barrière est
rasterisée une fois à résolution native pour éviter des variations d'une colonne
de texels entre les coordonnées de grandes et petites cartes. Les tapis longs
utilisent des bordures et motifs composés, afin d'éviter d'étirer une petite
image de tapis en hauteur. Le trône reprend la direction artistique validée.

L'herbe et le chemin reprennent `public/assets/regional-tiles.png`. Les escaliers,
coffres, piliers, trône, caisses, tonneaux, mâts et écoutilles sont placés aux
positions des objets JSON. Les demi-mâts utilisent un disque de bois circulaire,
de largeur et hauteur identiques, coupé par les limites haute ou basse du canvas.
Aucune voile ni proue/poupe n'est ajoutée.

## Toits et portes

Le château démarre entièrement couvert, sans consulter les anciens `room.open`.
Seuls l'extérieur et la porte principale accessible sont visibles. La couche de
toit est opaque et masque tous les éléments situés dessous.

Utiliser **Clé** ou **Détruire** dans le panneau des portes, ou cliquer une porte
pour retrouver son accès. Ouvrir révèle les espaces reliés par des passages
libres, sans franchir un mur ni une autre porte fermée. Le hall et les couloirs
se découvrent ensemble. Les salles fermées, dont le trône, restent couvertes.
Les régions découvertes restent découvertes jusqu'à Réinitialiser.

Une porte ouverte ne dessine plus aucun battant, jambage ni bande de pierre
supplémentaire. Une porte encore fermée reste visible à la limite d'un espace
accessible, sans dévoiler la salle derrière. Les murs restent sur des cases
entières ; aucun mur n'est inventé entre deux cases et aucune arche n'est ajoutée.

## Bastingages et passerelles

Sur chaque bord de pont, la barrière occupe le quart de case côté bateau et la
mer les trois quarts côté eau. Les bords sont retournés selon leur côté pour
rester orientés vers le pont. La case entière demeure infranchissable. Le
bastingage est interrompu uniquement aux rangées des deux passerelles.

Sous les planches, le fond garde la mer dans la totalité de l'espace suspendu,
y compris les trois quarts des cases de bord. Seules les parties reposant sur
le pont ont du bois dessous. Les obstacles solides bloquent leur empreinte et
les deux passerelles restent franchissables sur leurs trois rangées.

## Vérifications exécutées

```sh
npm test
npm run build
npm run check:public
npm run build:prototype -- --base=/Les-Terres-Egarees/ --outDir dist-prototype
node scripts/check-public.mjs --prototype --dir=dist-prototype
# Serveur dev actif ; Chromium disponible à /usr/bin/chromium.
node scripts/map-studies-audit.mjs
node scripts/material-tests-audit.mjs
```

- **141 tests réussis** : 133 tests existants et 8 tests des plans/topologie.
- Audit Chromium des cartes : sept portes, clés/destruction, révélation,
  réinitialisation, trajets château, traversée des deux passerelles, obstacles,
  bastingages/eau, zoom, caméra, aides, exports et retour au menu.
- Comparaison exacte des pixels d'échantillons de sol, mur latéral, pont, mer et
  bastingage entre mini-tests et cartes complètes, à la même densité de texture.
- Comparaison de toutes les portions de mer sous les passerelles à la texture
  attendue, en retirant les planches dans une image de test uniquement.
- Opacité réelle du toit : des repères magenta peints sous les cases couvertes
  restent entièrement masqués par la couche de toiture.
- Audit des mini-tests conservés, stockage de campagne intact et aucune erreur
  JavaScript navigateur observée.
- Build public et prototype réussis, contrôle d'exclusion des outils en public.
  Avertissement Vite existant sur la taille des bundles conservé.
- Vérification navigateur du build prototype sous `/Les-Terres-Egarees/` :
  atelier complet, porte principale, navire et tous les assets chargés, sans 404.

Les suites navigateur complètes de campagne n'ont pas été relancées. Les cartes
et assets du prologue et du chapitre 1 ne sont pas modifiés.

## Fichiers de l'application finale des textures

- `src/rendering/plan-renderer.ts` : composition des deux cartes complètes.
- `src/dev/material-renderer.ts` : rectangles sources et barrière partagés.
- `src/dev/map-workshop.ts` : affichage logique, zoom et export détaillé.
- `src/dev/test-hub.ts` : accès aux cartes complètes.
- `public/assets/material-tests/plan-props.png`, `ship-details.png` : trône,
  disque de demi-mât et détails d'écoutilles ; les autres atlas validés sont réutilisés.
- `scripts/map-studies-audit.mjs`, `scripts/material-tests-audit.mjs` : contrôles,
  captures et vues d'ensemble.
- `artifacts/map-plans/` : château couvert, entrée ouverte, intérieur découvert,
  navire, vues d'ensemble et captures de l'atelier.
- `docs/MAP-STUDIES.md` : cette documentation.

Le JSON, les positions, les données de collision et les règles de révélation
établies précédemment restent inchangés. Les anciens petits essais 15 × 12 et
20 × 15 restent dans `artifacts/map-studies/` à titre historique. Le vieux PNG
`reusable-tileset-32px.png` de cette première tentative ne représente pas le
rendu actuel et n'est plus généré par l'audit.

Les changements sont locaux à cet environnement. Aucun commit, push ou
déploiement GitHub Pages n'est effectué.

## Correction de la vue couverte

La toiture complète présente désormais des pans ombrés et des faîtages par aile,
avec les faces de pierre extérieures visibles sous les ardoises. Les contours
et positions viennent toujours du plan ; la révélation reste calculée sur la
même topologie. Les pixels couverts restent opaques. L'audit des cartes et les
compilations publique/prototype ont été relancés avec succès après cette correction.
