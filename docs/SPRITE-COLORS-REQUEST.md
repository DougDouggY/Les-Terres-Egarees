# LES TERRES ÉGARÉES — SYSTÈME DE COULEURS ET GÉNÉRATION DES SPRITES

Avant de reprendre la génération des sprites, prends en compte les consignes suivantes. Elles remplacent toutes les précédentes instructions concernant les couleurs d'équipe.

## 1. Système de recoloration dynamique

Je souhaite que les sprites tactiques soient indépendants de la faction et de l'équipe.

Chaque classe doit posséder **une seule série de sprites et d'animations de référence**, réutilisable pour tous les personnages de cette classe, qu'ils appartiennent au joueur 1, au joueur 2 ou aux ennemis.

Prévoir une recoloration dynamique directement dans le moteur du jeu, sans générer de nouvelles images à chaque changement de couleur.

Palette de test :
- Bleu
- Rouge
- Jaune
- Vert
- Violet
- Orange
- Rose
- Noir / anthracite
- Blanc

Toutes ces couleurs doivent être disponibles pour les joueurs et les ennemis pendant les tests. Ne réserver aucune couleur définitivement pour le moment.

La recoloration doit concerner uniquement des zones identifiées du sprite : vêtements, capes, tissus, éléments d'armure ou boucliers.

Ne pas appliquer de filtre global qui modifierait la peau, les cheveux, les armes ou les autres détails du personnage.

Si nécessaire, utiliser des masques de recoloration ou un système de palettes indexées. L'objectif est d'obtenir un résultat propre, cohérent et performant.

## 2. Aucun indicateur visuel supplémentaire

Je ne veux pas de cercle coloré sous les unités, de contour artificiel, de symbole, d'icône ou de marqueur au-dessus des personnages pour identifier leur équipe.

Les équipes doivent être reconnaissables grâce aux couleurs intégrées directement aux sprites, dans l'esprit des anciens Fire Emblem.

Les couleurs doivent rester suffisamment visibles sur les petites unités tactiques et sur les différents terrains.

## 3. Choix des couleurs en jeu

Prévoir un système permettant de choisir la couleur du joueur 1 et celle du joueur 2 indépendamment de leur faction.

Les deux joueurs peuvent choisir Vikings, Chevaliers ou la même faction, sans aucune conséquence sur les sprites disponibles.

Pendant les tests, permettre également de modifier la couleur des ennemis.

Les couleurs ne sont pas encore définitives. Ne pas imposer pour le moment de combinaison obligatoire.

Prévoir une configuration initiale provisoire :
- Joueur 1 : bleu
- Joueur 2 : jaune
- Ennemis : rouge

Ces trois couleurs doivent pouvoir être modifiées facilement sans intervention de Codex.

En partie coopérative, chaque joueur doit avoir une couleur distincte afin de pouvoir identifier ses unités.

Enregistrer les choix dans les données de la partie et les restaurer au chargement.

## 4. Galerie des sprites — accessible dès maintenant

La galerie des sprites et le menu « Classes et systèmes » doivent être accessibles depuis le menu principal du prototype actuel.

Nous sommes en phase de développement : je dois pouvoir les utiliser immédiatement pour tester les unités.

Ils devront simplement pouvoir être désactivés ou exclus de la version publique finale.

Dans la galerie, je veux pouvoir :

- Sélectionner une faction, une classe et une promotion.
- Afficher le sprite tactique réel utilisé dans le jeu, avec un zoom net en pixel art.
- Prévisualiser les animations disponibles : repos, déplacement, attaque, riposte, dégâts, mort, etc.
- Changer librement la couleur du sprite parmi toutes les couleurs de test.
- Comparer plusieurs couleurs côte à côte sur la même classe.
- Afficher trois exemplaires d'une même classe avec les couleurs du joueur 1, du joueur 2 et des ennemis.
- Tester les couleurs sur les classes vikings, chevaliers et les éventuelles classes spécifiques aux monstres.
- Enregistrer les préférences de couleurs de test.
- Conserver le système de commentaires et de signalement « À corriger » déjà prévu.
- Signaler les sprites ou animations manquants sans inventer de faux aperçus.

Les changements de couleur doivent être immédiats et ne nécessiter aucune nouvelle génération de sprites.

## 5. Génération des sprites

Tu peux reprendre la création des sprites de classe une fois le système de recoloration prévu.

Important :
- Ne génère pas plusieurs variantes de couleurs d'une même classe.
- Ne génère pas plusieurs sprites différents pour des personnages partageant la même classe et le même équipement.
- Préserve les variantes réellement nécessaires pour les armes, équipements, transformations ou états particuliers.
- Les animations doivent être compatibles avec la recoloration dynamique.
- Privilégie un style pixel art cohérent, lisible et homogène sur toutes les classes.
- Commence par un petit échantillon représentatif (par exemple un Viking et un Chevalier), intègre-le au jeu et à la galerie, puis vérifie que toutes les couleurs fonctionnent correctement avant de générer le reste. Évite de multiplier les générations inutiles.

## 6. Préserver le prototype existant

Ne touche pas à la carte tactique déjà validée : conserve ses dimensions, ses terrains, ses décors, sa grille et ses mécaniques fonctionnelles.

Ne supprime pas les unités de test existantes tant que leurs remplaçantes ne sont pas correctement intégrées.

Réutilise autant que possible les systèmes déjà développés.

L'objectif est de disposer d'un système de sprites réutilisable et recolorable, qui fonctionne avec n'importe quelle combinaison de factions et de couleurs, sans avoir besoin de régénérer les personnages lors des futures parties.