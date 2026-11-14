# Variante de test du château — nouveau set

Accès : **Tests de combat → Explorer les deux cartes → 02 · Château · Nouveau set EC**.

Trois choix directs sont disponibles : château validé, château Nouveau set EC et abordage naval. La version validée reste le choix initial. Les deux décors emploient le même plan architectural, les mêmes portes et la même progression d’exploration. La nouvelle variante possède en plus trois rayonnages de bibliothèque et quatre ensembles table-bancs, qui bloquent au total 34 cases ; ces objets et leurs collisions sont ajoutés sur une copie du plan et ne touchent pas au château validé. L’abordage reste inchangé. Aucun changement de campagne.

**Tout révéler (aperçu)** ouvre les sept portes afin d’inspecter les pièces. **Réinitialiser** referme les portes et rétablit les toits. Chaque sélection de carte démarre son aperçu avec les portes fermées. L’export PNG inclut le décor sélectionné dans son nom de fichier.

## Ressources

`public/assets/castle-experiment/` conserve les planches issues du ZIP : murs, ouvertures, sols et objets, ainsi que les portes détourées de face (2 et 3 cases), la porte de côté et l’atlas des portes. Les recadrages utilisés sont définis dans `src/rendering/castle-experiment.ts`.

- La porte de côté conserve le quart en bois de `door-side.png`, avec miroir corrigé selon le côté caché. Ses trois quarts en pierre utilisent exactement la texture et l’échelle du plafond voisin, par exemple la case 231. La porte de trois cases reste disponible dans le set ; aucun accès du plan actuel n’est élargi pour l’utiliser.
- Les murs de face alternent des variantes simples. Les fenêtres se trouvent sur le mur nord et sur les six cases extérieures explicitement demandées : 629, 1011, 1309, 1315, 1332 et 1339, avec le même modèle que la case 35. Deux bannières rouges déchirées encadrent l’entrée sur les façades hautes ; aucune autre bannière extérieure. Deux bannières intérieures sont placées symétriquement. Les façades hautes emploient les illustrations de deux cases de haut, sans piliers sur leurs grandes longueurs. Le premier et le quatrième modèle dominent, le troisième apparaît rarement, le deuxième est exclu.
- Les murs immédiatement à gauche des portes de face ont le pilier à droite ; ceux à droite ont le pilier à gauche.
- Cantine et bibliothèque : même plancher assombri. Le reste réutilise le sol de pierre de la version validée.
- Chaque tapis choisit un motif parmi les trois, utilisé sur toute sa surface. Le rendu répète la trame intérieure sans les bordures de chaque case, avec une seule bordure autour du tapis complet. Tapis rouges continus, coffres, piliers et escaliers proviennent du nouveau set. `props-transparent.png` est une planche détourée à partir des éléments fournis, avec six coffres et les trois objets en grille 3 × 3. Le château validé conserve son trône d’origine. Le nouveau set utilise `throne-top-down.png`, une proposition rouge et or vue verticalement, orientée vers le tapis et la porte à gauche.
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

Le nouveau décor dessine son propre terrain et sa propre couche de toits. Il ne superpose plus une ancienne façade ou un ancien escalier sous les nouveaux éléments. Les zones intérieures fermées conservent leur toiture. Le périmètre extérieur laisse visibles les plafonds de pierre et les façades hautes, sauf trois bordures qui restent sous toiture jusqu’à la découverte de leur pièce : première ligne (1–42), colonne gauche jusqu’à 967 et colonne droite de 42 à 588. Après l’entrée, les cases 178, 589 et 616 sont explicitement des plafonds, dont l’exception 589 sur la bordure gauche. Les cases 21 et 1018 restent couvertes d’un toit tant que leur secteur est caché. Les cases 1013, 1107, 1120, 627, 879 et 1047 utilisent explicitement un plafond de pierre. La case 757 utilise cette pierre une fois sa portion de bordure révélée. Les toits sont opaques pour empêcher le décor dessous de transparaître. La partie inférieure des façades hautes reste identique avant et après l’ouverture d’une salle.

La case située juste au-dessus d’une ouverture latérale est une face de mur quand le passage est libre. Cela concerne aussi les passages sans porte du hall vers les couloirs : coordonnées zéro `(14,20)` et `(27,21)`, soit **cases 855 et 910**. Plus haut, le mur de côté conserve son plafond de pierre. Un passage fermé par une porte ne reçoit cette face qu’après ouverture.

Les régressions navigateur vérifient les pixels des toits fermés, des angles, des portes en miroir, des deux étages des façades, le raccord du damier et l’absence d’ancien décor sous les escaliers.

## Bibliothèque, tapis et escalier

Deux rayonnages en chêne clair occupent chacun 3 × 2 cases aux coordonnées zéro `(30,25)` et `(30,28)`. La ligne 27 conserve un passage entre les deux. Un troisième rayonnage de 2 × 3 cases est placé à droite, en `(36,27)`, tourné vers l’intérieur. `bookcase-light.png` possède un fond transparent qui laisse voir les planches autour du meuble. Les 18 cellules sont infranchissables, avec des passages autour et entre les rangées.

Quatre tables en bois clair avec leurs bancs intégrés sont placées dans la cantine, en `(2,3)`, `(2,7)`, `(2,11)` et `(2,15)`. Chaque ensemble utilise `table-benches.png` et occupe exactement 4 × 1 cases, bancs compris. Les 16 cellules sont infranchissables. Ces meubles sont ajoutés uniquement sur la copie de plan du nouveau set.

Le tapis de la salle du trône rejoint désormais le seuil de la porte actuelle. La porte n’est pas agrandie et la case **399** reste inchangée.

Le fond complet de l’escalier extérieur utilise la partie basse en pierres nues du premier mur haut, avant la pose de l’escalier transparent. Il ne dépend ni de l’ancien décor ni du sol extérieur.

## Coffres : commandes d’aperçu

Le panneau **Coffres · avant / après** apparaît avec le nouveau set. Chaque coffre révélé dispose d’un bouton **Ouvrir / Fermer** ; les boutons natifs fonctionnent aussi au clavier. Cliquer directement sur un coffre visible bascule également son état. **Ouvrir les coffres visibles** et **Tout refermer** permettent une comparaison globale. Les versions fermée et ouverte conservent le même type de coffre, la même position et les mêmes collisions.

La sélection d’une carte ou **Réinitialiser** referme les coffres. L’état visuel reste propre à cet aperçu et apparaît dans l’export PNG. Les tests vérifient les boutons, le clavier, le clic sur la carte, le retour exact à l’image fermée et l’indépendance des sauvegardes de campagne.
