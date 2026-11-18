# Essai Pillard contre Pillard

Accessible directement depuis l’accueil, dans les versions publique et prototype. L’ancien bouton d’accueil « Tests de combat » est retiré ; les autres outils historiques restent dans le dépôt.

Quatre échanges visuels imposés :

1. Vous attaquez, l’adversaire répond, vous attaquez une seconde fois.
2. L’adversaire attaque, vous parez, vous ripostez, puis vous attaquez normalement.
3. L’adversaire attaque, vous parez et ripostez ; vous attaquez ; l’adversaire attaque une seconde fois, vous parez et ripostez encore.
4. Vous attaquez, il esquive ; il attaque, vous esquivez ; vous attaquez une seconde fois et il meurt.

Les deux combattants de mêlée se rejoignent au milieu, puis restent au contact. Les règles de placement prévoient aussi un attaquant de mêlée seul en mouvement contre une cible à distance, et aucun déplacement lorsque l’attaquant tire ; les quatre boutons actuels restent des duels de Pillards au corps à corps. Ripostes et secondes attaques utilisent exactement la série d’attaque classique, sans `attack_again`. Aucun nouveau sprite. La taille anatomique par source reste constante pendant les poses, même lorsque la hache se lève.

L’esquive utilise désormais de nouvelles poses dédiées de préparation, retrait et reprise, avec un pas net en arrière de 60 pixels puis un retour au contact. La pose profondément accroupie est exclue. Les sprites de parade, dégâts et mort viennent des ressources actives. Les PV et résultats sont imposés pour ces essais et ne prouvent pas une probabilité ou un résultat du moteur réel.

Commandes compactes dans une colonne à gauche, scène agrandie et journal d’impacts masqué. La dernière pose de parade avec la hache projetée en avant est exclue de cet essai ; les dessins originaux sont conservés. Les ancrages de course des quatre poses du Pillard sont alignés sur leurs repères de pieds.

Vitesses : ×0,25, ×0,5, ×1, ×1,5, ×2 et ×4, réglables pendant la lecture. Pause/reprise, rejouer, retour à l’accueil. Aucune sauvegarde de campagne lue ou modifiée par l’écran. Le comportement des combats en partie reste inchangé.

Vérifications : 196 tests avec `npm test`, parcours navigateur des quatre boutons (approches des deux côtés, maintien des positions, pause, événements et PV, retour et stockage inchangé), builds public et prototype et contrôles de séparation public/prototype. Trois tests navigateur couvrent également le nouvel effet partagé. Test navigateur : `npx playwright test --config=playwright.contact.config.ts`.

## Pas rapides, esquive et critique

Nouvelle planche transparente `pillard-quickstep-dodge-v6.png`, dessinée d’après le Pillard masculin hache-bouclier existant. Même identité, hache et bouclier, taille anatomique de référence constante pour les déplacements et l’esquive. Les autres unités ne changent pas de dessin.

Le déplacement retient quatre poses basses de contact/passage alternés (lignes 0 et 1, colonnes 0 et 1) à six images par seconde ; les poses aériennes et les genoux hauts ne sont pas sélectionnés. L’esquive retient trois poses (ligne 2, colonnes 0, 1 et 3) ; le dessin profondément accroupi n’est pas sélectionné. Les repères de sol et de corps sont constants pour éviter une translation parasite entre les poses.

Le dernier coup du scénario 4 est présenté comme critique : attaque normale, grande entaille lumineuse, bref contraste sombre, flash unique, éclats, mention « Critique » et secousse, sur une enveloppe de 480 ms. Aucun sprite de critique n’a été dessiné. L’effet est indépendant du personnage ; le mouvement réduit désactive la secousse et atténue le flash.

Le même effet est aussi utilisé dans `CombatSceneV2` pour les coups déjà résolus comme critiques, réussis et non bloqués. Il fonctionne sans association à une classe ou un atlas particulier. Il ne change ni dégâts, ni probabilités, ni timing des impacts, ni nombre d’attaques. Les tests navigateur le vérifient pour le Pillard, l’homme d’armes, le lancier et l’arbalétrier, ainsi que pour un coup paré qui ne doit pas déclencher cet effet. La généralisation du déplacement au centre à toutes les classes reste une étape distincte ; elle n’est pas effectuée par cette modification.

