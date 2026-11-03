# LES TERRES ÉGARÉES — PHASE 1 : CLASSES, INTERFACE ET STRUCTURE DU JEU

Tu vas faire évoluer le prototype existant de **Les Terres Égarées**, notre tactical RPG médiéval-fantastique coopératif inspiré notamment de Fire Emblem: The Sacred Stones.

**Ne recommence pas le projet de zéro.** Analyse d'abord le code existant, conserve la carte tactique, les déplacements, le système d'initiative individuelle, les combats et le brouillard de guerre déjà fonctionnels.

L'objectif de cette phase est de mettre en place le système de classes et de promotions, de revoir l'interface tactique et de préparer les fonctionnalités futures sans encore créer l'histoire.

## 1. Supprimer le camp de base actuel

Le prototype possède actuellement un camp de base.

Supprime son interface et son fonctionnement de la boucle de jeu actuelle, ainsi que les éléments de navigation devenus inutiles.

Ne supprime pas les ressources ou données qui pourraient servir plus tard.

Le jeu utilisera finalement des **campements temporaires entre les missions**, permettant de soigner, gérer l'équipement, préparer les unités et choisir la prochaine destination.

Ne développe pas encore ces campements temporaires.

## 2. Classes et factions

Prévoir deux factions jouables : Vikings et Chevaliers.

Chaque joueur choisit indépendamment sa faction. Les combinaisons Viking/Viking, Chevalier/Chevalier et Viking/Chevalier doivent être possibles.

Les classes et promotions doivent être définies dans des données configurables, séparées du code des personnages.

### Vikings

**Guerrier du Nord**
- Arme : hache.
- Promotion 1 : Berserker — deux haches, attaques multiples.
- Promotion 2 : Brise-fer — grande hache à deux mains, coups puissants et pénétration d'armure.

**Pillard**
- Armes : épée ou hache, avec bouclier.
- Promotion 1 : Huscarl — épée ou hache avec bouclier, parade et interception des attaques visant les alliés adjacents.
- Promotion 2 : Guérisseur du clan — épée ou hache avec bouclier, bandages et soins non magiques.

**Lame nordique**
- Arme : épée.
- Promotion 1 : Drengr — deux épées, attaques multiples.
- Promotion 2 : Garde d'honneur — épée et bouclier, parade et défense.

**Chasseur**
- Arme : arc.
- Promotion 1 : Grand chasseur — arc, précision supérieure et portée améliorée.
- Promotion 2 : Traqueur — arc et hache, vision supérieure et mobilité forestière.

**Chaman**
- Magie de soins uniquement.
- Deux promotions distinctes seront précisées ultérieurement.
- Ne pas inventer leurs capacités ni révéler leurs caractéristiques dans les menus.

### Chevaliers

**Homme d'armes**
- Épée et bouclier.
- Promotion 1 : Chevalier de la garde — défense, parade et protection.
- Promotion 2 : Cavalier — épée et bouclier à cheval, mobilité et charge.

**Lancier**
- Lance.
- Promotion 1 : Garde royal — lance et bouclier, défense.
- Promotion 2 : Lancier monté — lance à cheval, mobilité et charge.
- Promotion 3 : Porte-étendard — bannière, épée et soutien de zone.

**Arbalétrier**
- Arbalète.
- Promotion 1 : Rôdeur — arbalète et épée, vision et mobilité forestière.
- Promotion 2 : Arbalétrier à pavois — arbalète et grand bouclier défensif personnel.

**Épéiste**
- Épée.
- Promotion 1 : Duelliste — deux épées, attaques multiples.
- Promotion 2 : Exécuteur — grande épée à deux mains, coups puissants.

**Sorcier**
- Magie offensive et magie de soins.
- Promotion 1 : Nécromancien — magie, soins et invocation limitée de créatures temporaires.
- Promotion 2 : Archimage — magie, soins et attaques de zone.

Les noms des classes doivent pouvoir être modifiés facilement.

## 3. Progression et promotions

- Les classes de base progressent du niveau 1 au niveau 20.
- Au niveau 20, le joueur choisit une promotion parmi les voies autorisées.
- Après promotion, le personnage revient au niveau 1 de sa classe avancée.
- Les classes avancées progressent du niveau 1 au niveau 20.
- Les capacités associées à la promotion sont disponibles immédiatement.

Prévoir des arbres de promotions configurables, y compris des classes possédant trois promotions.

Ne pas inventer de nouvelles classes.

## 4. Jeunes recrues

Prévoir deux classes particulières :

- Jeune Viking, homme ou femme.
- Écuyer / Écuyère.

Ces unités ne sont pas disponibles dans le créateur de héros.

Elles progressent du niveau 1 au niveau 10, puis choisissent entre exactement deux classes de base prédéfinies dans les données du personnage.

