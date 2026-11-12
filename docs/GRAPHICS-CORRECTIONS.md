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
