# Accueil et versions publiées — 26 novembre 2026

Le bouton **Carte du chapitre 2** conserve son accès direct au village rapproché. Aucun bouton supplémentaire de navigation n’a été ajouté et **Tester chapitre 2** conserve les dialogues demandés depuis la victoire du chapitre I.

## Diagnostic

Le workflow GitHub Pages de `c29ff78` (run `45852592535`) était terminé avec succès. La session du joueur n’a pas été inspectée : la cause exacte de son ancienne vue reste donc non confirmée. Une page restée ouverte peut conserver les anciens modules. Le code n’affichait pas de retour pendant certains imports et laissait leurs erreurs non prises en charge.

L’essai temporaire fonctionne depuis une ouverture fraîche. Les essais ont également été exécutés sur les fichiers compilés et sous le chemin `/Les-Terres-Egarees/`, plutôt que seulement sur Vite en développement.

## Corrections

- Chargement visible sur le bouton utilisé et blocage des clics concurrents pendant son ouverture.
- Gestion des échecs des imports des aperçus : message lisible, boutons réactivés, possibilité d’actualiser.
- Pas d’empilement des fenêtres « Tester chapitre 2 » sur des clics répétés.
- Réinitialisation des verrous de présentation au retour à l’accueil.
- Indication visible « Aperçu actuel : rues du village · cinq maisons ».
- `release.json` généré lors de la compilation avec la révision réellement compilée. Vérification au chargement, au retour dans l’onglet et périodiquement, sans cache de requête.
- Signalement des nouvelles publications et prise en charge des erreurs `vite:preloadError`. L’actualisation utilise une nouvelle URL de document ; elle ne touche pas aux sauvegardes.
- Aucune actualisation automatique pendant une partie non sauvegardée : retour à l’accueil demandé avant le rechargement.

Une page antérieure à cette correction doit être rechargée une fois avec le lien de la nouvelle version : elle ne peut pas exécuter une détection qu’elle ne contenait pas encore.

## Vérifications

- **243 tests automatisés réussis**.
- **Six parcours navigateur sur la compilation publiée** : carte actuelle et essai temporaire ouverts plusieurs fois sur ordinateur/téléphone ; chargement ralenti ; module indisponible puis actualisation ; nouvelle publication ; protection d’une partie non sauvegardée.
- **Deux parcours de l’essai tactique existant réussis** : entrée, changement de faction, recommencement, sauvegarde, rechargement et retour sur ordinateur/téléphone.
- Compilation du prototype et contrôle des ressources réussis.

Reproduction : `npm test`, `npx playwright test --config=playwright.launcher.config.ts`, `npx playwright test --config=playwright.unit-review.config.ts -g 'entrée, camps'`, `npm run check:prototype`.

## Fichiers

`src/main.ts`, `src/style.css`, `src/ui/release-updates.ts`, `vite.config.ts`, `playwright.launcher.config.ts`, `tests/launcher-release.spec.ts`, `tests/unit-review.spec.ts` et ce document. Les données de la carte, du scénario et du combat ne changent pas.
