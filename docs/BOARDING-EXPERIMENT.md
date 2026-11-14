# Abordage — nouveau set

Accès : **Tests de combat → Explorer les deux cartes → 04 · Abordage · Nouveau set**.

Le choix **03 · Abordage naval** conserve le plan et le rendu validés. La variante utilise une copie indépendante : navire normal en haut, navire fantôme en bas, tous deux orientés vers la droite. Les ponts mesurent **34 × 12 cases**, soit un tiers de largeur en moins, dans une carte de **34 × 30 cases**. Ils continuent hors cadre à gauche et à droite : aucune proue ni poupe n’est visible.

## Passages et collisions

Sept passerelles d’une case de large traversent le bras d’eau de quatre cases. Elles se trouvent aux colonnes zéro **2, 4, 8, 13, 19, 25 et 30**, avec des intervalles non uniformes. Elles se prolongent sur les deux cellules de bord pour raccorder les ponts sans bastingage bloquant. Chaque traversée est dessinée comme une seule longue planche fantomatique sans clous (`plank.png`), sur fond transparent, dans une emprise de 1 × 6 cases. Les marges laissent voir l’eau et les ponts sous les extrémités, sans modifier les cases praticables. Le bois gris bleuté est assorti au navire fantôme, avec de petits trous transparents qui restent traversables et des ombres de contact limitées aux appuis sur les ponts.

Les bords, les mâts, les caisses, les tonneaux et les braseros sont infranchissables. L’eau l’est également. Chaque case praticable appartient au même réseau de déplacement ; chacune des sept traversées est vérifiée séparément. Chaque navire porte trois mâts centraux de 3 × 3 cases, bloqués sur toute leur emprise. Trappes métalliques et groupes de caisses et tonneaux habillent les planchers.

## Ressources et grille

Les deux planches fournies sont conservées dans `public/assets/boarding-experiment/elements.png` et `tiles.png`. `props.png` est une planche transparente 4 × 4 adaptée à partir de leurs éléments : bords, mâts, cargaison, trappes et lumières.

- Les sols et passerelles prennent une découpe carrée centrée dans la ressource. Le rapport horizontal/vertical reste identique : aucune texture n’est étirée sur un rectangle.
- Les objets sont recadrés selon leurs pixels visibles et placés dans un canevas transparent de 96 × 96 pixels. Leurs proportions sont conservées. Les grands mâts occupent une plateforme métallique carrée de 3 × 3 cases. Le fût reste dans les limites de la base : le sommet du premier mât est dans la case 178, sans recouvrir la case 144. Les anciens visuels restent conservés dans `structures.png`.
- `structures.png` fournit les plateformes de mâts, bastingages et caisses fantomatiques texturés dans le style du set, en atlas de 3 colonnes × 2 rangées. Les caisses du navire fantôme ont leur propre visuel aux fissures turquoise.
- `details.png` ajoute les hauts mâts, une variante de bastingages conservée, deux escaliers de renfort praticables par bateau, cordages et ancres. Sacs et cinq cases de planches trouées infranchissables sur le fantôme complètent les décors ; toutes les passerelles restent accessibles.
- Les bords sont des bastingages opaques en relief vus du dessus, raccordés au bord de l’eau et interrompus aux passerelles. Les quatre rangées gardent la même orientation : dessus élargi à 35 % en haut et face sur les 65 % restants, sans miroir vertical.
- Le navire normal conserve un plancher brun cohérent. Le navire fantôme utilise les planches froides du set, une surface uniforme et des lueurs turquoise.
- L’eau reprend la texture raccordable validée.

Les images et le décor sont définis dans `src/rendering/boarding-experiment.ts` ; la géométrie et les collisions sont dans `src/data/boarding-experiment.ts`. Aucun fichier du plan validé n’est modifié.

## Utilisation

Zoom, déplacement de caméra, grille, collisions et info-bulle fonctionnent comme sur les autres cartes. La numérotation va de 1 à 1020, ligne par ligne avec **34 colonnes** dans cette variante. Le cadrage peut descendre à 25 % pour afficher toute la carte sur téléphone.

L’export `plan-abordage-fantome-34x30.png` mesure **3264 × 2880 pixels**, soit 96 × 96 pixels par case. Le bouton Réinitialiser replace le personnage au départ. Les sauvegardes de campagne restent indépendantes.

## Vérification

```sh
npm test
npx playwright test --config=playwright.boarding.config.ts
npx playwright test --config=playwright.castle.config.ts
npm run build:prototype -- --base=/Les-Terres-Egarees/
npm run check:prototype
```

Les tests vérifient les sept traversées, l’accessibilité de toutes les cellules praticables, les obstacles et l’eau, la conservation de l’ancien abordage, les déplacements dans le navigateur, les proportions des sprites, la transparence, le cadrage mobile et les dimensions de l’export.
