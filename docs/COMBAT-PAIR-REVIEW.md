# Deux combattants — essai à valider

Menu du prototype : **Essai des combats**. L’Atelier propose également « Essai des deux combattants ».

## Présentation

L’Homme d’armes et le Pillard utilisent les mêmes dessins que lors de la précédente livraison ; aucune nouvelle génération d’images. Dans l’essai, leur cadre passe de 240 à 160 pixels, soit une réduction d’un tiers. La scène réelle utilise également des combattants plus petits. À la largeur maximale du banc d’essai, le corps affiché reste inférieur à sa hauteur dans l’image source.

L’interface reprend la lecture de la référence fournie : noms dans les cadres supérieurs, armes et précision/dégâts dans le bandeau inférieur, PV et jauges segmentées en bas. Les deux écrans partagent le même composant de présentation, avec les couleurs des équipes. Sur petit écran, le bandeau inférieur occupe sa propre place sous le canevas et ne masque pas les sprites. Les décors existants sont conservés.

## Couleurs

Le masque de la nouvelle paire inclut maintenant les nuances roses adoucies proches de la matière magenta. L’extension est limitée aux pixels voisins du masque, sur cette planche seulement, pour préserver les tons naturels. Les pixels de peau, cuir, métal et les valeurs alpha sont contrôlés. L’image source n’est pas retouchée ; la recoloration reste calculée et mise en cache par palette et mode de masque.

## Les deux boutons

1. **Seconde attaque par agilité** : attaque simple, retour à sa place, riposte de l’adversaire, retour adverse, seconde approche et attaque grâce à l’agilité, puis retour. L’Homme d’armes et le Pillard n’enchaînent plus deux frappes lors d’une seule approche. Les trois impacts de démonstration donnent 20/24 PV à gauche et 16/24 à droite.
2. **Parade, riposte et votre tour** : attaque adverse ; parade sans perte de PV ; riposte immédiate au contact ; retour adverse ; passage de tour ; approche et attaque du joueur, puis retour.

Le choix « Votre personnage » inverse les rôles. Ralenti, pause et relecture restent disponibles. Il s’agit de scénarios visuels forcés (24 PV et dégâts de démonstration), indépendants de la campagne et de ses sauvegardes. Le premier scénario simule volontairement un avantage d’agilité.

## Règles partagées avec le jeu

Le résolveur utilise désormais des passages distincts : groupe d’attaques initial, groupe de riposte, puis passage supplémentaire du combattant plus agile. Avec deux armes, le groupe contient une frappe par arme, au contact, puis un retour ; le bonus d’agilité ouvre un nouveau groupe après la riposte adverse. Les métadonnées de groupe permettent au renderer de garder le contact entre les deux armes tout en conservant un retour complet entre les passages d’agilité. La décision de critique reste propre à chaque séquence d’arme ; une séquence critique ne reçoit pas sa seconde frappe normale. Les décès interrompent les frappes suivantes.

Aucune nouvelle unité à doubles armes n’est générée pour ces essais. Les autres classes et variantes attendent la validation de la paire.

## Préservation et contrôles

La carte, le terrain, les décors, toutes les images antérieures, les effectifs, les positions et l’équipement de la première mission restent inchangés. Aucun premier combat n’est lancé automatiquement.

Les vérifications portent sur les empreintes des ressources, l’ordre réel des attaques avec une et deux armes, les critiques/parades/décès, les phases d’approche et retour, la pause, l’affichage mobile et la recoloration de pixels de la planche réelle. Les compilations publique et prototype sont vérifiées ; le banc d’essai reste exclu de la version publique normale.

Validation finale : 25 tests unitaires (visuels et systèmes) et 11 contrôles Chromium réussis. Compilations publique et prototype réussies ; aucune image source modifiée.
