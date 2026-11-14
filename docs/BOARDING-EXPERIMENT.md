# Abordage — nouveau set

Accès : **Tests de combat → Explorer les deux cartes → 04 · Abordage · Nouveau set**.

Le choix **03 · Abordage naval** conserve le plan et le rendu validés. La variante utilise une copie indépendante : navire normal en haut, navire fantôme en bas, tous deux orientés vers la droite. Les emprises des ponts validés, 18 × 34 cases, sont tournées dans une carte de **34 × 42 cases**. Le départ et les positions des accessoires sont adaptés à cette rotation.

## Passages et collisions

Sept passerelles d’une case de large traversent le bras d’eau de quatre cases. Elles se trouvent aux colonnes zéro **2, 4, 8, 13, 19, 25 et 30**, avec des intervalles non uniformes. Elles se prolongent sur les deux cellules de bord pour raccorder les ponts sans bastingage bloquant.

Les bords, les mâts, les caisses, les tonneaux et les braseros sont infranchissables. L’eau l’est également. Chaque case praticable appartient au même réseau de déplacement ; chacune des sept traversées est vérifiée séparément. Les accessoires sont adaptés à une case carrée, y compris les anciens objets de plusieurs cases, pour correspondre aux éléments du nouveau set.

## Ressources et grille

Les deux planches fournies sont conservées dans `public/assets/boarding-experiment/elements.png` et `tiles.png`. `props.png` est une planche transparente 4 × 4 adaptée à partir de leurs éléments : bords, mâts, cargaison, trappes et lumières.

- Les sols et passerelles prennent une découpe carrée centrée dans la ressource. Le rapport horizontal/vertical reste identique : aucune texture n’est étirée sur un rectangle.
- Les objets sont recadrés selon leurs pixels visibles et placés dans un canevas transparent de 96 × 96 pixels. Leurs proportions sont conservées : un mât reste haut et étroit dans sa case, une caisse reste carrée.
- Les bords se raccordent par une lisse continue, interrompue aux passerelles.
- Le navire normal conserve un plancher brun cohérent. Le navire fantôme utilise les planches froides du set, quelques variantes usées, des lanternes, des étoffes et des lueurs turquoise.
- L’eau reprend la texture raccordable validée.

Les images et le décor sont définis dans `src/rendering/boarding-experiment.ts` ; la géométrie et les collisions sont dans `src/data/boarding-experiment.ts`. Aucun fichier du plan validé n’est modifié.

## Utilisation

Zoom, déplacement de caméra, grille, collisions et info-bulle fonctionnent comme sur les autres cartes. La numérotation va de 1 à 1428, ligne par ligne avec **34 colonnes** dans cette variante. Le cadrage peut descendre à 25 % pour afficher toute la carte sur téléphone.

L’export `plan-abordage-fantome-34x42.png` mesure **3264 × 4032 pixels**, soit 96 × 96 pixels par case. Le bouton Réinitialiser replace le personnage au départ. Les sauvegardes de campagne restent indépendantes.

## Vérification

```sh
npm test
npx playwright test --config=playwright.boarding.config.ts
npx playwright test --config=playwright.castle.config.ts
npm run build:prototype -- --base=/Les-Terres-Egarees/
npm run check:prototype
```

Les tests vérifient les sept traversées, l’accessibilité de toutes les cellules praticables, les obstacles et l’eau, la conservation de l’ancien abordage, les déplacements dans le navigateur, les proportions des sprites, la transparence, le cadrage mobile et les dimensions de l’export.
