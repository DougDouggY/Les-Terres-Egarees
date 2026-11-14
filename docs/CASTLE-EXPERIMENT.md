# Variante de test du château — nouveau set

Accès : **Tests de combat → Explorer les deux cartes → 02 · Château · Nouveau set EC**.

Trois choix directs sont disponibles : château validé, château Nouveau set EC et abordage naval. La version validée reste le choix initial. Les deux décors emploient le même plan, les mêmes objets, les mêmes collisions, les mêmes portes et le même état d’exploration. L’abordage reste inchangé. Aucun changement de campagne.

**Tout révéler (aperçu)** ouvre les sept portes afin d’inspecter les pièces. **Réinitialiser** referme les portes et rétablit les toits. Chaque sélection de carte démarre son aperçu avec les portes fermées. L’export PNG inclut le décor sélectionné dans son nom de fichier.

## Ressources

`public/assets/castle-experiment/` conserve les planches issues du ZIP : murs, ouvertures, sols et objets, ainsi que les portes détourées de face (2 et 3 cases), la porte de côté et l’atlas des portes. Les recadrages utilisés sont définis dans `src/rendering/castle-experiment.ts`.

- La porte de côté utilise directement `door-side.png` : trois quarts de pierre, un quart de bois, avec miroir corrigé selon le côté caché. La porte de trois cases reste disponible dans le set ; aucun accès du plan actuel n’est élargi pour l’utiliser.
- Les murs de face alternent des variantes simples. Les fenêtres sont uniquement sur le mur nord (ligne du haut). Deux bannières rouges déchirées encadrent l’entrée sur les façades hautes ; aucune autre bannière extérieure. Deux bannières intérieures sont placées symétriquement. Les façades hautes emploient les illustrations de deux cases de haut, sans piliers sur leurs grandes longueurs. Le premier et le quatrième modèle dominent, le troisième apparaît rarement, le deuxième est exclu.
- Les murs immédiatement à gauche des portes de face ont le pilier à droite ; ceux à droite ont le pilier à gauche.
- Cantine : damier. Bibliothèque : plancher. Le reste réutilise le sol de pierre de la version validée. Le damier de la cantine alterne la couleur de départ de chaque case pour raccorder ses carrés horizontalement et verticalement.
- Chaque tapis choisit un motif parmi les trois, utilisé sur toute sa surface. Le rendu répète la trame intérieure sans les bordures de chaque case, avec une seule bordure autour du tapis complet. Tapis rouges continus, coffres, piliers et escaliers proviennent du nouveau set. `props-transparent.png` est une planche détourée à partir des éléments fournis, avec six coffres et les trois objets en grille 3 × 3. Le trône validé conserve sa ressource transparente existante.
- Les toitures progressives conservent leur couverture validée ; les murs de côté et leurs plafonds de pierre utilisent la nouvelle tuile.

## Validation

```sh
npm test
npx playwright test --config=playwright.castle.config.ts
npm run build:prototype -- --base=/Les-Terres-Egarees/
npm run check:prototype
```

Les tests navigateur vérifient la bascule et le retour au rendu validé, l’ouverture des portes, l’aperçu complet, la réinitialisation, l’export, la transparence des objets et l’utilisation sur téléphone. Ils ne modifient pas les captures suivies.

## Survol et corrections des ouvertures

Survoler le canevas affiche une petite info-bulle **Case N**. Les numéros vont de **1 à 1428**, de gauche à droite puis de haut en bas sur les trois cartes (42 × 34). Ils restent identiques avec le zoom, le déplacement de caméra et l’ouverture des pièces. Formule : `numéro = ligne × 42 + colonne + 1`, avec ligne et colonne comptées depuis zéro.

Le nouveau décor dessine son propre terrain et sa propre couche de toits. Il ne superpose plus une ancienne façade ou un ancien escalier sous les nouveaux éléments. Une zone fermée conserve sa toiture, y compris au-dessus des encadrements ; la révélation découvre les murs et les plafonds de pierre du nouveau set. Les angles utilisent également cette pierre. La partie inférieure des façades hautes reste identique avant et après l’ouverture d’une salle.

La case située juste au-dessus d’une ouverture latérale est une face de mur quand le passage est libre. Cela concerne aussi les passages sans porte du hall vers les couloirs : coordonnées zéro `(14,20)` et `(27,21)`, soit **cases 855 et 910**. Plus haut, le mur de côté conserve son plafond de pierre. Un passage fermé par une porte ne reçoit cette face qu’après ouverture.

Les régressions navigateur vérifient les pixels des toits fermés, des angles, des portes en miroir, des deux étages des façades, le raccord du damier et l’absence d’ancien décor sous les escaliers.
