# Publication sur GitHub Pages

Le workflow `.github/workflows/pages.yml` compile et déploie le jeu à chaque push
sur `main`. Il peut aussi être lancé depuis l'onglet Actions (workflow_dispatch).
Le déploiement demande l'activation de Pages si elle n'a pas encore eu lieu.

Adresse attendue après un déploiement réussi :
https://dougdouggy.github.io/Les-Terres-Egarees/

La compilation utilise `npm run build -- --base=/Les-Terres-Egarees/`.
Les images chargées à l'exécution suivent la base Vite, ce qui permet de servir
le jeu sous ce sous-dossier sans perdre les portraits, cinématiques ou sprites.
La même compilation a été vérifiée localement sous ce chemin dans Chromium.

Si GitHub bloque l'activation automatique : ouvrir le dépôt, Settings → Pages,
choisir GitHub Actions comme source, puis relancer le workflow de publication.
Un dépôt privé peut nécessiter une offre GitHub compatible avec Pages ; ne pas
changer sa visibilité sans décision du propriétaire.

Une adresse attendue n'atteste pas un déploiement réussi : vérifier le résultat
`deploy` dans Actions et ouvrir le lien publié par GitHub.
