# Corrections ciblées des deux cartes

Aucune modification de `src/data/tactical-plans.json`, des dimensions, des
collisions ou des systèmes de déplacement, de portes et de révélation des toits.
Les images du tileset sont réutilisées sans nouvelle génération d'assets.

## Château

- `wallJunction` distingue les croisements, les T, les angles et les terminaisons.
  La continuité verticale prend priorité : la façade horizontale ne traverse
  pas sa case. Les joints nord et sud sont traités différemment.
- Les portes carrées trouvent leur orientation à partir des murs voisins.
  Les ouvertures verticales montrent une tranche basse et un bord supérieur,
  dans les cases murales adjacentes, sans ajouter de jambage dans le passage.
  Les ouvertures horizontales gardent leurs terminaisons latérales propres.
- Les marches d'entrée sont composées sur les 6 × 2 cases d'escalier du JSON
  avec la pierre du mur, sans cadre ou poteaux rapportés et sans étirer un sprite.
- Seul le rendu du tapis du trône pivote : le centre reste `(33, 8)`, le rectangle
  visuel devient `(29, 7, 8, 2)`. Cela amène son extrémité vers le trône.
  L'objet JSON `(32, 4, 2, 8)` est inchangé, de même que la navigation (sol libre).

## Abordage

- Le bastingage passe visuellement d'un quart à une demi-case, à l'intérieur
  de la même case infranchissable. Les ouvertures de passerelles ne changent pas.
- Les grilles de cale répètent une maille du sprite métallique existant sur
  les tiers de cases, avec un cadre assemblé dans leur rectangle de 3 × 3 cases.
- Les deux mâts complets utilisent le même disque de bois circulaire que les
  demi-mâts de bordure. Même image source, même échelle, aucune ellipse.
- Les obstacles d'une case sont dessinés à la taille de leur case, sans les
  anciens retraits. Les deux zones de stockage de 2 × 2 cases déjà bloquées
  accueillent chacune trois caisses d'une case et un tonneau. Cela ajoute
  quatre caisses et deux tonneaux visibles sans étendre aucune collision ni
  bloquer de chemin supplémentaire. Le JSON reste inchangé.

## Vérification et captures

- `npm test` : 145 tests (les 141 existants et 4 nouveaux tests de géométrie).
- `node scripts/map-studies-audit.mjs` : parcours réel dans Chromium,
  captures des zones corrigées à 300 %, portes/toits, déplacements, deux
  passerelles, obstacles, eau sous les planches, zoom, caméra et sauvegardes.
- L'audit compare le bas d'un mât complet au demi-mât supérieur : pixels
  identiques. Il vérifie aussi l'élargissement du bastingage et la mer restante.
- `npm run build`, `npm run check:public`, build prototype et contrôle prototype.
- `cmp` avec le fichier JSON fourni : identique.

Les captures sont dans `artifacts/map-plans/correction-*.png` et sont copiées
pour publication dans `public/validation/cartes/`. La page statique associée
est consultable à `/Les-Terres-Egarees/validation/cartes/` après déploiement.
L'accès interactif reste **Tests de combat → Explorer les deux cartes**.

Fichiers des corrections : `src/rendering/plan-geometry.ts`,
`src/rendering/plan-renderer.ts`, `tests/plan-graphics.test.ts`,
`scripts/map-studies-audit.mjs`, `package.json` (ajout des tests),
`src/dev/test-hub.ts` (lien vers captures) et la page de captures ci-dessus.
