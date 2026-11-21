# Combats, marche, repos et inventaire

La scène de combat de campagne utilise désormais la même règle d’approche que l’essai validé : les deux combattants de mêlée se rejoignent au centre, puis restent au contact pendant les attaques, ripostes et secondes frappes. Face à un tireur, seul le combattant de mêlée avance. Une attaque à distance ne déclenche aucun déplacement. Les réactions d’esquive conservent leur bref retrait. Les dégâts, probabilités, portées et événements de combat restent ceux du moteur existant.

L’attente des classes de base utilisait déjà une respiration calculée sur une pose existante. L’amplitude passe de 1,6 % à 2,4 %, sans changer le cycle de 2,2 secondes. Ce traitement est étendu aux silhouettes des Sans-Repos, en gardant les pieds ancrés. Aucun sprite de personnage n’est régénéré.

La marche est chargée et préparée avant le démarrage du déplacement, aussi pour les ennemis. Certaines animations de marche sont dans un fichier différent de la pose de repos : leur premier chargement pouvait faire apparaître le texte « Sprite indisponible ». Une unité quittant sa fortification utilise sa silhouette mobile ; ses règles de fortification sont inchangées.

L’inventaire utilise 21 illustrations propres aux identifiants d’équipement : vingt icônes dans un atlas transparent et une icône de griffes séparée. Lance, épée, hache, arc, arbalète, combinaisons avec bouclier, armes doubles, armes lourdes, magie offensive, soins, bandages, bannière et armes d’entraînement ont des visuels distincts. Les illustrations sont générées pour cette interface, séparément des portraits et sprites d’unités.

Les suffixes H/F restent limités aux noms de l’essai temporaire. Les noms des personnages en campagne ne sont pas modifiés.

Principaux fichiers : `src/ui/combat-v2.ts`, `src/ui/contact-trial-model.ts`, `src/main.ts`, `src/sprites/idle-motion.ts`, `src/ui/character-sheet.ts`, `src/ui/item-icons.ts`, `src/assets/ui/inventory-icons.png`, `src/assets/ui/inventory-claws.png`, `src/style.css`.

## Vérifications effectuées

- 225 tests automatisés réussis : systèmes de jeu, ressources, initiative, sauvegardes et présentation.
- Quatre vérifications navigateur ciblées réussies : maintien au contact en campagne et cas mixtes/distance ; fichiers et cellules de marche des états mobiles ; icônes distinctes et transparentes ; premier déplacement réel d’un lancier ennemi avec chargement volontairement retardé.
- Quatorze vérifications de régression des combats réussies, dont une relancée après une interruption par le rechargement du serveur de développement.
- Compilation TypeScript, construction du prototype et contrôle du paquet publiable réussis.
