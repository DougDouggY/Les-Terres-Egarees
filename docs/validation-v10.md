# V10 — Création et présentation du prologue

## Corrections livrées

- Création en trois étapes : répartition des factions, création des deux héros avec validations distinctes, voix sans visage puis sélection des compagnons et validations distinctes. Les voix progressent indépendamment ; les choix de compagnons restent chronologiques (FIFO).
- Sorcier/Sorcière exclus des héros chevaliers initiaux et de leurs compagnons initiaux, avec contrôle dans le moteur. La classe reste disponible pour la suite du jeu ; les sauvegardes existantes ne sont pas réécrites.
- Taille anatomique cible des aperçus de création passée de 72 à 96 pixels CSS ; mise à l'échelle réévaluée au redimensionnement.
- Carton « Prologue — Les Terres Égarées » de 3,8 secondes avant les arrivées, avec tempête/brume CSS. Les deux points de vue sont indiqués dans le prototype local ; un acquittement commun est prévu par les hooks de session. Aucun backend multijoueur ajouté.
- Rouge des matières recolorables moins pastel, alpha, peau et métal préservés. Repos de la Chamane féminine animé par une légère oscillation procédurale ancrée aux pieds : aucune pose masculine empruntée, aucun nouvel atlas annoncé.
- Texte de l'équipement assombri et éléments équipés lisibles même désactivés.
- Survol d'un ennemi : déplacement et attaque estimés depuis les seules informations connues. D affiche/masque l'ensemble des ennemis visibles, séparément par point de vue. Commandes documentées dans Échap. Aucun ennemi caché ni contenu de terrain caché révélé par le calcul.

La carte, les décors, les statistiques, les calculs de combat, les sauvegardes et la barre d'initiative validés sont conservés. Aucune image générée pour cette version.

## Vérifications

- `npm test` : suite complète réussie, dont les cinq nouveaux tests V10 (création, carton partagé/sauvegarde, confidentialité des portées, palette et repos).
- TypeScript : `tsc --noEmit` réussi.
- Playwright V10 : trois scénarios réussis, couvrant le parcours complet, les validations séparées, les voix, le carton et ses temporisations, le survol/D/Échap, les deux phases réellement rendues du repos de la Chamane rouge et le contraste de l'équipement.
- Régressions de création V8/V9 : FIFO, neuf ressources réelles, prénom Armand, taille cible 96 et redimensionnement mobile vérifiés.
- Captures inspectées : `artifacts/prologue-v10/`, notamment Chamane rouge et équipement.
- Compilations publique et prototype, et contrôles de contenu correspondant. Avertissement Vite préexistant sur la taille des bundles.

## Limites

Les introductions et le carton apparaissent lors d'une nouvelle aventure. Une sauvegarde en cours reprend son étape actuelle. La synchronisation réseau réelle Cloudflare reste une phase ultérieure ; seuls les contrôles et acquittements de session existants sont utilisés. Les futures illustrations avant le prologue ne sont pas produites ici.