Aucune ancienne planche entière n’a été supprimée : les anciennes planches de mouvement restent partagées avec d’autres unités. Les sources et séquences de déplacement/esquive actives du Pillard ont été remplacées. La nouvelle planche conserve des propositions de poses qui ne sont pas sélectionnées dans les animations ; aucun de ces dessins n’est chargé dans une autre animation par hasard.

## Validation isolée du critique V2

Le bouton « Critique seul · V2 » lance une seule approche suivie d'un critique non mortel : huit PV retirés, afin de voir l'impact sans confondre l'effet avec la disparition d'une unité. Le titre affiche « Critique V2 » pour identifier cette version. Pause et Rejouer permettent de revoir uniquement ce coup. Les quatre scénarios précédents restent disponibles.

L'effet partagé conserve contraste, flash unique, éclats et secousse ; les deux traits sont désormais effilés en entailles plutôt qu'en barres arrondies. Aucun sprite ni fichier image supplémentaire n'a été créé. Le style reste à valider par le joueur avant la reprise des personnages. La publication distante ne peut pas être vérifiée depuis cet environnement (accès GitHub refusé en HTTP 403).

Vérifications de cette révision : 196 tests habituels, deux tests navigateur ciblés (moteur partagé et critique isolé), builds public et prototype.

## Effet validé et modèle de remplacement — 18 novembre 2026

Le joueur retient les deux griffures, le flash et la secousse. Suppression des douze particules triangulaires orange et blanches. Aucun portrait en bandeau n'est ajouté à cette étape. Le rendu partagé sert au test et aux critiques réels déjà résolus par le moteur.

La référence `docs/references/pillard-masculin-hache-bouclier.*` est mise à jour : 26 poses, pas rapides et esquive actuels, trois poses de parade, aucune ligne de riposte ou seconde attaque en double. Le nouveau `pillard-modele-atlas.png` présente les mêmes poses dans une grille transparente 8 × 8 de cases carrées de 320 pixels, avec manifeste de découpe, contrôle des bords et repère de sol commun. Les cellules non utilisées restent vides. Ce modèle est un export documentaire pour préparer les futurs remplacements ; il ne remplace pas automatiquement les atlas du jeu.

Le guide `docs/references/guide-remplacement.md` liste les profils effectivement présents, les fantassins avec bouclier proches de ce modèle et les gestes spéciaux à préserver pour les autres familles. Il ne prétend pas que tous ces profils sont défectueux. Les deux Pillardes sont prioritaires. Aucune autre unité n'est redessinée dans cette modification.

Une page autonome et ses téléchargements sont préparés sous `public/validation/pillard/`, pour l'URL `/Les-Terres-Egarees/validation/pillard/` après publication. Le jeu ne charge pas ces ressources documentaires pendant une partie.

## Pillarde hache-bouclier — proposition à valider

Le sélecteur « Personnage » de l'essai propose le Pillard masculin et la Pillarde hache-bouclier. Les cinq scénarios, les vitesses, Pause, Rejouer, les positions au contact et l'effet de critique sont communs. Changer de personnage remet la lecture à zéro et recharge ses seules ressources ; un chargement ancien ne peut pas réactiver un personnage sélectionné précédemment.

Nouvelle planche `pillarde-axe-review-v1.png` : 26 poses de la Pillarde rousse, en grille 4 × 7, cases de 237 pixels, fond alpha réellement transparent. Deux cases sont laissées vides. Les pas rapides ont quatre poses à six images/s, l'esquive possède trois poses et un vrai déplacement arrière. Les repères de corps, les pieds et l'échelle sont normalisés dans les métadonnées ; les attaques utilisent huit poses dont la hache levée est redessinée. Le critique conserve l'effet partagé, sans pose spéciale.

La définition `pillarde-axe.review.json` est volontairement réservée à cet essai. Elle n'est pas enregistrée parmi les descriptions de campagne `*.sprite.json` ou `*.combat.json`. Les dessins de la Pillarde en partie, la variante épée-bouclier et les autres unités attendent leur validation propre. Les anciennes planches encore actives ne sont pas supprimées.

Vérifications : 198 tests habituels, deux parcours navigateur ciblés (Pillard existant et cinq scénarios de la Pillarde), transparence réelle, retour au masculin, sauvegardes inchangées et builds public/prototype. Les autres personnages seront examinés un par un : le catalogue contient des bases utilisables, mais présence d'une animation ne garantit pas des poses ou transitions satisfaisantes.
