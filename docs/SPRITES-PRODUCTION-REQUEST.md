# LES TERRES ÉGARÉES — PRODUCTION DES SPRITES PAR PRIORITÉ TECHNIQUE

Le système de recoloration dynamique fonctionne et les premiers tests sont satisfaisants.

Je souhaite maintenant poursuivre la production des sprites, mais dans un ordre permettant de résoudre les difficultés techniques avant de généraliser les créations.

Tu peux enchaîner les lots ci-dessous sans attendre mon autorisation entre chaque lot, à condition de vérifier le rendu et le fonctionnement de chaque catégorie.

## LOT 1 — UNITÉS TECHNIQUEMENT COMPLEXES

Commencer par les classes et unités présentant les plus grands risques visuels ou techniques :

- Cavalier : cheval et cavalier visibles, déplacements montés.
- Lancier monté : cheval et cavalier avec lance.
- Porte-étendard : bannière portée et animation pour la planter, puis passage à l'épée.
- Arbalétrier à pavois : grande protection, position normale et fortifiée.
- Brise-fer : grande hache à deux mains.
- Exécuteur : grande épée à deux mains.
- Berserker : deux haches.
- Drengr : deux épées.
- Cavalier spectral : monture et cavalier morts-vivants.

Pour ces unités, vérifier particulièrement :

- La lisibilité à la taille réelle du jeu.
- Le bon positionnement sur une seule case tactique.
- L'absence de débordements visuels gênants sur les cases voisines.
- La cohérence des proportions et des animations.
- Les changements d'équipement et d'état.
- La compatibilité avec le système de recoloration.

Un cavalier reste une unité occupant une seule case, même si son sprite dépasse légèrement de celle-ci.

## LOT 2 — CLASSES DE BASE

Produire ensuite toutes les classes de base jouables :

Vikings :

- Guerrier du Nord
- Pillard
- Lame nordique
- Chasseur
- Chaman

Chevaliers :

- Homme d'armes
- Lancier
- Arbalétrier
- Épéiste
- Sorcier

Réutiliser les sprites du Pillard et de l'Homme d'armes déjà présents s'ils sont satisfaisants.

Ne pas générer plusieurs personnages différents pour une même classe.

## LOT 3 — LES SANS-REPOS

Créer les sprites de la faction ennemie des Sans-Repos :

- Squelette épéiste
- Squelette hacheur
- Squelette lancier
- Archer décharné
- Arbalétrier décharné
- Garde en armure
- Cavalier spectral (réutiliser celui du lot 1)
- Nécromancien ennemi

Les monstres doivent être immédiatement reconnaissables comme des morts-vivants, tout en conservant la lisibilité de leurs armes pour les triangles de combat.

## LOT 4 — AUTRES PROMOTIONS

Produire les promotions restantes des arbres de classes vikings et chevaliers déjà validés.

Respecter les armes, équipements, compétences et états particuliers définis pour chacune.

Ne pas inventer de nouvelles classes, promotions ou mécaniques.

## ANIMATIONS

Chaque classe doit disposer des animations adaptées à ses capacités.

Distinguer dans la galerie :

- Fonctionnelle : animation réellement visible.
- Provisoire : pose statique, ancienne animation ou remplacement.
- Manquante : aucune animation disponible.

Ne pas afficher « Fonctionnelle » pour une simple image immobile.

Les actions spéciales (soin, fortification, bannière, invocation, attaque de zone, etc.) doivent être représentées uniquement pour les classes concernées.

## COULEURS D'ÉQUIPE

Le choix des couleurs est maintenant le suivant :

- Les ennemis utilisent par défaut le ROSE VIF.
- Le joueur 1 choisit librement sa couleur parmi les couleurs proposées, sauf le rose.
- Le joueur 2 choisit librement sa couleur parmi les couleurs proposées, sauf le rose.
- Les deux joueurs ne peuvent pas choisir la même couleur.
- Couleurs par défaut : joueur 1 bleu, joueur 2 jaune.

Conserver la recoloration dynamique des zones prévues dans les sprites. Ne jamais générer plusieurs séries d'animations pour les différentes couleurs.

Aucun cercle, contour, marqueur ou symbole supplémentaire ne doit être ajouté autour ou au-dessus des unités.

Dans la galerie de développement, conserver la possibilité de tester toutes les couleurs, y compris le rose sur les alliés et les autres couleurs sur les ennemis.

## GALERIE ET INTÉGRATION

- Intégrer chaque sprite au jeu et à la galerie.
- Tester le rendu sur la carte tactique existante.
- Vérifier les animations et leur statut réel.
- Conserver les fonctions de comparaison et de commentaires « À corriger ».
- Ne pas remplacer les sprites existants par des images provisoires de moindre qualité.

## CONTRAINTES IMPORTANTES

- Ne pas modifier la carte tactique validée, ses dimensions, ses terrains ou ses décors.
- Ne pas casser les déplacements, attaques, ripostes ou menus existants.
- Réutiliser les systèmes déjà fonctionnels.
- Éviter les générations redondantes et les ressources inutiles.
- Ne pas bloquer toute la production si une animation complexe pose problème : signaler précisément le problème, conserver une version provisoire et poursuivre les autres unités.
- À la fin, fournir un bilan clair des sprites et animations réellement terminés, provisoires ou manquants.

L'objectif est de disposer de toutes les classes et des premiers monstres dans le prototype, tout en résolvant en priorité les problèmes techniques liés aux unités complexes.

# Restriction prioritaire de cette phase

Création, animation et intégration visuelle uniquement. Ne pas créer, modifier
ou équilibrer le premier combat ; ne pas modifier ses unités, positions,
statistiques ou équipements. Ne pas modifier les mécaniques ni concevoir de
missions. Ne lancer aucune simulation ni aucun test de gameplay. Conserver
intégralement la carte validée et présenter les nouveaux sprites dans la galerie,
sans lancer automatiquement le premier combat.
