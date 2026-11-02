# Validation exécutée

- Installation verrouillée : `npm ci --offline --cache /workspace/.npm-cache --no-audit --no-fund`, réussie.
- `npm run build` : TypeScript et compilation Vite réussis.
- `npm test` : 23 tests, aucun échec ni test ignoré.
- Missions simulées en respectant visibilité, déplacements et IA :

| Factions              | Activations jusqu’à la victoire | Survivants |
| --------------------- | ------------------------------: | ---------: |
| Viking / Viking       |                              51 |          4 |
| Viking / Chevalier    |                              54 |          4 |
| Chevalier / Viking    |                              45 |          4 |
| Chevalier / Chevalier |                              59 |          4 |

Les quatre variantes comprennent des frappes après la fusion des initiatives.

- `npm run test:e2e` : parcours navigateur réel de la mission, incluant un combat commun, le camp, la carte du monde, la sauvegarde et sa reprise.
- `node tests/ui-smoke.mjs` : quatre configurations contrôlées dans Chromium, avec Tab, observation côte à côte et deux caméras indépendantes. Aucune erreur JavaScript ou réponse HTTP en échec. Le serveur de développement doit déjà être lancé pour ce script.
- Version de production lancée avec `npm run preview`, puis parcourue dans Chromium depuis l’accueil jusqu’à la carte après les deux introductions : aucune erreur constatée. Ce serveur de vérification a été arrêté ensuite.

Le serveur de développement reste lancé sur le port 5173 dans la machine préparée. Les processus ne sont pas garantis de survivre à une restauration : les instructions de redémarrage sont enregistrées dans `start_skill`.

La configuration cloud a été enregistrée en brouillon (`install_script`, `start_skill`). Elle n’a pas été publiée automatiquement.
