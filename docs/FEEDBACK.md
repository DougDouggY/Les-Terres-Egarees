# Retours de test — priorités

## Cette passe

- Remplacer le quadrillage sombre par une nappe de brume animée et continue.
- Recouvrir de la même brume les cases découvertes qui sortent de la vision.
- Conserver les visions indépendantes, les animations de repos et les déplacements.
- Rendre les sprites et le terrain moins crénelés sans générer de nouvelles images.
- Structurer le sanctuaire par une enceinte, des murs intérieurs et des portes larges.
- Expliquer le rôle de chaque statistique, y compris l’initiative indépendante de l’agilité.
- Préserver les sauvegardes : une unité sur un mur ajouté est déplacée vers une case libre proche, en conservant ses PV, objets, expérience et progression.

## Mis de côté à la demande de l’utilisateur

Aucune génération d’images pendant cette passe. Les illustrations de cinématiques
restent à remplacer plus tard : meilleure résolution native et choix de plans
fidèle au texte (notamment le bateau dans la tempête, pas seulement le ciel).
Le traitement actuel des sprites améliore le rendu ; il ne constitue pas une
nouvelle direction artistique cartoon ni une nouvelle série d’illustrations.

## Références fournies

- https://le-dernier-raid.ledougoudouggy.chatgpt.site/ : unités, combats et rôle des statistiques.
- https://le-dernier-raid-3d-test.ledougoudouggy.chatgpt.site/ : carte d’Angleterre et brouillard.

Les deux requêtes ont été refusées par le proxy réseau de l’environnement
(CONNECT 403). Leur apparence et leurs formules n’ont donc pas pu être étudiées.
La refonte exacte de la carte du monde et l’alignement des règles sur ces exemples
restent à faire après accès aux références. Les formules de combat actuelles ont
été conservées ; aucune formule supposée de ces jeux n’a été inventée.

## Correctif après test de sélection

La couche de déplacement accédait à une variable de case avant sa déclaration
lorsqu’une destination potentielle était hors de vue. L’exception interrompait
le dessin avant la brume et les personnages. Le test navigateur reproduit ce
défaut avant correction et vérifie ensuite la texture de brume ainsi que le
dessin continu des ennemis visibles pendant la sélection.

Les alliés sont maintenant traversables : même armée, ou deux expéditions après
leur alliance. Une destination occupée reste interdite. Les ennemis restent
bloquants. Les règles de contrôle et les coûts de terrain sont conservés.

Le style cartoon demeure une reprise des ressources graphiques, distincte du
correctif de rendu. Aucune nouvelle image créée pour ces corrections.

## Choix graphique confirmé ensuite

L’utilisateur a choisi de refaire uniquement le tileset. Une seule nouvelle
planche a été générée : terrain cartoon peint, contours souples, pierres et
végétation simplifiées. Les 32 rôles de tuiles restent identiques. Les cellules
sont conservées en 128×128 pixels pour 32 pixels logiques, et les routes sont
réassemblées à la même résolution. Aucun nouveau sprite ni plan de cinématique.
Les URL de terrain sont versionnées pour éviter de garder l’ancien atlas en cache.

## Atelier de comparaison du terrain

Trois rendus sélectionnables dans la même partie : tuiles fondues par raccords
progressifs, textures continues en coordonnées monde mais découpées selon les
cases logiques, et tuiles variées avec huit compositions d’herbe (dont nue).
Les variantes sont distribuées de manière pseudo-aléatoire fixe : elles ne
changent pas en déplaçant la caméra ou en sélectionnant une unité, et n’utilisent
pas la graine des combats. Aucune génération d’images IA supplémentaire.

Le bouton « Retirer la brume (test) » permet l’inspection de toute la carte.
Il ne révèle aucune case dans la sauvegarde, ne déclenche pas la rencontre et
ne change pas le propriétaire des unités. Le bouton « Grille » affiche les
limites exactes des cases. Ces commandes sont des outils temporaires de comparaison.

La carte est assombrie dans les trois rendus. Le monastère comprend un vestibule,
une chapelle et un réfectoire, avec portes et brèches. Les escaliers s’orientent
selon le côté de l’entrée. La révision 3 conserve la progression des anciennes
sauvegardes et recalcule la visibilité après migration.

## Échelle régionale — révision 4

Les trois essais précédents sont remplacés par une carte régionale inspirée
des conventions spatiales des cartes Fire Emblem, avec un atlas original.
Village détruit compact (3 × 3), huit cases de bâtiments bloquantes et entrée
unique au milieu sud. Drakkar détruit au nord-ouest et convoi détruit au sud-est :
une case chacun, indépendamment des factions choisies. Mer limitée à la baie
nord-ouest, plages et chemins raccordés, massifs et bois représentés en miniature.
Une seule génération d’atlas ; cinématiques inchangées. Migration des anciennes
sauvegardes : déplacement des unités uniquement si le nouveau décor les bloque.
Les commandes d’inspection de brume et de grille restent disponibles.

## Bois raccordés, carte agrandie et interface contextuelle — révision 5

Carte 60 × 40, approches allongées sans agrandir le village ni les épaves.
Forêts dessinées en bouquets irréguliers bordés d’herbe ; arbres supplémentaires
uniquement sur les jonctions de cases boisées. Trois compositions de montagnes,
un pic principal et zéro, un ou deux petits pics devant. Eau et sable conservés.
Ces changements sont dessinés dans le moteur, sans génération d’images.

Caméra ×1,65, glisser au clic gauche avec capture du pointeur, flèches et bouton
Recentrer. Les clics de jeu sont ignorés après un glisser. Interface recentrée sur
la carte : infobulle terrain/unité en bas à gauche, fiche flottante au clic,
aide au survol et au clavier pour les statistiques. Entrée sud du village
praticable et repérée. Les commandes de brume et de grille restent disponibles.

## Carte bord à bord et retour aux arbres peints

Suppression du plafond de largeur calculé depuis la hauteur de fenêtre qui
réduisait fortement la carte, notamment sur les écrans larges peu hauts. La carte
remplit le viewport ; en-tête, outils et commandes flottent au-dessus. Le tampon
Canvas suit les dimensions et la densité de pixels, et les lignes visibles
s’adaptent au format sans étirer les cases. L’observation conserve deux vues
côte à côte. Les forêts réutilisent le dessin peint original avec raccords
latéraux et aux jonctions ; les montagnes sont un quart plus basses.
Les positions de départ et les sauvegardes ne changent pas.

## Massifs irréguliers et route du convoi — révision 6

Le tileset approuvé, le zoom et le plein écran sont conservés. Les anciens
blocs de bois dessinés en carrés de 2 × 2 cases sont remplacés par des contours
asymétriques définis case par case. Les forêts denses ont des lisières de
sous-bois praticables ; des massifs supplémentaires bordent les ruines et
encadrent le secteur du convoi. Les clairières de départ restent reliées.

La route traverse désormais la case du convoi détruit (50, 34) et rejoint le
bord est de la carte. Le fond herbeux du décor du chariot est retiré au rendu
pour laisser apparaître le chemin sous les débris. L’atlas lui-même reste intact.
La progression des sauvegardes est conservée ; une unité couverte par une
nouvelle forêt dense est replacée sur la case libre la plus proche.