Elles utilisent des armes d'entraînement et ne peuvent pas équiper d'armes rares ou légendaires.

Après leur choix de classe de base, elles repartent au niveau 1.

Ne pas créer de personnages définitifs de ce type pour l'instant.

## 5. Créateur de personnage

Préparer une interface permettant à chaque joueur de choisir :

1. Sa faction.
2. Le nom de son héros.
3. Homme ou femme.
4. Une classe de base de sa faction.

Prévoir des emplacements pour les futurs portraits.

Ne pas générer les portraits définitifs.

## 6. Sprites mutualisés

Les personnages d'une même classe utilisent le même sprite tactique et les mêmes animations, à équipement et état équivalents.

Exemple : trois Rôdeurs différents utilisent le même sprite sur la carte, mais possèdent chacun leur nom, portrait, statistiques et inventaire.

Les sprites tactiques sont liés à la classe et à ses états graphiques, pas à l'identité du personnage.

Prévoir une architecture extensible pour les variantes d'armes et les capacités particulières.

Ne pas générer maintenant tous les sprites définitifs.

## 7. Armes et ripostes

Une unité peut transporter plusieurs armes compatibles avec sa classe.

Elle possède une arme active.

La portée de l'arme active détermine si elle peut riposter lors d'une attaque ennemie.

Le changement d'arme se fait pendant le tour de l'unité, via le menu Objet/Équipement.

Ne pas changer automatiquement d'arme lors d'une riposte.

Portées de référence :
- Armes de mêlée ordinaires : 1 case.
- Arcs ordinaires : 2 cases.
- Grand chasseur : 2 à 3 cases.

La portée correspond à la distance sur la grille, pas à un nombre de cases vides entre les unités.

Prévoir les autres portées dans des données configurables.

Les unités équipées de deux armes effectuent deux attaques distinctes, chacune avec son calcul de précision.

Si leur Agilité permet une double attaque, elles peuvent effectuer jusqu'à quatre attaques.

## 8. Triangles des armes

Corps à corps :
- Épée > Hache.
- Hache > Lance.
- Lance > Épée.

Distance :
- Arc > Arbalète.
- Arbalète > Magie offensive.
- Magie offensive > Arc.

Les avantages affectent la précision et les dégâts.

Prévoir les efficacités particulières :
- Lances contre unités montées.
- Arcs et arbalètes contre unités volantes.
- Grandes haches contre armures lourdes.

Ne pas inventer les valeurs définitives de ces bonus.

## 9. Porte-étendard

Prévoir deux états :

**Bannière portée**
- La bannière est utilisée comme une lance.
- Le personnage combat normalement.

**Bannière plantée**
- Une action permet de planter la bannière.
- Une seule pose par bataille.
- La bannière ne peut pas être récupérée.
- Elle confère un bonus aux alliés dans un rayon de cinq cases.
- Le personnage passe à une épée.
- Son sprite et ses animations changent.

Le bonus exact reste configurable.

## 10. Arbalétrier à pavois

- Peut utiliser une action pour se fortifier.
- Bénéficie d'une protection accrue contre les attaques à distance.
- Peut recharger et tirer en restant fortifié.
- Tout déplacement annule la fortification.
- Le pavois protège uniquement son porteur.

Ne pas implémenter de protection des alliés ni de blocage de projectiles.

## 11. Refonte de l'interface tactique

L'interface doit s'inspirer de la lisibilité, de la compacité et de l'ergonomie de **Fire Emblem: The Sacred Stones**, tout en conservant une identité visuelle propre au jeu.

### Infobulle de survol

Lorsqu'on survole une case, afficher une petite fenêtre en bas à gauche de l'écran.

Si la case est vide :
- Nom du terrain.
- Informations utiles sur le terrain, lorsqu'elles existent.

Si une unité occupe la case :
- Nom du personnage ou type d'ennemi.
- Classe connue.
- Points de vie actuels et maximum.
- Barre de points de vie.

Refaire entièrement l'habillage de cette fenêtre pour qu'elle s'intègre à l'univers médiéval-fantastique : cadre travaillé, typographie lisible, couleurs cohérentes, style proche des interfaces de tactical RPG pixel-art.

Éviter les grandes cartes modernes, les panneaux disproportionnés et les éléments qui masquent inutilement la carte.

### Sélection d'une unité et déplacements

Le déplacement ne doit PAS apparaître comme une commande du menu.

Le joueur sélectionne une unité, puis clique directement sur une case accessible pour la déplacer.

Conserver l'affichage des cases de déplacement et des cases d'attaque déjà présent.

### Menu d'actions compact

Afficher un petit menu contextuel près de l'unité lorsqu'elle peut effectuer une action.

