# Corrections ciblées des deux cartes

Le JSON fourni, les dimensions 42 × 34 et toutes les collisions sont conservés.
L’escalier d’entrée, les sols, la mer, les cales et les mâts validés sont conservés.

## Dernier retour visuel

- Au-dessus d’un passage dans un mur vertical, une façade complète remplace la
  tranche trop fine : même pierre et même couronnement que les murs horizontaux.
  Cela vaut pour les portes ouvertes/détruites et les passages sans porte.
- Les portes verticales, y compris les portes carrées, utilisent un dessin de
  profil distinct. Le trône est dessiné tourné à gauche. Ces deux variantes sont
  dans `public/assets/material-tests/directional-props.png` ; les autres textures
  restent celles du tileset validé.
- Correction de la régression des cloisons : dès qu’une pièce ou un couloir est
  découvert, ses murs adjacents restent visibles, même si la pièce de l’autre
  côté est encore fermée. Le toit reste sur le sol des pièces fermées et sur les
  coins sans face exposée. Les tests couvrent maintenant ces états intermédiaires.
- Les bastingages gardent leur largeur d’une case. Leur dessin compose une
  corniche supérieure continue en bois, un chanfrein éclairé, une ombre portée
  sous la corniche et une face verticale en planches cerclée de fer. Le bois de
  bout ferme les extrémités aux passerelles. Les textures viennent des matériaux
  validés ; les collisions et les ouvertures de passerelles restent inchangées.
- Les grandes caisses restent des caisses uniques de 2 × 2 cases, sur leur
  empreinte d’origine, au lieu de quatre petits objets.
- L’atelier utilise un homme d’armes du catalogue réel du jeu, ses sprites de
  repos et de marche et le même rendu que les unités du jeu. Clic ou flèches pour
  se déplacer, sans ennemis et sans modification des sauvegardes de campagne.

Le tapis horizontal conserve son centre prévu `(33, 8)` et son rectangle visuel
`(29, 7, 8, 2)` ; l’objet JSON d’origine reste inchangé.

## Vérification et captures

- `npm test` : 147 tests, dont les régressions de coins de toiture et de passages
  permanents sans porte.
- `node scripts/map-studies-audit.mjs` : parcours réel dans Chromium, personnage
  dans les deux cartes, sept portes, toits opaques, deux passerelles, obstacles,
  mer sous les planches, zoom, caméra, exports PNG et sauvegardes préservées.
- `npm run build`, `npm run check:public`, compilation du prototype et contrôle
  du prototype. Vérification supplémentaire du prototype compilé dans Chromium.
- Comparaison du JSON au fichier fourni : identique.

Les huit captures initiales sont actualisées. Trois vues supplémentaires montrent
les portes de profil/toits fermés, la réserve et le personnage. Elles sont dans
`artifacts/map-plans/correction-*.png`, copiées dans `public/validation/cartes/`.

Site : https://dougdouggy.github.io/Les-Terres-Egarees/

Accès interactif : **Tests de combat → Explorer les deux cartes**.
Captures : `/Les-Terres-Egarees/validation/cartes/`.

## Révision du 14 novembre 2026 — en attente de retour graphique

Les repères des trois captures ont été reportés sur le raster d’origine, avec
coordonnées à partir de zéro : `(20,0)`, `(9,4)`, `(20,4)`, `(27,14)`,
`(38,14)`, `(4,24)`, `(9,24)`, `(14,26)`, `(27,26)`. Le dessus de pierre
vient du même matériau que les murs latéraux, sans façade verticale ajoutée.
Les raccords intérieurs apparaissent lorsque leur diagonale est découverte ;
les sols des pièces voisines restent couverts. La logique de révélation et la
correction des cloisons de `4c5e2a7` sont conservées.

Les portes de face ont un panneau abaissé dans leur empreinte, un linteau et
deux montants. Les portes latérales ne réutilisent plus un panneau frontal :
un demi-couronnement occupe le côté de la salle cachée, avec sol sur l’autre
moitié et une poignée discrète. L’ouverture/destruction retire la poignée ;
les terminaisons existantes des murs ferment les extrémités du passage.

Seuls le plancher et les bastingages du navire droit sont délavés : transformation
des couleurs des textures existantes, sans nouvelle image générée. Quatre petites
brèches décoratives sont à `(26,3)`, `(37,11)`, `(25,26)`, `(37,30)`, hors des
passerelles. Les mâts, caisses, cales, formes, collisions et chemins restent
conservés. Le navire gauche, la mer et les passerelles restent identiques au pixel.

Validation : 148 tests de logique ; compilations standard et prototype ; contrôles
public/prototype ; audit Chromium avec le personnage sur les deux cartes et
captures de plusieurs étapes intermédiaires. L’audit compare les neuf raccords
au matériau attendu à chaque ouverture et vérifie les pixels préservés sur
le navire gauche, la mer et les passerelles. Le JSON original est inchangé.

Captures réelles : `public/validation/cartes/revision-*.png`, accessibles depuis
la page `validation/cartes/?v=20261114-c1`. Leur présence ne constitue pas une
validation graphique par l’utilisateur.

## Retour suivant — façades et retour du navire d’origine

- Au raccord `(9,24)`, l’ouverture de l’armurerie remplace le dessus plat par
  une façade horizontale, même lorsque la salle des gardes reste couverte.
- Les façades sud donnant sur l’herbe gagnent une case de hauteur visuelle,
  sous leur contour existant : débord de l’armurerie, côtés de l’entrée,
  façades basses des deux ailes et débord nord-est. Les marches restent libres.
  Les angles suivent les contours existants. Aucun changement du JSON, des
  collisions, des déplacements ou des dimensions.
- Le vieillissement et les brèches du bateau sont retirés. Une comparaison
  Chromium avec le moteur du commit `4c5e2a7` confirme que la carte d’abordage
  entière est identique au pixel près (ponts, passerelles, accessoires compris).
- 149 tests de logique, compilations et contrôles public/prototype, parcours
  interactif des deux cartes et captures de l’armurerie et des façades.

Captures actualisées : `validation/cartes/?v=20261114-c2`. Aucun changement
supplémentaire de direction graphique ; résultat en attente du retour utilisateur.
