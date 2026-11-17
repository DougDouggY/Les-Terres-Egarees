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

Vérifications : 196 tests avec `npm test`, parcours navigateur des quatre boutons (approches des deux côtés, maintien des positions, pause, événements et PV, retour et stockage inchangé), builds public et prototype et contrôles de séparation public/prototype. Test navigateur : `npx playwright test --config=playwright.contact.config.ts`.

## Pas rapides, esquive et critique

Nouvelle planche transparente `pillard-quickstep-dodge-v6.png`, dessinée d’après le Pillard masculin hache-bouclier existant. Même identité, hache et bouclier, taille anatomique de référence constante pour les déplacements et l’esquive. Les autres unités ne changent pas de dessin.

Le déplacement retient quatre poses basses de contact/passage alternés (lignes 0 et 1, colonnes 0 et 1) à six images par seconde ; les poses aériennes et les genoux hauts ne sont pas sélectionnés. L’esquive retient trois poses (ligne 2, colonnes 0, 1 et 3) ; le dessin profondément accroupi n’est pas sélectionné. Les repères de sol et de corps sont constants pour éviter une translation parasite entre les poses.

Le dernier coup du scénario 4 est présenté comme critique : attaque normale, éclat lumineux, rayons et secousse de 280 ms. L’effet est indépendant du personnage, sans atlas de critique supplémentaire ; le mouvement réduit désactive la secousse et atténue le flash. Il reste une démonstration dans cet essai, sans modification des probabilités du moteur ou des résultats de campagne.

Aucune ancienne planche entière n’a été supprimée : les anciennes planches de mouvement restent partagées avec d’autres unités. Les sources et séquences de déplacement/esquive actives du Pillard ont été remplacées. La nouvelle planche conserve des propositions de poses qui ne sont pas sélectionnées dans les animations ; aucun de ces dessins n’est chargé dans une autre animation par hasard.