Actions possibles selon la situation :
- Attaquer.
- Objet / Équipement.
- Compétence, si disponible.
- Soigner, si disponible.
- Attendre.
- Autres actions particulières selon la classe.

N'afficher que les actions réellement disponibles.

Par exemple :
- « Attaquer » apparaît uniquement lorsqu'au moins une cible valide est attaquable depuis la position actuelle.
- « Soigner » apparaît uniquement lorsqu'une capacité de soin peut être utilisée sur une cible valide.
- Les compétences indisponibles ne doivent pas encombrer le menu.

### Position intelligente du menu

Le menu doit être compact et se placer automatiquement du côté de l'unité qui gêne le moins l'interaction.

Il doit pouvoir basculer à gauche ou à droite selon :
- La position de l'unité.
- Les bords de l'écran.
- La position de la souris.
- Les cases accessibles que le joueur risque de vouloir sélectionner.

Le menu ne doit jamais empêcher le joueur de cliquer facilement sur une case de déplacement adjacente.

Prévoir également la fermeture ou le repositionnement du menu lorsque le joueur commence à choisir une destination.

### Équipement

L'action Objet / Équipement permet de consulter les armes transportées et de changer l'arme active.

Le changement d'arme doit être visible dans les informations de l'unité.

La riposte utilise l'arme active au moment où l'ennemi attaque.

## 12. Bouton de vérification dans le menu

Ajouter au menu principal un bouton clairement identifiable, par exemple :

**« Classes et systèmes »**

Ce bouton ouvre une interface de consultation et de vérification du prototype.

Elle doit permettre de consulter :
- Les factions.
- Les classes de base.
- Les promotions configurées.
- Les armes autorisées.
- Les niveaux et règles de progression.
- Les capacités disponibles.
- Les portées.
- Les triangles des armes.
- Les données de test utiles au développement.

Il s'agit d'un outil de développement, pas d'une encyclopédie destinée aux joueurs.

Il doit être clairement isolé des menus normaux et ne pas être accessible en mode joueur final.

## 13. Découverte progressive des informations

En mode joueur, ne pas afficher les promotions et mécaniques que le joueur n'a pas encore découvertes.

L'aide et l'encyclopédie doivent révéler progressivement :
- Les classes rencontrées.
- Les promotions découvertes.
- Les armes et catégories rencontrées.
- Les capacités observées.
- Les faiblesses ennemies découvertes.

Les mécaniques cachées ne doivent pas être divulguées par les menus, les descriptions ou les aides contextuelles.

Le bouton de vérification développeur est une exception contrôlée, uniquement pour les tests.

## 14. Contexte narratif futur — Ne pas développer maintenant

Le jeu débutera par une introduction propre à la faction choisie.

Les Vikings préparent une expédition maritime vers l'ouest.

Les chevaliers appartiennent à une compagnie d'armes au service d'un royaume et préparent l'interception d'un convoi d'argent d'un royaume rival.

Après la première bataille et une catastrophe surnaturelle, les survivants se réfugient dans des ruines.

Une séquence illustrée et des dialogues avec portraits introduiront un personnage mystérieux pratiquant la magie et les soins.

La composition des illustrations et dialogues devra dépendre des factions et personnages réellement présents.

La sélection initiale des compagnons proposera plusieurs candidats prédéfinis, dont le portrait restera caché avant leur recrutement. Lorsqu'un candidat est choisi, son portrait apparaît et il prononce une réplique.

Ne pas créer maintenant les personnages, portraits, dialogues, cinématiques, illustrations ou chapitres définitifs.

Le jeu conservera une carte d'exploration avec des destinations inconnues, du brouillard de guerre et des missions pouvant s'enchaîner avec des embuscades inattendues.

Entre les missions, des campements temporaires permettront une gestion rapide des soins, de l'équipement et de l'équipe.

Ces informations sont fournies uniquement pour anticiper l'architecture.

## 15. Consignes de développement

Avant de modifier le projet :
1. Examiner les fichiers existants.
2. Identifier les fonctionnalités déjà opérationnelles.
3. Vérifier les dépendances entre les systèmes.
4. Préserver les éléments qui fonctionnent.
5. Prévoir des données de classes configurables.
6. Utiliser des valeurs de test pour les statistiques non encore définies.
7. Ne pas générer de personnages ou de sprites définitifs.
8. Ne pas inventer de nouvelles classes, missions ou éléments narratifs.
9. Vérifier que l'interface fonctionne avec la souris et que les menus n'empêchent pas les déplacements.
10. Tester les nouvelles fonctionnalités sans casser les combats existants.

Commence par analyser le projet, puis implémente les systèmes suffisamment définis. Signale les décisions encore ouvertes et les points qui nécessitent une validation ultérieure.