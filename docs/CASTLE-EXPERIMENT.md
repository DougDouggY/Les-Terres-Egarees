# Variante de test du château — nouveau set

Accès : **Tests de combat → Explorer les deux cartes → 02 · Château · Nouveau set EC**.

Trois choix directs sont disponibles : château validé, château Nouveau set EC et abordage naval. La version validée reste le choix initial. Les deux décors emploient le même plan, les mêmes objets, les mêmes collisions, les mêmes portes et le même état d’exploration. L’abordage reste inchangé. Aucun changement de campagne.

**Tout révéler (aperçu)** ouvre les sept portes afin d’inspecter les pièces. **Réinitialiser** referme les portes et rétablit les toits. Chaque sélection de carte démarre son aperçu avec les portes fermées. L’export PNG inclut le décor sélectionné dans son nom de fichier.

## Ressources

`public/assets/castle-experiment/` conserve les planches issues du ZIP : murs, ouvertures, sols et objets, ainsi que les portes détourées de face (2 et 3 cases), la porte de côté et l’atlas des portes. Les recadrages utilisés sont définis dans `src/rendering/castle-experiment.ts`.

- La porte de côté utilise directement `door-side.png` : trois quarts de pierre, un quart de bois, avec miroir selon le côté caché. La porte de trois cases reste disponible dans le set ; aucun accès du plan actuel n’est élargi pour l’utiliser.
- Les murs de face alternent des variantes simples. Les fenêtres sont uniquement sur le mur nord (ligne du haut). Deux bannières rouges déchirées encadrent l’entrée sur les façades hautes ; aucune autre bannière extérieure. Deux bannières intérieures sont placées symétriquement. Les façades hautes emploient les illustrations de deux cases de haut, sans piliers sur leurs grandes longueurs.
- Les murs immédiatement à gauche des portes de face ont le pilier à droite ; ceux à droite ont le pilier à gauche.
- Cantine : damier. Bibliothèque : plancher. Les autres cases mélangent les neuf sols bleus de la planche (les quatre premiers en haut et les cinq du bas). Un tirage pseudoaléatoire par coordonnée garde la répartition stable lors de l’ouverture des portes.
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
