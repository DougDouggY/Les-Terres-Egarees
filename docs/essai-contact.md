# Essai Pillard contre Pillard

Accessible directement depuis l’accueil, dans les versions publique et prototype. L’ancien bouton d’accueil « Tests de combat » est retiré ; les autres outils historiques restent dans le dépôt.

Quatre échanges visuels imposés :

1. Vous attaquez, l’adversaire répond, vous attaquez une seconde fois.
2. L’adversaire attaque, vous parez, vous ripostez, puis vous attaquez normalement.
3. L’adversaire attaque, vous parez et ripostez ; vous attaquez ; l’adversaire attaque une seconde fois, vous parez et ripostez encore.
4. Vous attaquez, il esquive ; il attaque, vous esquivez ; vous attaquez une seconde fois et il meurt.

Les deux combattants de mêlée se rejoignent au milieu, puis restent au contact. Les règles de placement prévoient aussi un attaquant de mêlée seul en mouvement contre une cible à distance, et aucun déplacement lorsque l’attaquant tire ; les quatre boutons actuels restent des duels de Pillards au corps à corps. Ripostes et secondes attaques utilisent exactement la série d’attaque classique, sans `attack_again`. Aucun nouveau sprite. La taille anatomique par source reste constante pendant les poses, même lorsque la hache se lève.

L’esquive n’a pas encore de dessin cohérent pour ce personnage : garde décalée brièvement et mention « Esquive ». Elle reste une simulation visuelle provisoire. Les sprites de parade, dégâts et mort viennent des ressources actives. Les PV et résultats sont imposés pour ces essais et ne prouvent pas une probabilité ou un résultat du moteur réel.

Commandes compactes dans une colonne à gauche, scène agrandie et journal d’impacts masqué. La dernière pose de parade avec la hache projetée en avant est exclue de cet essai ; les dessins originaux sont conservés. Les ancrages de course des quatre poses du Pillard sont alignés sur leurs repères de pieds.

Vitesses : ×0,25, ×0,5, ×1, ×1,5, ×2 et ×4, réglables pendant la lecture. Pause/reprise, rejouer, retour à l’accueil. Aucune sauvegarde de campagne lue ou modifiée par l’écran. Le comportement des combats en partie reste inchangé.

Vérifications : 194 tests avec `npm test`, parcours navigateur des quatre boutons (approches des deux côtés, maintien des positions, pause, événements et PV, retour et stockage inchangé), builds public et prototype et contrôles de séparation public/prototype. Test navigateur : `npx playwright test --config=playwright.contact.config.ts`.
