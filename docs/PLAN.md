# Le Plan

Le menu principal donne accès à une bible narrative indépendante des campagnes, dans les versions publique et prototype. Il ne change aucun dialogue, événement, combat ou plan de carte.

Les textes initiaux complets sont dans `src/data/narrative-plan.json`. Chaque chapitre possède un identifiant stable, un titre, trois descriptions et un indicateur facultatif ; le chapitre 10.5 reste facultatif. Les noms affichés du prologue et du chapitre 1 conservent ceux du jeu. Les autres intitulés fournis sont conservés dans les notes générales.

Les modifications restent en brouillon quand on change de chapitre. **Enregistrer** sauvegarde tout le plan dans la clé locale `lte-narrative-plan-v1`, séparée de `lte-save`. **Annuler les modifications non enregistrées** revient à la dernière sauvegarde de tout le plan. **Réinitialiser ce chapitre** restaure seulement ce chapitre dans le brouillon ; il faut ensuite enregistrer. Les notes générales disposent de leur propre réinitialisation.

L’export inclut tout le brouillon, même ses modifications non enregistrées. Le JSON contient `version: 1`, `chapters` et `notes`. L’import vérifie la version, les identifiants uniques des 14 chapitres, les champs texte et le caractère facultatif du chapitre 10.5 avant de demander confirmation et d’enregistrer le remplacement. Un fichier invalide ou une erreur de stockage conserve le plan actuel. Aucun texte importé n’est interprété comme du HTML.

Le stockage du navigateur peut être effacé par ses réglages ; l’export JSON permet de conserver une copie indépendante ou de transférer le plan vers un autre appareil.

Validation dédiée ordinateur et téléphone :

```sh
npx playwright test --config=playwright.plan.config.ts
```

La configuration démarre Vite si nécessaire et utilise `/usr/bin/chromium`. Elle ne modifie aucune capture suivie du dépôt.
